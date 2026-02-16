"""Graph utilities – cycle detection, SCC analysis, topological sort, critical‑path."""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple

from models import EdgeConfig


class CycleGroup:
    """A strongly connected component (SCC) containing ≥ 2 nodes — i.e. a loop."""

    __slots__ = ("node_ids", "back_edges")

    def __init__(self, node_ids: List[str], back_edges: List[Tuple[str, str]]) -> None:
        self.node_ids = node_ids
        self.back_edges = back_edges  # edges that form the loop

    def __repr__(self) -> str:
        return f"CycleGroup(nodes={self.node_ids}, back_edges={self.back_edges})"


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
