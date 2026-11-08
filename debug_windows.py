import logging
logging.disable(logging.CRITICAL)
from collections import Counter
from backend.data_fetch import fetch_papers
from backend.time_windows import compute_time_windows
from backend.tfidf_scoring import compute_tfidf_scores
from backend.velocity import compute_velocity
from ml.topic_modeling import run_topic_modeling

papers = fetch_papers("graph neural networks")
print("papers:", len(papers))
papers = compute_time_windows(papers, window_weeks=1, granularity="weekly")
print("window values:", sorted(Counter(str(p.get("window")) for p in papers).items())[:30])
print("n windows:", len({p.get("window") for p in papers}))
papers, topic_map = run_topic_modeling(papers)
print("topic_map:", topic_map)
t = compute_tfidf_scores(papers)
print("tfidf:", type(t).__name__, getattr(t, "shape", None))
print(t.head(10) if hasattr(t, "head") else t)
v = compute_velocity(t)
print("velocity:", v[:3] if isinstance(v, list) else v)