# Plan 04-1: Backend Branch Enumeration & Probability-Weighted Aggregation

## Goal
Add condition-branch path enumeration to graph_analyzer.py and probability-weighted cost/latency aggregation to estimator.py so that workflows with condition nodes produce min/expected/max ranges.

## Files to Modify

### 1. `backend/graph_analyzer.py` — Add branch path enumeration

Add method `enumerate_branch_paths()` to GraphAnalyzer:
- Walk edges, tracking `source_handle` ("s-right" = true branch, "s-bottom" = false branch for condition nodes)
- Build a mapping: `condition_node_id → { true_targets: [node_ids], false_targets: [node_ids] }`
- Return `List[BranchPath]` where each path has: path_id, probability (product of condition probabilities along it), and set of node_ids on that path
- Cap at 32 paths max (5 binary conditions); if exceeded, return None (fallback to simple aggregation)

Add helper `get_condition_branches()`:
- For each condition node, look at outgoing edges
- Edges with source_handle containing "right" → true branch targets
- Edges with source_handle containing "bottom" → false branch targets
- Return dict mapping condition_id → (true_target_ids, false_target_ids)

### 2. `backend/graph_analyzer.py` — Add BranchPath dataclass

```python
class BranchPath:
    path_id: str           # e.g., "path_0"
    probability: float     # product of condition probs (0.0–1.0)
    node_ids: Set[str]     # nodes executed on this path
    condition_values: Dict[str, bool]  # condition_id → True/False
```

### 3. `backend/estimator.py` — Add probability-weighted ranges

In `estimate_workflow()`, after per-node estimation:
- Check if any condition nodes exist with probability data
- If yes, call `analyzer.enumerate_branch_paths()` with condition probabilities
- If paths returned (≤32), compute per-path cost/latency by summing only nodes on each path
- Derive ranges:
  - min = lowest-cost path's cost
  - max = highest-cost path's cost
  - avg = sum(path_prob × path_cost) for all paths (expected value)
- Populate `token_range`, `cost_range`, `latency_range` with these values
- Update `sensitivity` to use branch-based ranges instead of flat values
- If graph is BOTH cyclic AND has conditions: combine — branch ranges × cycle ranges

### 4. `backend/models.py` — Add condition_branches to NodeEstimation (minimal)

Add optional field to NodeEstimation:
- `branch_probability: Optional[float]` — the expected execution probability of this node (product of all upstream condition probabilities)

This lets the frontend show "Executed ~80% of runs" per node.

### 5. `backend/tests/test_smoke.py` — Add branch estimation tests

Add 2-3 test cases:
- DAG with one condition node (70/30 split) → verify ranges are populated
- DAG with two sequential conditions → verify path enumeration produces 4 paths
- Condition node with no successors → verify graceful handling

## Verification
- `python -c "from main import app"` passes (via model import check)
- `python -m pytest tests/ -v` passes
- Manual: POST /api/estimate with condition workflow produces ranges
