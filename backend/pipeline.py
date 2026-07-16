import time
import logging
from backend.data_fetch import fetch_papers
from backend.citation_fetch import enrich_with_citations
from backend.time_windows import compute_time_windows
from backend.tfidf_scoring import compute_tfidf_scores
from backend.velocity import compute_velocity
from backend.citation_velocity import compute_citation_velocity
from backend.momentum import compute_momentum
from backend.forecasting import forecast_topics
from backend.trend_analysis import get_top_accelerating

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from ml.topic_modeling import run_topic_modeling
except ImportError:
    run_topic_modeling=None

try:
    from ml.gap_analysis import generate_research_gaps
except ImportError:
    generate_research_gaps=None

def timed_operation(name):
    """Decorator to log timing of operations"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger.info(f"[PIPELINE] Starting: {name}")
            start = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start
                logger.info(f"[PIPELINE] Completed {name} in {elapsed:.2f}s")
                return result
            except Exception as e:
                elapsed = time.time() - start
                logger.error(f"[PIPELINE] Failed {name} after {elapsed:.2f}s: {str(e)}", exc_info=True)
                raise
        return wrapper
    return decorator

def run_pipeline(query):

    if run_topic_modeling is None:
        raise NotImplementedError(
            "run_topic_modeling() is not implemented yet."
        )

    pipeline_start = time.time()
    logger.info(f"[PIPELINE] START: query='{query}'")

    # Step 1: Fetch papers
    logger.info("[PIPELINE] Step 1: Fetching papers...")
    step_start = time.time()
    papers=fetch_papers(query)
    logger.info(f"[PIPELINE] Fetched {len(papers)} papers in {time.time() - step_start:.2f}s")

    # Step 2: Enrich with citations
    logger.info("[PIPELINE] Step 2: Enriching with citations...")
    step_start = time.time()
    papers=enrich_with_citations(papers)
    logger.info(f"[PIPELINE] Enriched papers in {time.time() - step_start:.2f}s")

    # Step 3: Compute time windows
    logger.info("[PIPELINE] Step 3: Computing time windows...")
    step_start = time.time()
    papers=compute_time_windows(
        papers,
        window_weeks=1,  # 1 week windows for granular temporal resolution
        granularity="weekly"  # Apply weekly granularity so window_weeks actually takes effect
    )
    logger.info(f"[PIPELINE] Time windows computed in {time.time() - step_start:.2f}s")

    # Step 4: Run topic modeling
    logger.info("[PIPELINE] Step 4: Running topic modeling (BERTopic)...")
    step_start = time.time()
    papers,topic_map=run_topic_modeling(
        papers
    )
    logger.info(f"[PIPELINE] Topic modeling completed in {time.time() - step_start:.2f}s")
    logger.info(f"[PIPELINE] Found {len(topic_map)} topics")

    # Step 5: Compute TFIDF
    logger.info("[PIPELINE] Step 5: Computing TFIDF scores...")
    step_start = time.time()
    tfidf_matrix=compute_tfidf_scores(
        papers
    )
    logger.info(f"[PIPELINE] TFIDF computed in {time.time() - step_start:.2f}s")

    # Step 6: Compute velocity
    logger.info("[PIPELINE] Step 6: Computing velocity...")
    step_start = time.time()
    velocity=compute_velocity(
        tfidf_matrix
    )
    logger.info(f"[PIPELINE] Velocity computed in {time.time() - step_start:.2f}s ({len(velocity)} topics)")

    # Step 7: Compute citation velocity
    logger.info("[PIPELINE] Step 7: Computing citation velocity...")
    step_start = time.time()
    citation_velocity=compute_citation_velocity(
        papers,
        min_age_days=0
    )
    logger.info(f"[PIPELINE] Citation velocity computed in {time.time() - step_start:.2f}s ({len(citation_velocity)} topics)")

    # Step 8: Compute momentum
    logger.info("[PIPELINE] Step 8: Computing momentum...")
    step_start = time.time()
    momentum=compute_momentum(
        velocity,
        citation_velocity
    )
    logger.info(f"[PIPELINE] Momentum computed in {time.time() - step_start:.2f}s ({len(momentum)} topics)")

    # Step 9: Forecast topics
    logger.info("[PIPELINE] Step 9: Forecasting topics...")
    step_start = time.time()
    forecast=forecast_topics(
        tfidf_matrix,
        horizon_windows=4  # Forecast 4 weeks ahead (1 month)
    )
    logger.info(f"[PIPELINE] Forecast computed in {time.time() - step_start:.2f}s ({len(forecast)} topics)")

    # Step 10: Get top accelerating
    logger.info("[PIPELINE] Step 10: Computing top accelerating...")
    step_start = time.time()
    top_accelerating=get_top_accelerating(
        velocity,
        topic_map,
        n=5
    )
    logger.info(f"[PIPELINE] Top accelerating computed in {time.time() - step_start:.2f}s ({len(top_accelerating)} topics)")

    # Step 11: Prepare response
    logger.info("[PIPELINE] Step 11: Preparing response...")
    step_start = time.time()
    serializable_papers=[]
    for p in papers:
        published_date = p.get("published_date")
        serializable_papers.append({
            **p,
            "published_date":
                published_date.isoformat()
                if hasattr(published_date, "isoformat")
                else published_date
        })

    response = {
        "papers":serializable_papers,
        "topic_map":topic_map,
        "tfidf_matrix":tfidf_matrix.to_dict(
            orient="records"
        ),
        "velocity":velocity,
        "citation_velocity":citation_velocity,
        "momentum":momentum,
        "forecast":forecast,
        "top_accelerating":top_accelerating

    }
    logger.info(f"[PIPELINE] Response prepared in {time.time() - step_start:.2f}s")

    total_elapsed = time.time() - pipeline_start
    logger.info(f"[PIPELINE] COMPLETE in {total_elapsed:.2f}s total")
    logger.info(f"[PIPELINE] Response keys: {list(response.keys())}")

    return response
