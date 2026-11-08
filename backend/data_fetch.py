import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone

import feedparser
import requests

logger = logging.getLogger(__name__)

BASE_URL = "https://export.arxiv.org/api/query"
HEADERS = {"User-Agent": "PaperMind/1.0 (research trend tool)"}
LOOKBACK_DAYS = int(os.getenv("LOOKBACK_DAYS", 180))
MAX_RESULTS = int(os.getenv("MAX_RESULTS", 150))


def _build_query(query):
    terms = re.findall(r"[A-Za-z0-9+\-]+", query)
    if not terms:
        raise ValueError("Query has no searchable words.")
    return " AND ".join(f"all:{t}" for t in terms)


def fetch_papers(query, max_results=None):
    max_results = max_results or MAX_RESULTS
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=LOOKBACK_DAYS)
    date_filter = f"submittedDate:[{start:%Y%m%d}0000 TO {end:%Y%m%d}2359]"

    params = {
        "search_query": f"({_build_query(query)}) AND {date_filter}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    response = None
    for attempt in range(3):
        try:
            response = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=30)
            if response.status_code in (429, 503):
                logger.warning("arXiv %s, retrying", response.status_code)
                time.sleep(3 * (attempt + 1))
                continue
            response.raise_for_status()
            break
        except requests.RequestException:
            logger.exception("arXiv request failed (attempt %d)", attempt + 1)
            time.sleep(3 * (attempt + 1))
    else:
        raise RuntimeError("arXiv API is unavailable right now. Try again later.")

    feed = feedparser.parse(response.text)
    papers = []
    for entry in feed.entries:
        try:
            papers.append({
                "id": entry.id.split("/")[-1],
                "title": entry.title.replace("\n", " ").strip(),
                "abstract": entry.summary.replace("\n", " ").strip(),
                "authors": [a.name for a in getattr(entry, "authors", [])],
                "published_date": datetime.strptime(entry.published, "%Y-%m-%dT%H:%M:%SZ"),
                "topic_id": -1,
                "citation_count": None,
                "influential_citation_count": None,
                "window": None,
            })
        except Exception:
            logger.warning("Skipping malformed arXiv entry: %s", getattr(entry, "id", "?"))
    logger.info("[FETCH] query=%r -> %d papers", query, len(papers))
    return papers