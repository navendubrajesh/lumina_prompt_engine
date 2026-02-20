"""
Pytest tests for Lumina Prompt Engine API.

Simulates Persona submission and verifies all engine results
are returned with scores. Run with: pytest backend/tests/test_main.py -v
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.engines.providers import ENGINES
from backend.main import app

client = TestClient(app)


# Sample persona for tests
SAMPLE_PERSONA = {
    "identity": "Senior data scientist at a fintech startup",
    "intent": "Extract structured insights from customer feedback",
    "output_format": "JSON with keys: sentiment, themes, action_items",
}


def test_health() -> None:
    """Health endpoint returns 200 OK."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generate_optimized_prompts_returns_engine_results() -> None:
    """
    POST /generate-optimized-prompts returns one result per registered engine with scores.

    Requires valid API keys in .env. If providers fail, some results may be empty
    but the endpoint should still return a valid structure.
    """
    response = client.post(
        "/generate-optimized-prompts",
        json=SAMPLE_PERSONA,
    )

    assert response.status_code == 200
    data = response.json()

    assert "persona" in data
    assert data["persona"]["identity"] == SAMPLE_PERSONA["identity"]
    assert data["persona"]["intent"] == SAMPLE_PERSONA["intent"]
    assert data["persona"]["output_format"] == SAMPLE_PERSONA["output_format"]

    assert "results" in data
    results = data["results"]
    expected = len(ENGINES)
    assert len(results) == expected, f"Expected {expected} engine results, got {len(results)}"

    for i, item in enumerate(results):
        assert "engine_output" in item
        assert "evaluation" in item
        assert "overall_score" in item

        eng = item["engine_output"]
        assert "engine_name" in eng
        assert "generated_prompt" in eng
        assert eng["engine_name"], f"Result {i}: engine_name must not be empty"

        ev = item["evaluation"]
        assert "contextual_alignment" in ev
        assert "instruction_clarity" in ev
        assert "constraint_adherence" in ev
        assert "robustness" in ev
        assert "efficiency" in ev
        for key in [
            "contextual_alignment_reasoning",
            "instruction_clarity_reasoning",
            "constraint_adherence_reasoning",
            "robustness_reasoning",
            "efficiency_reasoning",
        ]:
            assert key in ev

        assert 0.0 <= item["overall_score"] <= 1.0

    assert "summary" in data


def test_generate_rejects_invalid_persona() -> None:
    """Missing required Persona fields returns 422."""
    response = client.post(
        "/generate-optimized-prompts",
        json={"identity": "Only identity"},
    )
    assert response.status_code == 422
