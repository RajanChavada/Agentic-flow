"""Graph utilities – cycle detection, SCC analysis, topological sort, critical‑path."""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple

from models import EdgeConfig, NodeConfig


class CycleGroup:
    """A strongly connected component (SCC) containing ≥ 2 nodes — i.e. a loop."""

    __slots__ = ("node_ids", "back_edges")

    def __init__(self, node_ids: List[str], back_edges: List[Tuple[str, str]]) -> None:
        self.node_ids = node_ids
        self.back_edges = back_edges  # edges that form the loop

    def __repr__(self) -> str:
        return f"CycleGroup(nodes={self.node_ids}, back_edges={self.back_edges})"


class BranchPath:
    """A single execution path through condition branches."""

    __slots__ = ("path_id", "probability", "node_ids", "condition_values")

    def __init__(
        self,
        path_id: str,
        probability: float,
        node_ids: Set[str],
        condition_values: Dict[str, bool],
    ) -> None:
        self.path_id = path_id
        self.probability = probability
        self.node_ids = node_ids
        self.condition_values = condition_values

    def __repr__(self) -> str:
        return f"BranchPath(id={self.path_id}, prob={self.probability:.3f}, nodes={len(self.node_ids)})"


class GraphAnalyzer:
    """Analyse the workflow graph built from a list of edges.

    Supports:
      • DFS‑based cycle detection
      • Tarjan's SCC algorithm (finds all loops)
      • Back‑edge identification per SCC
      • Kahn's topological sort (DAG only)
      • Critical‑path stub
    """

    def __init__(self, node_ids: List[str], edges: List[EdgeConfig]) -> None:
        self.node_ids = node_ids
        self.edges = edges
        self.adj: Dict[str, List[str]] = defaultdict(list)
        self.in_degree: Dict[str, int] = {nid: 0 for nid in node_ids}

        for edge in edges:
            self.adj[edge.source].append(edge.target)
            self.in_degree.setdefault(edge.target, 0)
            self.in_degree[edge.target] += 1

        # Lazily computed
        self._sccs: List[List[str]] | None = None
        self._cycle_groups: List[CycleGroup] | None = None

    # ── Public API ──────────────────────────────────────────────

    def is_cyclic(self) -> bool:
        """Return True if the graph contains at least one cycle (DFS)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {nid: WHITE for nid in self.node_ids}

        def _dfs(node: str) -> bool:
            color[node] = GRAY
            for neighbour in self.adj[node]:
                if color[neighbour] == GRAY:
                    return True  # back‑edge → cycle
                if color[neighbour] == WHITE and _dfs(neighbour):
                    return True
            color[node] = BLACK
            return False

        return any(
            _dfs(nid) for nid in self.node_ids if color[nid] == WHITE
        )

    def topological_order(self) -> List[str]:
        """Kahn's algorithm – returns topological ordering or empty list if cyclic."""
        in_deg = dict(self.in_degree)
        queue: deque[str] = deque(
            nid for nid, deg in in_deg.items() if deg == 0
        )
        order: List[str] = []

        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbour in self.adj[node]:
                in_deg[neighbour] -= 1
                if in_deg[neighbour] == 0:
                    queue.append(neighbour)

        return order if len(order) == len(self.node_ids) else []

    def classify(self) -> str:
        """Return 'DAG' or 'CYCLIC'."""
        return "CYCLIC" if self.is_cyclic() else "DAG"

    def critical_path(self) -> List[str]:
        """MVP critical path – just the topological order (longest‑latency weighting later)."""
        order = self.topological_order()
        return order if order else self.node_ids  # fallback for cyclic graphs

    def compute_critical_path(self, latency_map: Dict[str, float]) -> List[str]:
        """Compute the longest-latency path through the graph.

        Uses latency-weighted dynamic programming on the DAG. For cyclic
        graphs, returns a best-effort fallback path based on the current node
        ordering so callers still get a stable path summary.
        """
        order = self.topological_order()
        if not order:
            return self.node_ids
        return self.weighted_critical_path(latency_map)

    def compute_parallel_branch_latency(self, latency_map: Dict[str, float]) -> float:
        """Estimate latency contributed by parallel branches.

        For each non-condition fork node with multiple outgoing edges, compute
        the longest downstream latency among its outgoing branches and treat
        that as the parallel branch latency for the fork. The return value is
        the largest such branch latency, which is a useful summary of the
        workflow's widest parallel fan-out.
        """
        order = self.topological_order()
        if not order:
            return sum(latency_map.get(nid, 0.0) for nid in self.node_ids)

        downstream: Dict[str, float] = {nid: latency_map.get(nid, 0.0) for nid in self.node_ids}
        for u in reversed(order):
            children = self.adj.get(u, [])
            if not children:
                continue
            child_latencies = [downstream.get(v, latency_map.get(v, 0.0)) for v in children]
            downstream[u] = latency_map.get(u, 0.0) + max(child_latencies)

        fork_latencies: List[float] = []
        for u in order:
            children = self.adj.get(u, [])
            if len(children) <= 1:
                continue
            branch_latencies = [downstream.get(v, latency_map.get(v, 0.0)) for v in children]
            fork_latencies.append(max(branch_latencies))

        return max(fork_latencies) if fork_latencies else 0.0

    def weighted_critical_path(self, latency_map: Dict[str, float]) -> List[str]:
        """Latency-weighted critical path using longest-path through the DAG.

        Uses dynamic programming on the topological order:
          dist[v] = max(dist[u] + latency[u]) for all u with edge u→v
        Then backtracks from the sink node with maximum distance.

        Falls back to topological order for cyclic graphs.
        """
        order = self.topological_order()
        if not order:
            return self.node_ids  # cyclic — fallback

        dist: Dict[str, float] = {nid: 0.0 for nid in self.node_ids}
        parent: Dict[str, str | None] = {nid: None for nid in self.node_ids}

        for u in order:
            for v in self.adj.get(u, []):
                new_dist = dist[u] + latency_map.get(u, 0.0)
                if new_dist >= dist[v] and parent[v] is None and u != v:
                    # Use >= so that zero-latency source nodes still
                    # establish a parent link on the first visit.
                    dist[v] = new_dist
                    parent[v] = u
                elif new_dist > dist[v]:
                    dist[v] = new_dist
                    parent[v] = u

        # Prefer sink nodes (no outgoing edges) as the endpoint
        sink_nodes = [nid for nid in order if not self.adj.get(nid)]
        candidates = sink_nodes if sink_nodes else order
        end_node = max(candidates, key=lambda n: dist[n] + latency_map.get(n, 0.0))

        # Backtrack to build the path
        path: List[str] = [end_node]
        current = end_node
        while parent[current] is not None:
            current = parent[current]  # type: ignore[assignment]
            path.append(current)
        path.reverse()
        return path

    def compute_parallel_steps(self) -> List[List[str]]:
        """Compute parallelism levels using BFS level-order traversal.

        Each "step" contains nodes that can execute in parallel (same BFS depth).
        Only works cleanly for DAGs; for cyclic graphs, returns a best-effort
        approximation using the topo-order fallback.
        """
        order = self.topological_order()
        if not order:
            # Cyclic: just return all nodes as a single step
            return [self.node_ids]

        # Compute depth for each node (longest path from any source)
        depth: Dict[str, int] = {nid: 0 for nid in self.node_ids}
        for u in order:
            for v in self.adj.get(u, []):
                depth[v] = max(depth[v], depth[u] + 1)

        # Group nodes by depth
        max_depth = max(depth.values()) if depth else 0
        steps: List[List[str]] = [[] for _ in range(max_depth + 1)]
        for nid in order:
            steps[depth[nid]].append(nid)

        return steps

    # ── Tarjan's SCC ────────────────────────────────────────────

    def _compute_sccs(self) -> List[List[str]]:
        """Tarjan's algorithm for strongly connected components."""
        index_counter = [0]
        stack: List[str] = []
        on_stack: Set[str] = set()
        lowlink: Dict[str, int] = {}
        index: Dict[str, int] = {}
        result: List[List[str]] = []

        def strongconnect(v: str) -> None:
            index[v] = index_counter[0]
            lowlink[v] = index_counter[0]
            index_counter[0] += 1
            stack.append(v)
            on_stack.add(v)

            for w in self.adj.get(v, []):
                if w not in index:
                    strongconnect(w)
                    lowlink[v] = min(lowlink[v], lowlink[w])
                elif w in on_stack:
                    lowlink[v] = min(lowlink[v], index[w])

            # Root of an SCC
            if lowlink[v] == index[v]:
                component: List[str] = []
                while True:
                    w = stack.pop()
                    on_stack.discard(w)
                    component.append(w)
                    if w == v:
                        break
                result.append(component)

        for nid in self.node_ids:
            if nid not in index:
                strongconnect(nid)

        return result

    @property
    def sccs(self) -> List[List[str]]:
        """Cached list of all SCCs."""
        if self._sccs is None:
            self._sccs = self._compute_sccs()
        return self._sccs

    def get_cycle_groups(self) -> List[CycleGroup]:
        """Return CycleGroups — SCCs with ≥ 2 nodes (actual loops).

        Also identifies which edges within each SCC are the back‑edges
        that complete the loop.
        """
        if self._cycle_groups is not None:
            return self._cycle_groups

        groups: List[CycleGroup] = []
        for scc in self.sccs:
            if len(scc) < 2:
                continue

            scc_set = set(scc)
            # Find back-edges: edges within the SCC whose target has a
            # higher in-degree within the SCC (i.e. they loop back).
            # Simpler: any edge where both source and target are in the SCC.
            internal_edges = [
                (e.source, e.target)
                for e in self.edges
                if e.source in scc_set and e.target in scc_set
            ]

            # Identify back-edges by doing a DFS within the SCC
            back_edges = self._find_back_edges_in_subgraph(scc, scc_set)

            groups.append(CycleGroup(node_ids=scc, back_edges=back_edges))

        self._cycle_groups = groups
        return groups

    def _find_back_edges_in_subgraph(
        self, scc: List[str], scc_set: Set[str]
    ) -> List[Tuple[str, str]]:
        """DFS within an SCC to find back-edges (edges that form cycles)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {nid: WHITE for nid in scc}
        back_edges: List[Tuple[str, str]] = []

        def _dfs(node: str) -> None:
            color[node] = GRAY
            for neighbour in self.adj.get(node, []):
                if neighbour not in scc_set:
                    continue
                if color.get(neighbour) == GRAY:
                    back_edges.append((node, neighbour))
                elif color.get(neighbour) == WHITE:
                    _dfs(neighbour)
            color[node] = BLACK

        for nid in scc:
            if color[nid] == WHITE:
                _dfs(nid)

        return back_edges

    def get_nodes_in_cycles(self) -> Set[str]:
        """Return the set of all node ids that participate in any cycle."""
        result: Set[str] = set()
        for cg in self.get_cycle_groups():
            result.update(cg.node_ids)
        return result

    def get_nodes_outside_cycles(self) -> List[str]:
        """Return node ids that are NOT part of any cycle."""
        in_cycle = self.get_nodes_in_cycles()
        return [nid for nid in self.node_ids if nid not in in_cycle]

    # ── Condition branch enumeration ─────────────────────────────

    def get_condition_branches(
        self, node_map: Dict[str, NodeConfig]
    ) -> Dict[str, Tuple[Set[str], Set[str]]]:
        """For each condition node, find true-branch and false-branch target nodes.

        Inspects ``source_handle`` on each edge:
          • handle containing ``"right"`` → True branch target
          • handle containing ``"bottom"`` → False branch target

        Returns:
            ``{condition_id: (true_target_ids, false_target_ids)}``
        """
        branches: Dict[str, Tuple[Set[str], Set[str]]] = {}

        for edge in self.edges:
            src_node = node_map.get(edge.source)
            if src_node is None or src_node.type != "conditionNode":
                continue

            if edge.source not in branches:
                branches[edge.source] = (set(), set())

            handle = edge.source_handle or ""
            if "right" in handle:
                branches[edge.source][0].add(edge.target)
            elif "bottom" in handle:
                branches[edge.source][1].add(edge.target)

        return branches

    def enumerate_branch_paths(
        self,
        condition_probs: Dict[str, float],
        node_map: Dict[str, NodeConfig],
    ) -> List[BranchPath]:
        """Enumerate all valid execution paths through condition branches.

        For each combination of True/False choices across all condition
        nodes, builds a filtered adjacency list and BFS-walks from start
        nodes to discover which nodes are reachable on that path.

        Args:
            condition_probs: ``{condition_id: probability}`` where
                probability is on the **0–100** scale (True-branch %).
            node_map: ``{node_id: NodeConfig}``

        Returns:
            List of :class:`BranchPath` objects, or **empty list** if
            there are no condition branches or > 32 possible paths
            (more than 5 binary conditions).
        """
        branches = self.get_condition_branches(node_map)
        if not branches:
            return []

        condition_ids = list(branches.keys())

        # Cap at 32 paths (5 binary conditions)
        if len(condition_ids) > 5:
            return []

        # Find start nodes (in_degree == 0)
        start_nodes = [nid for nid, deg in self.in_degree.items() if deg == 0]
        if not start_nodes:
            start_nodes = self.node_ids[:1]  # fallback

        paths: List[BranchPath] = []

        for combo_idx in range(2 ** len(condition_ids)):
            # Determine which branch to take for each condition
            condition_values: Dict[str, bool] = {}
            for i, cid in enumerate(condition_ids):
                condition_values[cid] = bool((combo_idx >> i) & 1)

            # Build filtered adjacency: for condition nodes, only follow
            # the edges matching the chosen branch direction.
            filtered_adj: Dict[str, List[str]] = defaultdict(list)
            for edge in self.edges:
                src_node = node_map.get(edge.source)
                if (
                    src_node is not None
                    and src_node.type == "conditionNode"
                    and edge.source in condition_values
                ):
                    handle = edge.source_handle or ""
                    chosen_true = condition_values[edge.source]
                    if chosen_true and "right" in handle:
                        filtered_adj[edge.source].append(edge.target)
                    elif not chosen_true and "bottom" in handle:
                        filtered_adj[edge.source].append(edge.target)
                    # Skip edges for the non-chosen branch
                else:
                    filtered_adj[edge.source].append(edge.target)

            # BFS from start nodes using filtered adjacency
            visited: Set[str] = set()
            queue: deque[str] = deque()
            for sn in start_nodes:
                if sn not in visited:
                    visited.add(sn)
                    queue.append(sn)

            while queue:
                node = queue.popleft()
                for neighbor in filtered_adj.get(node, []):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            # Compute probability as product of condition-branch choices
            probability = 1.0
            for cid, is_true in condition_values.items():
                p = condition_probs.get(cid, 50.0) / 100.0
                if is_true:
                    probability *= p
                else:
                    probability *= (1.0 - p)

            paths.append(BranchPath(
                path_id=f"path_{combo_idx}",
                probability=probability,
                node_ids=visited,
                condition_values=dict(condition_values),
            ))

        return paths
