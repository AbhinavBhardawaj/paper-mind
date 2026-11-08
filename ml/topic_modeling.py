import logging

from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer, ENGLISH_STOP_WORDS
from umap import UMAP
from hdbscan import HDBSCAN

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

RESEARCH_STOP_WORDS = {
    "et", "al", "figure", "method", "paper", "result",
    "approach", "study", "dataset", "model", "learning",
}
ALL_STOP_WORDS = set(ENGLISH_STOP_WORDS) | RESEARCH_STOP_WORDS


def run_topic_modeling(papers):
    abstracts = [(p.get("abstract") or p.get("title") or "").strip() for p in papers]
    n = len(abstracts)

    umap_model = UMAP(
        n_neighbors=max(3, min(15, n - 1)),
        n_components=max(2, min(5, n - 1)),
        min_dist=0.0, metric="cosine", random_state=42, init="random",
    )
    size = max(2, min(15, n // 10))
    hdbscan_model = HDBSCAN(
        min_cluster_size=size, min_samples=1,
        metric="euclidean", prediction_data=True,
    )
    vectorizer_model = CountVectorizer(
        stop_words=list(ALL_STOP_WORDS),
        ngram_range=(1, 2), min_df=1, max_df=1.0, max_features=500,
    )
    topic_model = BERTopic(
        embedding_model=EMBEDDING_MODEL,
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        min_topic_size=size,
        verbose=False,
    )

    try:
        topics, _ = topic_model.fit_transform(abstracts)
    except Exception:
        logger.exception("[TOPICS] BERTopic failed; falling back to a single topic")
        for p in papers:
            p["topic_id"] = 0
        return papers, {0: ["general"]}

    if len(topics) != n:
        raise ValueError(f"Topic count {len(topics)} does not match paper count {n}")

    for p, t in zip(papers, topics):
        p["topic_id"] = int(t)

    topic_labels = {}
    for topic_id in topic_model.get_topics():
        if topic_id == -1:
            continue
        words = [w for w, _ in topic_model.get_topic(topic_id)]
        keywords = [w for w in words if w.lower() not in ALL_STOP_WORDS][:5] or words[:5]
        topic_labels[int(topic_id)] = keywords

    return papers, topic_labels


def warmup():
    """Run a tiny job once so numba compilation doesn't hit the first real request."""
    try:
        docs = [f"sample abstract {i} about topic {i % 3} neural networks training data"
                for i in range(20)]
        run_topic_modeling([{"abstract": d} for d in docs])
        logger.info("[TOPICS] warmup complete")
    except Exception:
        logger.exception("[TOPICS] warmup failed")