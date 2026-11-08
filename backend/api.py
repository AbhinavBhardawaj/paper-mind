import asyncio
import json
import logging
import math
import os
import time
from collections import OrderedDict
from datetime import date, datetime
from typing import Any
import resource

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.pipeline import run_pipeline
from contextlib import asynccontextmanager
from ml.topic_modeling import warmup

from dotenv import load_dotenv
load_dotenv()

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


class QueryRequest(BaseModel):
    query: str = Field(..., max_length=200)


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
        peak_mb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024
        logger.info(
            "[PIPELINE] done query=%r in %.1fs papers=%d topics=%d peak_rss=%.0fMB",
            query, elapsed, len(data.get("papers", [])), len(data.get("topic_map", {})), peak_mb,
        )
        # only cache results where citation data was fetched successfully
        if "citation_data_unavailable" not in data.get("warnings", []):
            _cache_set(query, data)
        return data, elapsed


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/pipeline")
async def pipeline(request: QueryRequest):
    query = request.query.strip().lower()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    cached = _cache_get(query)
    if cached is not None:
        return {"cached": True, "data": cached}

    task = IN_FLIGHT.get(query)
    if task is None:
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