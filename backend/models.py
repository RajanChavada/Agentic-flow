"""Pydantic request / response schemas for the estimation API."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


# ── Request models ──────────────────────────────────────────────

class NodeConfig(BaseModel):
    id: str
    type: Literal["startNode", "agentNode", "toolNode", "finishNode"]
    label: Optional[str] = None
    model_provider: Optional[str] = Field(
        default=None, description="e.g. OpenAI, Anthropic, Google"
    )
    model_name: Optional[str] = None
    context: Optional[str] = Field(default="", max_length=500)
    # Tool node fields
    tool_id: Optional[str] = Field(
        default=None,
        description="Tool definition id from tool_definitions.json (e.g. 'postgres', 'mcp_web_search')",
    )
    tool_category: Optional[str] = Field(
        default=None,
        description="Tool category id (e.g. 'database', 'mcp_server', 'api')",
    )
    # Loop / cycle control
    max_steps: Optional[int] = Field(
        default=None,
        ge=1,
        le=100,
        description="Maximum loop iterations this agent will perform when in a cycle (default: 10)",
    )


class EdgeConfig(BaseModel):
    id: Optional[str] = None
    source: str
    target: str


class WorkflowRequest(BaseModel):
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    recursion_limit: Optional[int] = Field(
        default=25,
        ge=1,
        le=200,
        description="Graph-wide recursion limit (caps total cycle iterations; default 25)",
    )


# ── Estimation response models ──────────────────────────────────

class ToolImpact(BaseModel):
    """Breakdown of a single tool's cost impact on its calling agent."""
    tool_node_id: str
    tool_name: str
    tool_id: Optional[str] = None
    schema_tokens: int         # tokens injected into agent input for tool schema
    response_tokens: int       # tokens from tool result fed back to agent
    execution_latency: float   # tool execution time in seconds


class NodeEstimation(BaseModel):
    node_id: str
    node_name: str
    tokens: int
    input_tokens: int
    output_tokens: int
    cost: float
    input_cost: float
    output_cost: float
    latency: float
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    # Tool-related fields
    tool_id: Optional[str] = None
    tool_impacts: Optional[List[ToolImpact]] = None  # populated on agent nodes that have connected tools
    tool_schema_tokens: int = 0     # total schema tokens injected from connected tools
    tool_response_tokens: int = 0   # total response tokens from connected tools
    tool_latency: float = 0.0       # total tool execution latency in seconds
    # Cycle membership
    in_cycle: bool = False


class CycleInfo(BaseModel):
    """Describes a detected cycle (SCC) in the workflow graph."""
    cycle_id: int
    node_ids: List[str]
    node_labels: List[str]
    back_edges: List[List[str]]       # [[source, target], ...]
    max_iterations: int               # per-node max_steps or graph recursion_limit
    expected_iterations: int           # heuristic average (ceil of max / 2)


class EstimationRange(BaseModel):
    """Min / avg / max estimation for a single metric."""
    min: float
    avg: float
    max: float


class WorkflowEstimation(BaseModel):
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    total_latency: float
    total_tool_latency: float
    graph_type: Literal["DAG", "CYCLIC"]
    breakdown: List[NodeEstimation]
    critical_path: List[str]
    # Cycle-aware estimation fields (populated when graph_type == "CYCLIC")
    detected_cycles: List[CycleInfo] = []
    token_range: Optional[EstimationRange] = None
    cost_range: Optional[EstimationRange] = None
    latency_range: Optional[EstimationRange] = None
    recursion_limit: int = 25


# ── Provider / model registry response models ──────────────────

class ModelInfo(BaseModel):
    """A single model returned by GET /api/models."""
    id: str
    display_name: str
    family: str
    input_per_million: float
    output_per_million: float
    tokens_per_sec: float
    context_window: Optional[int] = None


class ProviderSummary(BaseModel):
    """A provider entry returned by GET /api/providers."""
    id: str
    name: str
    model_count: int


class ProviderModelsResponse(BaseModel):
    """Full provider + models response for GET /api/providers (detailed)."""
    id: str
    name: str
    models: List[ModelInfo]


# ── Tool registry response models ──────────────────────────────

class ToolInfo(BaseModel):
    """A single tool returned by GET /api/tools."""
    id: str
    display_name: str
    description: str
    schema_tokens: int
    avg_response_tokens: int
    latency_ms: int
    latency_type: str


class ToolCategoryInfo(BaseModel):
    """A tool category returned by GET /api/tools/categories."""
    id: str
    name: str
    tool_count: int


class ToolCategoryDetailedInfo(BaseModel):
    """A tool category with full tool listings."""
    id: str
    name: str
    tools: List[ToolInfo]


# ── Batch (scenario comparison) models ─────────────────────────

class BatchWorkflowItem(BaseModel):
    """A single workflow in a batch estimation request."""
    id: str
    name: Optional[str] = None
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    recursion_limit: Optional[int] = Field(default=25, ge=1, le=200)


class BatchEstimateRequest(BaseModel):
    """POST /api/estimate/batch – estimate multiple workflows at once."""
    workflows: List[BatchWorkflowItem] = Field(..., min_length=1, max_length=10)


class BatchEstimateResult(BaseModel):
    """Summary result for one workflow in a batch response."""
    id: str
    name: Optional[str] = None
    graph_type: Literal["DAG", "CYCLIC"]
    total_tokens: int
    total_cost: float
    total_latency: float
    total_tool_latency: float
    node_count: int
    edge_count: int
    # Ranges (populated for cyclic workflows)
    token_range: Optional[EstimationRange] = None
    cost_range: Optional[EstimationRange] = None
    latency_range: Optional[EstimationRange] = None
    detected_cycles: int = 0


class BatchEstimateResponse(BaseModel):
    """Response from POST /api/estimate/batch."""
    results: List[BatchEstimateResult]
