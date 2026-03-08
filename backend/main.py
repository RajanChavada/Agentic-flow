"""FastAPI application – Neurovn backend."""

from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGINS
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
    ExternalWorkflowImportRequest,
    ImportedWorkflow,
    SchemaGenerateRequest,
    SchemaGenerateResponse,
    SchemaValidateRequest,
    SchemaValidateResponse,
    ScaffoldRequest,
    ScaffoldRefineRequest,
    ScaffoldResponse,
)
from estimator import estimate_workflow
from pricing_registry import registry
from tool_registry import tool_registry
from import_adapters import get_adapter
from schema_generator import generate_schema, validate_schema
from scaffold_generator import scaffold_workflow, refine_workflow

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
        runs_per_day=request.runs_per_day,
        loop_intensity=request.loop_intensity,
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


# ── Schema Generation ──────────────────────────────────────────

@app.post("/api/generate-schema", response_model=SchemaGenerateResponse)
async def generate_schema_endpoint(request: SchemaGenerateRequest):
    """Generate a JSON schema from a natural language success description."""
    schema = generate_schema(request.description, context=request.context)
    return SchemaGenerateResponse(schema=schema, description=request.description)


@app.post("/api/validate-schema", response_model=SchemaValidateResponse)
async def validate_schema_endpoint(request: SchemaValidateRequest):
    """Validate a JSON schema for correctness."""
    is_valid, errors = validate_schema(request.schema_obj)
    return SchemaValidateResponse(valid=is_valid, errors=errors)


# ── Scaffold (NL-to-workflow) ─────────────────────────────────

@app.post("/api/scaffold", response_model=ScaffoldResponse)
async def scaffold_endpoint(request: ScaffoldRequest):
    """Generate a workflow graph from a natural language description."""
    result = scaffold_workflow(request.prompt)
    return ScaffoldResponse(**result)


@app.post("/api/scaffold/refine", response_model=ScaffoldResponse)
async def scaffold_refine_endpoint(request: ScaffoldRefineRequest):
    """Refine an existing workflow graph based on a follow-up instruction."""
    current_graph = {
        "nodes": [n.model_dump() for n in request.nodes],
        "edges": [e.model_dump() for e in request.edges],
    }
    result = refine_workflow(
        request.prompt,
        current_graph["nodes"],
        current_graph["edges"],
    )
    return ScaffoldResponse(**result)


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
