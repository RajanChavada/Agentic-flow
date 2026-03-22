"""
Spec verification tests for the estimation engine.

Covers the three explicit ✅ Verify scenarios from ESTIMATION_GENERATION_SPEC.md:

  1. Multi-Model Comparison template — fork detection and parallel branch latency
  2. 3-node chain — context accumulation (Agent B inherits Agent A's output tokens)
  3. Looping agent — worst-case cost ≈ 10× best-case (maxLoopSteps=5, retryBudget=2)

These are integration-level unit tests against the Python estimator functions;
they do NOT require the HTTP server.
"""

import asyncio
import httpx
import pytest
from main import app


# ── Shared HTTP helper ────────────────────────────────────────────


async def _post(url: str, payload: dict) -> dict:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(url, json=payload)
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )
        return response.json()


# ─────────────────────────────────────────────────────────────────
# Verify 1: Multi-Model Comparison — fork + parallel branch latency
# Graph: start → agent1 + agent2 (parallel) → comparator → finish
# ─────────────────────────────────────────────────────────────────


def test_multi_model_comparison_fork_detection():
    """
    Spec §3.2 + §5.3 ✅ Verify.

    graph.forks should show start-1 as a fork with [agent-1, agent-2].
    graph.cycles should be [].
    latency.parallel_branches should have effective_latency_ms == max(branch latencies).
    """
    payload = {
        "nodes": [
            {"id": "start-1", "type": "startNode", "label": "Start"},
            {
                "id": "agent-1",
                "type": "agentNode",
                "label": "Model A",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o",
                "context": "You are a comparison agent for model A.",
                "task_type": "summarization",
                "expected_output_size": "medium",
            },
            {
                "id": "agent-2",
                "type": "agentNode",
                "label": "Model B",
                "model_provider": "Anthropic",
                "model_name": "claude-3-5-sonnet-20241022",
                "context": "You are a comparison agent for model B.",
                "task_type": "summarization",
                "expected_output_size": "short",
            },
            {
                "id": "comparator",
                "type": "agentNode",
                "label": "Comparator",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "Compare the two outputs.",
                "task_type": "classification",
                "expected_output_size": "short",
            },
            {"id": "finish-1", "type": "finishNode", "label": "Finish"},
        ],
        "edges": [
            {"id": "e1", "source": "start-1", "target": "agent-1"},
            {"id": "e2", "source": "start-1", "target": "agent-2"},
            {"id": "e3", "source": "agent-1", "target": "comparator"},
            {"id": "e4", "source": "agent-2", "target": "comparator"},
            {"id": "e5", "source": "comparator", "target": "finish-1"},
        ],
    }

    data = asyncio.run(_post("/api/estimate", payload))

    # ── Graph preprocessing ───────────────────────────────────────
    assert "graph" in data, "Response must include 'graph' key"
    graph = data["graph"]

    assert "forks" in graph
    assert "cycles" in graph
    assert "topological_order" in graph

    # start-1 is the fork with both agents as targets
    assert "start-1" in graph["forks"], (
        f"start-1 should be detected as a fork. forks={graph['forks']}"
    )
    fork_targets = graph["forks"]["start-1"]
    assert set(fork_targets) == {"agent-1", "agent-2"}, (
        f"Fork targets should be agent-1 and agent-2, got {fork_targets}"
    )

    # No cycles in this DAG
    assert graph["cycles"] == [], (
        f"Expected no cycles, got {graph['cycles']}"
    )

    # Topological order: start-1 should come first
    assert graph["topological_order"][0] == "start-1", (
        f"start-1 should be first in topological order, "
        f"got {graph['topological_order']}"
    )

    # ── Latency: parallel branch report ──────────────────────────
    assert "latency" in data, "Response must include 'latency' key"
    latency = data["latency"]
    assert "parallel_branches" in latency

    parallel_branches = latency["parallel_branches"]
    assert len(parallel_branches) >= 1, (
        "Expected at least one parallel branch entry"
    )

    # Find the branch rooted at start-1
    branch_report = next(
        (b for b in parallel_branches if b["fork_node"] == "start-1"), None
    )
    assert branch_report is not None, (
        f"Expected a parallel branch entry for fork_node=start-1, "
        f"got {parallel_branches}"
    )

    branch_latencies = branch_report["branch_latencies_ms"]
    effective = branch_report["effective_latency_ms"]
    assert len(branch_latencies) == 2, (
        f"Expected 2 branch latencies, got {branch_latencies}"
    )
    # effective_latency_ms must equal max, NOT sum (spec §5.3)
    assert effective == max(branch_latencies), (
        f"effective_latency_ms={effective} should equal "
        f"max({branch_latencies})={max(branch_latencies)}"
    )
    assert effective < sum(branch_latencies), (
        f"Parallel: effective latency {effective} should be less than sum "
        f"{sum(branch_latencies)}"
    )

    # Critical path routes through the slower parallel agent
    assert "critical_path_nodes" in latency
    critical_path = latency["critical_path_nodes"]
    # One of the two agents must be on the critical path
    assert "agent-1" in critical_path or "agent-2" in critical_path, (
        f"Critical path should include one of the parallel agents, "
        f"got {critical_path}"
    )


# ─────────────────────────────────────────────────────────────────
# Verify 2: 3-node chain — context accumulation
# Graph: start → agent-a (medium output) → agent-b → finish
# ─────────────────────────────────────────────────────────────────


def test_context_accumulation_chain():
    """
    Spec §4.4 + §4.6 ✅ Verify.

    agent-b's ancestor_tokens should equal agent-a's output_tokens.
    agent-b's total_input_tokens > agent-b's input_tokens (higher than independent).
    context_accumulation section must appear with an entry for agent-b.
    """
    payload = {
        "nodes": [
            {"id": "start", "type": "startNode", "label": "Start"},
            {
                "id": "agent-a",
                "type": "agentNode",
                "label": "Agent A",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "Produce a detailed analysis of the given document.",
                "task_type": "summarization",
                "expected_output_size": "medium",  # medium output: ~400 tokens midpoint
            },
            {
                "id": "agent-b",
                "type": "agentNode",
                "label": "Agent B",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "Refine the summary produced by Agent A.",
                "task_type": "summarization",
                "expected_output_size": "short",
            },
            {"id": "finish", "type": "finishNode", "label": "Finish"},
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "agent-a"},
            {"id": "e2", "source": "agent-a", "target": "agent-b"},
            {"id": "e3", "source": "agent-b", "target": "finish"},
        ],
    }

    data = asyncio.run(_post("/api/estimate", payload))

    # ── Per-node breakdown ───────────────────────────────────────
    breakdown_by_id = {b["node_id"]: b for b in data["breakdown"]}
    assert "agent-a" in breakdown_by_id
    assert "agent-b" in breakdown_by_id

    agent_a = breakdown_by_id["agent-a"]
    agent_b = breakdown_by_id["agent-b"]

    # Agent A has no ancestors → ancestor_tokens == 0
    assert agent_a["ancestor_tokens"] == 0, (
        f"Agent A should have no ancestor tokens, got {agent_a['ancestor_tokens']}"
    )

    # Agent B inherits Agent A's output (spec §4.4)
    assert agent_b["ancestor_tokens"] == agent_a["output_tokens"], (
        f"Agent B ancestor_tokens ({agent_b['ancestor_tokens']}) should equal "
        f"Agent A output_tokens ({agent_a['output_tokens']})"
    )

    # Agent B's total_input_tokens > base input_tokens (context adds overhead)
    assert agent_b["total_input_tokens"] >= agent_b["input_tokens"], (
        f"total_input_tokens ({agent_b['total_input_tokens']}) should be ≥ "
        f"input_tokens ({agent_b['input_tokens']})"
    )
    assert agent_b["total_input_tokens"] > agent_b["input_tokens"], (
        "Agent B's total_input_tokens should exceed base input_tokens "
        "because ancestor_tokens > 0"
    )

    # ── Context accumulation report ──────────────────────────────
    assert data.get("context_accumulation") is not None, (
        "context_accumulation section must appear in the report"
    )
    report = data["context_accumulation"]
    assert "breakdown" in report
    assert len(report["breakdown"]) >= 1

    # agent-b must appear in the accumulation breakdown
    accum_by_id = {row["node_id"]: row for row in report["breakdown"]}
    assert "agent-b" in accum_by_id, (
        f"agent-b should appear in context_accumulation.breakdown, "
        f"got node ids: {list(accum_by_id.keys())}"
    )

    b_row = accum_by_id["agent-b"]
    assert b_row["ancestor_token_contribution"] > 0, (
        "agent-b should have a positive ancestor_token_contribution"
    )
    assert b_row["accumulation_overhead_pct"] > 0, (
        "accumulation_overhead_pct should be positive for agent-b"
    )
    assert b_row["with_accumulation_cost_usd"] >= b_row["without_accumulation_cost_usd"], (
        "with_accumulation_cost should be ≥ without_accumulation_cost"
    )


# ─────────────────────────────────────────────────────────────────
# Verify 3: Looping agent — worst_case ≈ 10× best_case
# Graph: start → looping-agent (max_steps=5, retry_budget=2) → finish
# ─────────────────────────────────────────────────────────────────


def test_looping_agent_worst_case_cost_multiplier():
    """
    Spec §6.1 ✅ Verify.

    worst_case_usd should be approximately 10× best_case_usd
    (5 loop steps × 2 retry budget).

    The complexity label should reflect the loop (not 'Low').
    """
    payload = {
        "nodes": [
            {"id": "start", "type": "startNode", "label": "Start"},
            {
                "id": "loop-agent",
                "type": "agentNode",
                "label": "Looping Agent",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o-mini",
                "context": "You are an iterative refinement agent.",
                "task_type": "code_generation",
                "expected_output_size": "medium",
                "max_steps": 5,     # maxLoopSteps = 5
                "retry_budget": 2,  # retryBudget = 2
            },
            {"id": "finish", "type": "finishNode", "label": "Finish"},
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "loop-agent"},
            {"id": "e2", "source": "loop-agent", "target": "start"},  # back edge → loop
            {"id": "e3", "source": "loop-agent", "target": "finish"},
        ],
    }

    data = asyncio.run(_post("/api/estimate", payload))

    # ── Best / worst case cost ────────────────────────────────────
    assert "cost" in data, "Response must include 'cost' key"
    cost = data["cost"]
    assert "best_case_usd" in cost
    assert "worst_case_usd" in cost

    best = cost["best_case_usd"]
    worst = cost["worst_case_usd"]

    assert best > 0, f"best_case_usd must be > 0, got {best}"
    assert worst > best, (
        f"worst_case_usd ({worst}) should exceed best_case_usd ({best})"
    )

    # 5 steps × 2 retries = 10× multiplier; allow ±30% tolerance
    ratio = worst / best
    assert ratio >= 5.0, (
        f"worst/best ratio ({ratio:.1f}×) should be ≥ 5× for a "
        f"max_steps=5, retry_budget=2 looping agent"
    )

    # ── Complexity label reflects the loop ──────────────────────
    assert "summary" in data
    summary = data["summary"]
    assert summary.get("loops_detected", 0) >= 1, (
        f"loops_detected should be ≥ 1, got {summary.get('loops_detected')}"
    )
    assert summary["complexity_label"] != "Low", (
        f"A workflow with a loop should not have 'Low' complexity, "
        f"got '{summary['complexity_label']}'"
    )

    # Worst-case latency should also scale up
    assert "latency" in data
    latency = data["latency"]
    assert latency["worst_case_latency_ms"] >= latency["critical_path_ms"], (
        "worst_case_latency_ms should be ≥ critical_path_ms"
    )
