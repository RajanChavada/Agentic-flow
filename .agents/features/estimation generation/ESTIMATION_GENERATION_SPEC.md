# Neurovn — Estimation Engine Specification

> Technical specification for the cost and latency estimation engine.  
> Scope: Graph traversal logic, token accumulation model, parallelism detection, report outputs.  
> This document is implementation-ready — agent/engineer should be able to build directly from this.

---

## 1. Overview

The estimation engine takes a Neurovn canvas (a directed graph of nodes and edges) and produces:

1. **Per-node cost breakdown** — input tokens, output tokens, cost in USD
2. **Per-node latency estimate** — execution time in milliseconds
3. **Workflow-level report** — best case, worst case, critical path, complexity rating

The engine runs entirely server-side (Python backend). No LLM calls are made. All values are derived from the graph structure and the model/tool registry.

---

## 2. Input Schema

The engine receives the `.neurovn.json` export format:

```json
{
  "schema_version": "1.0",
  "nodes": [ ...NodeObjects ],
  "edges": [ ...EdgeObjects ],
  "config": { "recursion_limit": 50 }
}
```

**NodeObject fields used by estimator:**

| Field | Type | Used for |
|-------|------|---------|
| `id` | string | Graph traversal identity |
| `type` | enum | Determines estimation strategy |
| `data.modelProvider` | string | Registry lookup |
| `data.modelName` | string | Registry lookup |
| `data.context` | string | System prompt token count |
| `data.taskType` | string | Output multiplier lookup |
| `data.expectedOutputSize` | string | Token range lookup |
| `data.maxOutputTokens` | int? | Output ceiling override |
| `data.maxLoopSteps` | int | Loop cost multiplier |
| `data.retryBudget` | int | Per-node retry multiplier |
| `data.expectedCallsPerRun` | int | Orchestrator multiplier |
| `data.tools` | string[]? | Tool schema token injection |
| `data.probability` | int | Condition branch weight (0–100) |

---

## 3. Graph Preprocessing

Before estimation, the raw node/edge list is converted into a traversal-ready graph structure.

### 3.1 Build Adjacency Structures

```python
def build_graph(nodes, edges):
    successors = defaultdict(list)   # node_id → [child_ids]
    predecessors = defaultdict(list) # node_id → [parent_ids]
    node_map = {n["id"]: n for n in nodes}

    for edge in edges:
        successors[edge["source"]].append(edge["target"])
        predecessors[edge["target"]].append(edge["source"])

    return node_map, successors, predecessors
```

### 3.2 Detect Parallel Forks

A **parallel fork** exists when a single node has 2+ successors AND at least one of those successors is not a conditionNode.

> Note: A conditionNode with 2 outputs (True/False) is a *branch*, not a parallel fork. Parallel forks are when the same node spawns multiple simultaneous execution paths — like a start node spawning 2 agent nodes.

```python
def detect_forks(node_map, successors):
    forks = {}  # source_id → [parallel_target_ids]
    for node_id, children in successors.items():
        node = node_map[node_id]
        if len(children) >= 2 and node["type"] != "conditionNode":
            forks[node_id] = children
    return forks
```

### 3.3 Detect Cycles (Loops)

Use DFS to find back-edges. A back-edge indicates a loop.

```python
def detect_cycles(node_map, successors):
    visited = set()
    rec_stack = set()
    back_edges = []

    def dfs(node_id):
        visited.add(node_id)
        rec_stack.add(node_id)
        for child in successors.get(node_id, []):
            if child not in visited:
                dfs(child)
            elif child in rec_stack:
                back_edges.append((node_id, child))
        rec_stack.discard(node_id)

    for node_id in node_map:
        if node_id not in visited:
            dfs(node_id)

    return back_edges
```

### 3.4 Topological Sort (for context accumulation)

Process nodes in topological order so each node's ancestors are fully estimated before it runs.

For graphs with cycles, break the cycle at back-edges before sorting. The loop node uses `maxLoopSteps` as its multiplier.

---

## 4. Token Estimation Model

### 4.1 Token Counting Utilities

```python
def count_tokens(text: str) -> int:
    # Approximation: 1 token ≈ 4 characters (conservative)
    # Use tiktoken for OpenAI models if available, else fallback
    return max(1, len(text) // 4)
```

### 4.2 Output Token Ranges

From `data.expectedOutputSize` (overridden by `data.maxOutputTokens` if set):

| expectedOutputSize | Token range | Midpoint used |
|---|---|---|
| `short` | 0–200 | 100 |
| `medium` | 200–600 | 400 |
| `long` | 600–1500 | 1050 |
| `very_long` | 1500+ | 2000 |
| `auto` | 1.5× input tokens | computed |

If `data.maxOutputTokens` is set, use `min(maxOutputTokens, range_midpoint)` as the output estimate.

### 4.3 Task Type Input Multipliers

From `data.taskType` — adjusts the assumed input complexity:

| taskType | Input multiplier | Rationale |
|---|---|---|
| `generic` | 1.0x | Baseline |
| `classification` | 0.8x | Short inputs |
| `summarization` | 2.0x | Long document inputs |
| `code_generation` | 1.5x | Spec + context |
| `rag_answering` | 2.5x | Retrieved chunks in context |
| `tool_orchestration` | 1.8x | Tool schemas + history |
| `routing` | 0.7x | Short routing prompts |

### 4.4 Context Window Accumulation

**This is the differentiating feature.** Each node's input includes the output of all its ancestor nodes along the path.

```python
def compute_accumulated_context(node_id, node_map, predecessors, node_estimates):
    """
    Returns the total tokens inherited from ancestor outputs.
    Only direct lineage (not parallel branches) accumulates.
    """
    accumulated = 0
    visited = set()
    queue = list(predecessors.get(node_id, []))

    while queue:
        parent_id = queue.pop(0)
        if parent_id in visited:
            continue
        visited.add(parent_id)

        parent = node_map[parent_id]
        if parent["type"] in ("agentNode",):
            accumulated += node_estimates[parent_id]["output_tokens"]

        queue.extend(predecessors.get(parent_id, []))

    return accumulated
```

### 4.5 Tool Schema Token Injection

When an agent node has tools bound (via `data.tools[]`), each tool's `schema_tokens` and `avg_response_tokens` are added to the node's input token count.

```python
def compute_tool_tokens(tool_ids: list, tool_registry) -> tuple[int, int]:
    schema_tokens = 0
    response_tokens = 0
    for tool_id in tool_ids:
        tool = tool_registry.get(tool_id)
        if tool:
            schema_tokens += tool.schema_tokens
            response_tokens += tool.avg_response_tokens
    return schema_tokens, response_tokens
```

### 4.6 Per-Node Token Computation

```python
def estimate_node_tokens(node, node_map, predecessors, node_estimates, tool_registry):
    if node["type"] != "agentNode":
        return None

    data = node["data"]
    model = model_registry.get(data["modelProvider"], data["modelName"])

    # Base system prompt
    system_tokens = count_tokens(data.get("context", ""))

    # Task type multiplier on assumed user input
    base_input = 500  # assumed user/upstream input baseline
    task_multiplier = TASK_TYPE_MULTIPLIERS.get(data.get("taskType", "generic"), 1.0)
    task_adjusted_input = int(base_input * task_multiplier)

    # Accumulated context from ancestors
    ancestor_tokens = compute_accumulated_context(
        node["id"], node_map, predecessors, node_estimates
    )

    # Tool schema injection
    tool_schema_tokens, tool_response_tokens = compute_tool_tokens(
        data.get("tools", []), tool_registry
    )

    # Total input
    total_input_tokens = (
        system_tokens
        + task_adjusted_input
        + ancestor_tokens
        + tool_schema_tokens
        + tool_response_tokens
    )

    # Output tokens
    output_tokens = compute_output_tokens(data)

    # Multipliers
    retry_budget = data.get("retryBudget", 1)
    calls_per_run = data.get("expectedCallsPerRun", 1)
    loop_steps = data.get("maxLoopSteps", 1) if is_in_loop(node["id"], back_edges) else 1

    effective_multiplier = retry_budget * calls_per_run * loop_steps

    return {
        "node_id": node["id"],
        "label": data.get("label", node["id"]),
        "model": f"{data['modelProvider']} / {data['modelName']}",
        "system_tokens": system_tokens,
        "ancestor_tokens": ancestor_tokens,
        "tool_tokens": tool_schema_tokens + tool_response_tokens,
        "total_input_tokens": total_input_tokens,
        "output_tokens": output_tokens,
        "effective_multiplier": effective_multiplier,
        "base_input_cost": (total_input_tokens / 1_000_000) * model.input_price_per_1m,
        "base_output_cost": (output_tokens / 1_000_000) * model.output_price_per_1m,
        "total_cost_per_call": (
            (total_input_tokens / 1_000_000) * model.input_price_per_1m +
            (output_tokens / 1_000_000) * model.output_price_per_1m
        ),
        "total_cost_with_multipliers": (
            (total_input_tokens / 1_000_000) * model.input_price_per_1m +
            (output_tokens / 1_000_000) * model.output_price_per_1m
        ) * effective_multiplier,
    }
```

---

## 5. Latency Estimation Model

### 5.1 Per-Node Latency

```python
def estimate_node_latency_ms(node, node_estimate, tool_registry) -> int:
    data = node["data"]
    model = model_registry.get(data["modelProvider"], data["modelName"])

    # LLM generation time: output_tokens / tokens_per_second
    generation_ms = int((node_estimate["output_tokens"] / model.tokens_per_second) * 1000)

    # Network overhead (time to first token)
    ttft_ms = model.ttft_ms  # from registry, e.g. 300ms for Anthropic hosted

    # Tool execution latency
    tool_latency_ms = 0
    for tool_id in data.get("tools", []):
        tool = tool_registry.get(tool_id)
        if tool:
            tool_latency_ms += tool.latency_ms

    # Loop multiplier
    loop_steps = data.get("maxLoopSteps", 1) if is_in_loop(...) else 1

    return (ttft_ms + generation_ms + tool_latency_ms) * loop_steps
```

### 5.2 Critical Path (Sequential Latency)

The critical path is the longest path from Start to Finish measured in latency (not hops).

```python
def compute_critical_path(node_map, successors, node_latencies):
    """
    Returns (total_latency_ms, [node_id, ...]) for the critical path.
    Uses dynamic programming over topological order.
    """
    topo_order = topological_sort(node_map, successors)
    dp = {node_id: 0 for node_id in node_map}
    path = {node_id: [] for node_id in node_map}

    for node_id in topo_order:
        lat = node_latencies.get(node_id, 0)
        for child_id in successors.get(node_id, []):
            candidate = dp[node_id] + lat
            if candidate > dp[child_id]:
                dp[child_id] = candidate
                path[child_id] = path[node_id] + [node_id]

    finish_id = find_finish_node(node_map)
    total = dp[finish_id] + node_latencies.get(finish_id, 0)
    return total, path[finish_id] + [finish_id]
```

### 5.3 Parallel Branch Latency

For each detected fork, the branch latency contribution is `max(latency of each parallel branch)`, not the sum.

```python
def compute_parallel_branch_latency(fork_id, parallel_targets, successors, node_latencies):
    branch_latencies = []
    for target_id in parallel_targets:
        branch_lat = sum_path_latency(target_id, successors, node_latencies)
        branch_latencies.append(branch_lat)
    return max(branch_latencies)  # parallel — only the slowest branch matters
```

---

## 6. Workflow-Level Report

### 6.1 Best Case vs Worst Case

| Scenario | Definition |
|----------|-----------|
| **Best case cost** | All agents run once, no retries, condition branches take the cheaper path, loops execute 1 step |
| **Worst case cost** | All agents run at `retryBudget` × `maxLoopSteps` × `expectedCallsPerRun`, condition branches take the more expensive path |
| **Best case latency** | Critical path latency with all loop steps = 1 |
| **Worst case latency** | Critical path latency with all loop steps = `maxLoopSteps` |

### 6.2 Report Output Schema

```json
{
  "workflow_name": "Multi-Model Comparison",
  "generated_at": "2026-03-22T15:04:51Z",
  "summary": {
    "total_nodes": 5,
    "agent_nodes": 3,
    "tool_nodes": 0,
    "condition_nodes": 1,
    "loops_detected": 0,
    "parallel_forks_detected": 1,
    "graph_depth": 3,
    "complexity_score": 3,
    "complexity_label": "Medium"
  },
  "cost": {
    "best_case_usd": 0.028,
    "worst_case_usd": 0.141,
    "breakdown": [
      {
        "node_id": "agent-1",
        "label": "GPT-4o Responder",
        "model": "OpenAI / GPT-4o",
        "input_tokens": 842,
        "output_tokens": 400,
        "ancestor_tokens": 0,
        "tool_tokens": 0,
        "cost_per_call_usd": 0.011,
        "effective_multiplier": 1,
        "total_cost_usd": 0.011
      }
    ]
  },
  "latency": {
    "critical_path_ms": 2100,
    "critical_path_nodes": ["start-1", "agent-1", "agent-3", "finish-1"],
    "parallel_branches": [
      {
        "fork_node": "start-1",
        "branches": ["agent-1", "agent-2"],
        "branch_latencies_ms": [1200, 950],
        "effective_latency_ms": 1200,
        "note": "Parallel — slowest branch determines latency"
      }
    ],
    "worst_case_latency_ms": 2100
  },
  "context_accumulation": {
    "note": "Accumulated context adds upstream output tokens to each node's input",
    "breakdown": [
      {
        "node_id": "agent-3",
        "label": "Comparator",
        "ancestor_token_contribution": 800,
        "without_accumulation_cost_usd": 0.006,
        "with_accumulation_cost_usd": 0.009,
        "accumulation_overhead_pct": 50
      }
    ]
  }
}
```

### 6.3 Estimation Report UI Sections

The frontend report panel renders the following sections after "Run Workflow & Gen Estimate":

**1. Summary Cards (top row)**
- Total cost range: `$0.028 – $0.141 / run`
- Critical path latency: `~2.1s`
- Complexity: `Medium`
- Parallel forks: `1 detected`

**2. Cost Breakdown Table**
- One row per agent node
- Columns: Node, Model, Input tokens, Output tokens, Ancestor tokens, Cost/call, Multiplier, Total
- Subtotal row
- Color-code rows by cost (green < $0.01, yellow $0.01–$0.05, red > $0.05)

**3. Context Accumulation Section**
- Visible only if any node has `ancestor_tokens > 0`
- Shows "base cost vs accumulated cost" comparison
- Callout: "Context accumulation adds X% to total workflow cost"

**4. Latency Breakdown**
- Visual timeline of critical path nodes (horizontal bar, proportional to latency)
- Parallel branch callout: "Agents A and B run in parallel — latency is max(A, B), not A+B"

**5. Best / Worst Case Comparison**
```
                    Best Case    Worst Case
Cost per run:       $0.028       $0.141
Latency:            ~2.1s        ~8.4s
Token usage:        1,842        9,210
```

---

## 7. Graph Complexity Score (Canvas Bar)

Replaces the old R/W/X/N bar. Computed live on every canvas mutation.

```python
def compute_complexity_score(node_map, successors, back_edges, forks) -> dict:
    agent_nodes = [n for n in node_map.values() if n["type"] == "agentNode"]
    condition_nodes = [n for n in node_map.values() if n["type"] == "conditionNode"]
    depth = compute_max_depth(node_map, successors)
    loops = len(back_edges)
    branches = len(condition_nodes)
    parallel = len(forks)

    score = 0
    if len(agent_nodes) > 5:  score += 1
    if len(agent_nodes) > 10: score += 1
    if depth > 4:             score += 1
    if loops >= 1:            score += 1
    if loops > 3:             score += 1
    if branches >= 2:         score += 1
    if parallel >= 1:         score += 1

    label = ["Low", "Low", "Medium", "Medium", "High", "High", "Very High", "Very High"][min(score, 7)]

    return {
        "nodes": len(agent_nodes),
        "depth": depth,
        "loops": loops,
        "branches": branches,
        "score": score,
        "label": label
    }
```

**Canvas bar display:**
```
nodes: 5  |  depth: 3  |  loops: 1  |  branches: 2  |  complexity: Medium  ⓘ
```

Hover on `complexity: Medium` shows:
> "Agentic complexity score. Higher scores indicate more expensive and less predictable workflows. Based on node count, depth, loops, branching, and parallelism."

---

## 8. Live Per-Node Cost Preview

For immediate feedback when the user changes model in config (before running full estimation):

```python
def quick_node_cost(data: dict, model_registry) -> float:
    """
    Fast single-node cost preview. No context accumulation.
    Used for live update on the node card.
    """
    model = model_registry.get(data["modelProvider"], data["modelName"])
    if not model:
        return None

    system_tokens = count_tokens(data.get("context", ""))
    assumed_input = 500  # baseline
    output_tokens = compute_output_tokens(data)

    total_input = system_tokens + assumed_input
    cost = (
        (total_input / 1_000_000) * model.input_price_per_1m +
        (output_tokens / 1_000_000) * model.output_price_per_1m
    )
    return round(cost, 5)
```

This value is returned from a lightweight endpoint (e.g. `POST /api/quick-estimate`) and displayed on the node card as `~$X.XXXXX / call`.

---

## 9. Endpoint Summary

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/estimate` | POST | Full `.neurovn.json` | Full report JSON (section 6.2) |
| `/api/quick-estimate` | POST | Single node `data` object | `{ cost_per_call: float, latency_ms: int }` |
| `/api/complexity` | POST | Full `.neurovn.json` | Complexity score object (section 7) |

---

*Document version: 1.0 — Neurovn estimation engine spec, March 2026*