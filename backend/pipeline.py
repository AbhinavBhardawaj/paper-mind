import logging
import os
import time

from backend.data_fetch import fetch_papers
from backend.citation_fetch import enrich_with_citations
from backend.time_windows import compute_time_windows
from backend.tfidf_scoring import compute_tfidf_scores
from backend.velocity import compute_velocity
from backend.citation_velocity import compute_citation_velocity
from backend.momentum import compute_momentum
from backend.forecasting import forecast_topics
from backend.trend_analysis import get_top_accelerating
from ml.topic_modeling import run_topic_modeling

logger = logging.getLogger(__name__)

try:
    from ml.gap_analysis import generate_research_gaps
except Exception:
    logger.exception("[PIPELINE] gap_analysis unavailable; research gaps disabled")
    generate_research_gaps = None

MIN_PAPERS = int(os.getenv("MIN_PAPERS", 10))


def _step(name, fn, *args, **kwargs):
    logger.info("[PIPELINE] %s ...", name)
    start = time.time()
    try:
        result = fn(*args, **kwargs)
    except Exception:
        logger.exception("[PIPELINE] %s FAILED after %.2fs", name, time.time() - start)
        raise
    logger.info("[PIPELINE] %s done in %.2fs", name, time.time() - start)
    return result


def _iso(d):
    if d is None or d != d:
        return None
    return d.isoformat() if hasattr(d, "isoformat") else d


def run_pipeline(query):
    t0 = time.time()
    warnings = []
    logger.info("[PIPELINE] START query=%r", query)

    papers = _step("fetch_papers", fetch_papers, query)
    if len(papers) < MIN_PAPERS:
        raise ValueError(
            f"Only {len(papers)} papers found for '{query}'. "
            f"Try a broader query (need at least {MIN_PAPERS})."
        )

    try:
        papers = _step("enrich_with_citations", enrich_with_citations, papers)
        if not all(p.get("citation_data_available") for p in papers):
            warnings.append("citation_data_unavailable")
    except Exception:
        warnings.append("citation_data_unavailable")

    papers = _step(
        "compute_time_windows", compute_time_windows,
        papers, window_weeks=1, granularity="weekly",
    )

    papers, topic_map = _step("topic_modeling", run_topic_modeling, papers)

    tfidf_matrix = _step("tfidf", compute_tfidf_scores, papers)
    velocity = _step("velocity", compute_velocity, tfidf_matrix)
    citation_velocity = _step(
        "citation_velocity", compute_citation_velocity, papers, min_age_days=0
    )
    momentum = _step("momentum", compute_momentum, velocity, citation_velocity)
    # Time windows are weekly, so 26 steps gives an approximately six-month horizon.
    forecast = _step("forecast", forecast_topics, tfidf_matrix, horizon_windows=26)
    top_accelerating = _step(
        "top_accelerating", get_top_accelerating, velocity, topic_map, n=5
    )

    # Research ideas (Gemini): optional, never sends error details to the client
    research_gaps = []
    if generate_research_gaps is None or not os.getenv("GEMINI_API_KEY"):
        warnings.append("research_gaps_disabled")
    else:
        try:
            research_gaps = _step(
                "research_gaps", generate_research_gaps,
                top_accelerating, query=query, papers=papers,
            )
        except Exception:
            warnings.append("research_gaps_failed")

    serializable_papers = [
        {**p, "published_date": _iso(p.get("published_date"))} for p in papers
    ]

    logger.info("[PIPELINE] COMPLETE in %.2fs", time.time() - t0)
    return {
        "papers": serializable_papers,
        "topic_map": topic_map,
        "tfidf_matrix": tfidf_matrix.to_dict(orient="records"),
        "velocity": velocity,
        "citation_velocity": citation_velocity,
        "momentum": momentum,
        "forecast": forecast,
        "top_accelerating": top_accelerating,
        "research_gaps": research_gaps,
        "warnings": warnings,
    }
