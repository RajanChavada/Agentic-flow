"""Tests for the lightweight quick-estimate endpoint."""

from __future__ import annotations

import sys
import types
import asyncio

import httpx
import pytest


class _FakeEncoding:
    def encode(self, text: str):
        if not text:
            return []
        return text.split()


fake_tiktoken = types.ModuleType("tiktoken")
fake_tiktoken.get_encoding = lambda _name: _FakeEncoding()
sys.modules.setdefault("tiktoken", fake_tiktoken)

from estimator import count_tokens
from main import app
from pricing_registry import registry
from tool_registry import tool_registry


async def _post_quick_estimate(payload: dict) -> httpx.Response:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        return await client.post("/api/quick-estimate", json=payload)


def _expected_quick_estimate(provider: str, model: str, context: str, output_size: str, max_output_tokens=None, tools=None):
    model_entry = registry.get(provider, model)
    assert model_entry is not None

    midpoint_map = {
        "short": 100,
        "medium": 400,
        "long": 1050,
        "very_long": 2000,
    }
    output_tokens = midpoint_map[output_size]
    if max_output_tokens is not None:
        output_tokens = min(max_output_tokens, output_tokens)

    tool_schema_tokens = 0
    tool_response_tokens = 0
    tool_latency_ms = 0
    for tool_id in tools or []:
        tool_entry = tool_registry.get(tool_id)
        assert tool_entry is not None
        tool_schema_tokens += tool_entry.schema_tokens
        tool_response_tokens += tool_entry.avg_response_tokens
        tool_latency_ms += tool_entry.latency_ms

    input_tokens = count_tokens(context) + 500 + tool_schema_tokens + tool_response_tokens
    expected_cost = (
        (input_tokens / 1_000_000) * model_entry.input_per_million
        + (output_tokens / 1_000_000) * model_entry.output_per_million
    )
    expected_latency = int(round((output_tokens / model_entry.tokens_per_sec) * 1000)) + tool_latency_ms
    return expected_cost, expected_latency


def test_quick_estimate_accepts_aliases_and_returns_preview():
    payload = {
        "provider": "OpenAI",
        "model": "GPT-4o-mini",
        "context": "Estimate this short preview.",
        "expectedOutputSize": "medium",
    }

    response = asyncio.run(_post_quick_estimate(payload))

    assert response.status_code == 200
    data = response.json()

    expected_cost, expected_latency = _expected_quick_estimate(
        provider="OpenAI",
        model="GPT-4o-mini",
        context="Estimate this short preview.",
        output_size="medium",
    )

    assert data["cost_per_call"] == pytest.approx(expected_cost, rel=0, abs=1e-9)
    assert data["latency_ms"] == expected_latency


def test_quick_estimate_includes_tool_impacts_and_max_output_clamp():
    payload = {
        "model_provider": "Anthropic",
        "model_name": "Claude-3.5-Sonnet",
        "context": "Use tools in the preview.",
        "expected_output_size": "long",
        "maxOutputTokens": 250,
        "tools": [
            {"toolId": "mcp_web_search"},
            {"id": "redis"},
        ],
    }

    response = asyncio.run(_post_quick_estimate(payload))

    assert response.status_code == 200
    data = response.json()

    expected_cost, expected_latency = _expected_quick_estimate(
        provider="Anthropic",
        model="Claude-3.5-Sonnet",
        context="Use tools in the preview.",
        output_size="long",
        max_output_tokens=250,
        tools=["mcp_web_search", "redis"],
    )

    assert data["cost_per_call"] == pytest.approx(expected_cost, rel=0, abs=1e-9)
    assert data["latency_ms"] == expected_latency


def test_quick_estimate_rejects_unknown_tool():
    payload = {
        "model_provider": "OpenAI",
        "model_name": "GPT-4o-mini",
        "context": "",
        "expected_output_size": "short",
        "tools": ["does-not-exist"],
    }

    response = asyncio.run(_post_quick_estimate(payload))

    assert response.status_code == 404
    assert "Tool 'does-not-exist' not found" in response.json()["detail"]
