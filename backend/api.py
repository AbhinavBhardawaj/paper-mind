import asyncio
import json
import logging
import math
import os
import time
from collections import OrderedDict
from datetime import date, datetime, time as datetime_time, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    import resource
except ImportError:
    resource = None

import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load backend settings regardless of the directory used to launch Uvicorn.
load_dotenv(Path(__file__).resolve().parent / ".env")

from backend.pipeline import run_pipeline
from contextlib import asynccontextmanager
from ml.topic_modeling import warmup

@asynccontextmanager
async def lifespan(app):
    asyncio.create_task(asyncio.to_thread(warmup))
    yield

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PaperMind", lifespan=lifespan)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

CACHE_TTL = int(os.getenv("CACHE_TTL", 60 * 30))
CACHE_MAX = int(os.getenv("CACHE_MAX", 50))
CACHE: "OrderedDict[str, tuple[Any, float]]" = OrderedDict()
IN_FLIGHT: dict[str, asyncio.Task] = {}
PIPELINE_SLOTS = asyncio.Semaphore(int(os.getenv("MAX_CONCURRENT_PIPELINES", 1)))
bearer_scheme = HTTPBearer(auto_error=False)
DAILY_NEW_ANALYSIS_LIMIT = 10
# Process-local by design; counts reset when the API process restarts.
DAILY_ANALYSIS_COUNTS: dict[tuple[str, date], int] = {}
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_JWKS = jwt.PyJWKClient("https://www.googleapis.com/oauth2/v3/certs", cache_keys=True)


class QueryRequest(BaseModel):
    query: str = Field(..., max_length=200)


def current_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> str:
    token = credentials.credentials if credentials else None
    if not token or not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Sign in to analyze a topic.")
    try:
        signing_key = GOOGLE_JWKS.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            issuer=["accounts.google.com", "https://accounts.google.com"],
            options={"require": ["exp", "iat", "aud", "sub"]},
        )
        user_id = claims.get("sub")
        if not isinstance(user_id, str) or not user_id or claims.get("email_verified") is not True:
            raise jwt.InvalidTokenError("Missing or unverified Google identity")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Sign in to analyze a topic.") from None


def _json_default(o: Any):
    """Handle numpy / pandas / datetime values that json can't serialize."""
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if hasattr(o, "tolist"):      # numpy arrays
        return o.tolist()
    if hasattr(o, "item"):        # numpy scalars
        return o.item()
    return str(o)


def _sanitize(obj: Any) -> Any:
    """Replace NaN/inf with None so the response is valid JSON."""
    if isinstance(obj, float) and not math.isfinite(obj):
        return None
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    return obj


def _cache_get(query: str):
    hit = CACHE.get(query)
    if hit and time.time() - hit[1] < CACHE_TTL:
        CACHE.move_to_end(query)
        return hit[0]
    CACHE.pop(query, None)
    return None


def _cache_set(query: str, data: Any):
    CACHE[query] = (data, time.time())
    CACHE.move_to_end(query)
    while len(CACHE) > CACHE_MAX:
        CACHE.popitem(last=False)


async def _compute(query: str):
    async with PIPELINE_SLOTS:  # one heavy job at a time
        start = time.time()
        raw = await asyncio.to_thread(run_pipeline, query)
        data = _sanitize(json.loads(json.dumps(raw, default=_json_default)))
        elapsed = time.time() - start
        peak_mb = (
            resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
            if resource is not None
            else None
        )
        logger.info(
            "[PIPELINE] done query=%r in %.1fs papers=%d topics=%d peak_rss=%s",
            query,
            elapsed,
            len(data.get("papers", [])),
            len(data.get("topic_map", {})),
            f"{peak_mb:.0f}MB" if peak_mb is not None else "unavailable",
        )
        # only cache results where citation data was fetched successfully
        if "citation_data_unavailable" not in data.get("warnings", []):
            _cache_set(query, data)
        return data, elapsed


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/pipeline")
async def pipeline(request: QueryRequest, user_id: str = Depends(current_user_id)):
    query = request.query.strip().lower()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    cached = _cache_get(query)
    if cached is not None:
        return {"cached": True, "data": cached}

    task = IN_FLIGHT.get(query)
    if task is None:
        now = datetime.now(timezone.utc)
        today = now.date()
        count_key = (user_id, today)
        count = DAILY_ANALYSIS_COUNTS.get(count_key, 0)
        if count >= DAILY_NEW_ANALYSIS_LIMIT:
            reset_at = datetime.combine(today + timedelta(days=1), datetime_time.min, tzinfo=timezone.utc)
            raise HTTPException(
                status_code=429,
                detail=f"Daily limit reached ({DAILY_NEW_ANALYSIS_LIMIT} new analyses). Try again after {reset_at.isoformat()} UTC.",
            )
        DAILY_ANALYSIS_COUNTS[count_key] = count + 1
        task = asyncio.create_task(_compute(query))
        IN_FLIGHT[query] = task
        task.add_done_callback(lambda _t, q=query: IN_FLIGHT.pop(q, None))

    try:
        data, elapsed = await asyncio.shield(task)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        logger.exception("[PIPELINE] failed query=%r", query)
        raise HTTPException(status_code=500, detail="Pipeline failed. Check server logs.")

    return {"cached": False, "data": data, "elapsed_seconds": elapsed}
