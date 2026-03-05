"""Smoke tests for backend API endpoints."""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint_responds():
    """Smoke test: health endpoint returns 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_estimate_endpoint_accepts_minimal_payload():
    """Smoke test: /api/estimate accepts valid minimal payload."""
    payload = {
        "nodes": [
            {
                "id": "start-1",
                "type": "startNode",
                "label": "Start",
                "model_provider": None,
                "model_name": None,
                "context": None,
                "tool_id": None,
                "tool_category": None,
                "max_steps": None,
                "task_type": None,
                "expected_output_size": None,
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify response has expected structure
    assert "total_cost" in data
    assert "total_tokens" in data
    assert "total_latency" in data
    assert isinstance(data["total_cost"], (int, float))


def test_estimate_endpoint_returns_breakdown():
    """Smoke test: /api/estimate returns node breakdown for agent node."""
    payload = {
        "nodes": [
            {
                "id": "agent-1",
                "type": "agentNode",
                "label": "Test Agent",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o",
                "context": "short",
                "tool_id": None,
                "tool_category": None,
                "max_steps": 5,
                "task_type": "code_generation",
                "expected_output_size": "medium",
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Should have breakdown array
    assert "breakdown" in data
    assert len(data["breakdown"]) >= 1

    # First breakdown entry should be our agent
    breakdown = data["breakdown"][0]
    assert breakdown["node_id"] == "agent-1"
    assert breakdown["tokens"] > 0


def test_validate_schema_endpoint():
    """Valid schema passes validation."""
    payload = {
        "schema": {
            "type": "object",
            "properties": {
                "output": {"type": "string", "description": "Main output"}
            },
            "required": ["output"],
        }
    }
    response = client.post("/api/validate-schema", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["errors"] == []


def test_validate_schema_rejects_invalid():
    """Invalid schema is rejected with errors."""
    payload = {
        "schema": {
            "type": "string",  # not an object
            "properties": {},
        }
    }
    response = client.post("/api/validate-schema", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


def test_generate_schema_returns_fallback():
    """Generate schema returns fallback when no API key configured."""
    payload = {
        "description": "The workflow should produce a summary with sentiment score above 0.7"
    }
    response = client.post("/api/generate-schema", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "schema" in data
    assert data["schema"]["type"] == "object"
    assert "properties" in data["schema"]
