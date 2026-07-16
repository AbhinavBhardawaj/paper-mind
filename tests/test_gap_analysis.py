"""Tests for ml/gap_analysis.py"""
import json
import os
from unittest.mock import MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_TOPICS = [
    {"topic": "transformer efficiency", "velocity": 0.9},
    {"topic": "multimodal learning", "velocity": 0.75},
    {"topic": "retrieval augmented generation", "velocity": 0.6},
]

SAMPLE_GAPS_JSON = json.dumps([
    {
        "title": "Gap 1",
        "description": "Desc 1",
        "why_it_matters": "Matters because A",
        "potential_research_question": "RQ 1?",
        "related_keywords": ["kw1", "kw2"],
    },
    {
        "title": "Gap 2",
        "description": "Desc 2",
        "why_it_matters": "Matters because B",
        "potential_research_question": "RQ 2?",
        "related_keywords": ["kw3", "kw4"],
    },
    {
        "title": "Gap 3",
        "description": "Desc 3",
        "why_it_matters": "Matters because C",
        "potential_research_question": "RQ 3?",
        "related_keywords": ["kw5", "kw6"],
    },
])


def _make_mock_response(text):
    mock_resp = MagicMock()
    mock_resp.text = text
    return mock_resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestGenerateResearchGaps:

    def test_returns_list_of_dicts_on_success(self):
        """Happy-path: valid JSON array returned by the model."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
             patch("ml.gap_analysis.genai.Client") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.models.generate_content.return_value = _make_mock_response(SAMPLE_GAPS_JSON)

            from ml.gap_analysis import generate_research_gaps
            # Reset cached client so the mock is used
            import ml.gap_analysis as ga
            ga._client = None

            result = generate_research_gaps(SAMPLE_TOPICS)

        assert isinstance(result, list)
        assert len(result) == 3
        for gap in result:
            assert "title" in gap
            assert "description" in gap
            assert "potential_research_question" in gap
            assert "related_keywords" in gap

    def test_strips_markdown_fences(self):
        """Model wraps output in ```json ... ``` — should still parse cleanly."""
        fenced = f"```json\n{SAMPLE_GAPS_JSON}\n```"
        with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
             patch("ml.gap_analysis.genai.Client") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.models.generate_content.return_value = _make_mock_response(fenced)

            import ml.gap_analysis as ga
            ga._client = None

            result = ga.generate_research_gaps(SAMPLE_TOPICS)

        assert isinstance(result, list)
        assert len(result) == 3

    def test_returns_empty_list_for_empty_input(self):
        """No topics → no API call, empty list returned."""
        import ml.gap_analysis as ga
        ga._client = None

        result = ga.generate_research_gaps([])
        assert result == []

    def test_returns_error_dict_on_api_failure(self):
        """If the Gemini call raises, the error is surfaced gracefully."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
             patch("ml.gap_analysis.genai.Client") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.models.generate_content.side_effect = RuntimeError("network error")

            import ml.gap_analysis as ga
            ga._client = None

            result = ga.generate_research_gaps(SAMPLE_TOPICS)

        assert isinstance(result, list)
        assert len(result) == 1
        assert "error" in result[0]
        assert "network error" in result[0]["error"]

    def test_raises_on_missing_api_key(self):
        """EnvironmentError when GEMINI_API_KEY is absent — surfaced as error dict."""
        env = {k: v for k, v in os.environ.items() if k != "GEMINI_API_KEY"}
        with patch.dict(os.environ, env, clear=True):
            import ml.gap_analysis as ga
            ga._client = None

            result = ga.generate_research_gaps(SAMPLE_TOPICS)

        assert isinstance(result, list)
        assert len(result) == 1
        assert "error" in result[0]
        assert "GEMINI_API_KEY" in result[0]["error"]

    def test_accepts_string_input(self):
        """accelerating_topics can be a pre-formatted string."""
        with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key"}), \
             patch("ml.gap_analysis.genai.Client") as MockClient:
            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.models.generate_content.return_value = _make_mock_response(SAMPLE_GAPS_JSON)

            import ml.gap_analysis as ga
            ga._client = None

            result = ga.generate_research_gaps("topic A, topic B, topic C")

        assert isinstance(result, list)