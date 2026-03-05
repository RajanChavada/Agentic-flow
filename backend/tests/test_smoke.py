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
