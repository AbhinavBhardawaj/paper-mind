import logging
import os
import re
import time
import threading
import requests

logger = logging.getLogger(__name__)

BATCH_URL = "https://api.semanticscholar.org/graph/v1/paper/batch"
FIELDS = "citationCount,influentialCitationCount"
CACHE_TTL = 6 * 3600
BATCH_SIZE = 100
_cache = {}  # clean_id -> (data, timestamp)
_ID_RE = re.compile(r"^(\d{4}\.\d{4,5})")
_last_call = 0.0
_lock = threading.Lock()
MIN_INTERVAL = 1.1

def _clean_id(arxiv_id):
    m = _ID_RE.match(arxiv_id)
    return m.group(1) if m else arxiv_id


def _pace():
    global _last_call
    with _lock:
        wait = MIN_INTERVAL - (time.time() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.time()


def _fetch_batch(ids):
    """One request for many papers. Returns a list aligned with ids, or None on failure."""
    headers = {}
    key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
    if key:
        headers["x-api-key"] = key
    body = {"ids": [f"ARXIV:{i}" for i in ids]}

    for attempt in range(4):
        _pace()
        try:
            r = requests.post(
                BATCH_URL, params={"fields": FIELDS}, json=body,
                headers=headers, timeout=30,
            )
        except requests.RequestException as e:
            logger.warning("Semantic Scholar request error: %s", e)
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code == 200:
            return r.json()
        if r.status_code in (429, 500, 502, 503, 504):
            wait = int(r.headers.get("Retry-After", 2 * (attempt + 1)))
            logger.warning("Semantic Scholar %s (attempt %d), waiting %ss",
                           r.status_code, attempt + 1, wait)
            time.sleep(wait)
            continue
        logger.warning("Semantic Scholar %s: %s", r.status_code, r.text[:200])
        break
    return None


def enrich_with_citations(papers):
    now = time.time()
    clean = {p["id"]: _clean_id(p["id"]) for p in papers}
    todo = sorted({c for c in clean.values()
                   if c not in _cache or now - _cache[c][1] > CACHE_TTL})

    for i in range(0, len(todo), BATCH_SIZE):
        chunk = todo[i:i + BATCH_SIZE]
        results = _fetch_batch(chunk)
        if results is None:
            continue  # do NOT cache failures
        for cid, item in zip(chunk, results):
            # item is None when Semantic Scholar doesn't know the paper (common for brand-new ones)
            data = {
                "citation_count": (item or {}).get("citationCount") or 0,
                "influential_citation_count": (item or {}).get("influentialCitationCount") or 0,
            }
            _cache[cid] = (data, now)

    for p in papers:
        hit = _cache.get(clean[p["id"]])
        p["citation_data_available"] = hit is not None
        data = hit[0] if hit else {"citation_count": 0, "influential_citation_count": 0}
        p["citation_count"] = data["citation_count"]
        p["influential_citation_count"] = data["influential_citation_count"]
    return papers