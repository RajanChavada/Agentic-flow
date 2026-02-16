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
    output_tokens = int(base_context_tokens * _OUTPUT_RATIO)  # output based on base, not inflated by tool data
    total_tokens = input_tokens + output_tokens

    provider = node.model_provider or ""
    model = node.model_name or ""

    # ── Registry lookup ─────────────────────────────────────────
    pricing = registry.get(provider, model)

    if pricing is None:
        return NodeEstimation(
            node_id=node.id,
            node_name=node.label or node.type,
            tokens=total_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=0.0,
            input_cost=0.0,
            output_cost=0.0,
            latency=total_tool_latency,
            model_provider=provider or None,
            model_name=model or None,
            tool_id=None,
            tool_impacts=tool_impacts if tool_impacts else None,
            tool_schema_tokens=total_schema_tokens,
            tool_response_tokens=total_response_tokens,
            tool_latency=round(total_tool_latency, 3),
            in_cycle=in_cycle,
        )

    # ── Cost calculation ────────────────────────────────────────
    input_cost = (input_tokens / 1_000_000) * pricing.input_per_million
    output_cost = (output_tokens / 1_000_000) * pricing.output_per_million
    cost = round(input_cost + output_cost, 8)

    # ── Latency calculation ─────────────────────────────────────
    tps = pricing.tokens_per_sec or _DEFAULT_TPS
    llm_latency = output_tokens / tps
    total_latency = llm_latency + total_tool_latency

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
        tool_latency=round(total_tool_latency, 3),
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


def estimate_workflow(
    nodes: List[NodeConfig],
    edges: List[EdgeConfig],
    recursion_limit: int = 25,
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

    return WorkflowEstimation(
        total_tokens=total_tokens,
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_cost=total_cost,
        total_latency=total_latency,
        total_tool_latency=total_tool_latency,
        graph_type=analyzer.classify(),
        breakdown=breakdown,
        critical_path=analyzer.critical_path(),
        detected_cycles=detected_cycles,
        token_range=token_range,
        cost_range=cost_range,
        latency_range=latency_range,
        recursion_limit=recursion_limit,
    )
