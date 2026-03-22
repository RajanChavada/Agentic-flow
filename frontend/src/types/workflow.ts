/* ── Shared TypeScript types for the Neurovn frontend ─── */

/** The node kinds supported on the canvas. */
export type WorkflowNodeType =
  | "startNode"
  | "agentNode"
  | "toolNode"
  | "finishNode"
  | "blankBoxNode"
  | "textNode"
  | "conditionNode";

/** 9 anchor points for label placement inside a BlankBoxNode. */
export type LabelPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/** Full styling for BlankBoxNode containers. */
export type BlankBoxStyle = {
  label: string;
  labelPosition: LabelPosition;
  labelColor: string;
  labelBackground: "none" | "pill";
  borderStyle: "solid" | "dashed" | "none";
  borderColor: string;
  borderWidth: 1 | 2 | 3;
  backgroundColor: string;
  backgroundOpacity: number;
  connectable: boolean;
};

/** Tool binding stored on an agent node. */
export interface WorkflowToolBinding {
  id: string;
  displayName: string;
  schemaTokens: number;
  avgResponseTokens: number;
  latencyMs: number;
}

/** Tool binding payload used in persisted/imported node data. */
export interface NodeToolBindingPayload {
  id: string;
  display_name: string;
  schema_tokens: number;
  avg_response_tokens: number;
  latency_ms: number;
}

/** Data payload attached to every custom React Flow node. */
export type WorkflowNodeData = {
  label: string;
  type: WorkflowNodeType;
  modelProvider?: string;
  modelName?: string;
  context?: string;
  toolId?: string;
  toolCategory?: string;
  maxSteps?: number | null;
  maxOutputTokens?: number | null;
  temperature?: number | null;
  retryBudget?: number | null;
  tools?: WorkflowToolBinding[];
  quickEstimateCostPerCall?: number | null;
  quickEstimateLatencyMs?: number | null;
  /** Context-aware estimation fields (agent nodes). */
  taskType?: string;
  expectedOutputSize?: string;
  expectedCallsPerRun?: number | null;
  /** Condition node fields. */
  conditionExpression?: string;
  probability?: number;
  /** BlankBoxNode styling. */
  blankBoxStyle?: BlankBoxStyle;
  /** TextNode styling. */
  textNodeStyle?: {
    content: string;
    fontSize: "sm" | "md" | "lg" | "heading";
    color: string;
    background: "none" | "pill" | "badge";
    backgroundColor?: string;
  };
  [key: string]: unknown;    // satisfies Record<string, unknown> for React Flow
};

/** Shape of a node sent to the backend /api/estimate endpoint. */
export interface NodeConfigPayload {
  id: string;
  type: WorkflowNodeType;
  label?: string;
  model_provider?: string;
  model_name?: string;
  context?: string;
  tool_id?: string;
  tool_category?: string;
  max_steps?: number | null;
  max_output_tokens?: number | null;
  temperature?: number | null;
  retry_budget?: number | null;
  tools?: NodeToolBindingPayload[] | null;
  quick_estimate_cost_per_call?: number | null;
  quick_estimate_latency_ms?: number | null;
  /** Context-aware estimation fields. */
  task_type?: string | null;
  expected_output_size?: string | null;
  expected_calls_per_run?: number | null;
  /** Condition node fields. */
  condition_expression?: string | null;
  probability?: number | null;
}

/** Shape of an edge sent to the backend. */
export interface EdgeConfigPayload {
  id?: string;
  source: string;
  target: string;
  source_handle?: string | null;
}

/** Response from POST /api/quick-estimate. */
export interface QuickEstimateResponse {
  cost_per_call: number;
  latency_ms: number;
}

/** Shape of the full estimation request. */
export interface EstimateRequestPayload {
  nodes: NodeConfigPayload[];
  edges: EdgeConfigPayload[];
  recursion_limit?: number;
  runs_per_day?: number | null;
  loop_intensity?: number | null;
}

/** Projected cost/latency at user-defined scale. */
export interface ScalingProjection {
  runs_per_day: number;
  runs_per_month: number;
  loop_intensity: number;
  monthly_cost: number;
  monthly_tokens: number;
  monthly_compute_seconds: number;
  cost_per_1k_runs: number;
}

/** Cost/latency range across min/avg/max loop assumptions. */
export interface SensitivityReadout {
  cost_min: number;
  cost_avg: number;
  cost_max: number;
  latency_min: number;
  latency_avg: number;
  latency_max: number;
}

/** Workflow health score and badges. */
export interface HealthScore {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number;          // 0–100
  badges: string[];       // e.g. ["Cost-efficient", "Loop-free"]
  details: Record<string, { score: number;[key: string]: unknown }>;
}

/** Actual per-node runtime stats (for observability overlay). */
export interface ActualNodeStats {
  node_id: string;
  actual_tokens?: number;
  actual_latency?: number;  // seconds
  actual_cost?: number;
}

/** Tool impact on a calling agent node. */
export interface ToolImpact {
  tool_node_id: string;
  tool_name: string;
  tool_id: string | null;
  schema_tokens: number;
  response_tokens: number;
  execution_latency: number;
}

/** Single‑node estimation returned by the backend. */
export interface NodeEstimation {
  node_id: string;
  node_name: string;
  tokens: number;
  input_tokens: number;
  ancestor_tokens: number;
  tool_tokens: number;
  total_input_tokens: number;
  output_tokens: number;
  cost: number;
  input_cost: number;
  output_cost: number;
  latency: number;
  model_provider?: string | null;
  model_name?: string | null;
  tool_id?: string | null;
  tool_impacts?: ToolImpact[] | null;
  tool_schema_tokens: number;
  tool_response_tokens: number;
  tool_latency: number;
  in_cycle: boolean;
  /** Share of total cost for this node (0.0 – 1.0). */
  cost_share: number;
  /** Share of total latency for this node (0.0 – 1.0). */
  latency_share: number;
  /** Bottleneck severity: "low" | "medium" | "high". */
  bottleneck_severity: "low" | "medium" | "high" | null;
  /** Expected execution probability for condition-branch nodes (0.0–1.0). */
  branch_probability?: number | null;
}

/** Detected cycle (SCC) in the workflow graph. */
export interface CycleInfo {
  cycle_id: number;
  node_ids: string[];
  node_labels: string[];
  back_edges: [string, string][];
  max_iterations: number;
  expected_iterations: number;
  /** Per-lap metrics (single pass through all cycle nodes). */
  tokens_per_lap: number;
  cost_per_lap: number;
  latency_per_lap: number;
  /** Contribution to total workflow (0.0–1.0, avg-case iterations). */
  cost_contribution: number;
  latency_contribution: number;
  /** Risk level: "low" | "medium" | "high" | "critical". */
  risk_level: "low" | "medium" | "high" | "critical" | null;
  risk_reason: string | null;
}

/** Min / avg / max estimation range for a metric. */
export interface EstimationRange {
  min: number;
  avg: number;
  max: number;
}

/** A set of nodes that can execute in parallel (same BFS depth level). */
export interface ParallelStep {
  step: number;
  node_ids: string[];
  node_labels: string[];
  total_latency: number;   // max latency in this step (parallel = max, not sum)
  total_cost: number;       // sum of costs in this step
  parallelism: number;      // number of nodes that run in parallel
}

export interface GraphPreprocessing {
  forks: Record<string, string[]>;
  cycles: [string, string][];
  topological_order: string[];
}

export interface ContextAccumulationNode {
  node_id: string;
  label: string;
  ancestor_token_contribution: number;
  without_accumulation_cost_usd: number;
  with_accumulation_cost_usd: number;
  accumulation_overhead_pct: number;
}

export interface ContextAccumulationReport {
  note: string;
  breakdown: ContextAccumulationNode[];
}

export interface ParallelBranchReport {
  fork_node: string;
  branches: string[];
  branch_latencies_ms: number[];
  effective_latency_ms: number;
  note: string;
}

export interface LatencyReport {
  critical_path_ms: number;
  critical_path_nodes: string[];
  parallel_branches: ParallelBranchReport[];
  worst_case_latency_ms: number;
}

export interface CostReport {
  best_case_usd: number;
  worst_case_usd: number;
  breakdown: NodeEstimation[];
}

export interface EstimationSummary {
  total_nodes: number;
  agent_nodes: number;
  tool_nodes: number;
  condition_nodes: number;
  loops_detected: number;
  parallel_forks_detected: number;
  graph_depth: number;
  complexity_score: number;
  complexity_label: "Low" | "Medium" | "High" | "Very High";
}

/** Full workflow estimation response from the backend. */
export interface WorkflowEstimation {
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  total_latency: number;
  total_tool_latency: number;
  graph_type: "DAG" | "CYCLIC";
  graph: GraphPreprocessing;
  breakdown: NodeEstimation[];
  context_accumulation: ContextAccumulationReport | null;
  critical_path: string[];
  detected_cycles: CycleInfo[];
  token_range: EstimationRange | null;
  cost_range: EstimationRange | null;
  latency_range: EstimationRange | null;
  recursion_limit: number;
  /** Concurrency / parallelism analysis. */
  parallel_steps: ParallelStep[];
  /** Total latency along the critical (longest) path. */
  critical_path_latency: number;
  best_case_cost: number;
  best_case_latency: number;
  worst_case_cost: number;
  worst_case_latency: number;
  complexity_score: number;
  complexity_label: "Low" | "Medium" | "High" | "Very High";
  cost: CostReport | null;
  latency: LatencyReport | null;
  summary: EstimationSummary | null;
  /** Scaling projection (populated when runs_per_day is provided). */
  scaling_projection: ScalingProjection | null;
  /** Cost/latency sensitivity across loop assumptions. */
  sensitivity: SensitivityReadout | null;
  /** Workflow health scoring. */
  health: HealthScore | null;
}

// ── Model registry types (from GET /api/providers/detailed) ────

/** A single model's pricing & metadata. */
export interface ModelInfo {
  id: string;
  display_name: string;
  family: string;
  input_per_million: number;
  output_per_million: number;
  tokens_per_sec: number;
  context_window: number | null;
}

/** Provider summary (from GET /api/providers). */
export interface ProviderSummary {
  id: string;
  name: string;
  last_updated: string;
  model_count: number;
}

/** Provider with full model list (from GET /api/providers/detailed). */
export interface ProviderDetailed {
  id: string;
  name: string;
  last_updated: string;
  models: ModelInfo[];
}

// ── Tool registry types (from GET /api/tools/categories/detailed) ──

/** A single tool definition. */
export interface ToolInfoType {
  id: string;
  display_name: string;
  description: string;
  schema_tokens: number;
  avg_response_tokens: number;
  latency_ms: number;
  latency_type: string;
}

/** Tool category with full tool listings. */
export interface ToolCategoryDetailed {
  id: string;
  name: string;
  tools: ToolInfoType[];
}

// ── Canvas types ────────────────────────────────────────────────

/** A canvas container that holds multiple workflows. */
export interface Canvas {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isPublic?: boolean;
  publicUuid?: string;
  lastEstimationReport?: WorkflowEstimation | null;
  workflowCount?: number;
  thumbnailUrl?: string | null;
}

// ── Scenario comparison types ──────────────────────────────────

/** A saved workflow scenario for comparison. */
export interface WorkflowScenario {
  id: string;
  name: string;
  canvasId?: string;
  createdAt: string;
  updatedAt: string;
  graph: {
    nodes: NodeConfigPayload[];
    edges: EdgeConfigPayload[];
    recursionLimit: number;
  };
  /** Populated after estimation runs. */
  estimate?: WorkflowEstimation;
}

/** Marketplace template (browse, use, publish). */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  graph: {
    nodes: NodeConfigPayload[];
    edges: EdgeConfigPayload[];
    recursionLimit?: number;
  };
  category: string;
  is_curated: boolean;
  use_count?: number;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  author_name?: string | null;
}

/** Summary result for one workflow in a batch response. */
export interface BatchEstimateResult {
  id: string;
  name: string | null;
  graph_type: "DAG" | "CYCLIC";
  total_tokens: number;
  total_cost: number;
  total_latency: number;
  total_tool_latency: number;
  node_count: number;
  edge_count: number;
  token_range: EstimationRange | null;
  cost_range: EstimationRange | null;
  latency_range: EstimationRange | null;
  detected_cycles: number;
}

/** Response from POST /api/estimate/batch. */
export interface BatchEstimateResponse {
  results: BatchEstimateResult[];
}

// ── Import workflow types (from POST /api/import-workflow) ──────

/** Supported import source formats. */
export type ImportSource = "generic" | "langgraph" | "custom";

/** Request body for POST /api/import-workflow. */
export interface ImportWorkflowRequest {
  source: ImportSource;
  payload: Record<string, unknown>;
}

/** Response from POST /api/import-workflow. */
export interface ImportedWorkflow {
  nodes: NodeConfigPayload[];
  edges: EdgeConfigPayload[];
  metadata: Record<string, unknown>;
}
