"""FastAPI application – Agentic Workflow Analyzer backend."""

from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGIN
from models import (
    WorkflowRequest,
    WorkflowEstimation,
    BatchEstimateRequest,
    BatchEstimateResponse,
    BatchEstimateResult,
    ProviderSummary,
    ProviderModelsResponse,
    ModelInfo,
    ToolInfo,
    ToolCategoryInfo,
    ToolCategoryDetailedInfo,
)
from estimator import estimate_workflow
from pricing_registry import registry
from tool_registry import tool_registry

app = FastAPI(
    title="Agentic Workflow Analyzer",
    description="Estimates token usage, cost, and latency for agentic workflows.",
    version="0.2.0",
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Estimation ──────────────────────────────────────────────────

@app.post("/api/estimate", response_model=WorkflowEstimation)
async def estimate(request: WorkflowRequest):
    """Accept a workflow graph and return token/cost/latency estimates."""
    return estimate_workflow(
        request.nodes,
        request.edges,
        recursion_limit=request.recursion_limit or 25,
    )


@app.post("/api/estimate/batch", response_model=BatchEstimateResponse)
async def estimate_batch(request: BatchEstimateRequest):
    """Estimate multiple workflows in one request for scenario comparison."""
    results = []
    for wf in request.workflows:
        est = estimate_workflow(
            wf.nodes,
            wf.edges,
            recursion_limit=wf.recursion_limit or 25,
        )
        results.append(BatchEstimateResult(
            id=wf.id,
            name=wf.name,
            graph_type=est.graph_type,
            total_tokens=est.total_tokens,
            total_cost=est.total_cost,
            total_latency=est.total_latency,
            total_tool_latency=est.total_tool_latency,
            node_count=len(wf.nodes),
            edge_count=len(wf.edges),
            token_range=est.token_range,
            cost_range=est.cost_range,
            latency_range=est.latency_range,
            detected_cycles=len(est.detected_cycles),
        ))
    return BatchEstimateResponse(results=results)


# ── Provider & Model Registry ──────────────────────────────────

@app.get("/api/providers", response_model=list[ProviderSummary])
async def get_providers():
    """Return a list of supported providers with model counts."""
    return [
        ProviderSummary(
            id=p.id,
            name=p.name,
            model_count=len(p.models),
        )
        for p in registry.get_providers()
    ]


@app.get("/api/providers/detailed", response_model=list[ProviderModelsResponse])
async def get_providers_detailed():
    """Return all providers with full model listings (for frontend dropdowns)."""
    return [
        ProviderModelsResponse(
            id=p.id,
            name=p.name,
            models=[
                ModelInfo(**m.model_dump())
                for m in p.models
            ],
        )
        for p in registry.get_providers()
    ]


@app.get("/api/models")
async def get_models(
    provider: Optional[str] = Query(None, description="Filter by provider id"),
    family: Optional[str] = Query(None, description="Filter by model family"),
):
    """Return a flat list of all models with pricing.

    Accepts optional query filters: ?provider=OpenAI&family=reasoning
    """
    return registry.get_all_models(provider=provider, family=family)


@app.get("/api/models/{provider}/{model}", response_model=ModelInfo)
async def get_model(provider: str, model: str):
    """Return config + pricing for a specific model."""
    entry = registry.get(provider, model)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model}' not found for provider '{provider}'",
        )
    return ModelInfo(**entry.model_dump())


@app.get("/api/pricing")
async def pricing():
    """Return the full pricing registry (backward‑compatible convenience endpoint)."""
    return {
        "version": registry.version,
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "models": [m.model_dump() for m in p.models],
            }
            for p in registry.get_providers()
        ],
    }


# ── Tool Registry ──────────────────────────────────────────────

@app.get("/api/tools/categories", response_model=list[ToolCategoryInfo])
async def get_tool_categories():
    """Return a list of tool categories with tool counts."""
    return [
        ToolCategoryInfo(
            id=cat.id,
            name=cat.name,
            tool_count=len(cat.tools),
        )
        for cat in tool_registry.get_categories()
    ]


@app.get("/api/tools/categories/detailed", response_model=list[ToolCategoryDetailedInfo])
async def get_tool_categories_detailed():
    """Return all categories with full tool listings (for frontend dropdowns)."""
    return [
        ToolCategoryDetailedInfo(
            id=cat.id,
            name=cat.name,
            tools=[
                ToolInfo(**t.model_dump())
                for t in cat.tools
            ],
        )
        for cat in tool_registry.get_categories()
    ]


@app.get("/api/tools")
async def get_tools(
    category: Optional[str] = Query(None, description="Filter by category id"),
):
    """Return a flat list of all tools with metadata."""
    return tool_registry.get_all_tools(category=category)


@app.get("/api/tools/{tool_id}", response_model=ToolInfo)
async def get_tool(tool_id: str):
    """Return metadata for a specific tool."""
    entry = tool_registry.get(tool_id)
    if entry is None:
        raise HTTPException(
            status_code=404,
            detail=f"Tool '{tool_id}' not found",
        )
    return ToolInfo(**entry.model_dump())


# ── Entrypoint (for `python main.py`) ──────────────────────────
if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT

    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
