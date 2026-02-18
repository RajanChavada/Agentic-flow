"""Token, cost, and latency estimation for a workflow graph.

Uses the PricingRegistry (backed by data/model_pricing.json) for all
model lookups and the ToolRegistry (backed by data/tool_definitions.json)
for tool impact estimation.

Key insight: tools don't consume LLM tokens directly, but they affect
the calling agent in three ways:
  1. Schema injection — the tool's JSON schema is added to the agent's
     system prompt (adds to input_tokens).
  2. Result consumption — the tool's output is fed back to the agent as
     context (adds to input_tokens).
  3. Execution latency — the tool's execution time is added to the
     agent node's total latency.

The estimator walks the graph edges to find which tool nodes are
connected to which agent nodes, then rolls the tool costs into the
agent's estimation.

**Cycle-aware estimation (v2)**:
  • Uses Tarjan's SCC from GraphAnalyzer to find loops.
  • Nodes inside a cycle are estimated once (single-lap cost).
  • Total cost is multiplied by iteration count:
      - min  = 1 iteration
      - avg  = ceil(max_iterations / 2)
      - max  = max_iterations (from node.max_steps or graph recursion_limit)
  • DAG-zone nodes are always single-pass and added to all three.
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Dict, List, Optional, Set

import tiktoken

from models import (
    NodeConfig,
    NodeEstimation,
    ToolImpact,
    CycleInfo,
    EstimationRange,
    ParallelStep,
    ScalingProjection,
    SensitivityReadout,
    HealthScore,
    WorkflowEstimation,
    EdgeConfig,
)
from graph_analyzer import GraphAnalyzer
from pricing_registry import registry
from tool_registry import tool_registry

# Default encoding used for token counting (cl100k_base covers GPT‑4 family)
_DEFAULT_ENCODING = tiktoken.get_encoding("cl100k_base")

# Base system‑prompt token overhead assumed per agent node
_BASE_SYSTEM_TOKENS = 200

# Output/input ratio heuristic  (configurable per‑node type later)
_OUTPUT_RATIO = 1.5

# ── Task-aware output multipliers ───────────────────────────────
# Keys: (task_type, expected_output_size) → multiplier applied to
# base_context_tokens to estimate output_tokens.  Falls back to
# _OUTPUT_RATIO when the combination is not in the table.
_TASK_OUTPUT_MULTIPLIERS: dict[tuple[str, str], float] = {
    # Classification – typically short boolean/label outputs
    ("classification", "short"):   0.3,
    ("classification", "medium"):  0.5,
    ("classification", "long"):    0.8,
    ("classification", "very_long"): 1.0,
    # Summarization – moderate compression
    ("summarization", "short"):    0.8,
    ("summarization", "medium"):   1.2,
    ("summarization", "long"):     1.8,
    ("summarization", "very_long"): 2.5,
    # Code generation – tends to be verbose
    ("code_generation", "short"):  1.0,
    ("code_generation", "medium"): 2.0,
    ("code_generation", "long"):   3.0,
    ("code_generation", "very_long"): 4.5,
    # RAG answers – concise to moderate
    ("rag_answer", "short"):       0.6,
    ("rag_answer", "medium"):      1.2,
    ("rag_answer", "long"):        2.0,
    ("rag_answer", "very_long"):   3.0,
    # Tool orchestration – mostly function-call JSON, short
    ("tool_orchestration", "short"):  0.5,
    ("tool_orchestration", "medium"): 1.0,
    ("tool_orchestration", "long"):   1.5,
    ("tool_orchestration", "very_long"): 2.0,
    # Routing – very short decision outputs
    ("routing", "short"):          0.2,
    ("routing", "medium"):         0.4,
    ("routing", "long"):           0.6,
    ("routing", "very_long"):      0.8,
}


def _get_output_multiplier(task_type: str | None, output_size: str | None) -> float:
    """Look up the task-aware output multiplier, falling back to _OUTPUT_RATIO."""
    if task_type and output_size:
        return _TASK_OUTPUT_MULTIPLIERS.get((task_type, output_size), _OUTPUT_RATIO)
    return _OUTPUT_RATIO

# Default tokens‑per‑second if model entry is missing throughput data
_DEFAULT_TPS = 50

# Default fallback for tools not in the registry
_DEFAULT_TOOL_SCHEMA_TOKENS = 200
_DEFAULT_TOOL_RESPONSE_TOKENS = 800
_DEFAULT_TOOL_LATENCY_MS = 200

# Default max iterations when a cycle is detected but node has no max_steps
_DEFAULT_MAX_STEPS = 10


def count_tokens(text: str) -> int:
    """Count tokens using tiktoken's cl100k_base encoding."""
    return len(_DEFAULT_ENCODING.encode(text)) if text else 0


def _build_tool_connections(
    nodes: List[NodeConfig],
    edges: List[EdgeConfig],
) -> Dict[str, List[str]]:
    """Map each agent node id to the list of tool node ids connected to it.

    Connections are found by walking edges in both directions:
      • agent → tool  (agent calls a tool downstream)
      • tool → agent  (tool result flows back to an agent)
    """
    node_map: Dict[str, NodeConfig] = {n.id: n for n in nodes}
    agent_tools: Dict[str, List[str]] = defaultdict(list)

    for edge in edges:
        src = node_map.get(edge.source)
        tgt = node_map.get(edge.target)
        if src and tgt:
            # agent → tool  (agent calls the tool)
            if src.type == "agentNode" and tgt.type == "toolNode":
                if tgt.id not in agent_tools[src.id]:
                    agent_tools[src.id].append(tgt.id)
            # tool → agent  (tool result goes back to an agent)
            if src.type == "toolNode" and tgt.type == "agentNode":
                if src.id not in agent_tools[tgt.id]:
                    agent_tools[tgt.id].append(src.id)

    return dict(agent_tools)


def _get_tool_impact(tool_node: NodeConfig) -> ToolImpact:
    """Compute the token/latency impact a single tool node imposes on its agent."""
    tool_def = None
    if tool_node.tool_id:
        tool_def = tool_registry.get(tool_node.tool_id)

    if tool_def:
        return ToolImpact(
            tool_node_id=tool_node.id,
            tool_name=tool_node.label or tool_def.display_name,
            tool_id=tool_def.id,
            schema_tokens=tool_def.schema_tokens,
            response_tokens=tool_def.avg_response_tokens,
            execution_latency=round(tool_def.latency_ms / 1000.0, 3),
        )

    # Fallback: no tool_id set, use defaults
    return ToolImpact(
        tool_node_id=tool_node.id,
        tool_name=tool_node.label or "Unknown Tool",
        tool_id=None,
        schema_tokens=_DEFAULT_TOOL_SCHEMA_TOKENS,
        response_tokens=_DEFAULT_TOOL_RESPONSE_TOKENS,
        execution_latency=round(_DEFAULT_TOOL_LATENCY_MS / 1000.0, 3),
    )


def estimate_tool_node(node: NodeConfig, in_cycle: bool = False) -> NodeEstimation:
    """Return estimation for a tool node itself.

    Tool nodes don't consume LLM tokens, but they DO have execution
    latency and their impact is visible in the response so the
    frontend can render them meaningfully.
    """
    tool_def = None
    if node.tool_id:
        tool_def = tool_registry.get(node.tool_id)

    exec_latency = (tool_def.latency_ms / 1000.0) if tool_def else (_DEFAULT_TOOL_LATENCY_MS / 1000.0)

    return NodeEstimation(
        node_id=node.id,
        node_name=node.label or (tool_def.display_name if tool_def else "Tool"),
        tokens=0,
        input_tokens=0,
        output_tokens=0,
        cost=0.0,
        input_cost=0.0,
        output_cost=0.0,
        latency=round(exec_latency, 3),
        model_provider=None,
        model_name=None,
        tool_id=node.tool_id,
        tool_impacts=None,
        tool_schema_tokens=0,
        tool_response_tokens=(tool_def.avg_response_tokens if tool_def else _DEFAULT_TOOL_RESPONSE_TOKENS),
        tool_latency=round(exec_latency, 3),
        in_cycle=in_cycle,
    )


def estimate_agent_node(
    node: NodeConfig,
    connected_tool_nodes: List[NodeConfig],
    in_cycle: bool = False,
) -> NodeEstimation:
    """Return a detailed estimation for an agent node.

    Accounts for:
      • Base context tokens (tiktoken on node.context + system prompt overhead)
      • Tool schema injection (each connected tool adds schema_tokens)
      • Tool response consumption (each tool's avg_response_tokens added to input)
      • Tool execution latency (each tool's latency_ms added on top of LLM latency)
      • LLM cost based on total input/output tokens × model pricing
      • LLM latency based on output_tokens / tokens_per_sec
    """
    # ── Tool impacts ────────────────────────────────────────────
    tool_impacts: List[ToolImpact] = [
        _get_tool_impact(tn) for tn in connected_tool_nodes
    ]

    total_schema_tokens = sum(ti.schema_tokens for ti in tool_impacts)
    total_response_tokens = sum(ti.response_tokens for ti in tool_impacts)
    total_tool_latency = sum(ti.execution_latency for ti in tool_impacts)

    # ── Token calculation ───────────────────────────────────────
    base_context_tokens = count_tokens(node.context or "") + _BASE_SYSTEM_TOKENS
    input_tokens = base_context_tokens + total_schema_tokens + total_response_tokens

    # Task-aware output estimation: use multiplier table if task_type + output_size set
    output_multiplier = _get_output_multiplier(node.task_type, node.expected_output_size)
    output_tokens = int(base_context_tokens * output_multiplier)  # output based on base, not inflated by tool data

    # expected_calls_per_run: multiply tokens/cost/latency for orchestrator agents
    calls_multiplier = max(1, node.expected_calls_per_run or 1)
    input_tokens *= calls_multiplier
    output_tokens *= calls_multiplier

    total_tokens = input_tokens + output_tokens

    provider = node.model_provider or ""
    model = node.model_name or ""

    # ── Registry lookup ─────────────────────────────────────────
    pricing = registry.get(provider, model)

    if pricing is None:
        scaled_tool_latency = total_tool_latency * calls_multiplier
        return NodeEstimation(
            node_id=node.id,
            node_name=node.label or node.type,
            tokens=total_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=0.0,
            input_cost=0.0,
            output_cost=0.0,
            latency=scaled_tool_latency,
            model_provider=provider or None,
            model_name=model or None,
            tool_id=None,
            tool_impacts=tool_impacts if tool_impacts else None,
            tool_schema_tokens=total_schema_tokens,
            tool_response_tokens=total_response_tokens,
            tool_latency=round(scaled_tool_latency, 3),
            in_cycle=in_cycle,
        )

    # ── Cost calculation ────────────────────────────────────────
    input_cost = (input_tokens / 1_000_000) * pricing.input_per_million
    output_cost = (output_tokens / 1_000_000) * pricing.output_per_million
    cost = round(input_cost + output_cost, 8)

    # ── Latency calculation ─────────────────────────────────────
    tps = pricing.tokens_per_sec or _DEFAULT_TPS
    llm_latency = output_tokens / tps
    scaled_tool_latency = total_tool_latency * calls_multiplier
    total_latency = llm_latency + scaled_tool_latency

    return NodeEstimation(
        node_id=node.id,
        node_name=node.label or node.type,
        tokens=total_tokens,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost=cost,
        input_cost=round(input_cost, 8),
        output_cost=round(output_cost, 8),
        latency=round(total_latency, 3),
        model_provider=provider,
        model_name=model,
        tool_id=None,
        tool_impacts=tool_impacts if tool_impacts else None,
        tool_schema_tokens=total_schema_tokens,
        tool_response_tokens=total_response_tokens,
        tool_latency=round(scaled_tool_latency, 3),
        in_cycle=in_cycle,
    )


def estimate_node(node: NodeConfig, in_cycle: bool = False) -> NodeEstimation:
    """Return a zero estimation for non-agent, non-tool nodes."""
    return NodeEstimation(
        node_id=node.id,
        node_name=node.label or node.type,
        tokens=0,
        input_tokens=0,
        output_tokens=0,
        cost=0.0,
        input_cost=0.0,
        output_cost=0.0,
        latency=0.0,
        model_provider=None,
        model_name=None,
        tool_id=None,
        tool_impacts=None,
        tool_schema_tokens=0,
        tool_response_tokens=0,
        tool_latency=0.0,
        in_cycle=in_cycle,
    )


_HIGH_COST_MODEL_THRESHOLD = 10.0  # $/M input tokens — models above this are "expensive"


def _compute_cycle_contributions(
    detected_cycles: List[CycleInfo],
    breakdown: List[NodeEstimation],
    total_cost: float,
    total_latency: float,
) -> None:
    """Mutate CycleInfo objects in-place to add per-lap metrics, contribution, and risk level.

    Risk classification:
      - "critical" → expensive model(s) AND max_iterations ≥ 20
      - "high"     → expensive model(s) OR max_iterations ≥ 15 OR cost_contribution > 0.5
      - "medium"   → max_iterations ≥ 5 OR cost_contribution > 0.2
      - "low"      → everything else
    """
    from pricing_registry import registry as _reg

    for ci in detected_cycles:
        cycle_node_set = set(ci.node_ids)

        # Sum single-lap cost for nodes in this cycle
        lap_tokens = sum(b.tokens for b in breakdown if b.node_id in cycle_node_set)
        lap_cost = sum(b.cost for b in breakdown if b.node_id in cycle_node_set)
        lap_latency = sum(b.latency for b in breakdown if b.node_id in cycle_node_set)

        ci.tokens_per_lap = lap_tokens
        ci.cost_per_lap = round(lap_cost, 8)
        ci.latency_per_lap = round(lap_latency, 4)

        # Contribution: avg-case (expected_iterations × lap) / total
        avg_cost = lap_cost * ci.expected_iterations
        avg_latency = lap_latency * ci.expected_iterations

        ci.cost_contribution = round(avg_cost / total_cost, 4) if total_cost > 0 else 0.0
        ci.latency_contribution = round(avg_latency / total_latency, 4) if total_latency > 0 else 0.0

        # Determine if any cycle node uses an expensive model
        has_expensive_model = False
        expensive_model_name = ""
        for b in breakdown:
            if b.node_id in cycle_node_set and b.model_provider and b.model_name:
                pricing = _reg.get(b.model_provider, b.model_name)
                if pricing and pricing.input_per_million >= _HIGH_COST_MODEL_THRESHOLD:
                    has_expensive_model = True
                    expensive_model_name = f"{b.model_provider}/{b.model_name}"
                    break

        # Risk classification
        reasons: List[str] = []

        if has_expensive_model and ci.max_iterations >= 20:
            ci.risk_level = "critical"
            reasons.append(f"Expensive model ({expensive_model_name})")
            reasons.append(f"High max iterations ({ci.max_iterations})")
        elif has_expensive_model or ci.max_iterations >= 15 or ci.cost_contribution > 0.5:
            ci.risk_level = "high"
            if has_expensive_model:
                reasons.append(f"Expensive model ({expensive_model_name})")
            if ci.max_iterations >= 15:
                reasons.append(f"High max iterations ({ci.max_iterations})")
            if ci.cost_contribution > 0.5:
                reasons.append(f"Loop dominates cost ({round(ci.cost_contribution * 100)}%)")
        elif ci.max_iterations >= 5 or ci.cost_contribution > 0.2:
            ci.risk_level = "medium"
            if ci.max_iterations >= 5:
                reasons.append(f"Moderate iterations ({ci.max_iterations})")
            if ci.cost_contribution > 0.2:
                reasons.append(f"Significant cost share ({round(ci.cost_contribution * 100)}%)")
        else:
            ci.risk_level = "low"
            reasons.append("Bounded loop with low cost impact")

        ci.risk_reason = "; ".join(reasons)


def _compute_bottleneck_shares(
    breakdown: List[NodeEstimation],
    total_cost: float,
    total_latency: float,
) -> None:
    """Mutate breakdown nodes in-place to add cost_share, latency_share, and bottleneck_severity.

    Severity classification:
      - "high"   → node is in the top 20% of either cost or latency share
      - "medium" → node is in the top 20-50% range
      - "low"    → everything else
    """
    for b in breakdown:
        b.cost_share = round(b.cost / total_cost, 4) if total_cost > 0 else 0.0
        b.latency_share = round(b.latency / total_latency, 4) if total_latency > 0 else 0.0

    # Compute severity based on max(cost_share, latency_share)
    impacts = [(max(b.cost_share, b.latency_share), i) for i, b in enumerate(breakdown)]
    impacts.sort(key=lambda x: x[0], reverse=True)

    n = len(impacts)
    for rank, (_, idx) in enumerate(impacts):
        pct = (rank + 1) / n if n > 0 else 1.0
        if pct <= 0.2 and (breakdown[idx].cost > 0 or breakdown[idx].latency > 0):
            breakdown[idx].bottleneck_severity = "high"
        elif pct <= 0.5 and (breakdown[idx].cost > 0 or breakdown[idx].latency > 0):
            breakdown[idx].bottleneck_severity = "medium"
        else:
            breakdown[idx].bottleneck_severity = "low"


# ── Health scoring ──────────────────────────────────────────────

def _compute_health_score(
    breakdown: List[NodeEstimation],
    detected_cycles: List[CycleInfo],
    nodes: List[NodeConfig],
    total_cost: float,
    total_latency: float,
    critical_path_latency: float,
) -> HealthScore:
    """Compute an opinionated health grade (A–F) and badge list.

    Factors (each 0–25 pts, higher = better):
      1. cost_concentration  — penalise if top 1-2 nodes hold >60% of cost
      2. loop_risk           — penalise cycles, especially high/critical risk
      3. model_cost_tier     — penalise heavy use of premium models (>$10/M)
      4. latency_balance     — penalise if critical path >> parallelisable latency
    """
    badges: list[str] = []
    details: dict = {}

    # ── Factor 1: Cost concentration (0-25) ─────────────────
    cost_shares = sorted(
        [b.cost_share for b in breakdown if b.cost > 0], reverse=True
    )
    top2_share = sum(cost_shares[:2]) if cost_shares else 0.0
    if top2_share <= 0.4:
        cost_score = 25
        badges.append("Cost-efficient")
    elif top2_share <= 0.6:
        cost_score = 18
    elif top2_share <= 0.8:
        cost_score = 10
        badges.append("Cost-concentrated")
    else:
        cost_score = 3
        badges.append("Cost-concentrated")
    details["cost_concentration"] = {
        "score": cost_score,
        "top2_share": round(top2_share, 3),
    }

    # ── Factor 2: Loop risk (0-25) ──────────────────────────
    if not detected_cycles:
        loop_score = 25
        badges.append("Loop-free")
    else:
        risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for c in detected_cycles:
            risk_counts[c.risk_level or "low"] += 1

        if risk_counts["critical"] > 0:
            loop_score = 3
            badges.append("Loop-heavy")
        elif risk_counts["high"] > 0:
            loop_score = 10
            badges.append("Loop-heavy")
        elif risk_counts["medium"] > 0:
            loop_score = 18
        else:
            loop_score = 22
    details["loop_risk"] = {
        "score": loop_score,
        "cycle_count": len(detected_cycles),
    }

    # ── Factor 3: Premium model usage (0-25) ────────────────
    agent_nodes = [n for n in nodes if n.type == "agentNode"]
    premium_count = 0
    for n in agent_nodes:
        if n.model_provider and n.model_name:
            entry = registry.get(n.model_provider, n.model_name)
            if entry and entry.input_per_million > _HIGH_COST_MODEL_THRESHOLD:
                premium_count += 1

    premium_ratio = premium_count / len(agent_nodes) if agent_nodes else 0.0
    if premium_ratio <= 0.2:
        model_score = 25
        if agent_nodes:
            badges.append("Budget-friendly")
    elif premium_ratio <= 0.5:
        model_score = 18
    elif premium_ratio <= 0.8:
        model_score = 10
        badges.append("High premium-model usage")
    else:
        model_score = 3
        badges.append("High premium-model usage")
    details["premium_models"] = {
        "score": model_score,
        "premium_ratio": round(premium_ratio, 3),
    }

    # ── Factor 4: Latency balance (0-25) ────────────────────
    if total_latency > 0 and critical_path_latency > 0:
        parallelism_benefit = 1.0 - (critical_path_latency / total_latency)
        # Higher benefit = better parallelism = better score
        if parallelism_benefit >= 0.3:
            latency_score = 25
        elif parallelism_benefit >= 0.15:
            latency_score = 20
        elif parallelism_benefit >= 0.05:
            latency_score = 15
        else:
            latency_score = 8
            badges.append("Latency-sensitive")
    else:
        latency_score = 15  # can't assess
    details["latency_balance"] = {
        "score": latency_score,
        "critical_vs_total": round(
            critical_path_latency / max(total_latency, 0.001), 3
        ),
    }

    # ── Composite score and grade ───────────────────────────
    composite = cost_score + loop_score + model_score + latency_score  # 0-100
    if composite >= 85:
        grade = "A"
    elif composite >= 70:
        grade = "B"
    elif composite >= 55:
        grade = "C"
    elif composite >= 40:
        grade = "D"
    else:
        grade = "F"

    return HealthScore(
        grade=grade,
        score=composite,
        badges=badges,
        details=details,
    )


def estimate_workflow(
    nodes: List[NodeConfig],
    edges: List[EdgeConfig],
    recursion_limit: int = 25,
    runs_per_day: Optional[int] = None,
    loop_intensity: Optional[float] = None,
) -> WorkflowEstimation:
    """Estimate the full workflow: per‑node breakdown + graph analysis.

    Walks the graph to connect tools to their calling agents, then
    estimates each node with tool impacts folded in.

    For cyclic graphs:
      • Detects SCCs via Tarjan's algorithm
      • Nodes in a cycle get single-lap estimation in the breakdown
      • Total min/avg/max are computed by multiplying cycle-zone costs
        by iteration counts
    """
    node_map: Dict[str, NodeConfig] = {n.id: n for n in nodes}
    node_ids = [n.id for n in nodes]
    analyzer = GraphAnalyzer(node_ids, edges)

    # Build agent → [tool_nodes] mapping
    agent_tools = _build_tool_connections(nodes, edges)

    # Determine which nodes are in cycles
    cycle_node_ids: Set[str] = analyzer.get_nodes_in_cycles()
    is_cyclic = analyzer.is_cyclic()

    # ── Per-node estimation (single-lap) ────────────────────────
    breakdown: List[NodeEstimation] = []
    for node in nodes:
        in_cycle = node.id in cycle_node_ids
        if node.type == "agentNode":
            connected_tool_ids = agent_tools.get(node.id, [])
            connected_tools = [node_map[tid] for tid in connected_tool_ids if tid in node_map]
            breakdown.append(estimate_agent_node(node, connected_tools, in_cycle))
        elif node.type == "toolNode":
            breakdown.append(estimate_tool_node(node, in_cycle))
        else:
            breakdown.append(estimate_node(node, in_cycle))

    # ── Build CycleInfo objects + compute iteration counts ──────
    detected_cycles: List[CycleInfo] = []
    # Map: node_id → max_iterations for that cycle
    node_cycle_iterations: Dict[str, int] = {}

    if is_cyclic:
        li = loop_intensity if loop_intensity is not None else 1.0
        for idx, cg in enumerate(analyzer.get_cycle_groups()):
            # Max iterations: use the minimum max_steps among cycle's agent nodes,
            # falling back to default, then cap at recursion_limit
            agent_max_steps = []
            for nid in cg.node_ids:
                nc = node_map.get(nid)
                if nc and nc.type == "agentNode" and nc.max_steps is not None:
                    agent_max_steps.append(nc.max_steps)

            max_iter = min(agent_max_steps) if agent_max_steps else _DEFAULT_MAX_STEPS
            max_iter = min(max_iter, recursion_limit)
            # Apply loop intensity multiplier
            max_iter = max(1, min(recursion_limit, round(max_iter * li)))
            expected_iter = max(1, math.ceil(max_iter / 2))

            for nid in cg.node_ids:
                node_cycle_iterations[nid] = max_iter

            labels = [
                (node_map[nid].label or nid) for nid in cg.node_ids if nid in node_map
            ]

            detected_cycles.append(CycleInfo(
                cycle_id=idx,
                node_ids=cg.node_ids,
                node_labels=labels,
                back_edges=[[src, tgt] for src, tgt in cg.back_edges],
                max_iterations=max_iter,
                expected_iterations=expected_iter,
            ))

    # ── Aggregate totals (single-pass = what the breakdown shows) ──
    total_tokens = sum(b.tokens for b in breakdown)
    total_input = sum(b.input_tokens for b in breakdown)
    total_output = sum(b.output_tokens for b in breakdown)
    total_cost = round(sum(b.cost for b in breakdown), 8)
    total_latency = round(sum(b.latency for b in breakdown), 3)
    total_tool_latency = round(sum(b.tool_latency for b in breakdown), 3)

    # ── Compute min / avg / max ranges ──────────────────────────
    token_range: Optional[EstimationRange] = None
    cost_range: Optional[EstimationRange] = None
    latency_range: Optional[EstimationRange] = None

    if is_cyclic and detected_cycles:
        # DAG-zone contribution (nodes NOT in any cycle) — always single-pass
        dag_tokens = sum(b.tokens for b in breakdown if not b.in_cycle)
        dag_cost = sum(b.cost for b in breakdown if not b.in_cycle)
        dag_latency = sum(b.latency for b in breakdown if not b.in_cycle)

        # Cycle-zone contribution per cycle
        cycle_tokens_min = 0.0
        cycle_tokens_avg = 0.0
        cycle_tokens_max = 0.0
        cycle_cost_min = 0.0
        cycle_cost_avg = 0.0
        cycle_cost_max = 0.0
        cycle_latency_min = 0.0
        cycle_latency_avg = 0.0
        cycle_latency_max = 0.0

        for ci in detected_cycles:
            cycle_node_set = set(ci.node_ids)
            # Sum single-lap cost for nodes in this cycle
            lap_tokens = sum(b.tokens for b in breakdown if b.node_id in cycle_node_set)
            lap_cost = sum(b.cost for b in breakdown if b.node_id in cycle_node_set)
            lap_latency = sum(b.latency for b in breakdown if b.node_id in cycle_node_set)

            # min = 1 lap, avg = expected_iterations laps, max = max_iterations laps
            cycle_tokens_min += lap_tokens * 1
            cycle_tokens_avg += lap_tokens * ci.expected_iterations
            cycle_tokens_max += lap_tokens * ci.max_iterations

            cycle_cost_min += lap_cost * 1
            cycle_cost_avg += lap_cost * ci.expected_iterations
            cycle_cost_max += lap_cost * ci.max_iterations

            cycle_latency_min += lap_latency * 1
            cycle_latency_avg += lap_latency * ci.expected_iterations
            cycle_latency_max += lap_latency * ci.max_iterations

        token_range = EstimationRange(
            min=round(dag_tokens + cycle_tokens_min),
            avg=round(dag_tokens + cycle_tokens_avg),
            max=round(dag_tokens + cycle_tokens_max),
        )
        cost_range = EstimationRange(
            min=round(dag_cost + cycle_cost_min, 6),
            avg=round(dag_cost + cycle_cost_avg, 6),
            max=round(dag_cost + cycle_cost_max, 6),
        )
        latency_range = EstimationRange(
            min=round(dag_latency + cycle_latency_min, 3),
            avg=round(dag_latency + cycle_latency_avg, 3),
            max=round(dag_latency + cycle_latency_max, 3),
        )

        # The "totals" in the response represent the average case
        total_tokens = int(token_range.avg)
        total_input = int(sum(
            b.input_tokens * (node_cycle_iterations.get(b.node_id, 1) // 2 or 1)
            if b.in_cycle else b.input_tokens
            for b in breakdown
        ))
        total_output = int(sum(
            b.output_tokens * (node_cycle_iterations.get(b.node_id, 1) // 2 or 1)
            if b.in_cycle else b.output_tokens
            for b in breakdown
        ))
        total_cost = round(cost_range.avg, 8)
        total_latency = round(latency_range.avg, 3)

    # ── Bottleneck analysis: cost_share, latency_share, severity ──
    _compute_bottleneck_shares(breakdown, total_cost, total_latency)

    # ── Cycle contribution analysis: per-lap costs, risk levels ──
    if detected_cycles:
        _compute_cycle_contributions(detected_cycles, breakdown, total_cost, total_latency)

    # ── Latency-weighted critical path ──────────────────────────
    latency_map: Dict[str, float] = {b.node_id: b.latency for b in breakdown}
    critical_path = analyzer.weighted_critical_path(latency_map)
    critical_path_latency = round(sum(latency_map.get(nid, 0.0) for nid in critical_path), 4)

    # ── Parallelism analysis ────────────────────────────────────
    breakdown_map: Dict[str, NodeEstimation] = {b.node_id: b for b in breakdown}
    raw_steps = analyzer.compute_parallel_steps()
    parallel_steps: List[ParallelStep] = []
    for step_idx, step_node_ids in enumerate(raw_steps):
        step_latencies = [latency_map.get(nid, 0.0) for nid in step_node_ids]
        step_costs = [breakdown_map[nid].cost for nid in step_node_ids if nid in breakdown_map]
        step_labels = [
            (node_map[nid].label or nid) for nid in step_node_ids if nid in node_map
        ]
        parallel_steps.append(ParallelStep(
            step=step_idx,
            node_ids=step_node_ids,
            node_labels=step_labels,
            total_latency=round(max(step_latencies) if step_latencies else 0.0, 4),
            total_cost=round(sum(step_costs), 8),
            parallelism=len(step_node_ids),
        ))

    # ── Scaling projection (what-if analysis) ─────────────────────
    scaling_projection: Optional[ScalingProjection] = None
    if runs_per_day is not None:
        rpd = max(1, runs_per_day)
        rpm = rpd * 30
        li_val = loop_intensity if loop_intensity is not None else 1.0
        scaling_projection = ScalingProjection(
            runs_per_day=rpd,
            runs_per_month=rpm,
            loop_intensity=li_val,
            monthly_cost=round(total_cost * rpm, 4),
            monthly_tokens=total_tokens * rpm,
            monthly_compute_seconds=round(total_latency * rpm, 2),
            cost_per_1k_runs=round(total_cost * 1000, 6),
        )

    # ── Sensitivity readout (cost / latency across min/avg/max) ──
    sensitivity: Optional[SensitivityReadout] = None
    if is_cyclic and cost_range and latency_range:
        sensitivity = SensitivityReadout(
            cost_min=cost_range.min,
            cost_avg=cost_range.avg,
            cost_max=cost_range.max,
            latency_min=latency_range.min,
            latency_avg=latency_range.avg,
            latency_max=latency_range.max,
        )
    else:
        # DAG: no variance — min = avg = max
        sensitivity = SensitivityReadout(
            cost_min=total_cost,
            cost_avg=total_cost,
            cost_max=total_cost,
            latency_min=total_latency,
            latency_avg=total_latency,
            latency_max=total_latency,
        )

    # ── Health scoring ────────────────────────────────────────────
    health = _compute_health_score(
        breakdown, detected_cycles, nodes, total_cost, total_latency, critical_path_latency
    )

    return WorkflowEstimation(
        total_tokens=total_tokens,
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_cost=total_cost,
        total_latency=total_latency,
        total_tool_latency=total_tool_latency,
        graph_type=analyzer.classify(),
        breakdown=breakdown,
        critical_path=critical_path,
        detected_cycles=detected_cycles,
        token_range=token_range,
        cost_range=cost_range,
        latency_range=latency_range,
        recursion_limit=recursion_limit,
        parallel_steps=parallel_steps,
        critical_path_latency=critical_path_latency,
        scaling_projection=scaling_projection,
        sensitivity=sensitivity,
        health=health,
    )
