"""Pydantic request / response schemas for the estimation API."""

from typing import List, Optional, Literal, Union
from pydantic import AliasChoices, BaseModel, Field, field_validator


class EstimationRange(BaseModel):
    """Min / avg / max estimation range for a single metric."""
    min: float
    avg: float
    max: float


class ParallelStep(BaseModel):
    """A set of nodes that can execute in parallel (same BFS depth)."""
    step: int
    node_ids: List[str]
    node_labels: List[str]
    total_latency: float = 0.0      # max latency in this step (parallel = max, not sum)
    total_cost: float = 0.0         # sum of costs in this step
    parallelism: int = 0            # number of nodes that run in parallel


class GraphPreprocessing(BaseModel):
    """Graph preprocessing summary used by the estimator."""
    forks: dict[str, List[str]] = Field(default_factory=dict)
    cycles: List[List[str]] = Field(default_factory=list)
    topological_order: List[str] = Field(default_factory=list)


# ── Request models ──────────────────────────────────────────────

class NodeConfig(BaseModel):
    id: str
    type: Literal[
        "startNode", "agentNode", "toolNode", "finishNode",
        "blankBoxNode", "textNode",
        "conditionNode",
    ]
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
    retry_budget: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="Maximum retries before this node fails",
    )
    # ── Context-aware estimation fields ─────────────────────────
    task_type: Optional[Literal[
        "classification", "summarization", "code_generation",
        "rag_answer", "tool_orchestration", "routing"
    ]] = Field(default=None, description="Semantic task type for smarter output estimation")

    @field_validator("task_type", mode="before")
    @classmethod
    def coerce_unknown_task_type(cls, v: object) -> object:
        """Silently coerce unrecognised task_type values (e.g. 'generation'
        from scaffold LLM) to None rather than raising a 422."""
        valid = {"classification", "summarization", "code_generation",
                 "rag_answer", "tool_orchestration", "routing"}
        if v is None or v in valid:
            return v
        return None

    expected_output_size: Optional[Literal[
        "short", "medium", "long", "very_long"
    ]] = Field(default=None, description="Expected output token range: short ≤200, medium 200-600, long 600-1500, very_long >1500")
    expected_calls_per_run: Optional[int] = Field(
        default=None,
        ge=1,
        le=50,
        description="Expected number of LLM calls this agent makes per workflow run (for orchestrators)",
    )
    # ── Condition node fields ─────────────────────────────────────
    condition_expression: Optional[str] = Field(
        default=None,
        description="Human-readable condition expression (e.g., 'sentiment > 0.7')",
    )
    probability: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
        description="True branch probability 0-100%. False = 100 - probability.",
    )


class EdgeConfig(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    source_handle: Optional[str] = Field(
        default=None,
        description="React Flow source handle ID (e.g., 's-right-true', 's-bottom-false')",
    )


class WorkflowRequest(BaseModel):
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    recursion_limit: Optional[int] = Field(
        default=25,
        ge=1,
        le=200,
        description="Graph-wide recursion limit (caps total cycle iterations; default 25)",
    )
    # ── Scaling / what-if parameters ────────────────────────────
    runs_per_day: Optional[int] = Field(
        default=None,
        ge=1,
        le=1_000_000,
        description="Expected workflow invocations per day (for projection)",
    )
    loop_intensity: Optional[float] = Field(
        default=None,
        ge=0.1,
        le=5.0,
        description="Multiplier for expected_iterations of all cycles (1.0 = baseline)",
    )


# ── Quick estimate request / response models ───────────────────

class QuickEstimateToolRef(BaseModel):
    """A tool reference used by the quick estimate endpoint."""
    tool_id: str = Field(
        validation_alias=AliasChoices("tool_id", "toolId", "id"),
    )


class QuickEstimateRequest(BaseModel):
    """POST /api/quick-estimate payload."""
    model_provider: str = Field(
        validation_alias=AliasChoices("model_provider", "modelProvider", "provider"),
    )
    model_name: str = Field(
        validation_alias=AliasChoices("model_name", "modelName", "model"),
    )
    context: Optional[str] = ""
    expected_output_size: Optional[Literal[
        "short", "medium", "long", "very_long"
    ]] = Field(
        default=None,
        validation_alias=AliasChoices("expected_output_size", "expectedOutputSize"),
    )
    max_output_tokens: Optional[int] = Field(
        default=None,
        ge=1,
        validation_alias=AliasChoices("max_output_tokens", "maxOutputTokens"),
    )
    tools: List[Union[str, QuickEstimateToolRef]] = Field(default_factory=list)


class QuickEstimateResponse(BaseModel):
    """Response from POST /api/quick-estimate."""
    cost_per_call: float
    latency_ms: int


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
    ancestor_tokens: int = 0
    tool_tokens: int = 0
    total_input_tokens: int = 0
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
    # Bottleneck analysis (share of total cost/latency for this node, 0.0–1.0)
    cost_share: float = 0.0
    latency_share: float = 0.0
    # Bottleneck severity: "low" | "medium" | "high" (top X% of cost or latency)
    bottleneck_severity: Optional[str] = None
    # Annotation flag: True for blankBoxNode, textNode — excluded from bottleneck/health scoring
    is_annotation: bool = False
    # Branch probability: expected execution probability (0-1) based on condition paths
    branch_probability: Optional[float] = None


class CycleInfo(BaseModel):
    """Describes a detected cycle (SCC) in the workflow graph."""
    cycle_id: int
    node_ids: List[str]
    node_labels: List[str]
    back_edges: List[List[str]]       # [[source, target], ...]
    max_iterations: int               # per-node max_steps or graph recursion_limit
    expected_iterations: int           # heuristic average (ceil of max / 2)
    # Per-lap estimation (single pass through all cycle nodes)
    tokens_per_lap: int = 0
    cost_per_lap: float = 0.0
    latency_per_lap: float = 0.0
    # Contribution to total workflow (0.0–1.0, based on avg-case iterations)
    cost_contribution: float = 0.0
    latency_contribution: float = 0.0
    # Risk level: "low" | "medium" | "high" | "critical"
    risk_level: Optional[str] = None
    risk_reason: Optional[str] = None


class EstimationRange(BaseModel):
    """Min / avg / max estimation for a single metric."""
    min: float
    avg: float
    max: float


class ScalingProjection(BaseModel):
    """Projected cost / latency at user-defined scale."""
    runs_per_day: int
    runs_per_month: int                 # runs_per_day * 30
    loop_intensity: float               # multiplier applied to cycle iterations
    monthly_cost: float                 # total_cost * runs_per_month
    monthly_tokens: int                 # total_tokens * runs_per_month
    monthly_compute_seconds: float      # total_latency * runs_per_month
    cost_per_1k_runs: float             # total_cost * 1000


class ContextAccumulationNode(BaseModel):
    """Per-node context accumulation breakdown from preprocessing."""
    node_id: str
    label: str
    ancestor_token_contribution: int
    without_accumulation_cost_usd: float
    with_accumulation_cost_usd: float
    accumulation_overhead_pct: int


class ContextAccumulationReport(BaseModel):
    """Summary of accumulated context across the workflow graph."""
    note: str
    breakdown: List[ContextAccumulationNode]


class ParallelBranchReport(BaseModel):
    fork_node: str
    branches: List[str]
    branch_latencies_ms: List[int]
    effective_latency_ms: int
    note: str


class LatencyReport(BaseModel):
    critical_path_ms: int
    critical_path_nodes: List[str]
    parallel_branches: List[ParallelBranchReport]
    worst_case_latency_ms: int


class CostReport(BaseModel):
    best_case_usd: float
    worst_case_usd: float
    breakdown: List[NodeEstimation]


class EstimationSummary(BaseModel):
    total_nodes: int
    agent_nodes: int
    tool_nodes: int
    condition_nodes: int
    loops_detected: int
    parallel_forks_detected: int
    graph_depth: int
    complexity_score: int
    complexity_label: Literal["Low", "Medium", "High", "Very High"]


class SensitivityReadout(BaseModel):
    """Cost/latency range across min/avg/max loop assumptions."""
    cost_min: float
    cost_avg: float
    cost_max: float
    latency_min: float
    latency_avg: float
    latency_max: float


class WorkflowEstimation(BaseModel):
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost: float
    total_latency: float
    total_tool_latency: float
    graph_type: Literal["DAG", "CYCLIC"]
    graph: GraphPreprocessing
    breakdown: List[NodeEstimation]
    context_accumulation: Optional[ContextAccumulationReport] = None
    critical_path: List[str]
    # Cycle-aware estimation fields (populated when graph_type == "CYCLIC")
    detected_cycles: List[CycleInfo] = []
    token_range: Optional[EstimationRange] = None
    cost_range: Optional[EstimationRange] = None
    latency_range: Optional[EstimationRange] = None
    recursion_limit: int = 25
    # Concurrency / parallelism analysis
    parallel_steps: List[ParallelStep] = []
    critical_path_latency: float = 0.0   # total latency along the critical path
    best_case_cost: float = 0.0
    best_case_latency: float = 0.0
    worst_case_cost: float = 0.0
    worst_case_latency: float = 0.0
    complexity_score: int = 0
    complexity_label: Literal["Low", "Medium", "High", "Very High"] = "Low"
    cost: Optional[CostReport] = None
    latency: Optional[LatencyReport] = None
    summary: Optional[EstimationSummary] = None
    # Scaling / what-if analysis
    scaling_projection: Optional[ScalingProjection] = None
    sensitivity: Optional[SensitivityReadout] = None
    # Workflow health scoring
    health: Optional["HealthScore"] = None


class HealthScore(BaseModel):
    """Quick, opinionated summary of a workflow's robustness."""
    grade: Literal["A", "B", "C", "D", "F"]  # overall grade
    score: int                                  # 0–100
    badges: List[str]                           # e.g. ["Cost-efficient", "Loop-heavy"]
    details: dict                               # per-factor scores for transparency


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
    last_updated: str
    model_count: int


class ProviderModelsResponse(BaseModel):
    """Full provider + models response for GET /api/providers (detailed)."""
    id: str
    name: str
    last_updated: str
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


# ── Import / export models ─────────────────────────────────────

class ExternalWorkflowImportRequest(BaseModel):
    """POST /api/import-workflow – import a workflow from an external format."""
    source: Literal["generic", "langgraph", "custom"] = Field(
        ..., description="Adapter to use for converting the payload"
    )
    payload: dict = Field(
        ..., description="Raw JSON workflow definition in the chosen source format"
    )


class ImportedWorkflow(BaseModel):
    """Normalized internal representation returned after import."""
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    metadata: dict = Field(default_factory=dict, description="Source-specific extra info")


# ── LangGraph export models ───────────────────────────────────────────────────

class LangGraphExportRequest(BaseModel):
    """POST /api/export/langgraph – generate a LangGraph Python scaffold."""
    workflow_json: dict = Field(
        ..., description="The .neurovn.json workflow definition (nodes + edges + name)"
    )
    estimation_report: Optional[dict] = Field(
        default=None,
        description="Optional WorkflowEstimation dict; if present, populates the cost/latency header comment",
    )


class LangGraphExportResponse(BaseModel):
    """Response from POST /api/export/langgraph."""
    python_file: str = Field(..., description="Full contents of the generated .py file")
    requirements_txt: str = Field(..., description="requirements.txt content")
    env_example: str = Field(..., description=".env.example content")
    filename: str = Field(..., description="Suggested filename: {workflow_name}_langgraph.py")
