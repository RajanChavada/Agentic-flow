"""Smoke tests for backend API endpoints."""
import asyncio

import httpx

from main import app


async def _request(method: str, url: str, **kwargs) -> httpx.Response:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        return await client.request(method, url, **kwargs)


def test_health_endpoint_responds():
    """Smoke test: health endpoint returns 200."""
    response = asyncio.run(_request("GET", "/health"))
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

    response = asyncio.run(_request("POST", "/api/estimate", json=payload))

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

    response = asyncio.run(_request("POST", "/api/estimate", json=payload))

    assert response.status_code == 200
    data = response.json()

    # Should have breakdown array
    assert "breakdown" in data
    assert len(data["breakdown"]) >= 1

    # First breakdown entry should be our agent
    breakdown = data["breakdown"][0]
    assert breakdown["node_id"] == "agent-1"
    assert breakdown["tokens"] > 0


def test_estimate_endpoint_returns_graph_preprocessing():
    """Smoke test: /api/estimate returns graph preprocessing summary."""
    payload = {
        "nodes": [
            {
                "id": "start",
                "type": "startNode",
                "label": "Start",
            },
            {
                "id": "fork",
                "type": "agentNode",
                "label": "Fork",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "branch",
                "max_steps": 3,
                "task_type": "routing",
                "expected_output_size": "short",
            },
            {
                "id": "left",
                "type": "agentNode",
                "label": "Left",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "left",
                "max_steps": 3,
                "task_type": "classification",
                "expected_output_size": "short",
            },
            {
                "id": "right",
                "type": "agentNode",
                "label": "Right",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "right",
                "max_steps": 3,
                "task_type": "classification",
                "expected_output_size": "short",
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "fork"},
            {"id": "e2", "source": "fork", "target": "left"},
            {"id": "e3", "source": "fork", "target": "right"},
            {"id": "e4", "source": "right", "target": "fork"},
        ],
    }

    response = asyncio.run(_request("POST", "/api/estimate", json=payload))

    assert response.status_code == 200
    data = response.json()

    assert "graph" in data
    assert "forks" in data["graph"]
    assert "cycles" in data["graph"]
    assert "topological_order" in data["graph"]
    assert data["graph"]["forks"]["fork"] == ["left", "right"]
    assert data["graph"]["cycles"] == [["right", "fork"]]
    assert data["graph"]["topological_order"][0] == "start"


def test_estimate_endpoint_returns_context_accumulation():
    """Smoke test: /api/estimate returns accumulated context details."""
    payload = {
        "nodes": [
            {
                "id": "start",
                "type": "startNode",
                "label": "Start",
            },
            {
                "id": "agent-a",
                "type": "agentNode",
                "label": "Agent A",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "seed context",
                "task_type": "summarization",
                "expected_output_size": "short",
            },
            {
                "id": "agent-b",
                "type": "agentNode",
                "label": "Agent B",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "follow up",
                "task_type": "summarization",
                "expected_output_size": "short",
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "agent-a"},
            {"id": "e2", "source": "agent-a", "target": "agent-b"},
        ],
    }

    response = asyncio.run(_request("POST", "/api/estimate", json=payload))

    assert response.status_code == 200
    data = response.json()

    assert data["context_accumulation"] is not None
    report = data["context_accumulation"]
    assert "breakdown" in report
    assert len(report["breakdown"]) == 1
    row = report["breakdown"][0]
    assert row["node_id"] == "agent-b"
    assert row["ancestor_token_contribution"] > 0
    breakdown = {row["node_id"]: row for row in data["breakdown"]}
    assert breakdown["agent-b"]["ancestor_tokens"] == row["ancestor_token_contribution"]
    assert breakdown["agent-b"]["tool_tokens"] >= 0
    assert breakdown["agent-b"]["total_input_tokens"] >= breakdown["agent-b"]["input_tokens"]


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
    response = asyncio.run(_request("POST", "/api/validate-schema", json=payload))
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
    response = asyncio.run(_request("POST", "/api/validate-schema", json=payload))
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


def test_generate_schema_returns_fallback():
    """Generate schema returns fallback when no API key configured."""
    payload = {
        "description": "The workflow should produce a summary with sentiment score above 0.7"
    }
    response = asyncio.run(_request("POST", "/api/generate-schema", json=payload))
    assert response.status_code == 200
    data = response.json()
    assert "schema" in data
    assert data["schema"]["type"] == "object"
    assert "properties" in data["schema"]
