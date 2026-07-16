import os
import json
import re
import logging
from google import genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazily initialise the Gemini client so import-time errors are surfaced
    only when the function is actually called."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. "
                "Add it to your .env file or export it as an environment variable."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def generate_research_gaps(accelerating_topics):

    """Identify research gaps from a list of accelerating topics.
    Args:
        accelerating_topics: list of dicts or a formatted string describing
                             the top accelerating research topics.
    Returns:
        A list of dicts, each with keys:
            title, description, why_it_matters,
            potential_research_question, related_keywords
        Falls back to [{"error": "<message>"}] on failure.
    """
    if not accelerating_topics:
        logger.warning("[GAP_ANALYSIS] No accelerating topics provided.")
        return []
    
     # Accept either a list/dict or a pre-formatted string
    if isinstance(accelerating_topics, (list, dict)):
        topics_text = json.dumps(accelerating_topics, indent=2)
    else:
        topics_text = str(accelerating_topics)
    
    prompt = f"""You are a senior research scientist analysing the cutting edge of academic research.
        Below are the top accelerating research topics extracted from recent papers:

        {topics_text}

        Identify exactly 3 research gap opportunities. For each opportunity return a JSON object with these fields:
        - "title": short descriptive title
        - "description": 2-3 sentence description of the gap
        - "why_it_matters": why closing this gap is important
        - "potential_research_question": a concrete, answerable research question
        - "related_keywords": list of 3-5 relevant keywords

        Respond with ONLY a valid JSON array containing exactly 3 objects. No markdown fences, no extra text.
    """

    try:
        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt,
        )

        raw = response.text.strip()

        # Strip optional markdown code fences that the model sometimes adds
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        gaps = json.loads(raw)

        if not isinstance(gaps, list):
            raise ValueError(f"Expected a JSON array, got {type(gaps).__name__}")

        logger.info(f"[GAP_ANALYSIS] Generated {len(gaps)} research gap(s).")
        return gaps
    
    except json.JSONDecodeError as exc:
        logger.error(f"[GAP_ANALYSIS] Failed to parse JSON response: {exc}")
        return [{"error": f"JSON parse error: {exc}", "raw_response": raw}]
    except Exception as exc:
        logger.error(f"[GAP_ANALYSIS] Error calling Gemini API: {exc}", exc_info=True)
        return [{"error": str(exc)}]