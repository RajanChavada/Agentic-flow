"""Single-node quick estimate helper for live preview cards."""

from __future__ import annotations

from typing import Iterable

from fastapi import HTTPException

from estimator import count_tokens
from models import QuickEstimateRequest, QuickEstimateResponse, QuickEstimateToolRef
from pricing_registry import registry
from tool_registry import tool_registry


# The endpoint uses a fixed preview baseline rather than the full workflow engine.
_ASSUMED_INPUT_TOKENS = 500

# Range midpoints for the configured output-size dropdown.
# "very_long" is open-ended in the UI, so we use a conservative preview midpoint.
_OUTPUT_MIDPOINTS = {
    "short": 100,
    "medium": 400,
    "long": 1050,
    "very_long": 2000,
}


def _tool_id_from_ref(tool: str | QuickEstimateToolRef) -> str:
    if isinstance(tool, QuickEstimateToolRef):
        return tool.tool_id
    return tool


def _unique_tool_ids(tools: Iterable[str | QuickEstimateToolRef]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for tool in tools:
        tool_id = _tool_id_from_ref(tool)
        if tool_id not in seen:
            seen.add(tool_id)
            ordered.append(tool_id)
    return ordered


def quick_estimate(request: QuickEstimateRequest) -> QuickEstimateResponse:
    """Return a lightweight single-node cost / latency preview."""
    model = registry.get(request.model_provider, request.model_name)
    if model is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Model '{request.model_name}' not found for provider "
                f"'{request.model_provider}'"
            ),
        )

    output_tokens = _OUTPUT_MIDPOINTS.get(request.expected_output_size or "medium", 400)
    if request.max_output_tokens is not None:
        output_tokens = min(request.max_output_tokens, output_tokens)

    system_tokens = count_tokens(request.context or "")
    tool_schema_tokens = 0
    tool_response_tokens = 0
    tool_latency_ms = 0

    for tool_id in _unique_tool_ids(request.tools):
        tool_def = tool_registry.get(tool_id)
        if tool_def is None:
            raise HTTPException(
                status_code=404,
                detail=f"Tool '{tool_id}' not found",
            )
        tool_schema_tokens += tool_def.schema_tokens
        tool_response_tokens += tool_def.avg_response_tokens
        tool_latency_ms += tool_def.latency_ms

    input_tokens = system_tokens + _ASSUMED_INPUT_TOKENS + tool_schema_tokens + tool_response_tokens
    cost = (
        (input_tokens / 1_000_000) * model.input_per_million
        + (output_tokens / 1_000_000) * model.output_per_million
    )
    latency_ms = int(round((output_tokens / model.tokens_per_sec) * 1000)) + tool_latency_ms

    return QuickEstimateResponse(
        cost_per_call=round(cost, 8),
        latency_ms=latency_ms,
    )
