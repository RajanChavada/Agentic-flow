"""FastAPI application – Neurovn backend."""

import os
import resource
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGINS
from models import (
    WorkflowRequest,
    WorkflowEstimation,
    BatchEstimateRequest,
    BatchEstimateResponse,
    BatchEstimateResult,
    QuickEstimateRequest,
    QuickEstimateResponse,
    ProviderSummary,
    ProviderModelsResponse,
    ModelInfo,
    ToolInfo,
    ToolCategoryInfo,
    ToolCategoryDetailedInfo,
    ExternalWorkflowImportRequest,
    ImportedWorkflow,
    LangGraphExportRequest,
    LangGraphExportResponse,
    ModelRequestPayload,
)
from estimator import estimate_workflow, compute_graph_complexity
from quick_estimate import quick_estimate
from pricing_registry import registry
from tool_registry import tool_registry
from import_adapters import get_adapter

app = FastAPI(
    title="Neurovn",
    description="Estimates token usage, cost, and latency for AI workflows.",
    version="0.2.0",
)

# ── CORS ────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def limit_memory(request, call_next):
    # Soft limit 450MB — leaves headroom on Render's 512MB plan
    soft = 450 * 1024 * 1024
    try:
        resource.setrlimit(resource.RLIMIT_AS, (soft, resource.RLIM_INFINITY))
    except Exception:
        pass
    return await call_next(request)


# ── Health ──────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Estimation ──────────────────────────────────────────────────

import logging
logger = logging.getLogger("uvicorn.error")

@app.post("/api/estimate", response_model=WorkflowEstimation)
async def estimate(request: WorkflowRequest):
    """Accept a workflow graph and return token/cost/latency estimates."""
    logger.info(f"Received estimation request with {len(request.nodes)} nodes and {len(request.edges)} edges.")
    try:
        return estimate_workflow(
            request.nodes,
            request.edges,
            recursion_limit=request.recursion_limit or 25,
            runs_per_day=request.runs_per_day,
            loop_intensity=request.loop_intensity,
        )
    except Exception as e:
        logger.error(f"Error in /api/estimate: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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


@app.post("/api/quick-estimate", response_model=QuickEstimateResponse)
async def estimate_quick(request: QuickEstimateRequest):
    """Return a lightweight single-node preview estimate."""
    return quick_estimate(request)


@app.post("/api/complexity")
async def estimate_complexity(request: WorkflowRequest):
    """Return live complexity score based purely on graph topology."""
    return compute_graph_complexity(request.nodes, request.edges)



# ── Import Workflow ─────────────────────────────────────────────

@app.post("/api/import-workflow", response_model=ImportedWorkflow)
async def import_workflow(request: ExternalWorkflowImportRequest):
    """Import an external workflow definition (generic, LangGraph, custom).

    Returns normalized internal nodes + edges that the frontend can
    render on the canvas or load as a comparison scenario.
    """
    try:
        adapter = get_adapter(request.source)
        result = adapter(request.payload)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to import workflow: {exc}",
        )



# ── LangGraph Code Export ────────────────────────────────────────────

@app.post("/api/export/langgraph", response_model=LangGraphExportResponse)
async def export_langgraph(request: LangGraphExportRequest):
    """Generate a deterministic LangGraph Python scaffold from a .neurovn.json workflow.

    Pure algorithmic transpilation — no LLM calls, no external API calls.
    Returns the .py file contents, requirements.txt, and .env.example.
    """
    from transpiler.langgraph_exporter import (
        generate_full_file,
        generate_requirements_txt,
        generate_env_example,
        build_node_map,
        label_to_identifier,
    )

    try:
        node_map = build_node_map(request.workflow_json)
        workflow_name = request.workflow_json.get("name", "workflow")
        # Build a safe filename from the workflow name
        base_name = label_to_identifier(workflow_name) or "workflow"
        filename = f"{base_name}_langgraph.py"

        return LangGraphExportResponse(
            python_file=generate_full_file(request.workflow_json, request.estimation_report),
            requirements_txt=generate_requirements_txt(node_map),
            env_example=generate_env_example(node_map),
            filename=filename,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate LangGraph export: {exc}",
        )


@app.get("/api/providers", response_model=list[ProviderSummary])
async def get_providers():
    """Return a list of supported providers with model counts."""
    return [
        ProviderSummary(
            id=p.id,
            name=p.name,
            last_updated=p.last_updated,
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
            last_updated=p.last_updated,
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
