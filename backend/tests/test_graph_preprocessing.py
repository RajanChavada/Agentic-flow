"""Unit tests for graph preprocessing helpers."""

from models import EdgeConfig, NodeConfig
from estimator import build_graph, detect_cycles, detect_forks, topological_sort


def _node(node_id: str, node_type: str = "agentNode") -> NodeConfig:
    return NodeConfig(id=node_id, type=node_type, label=node_id)


def test_graph_preprocessing_helpers_produce_stable_results():
    nodes = [
        _node("start", "startNode"),
        _node("fork"),
        _node("left"),
        _node("right"),
        _node("loop"),
    ]
    edges = [
        EdgeConfig(source="start", target="fork"),
        EdgeConfig(source="fork", target="left"),
        EdgeConfig(source="fork", target="right"),
        EdgeConfig(source="right", target="fork"),
        EdgeConfig(source="fork", target="left"),
    ]

    node_map, successors, predecessors = build_graph(nodes, edges)
    forks = detect_forks(node_map, successors)
    back_edges, back_edge_set = detect_cycles(node_map, successors)
    order = topological_sort(node_map, successors, back_edge_set)

    assert successors["fork"] == ["left", "right"]
    assert predecessors["left"] == ["fork"]
    assert forks == {"fork": ["left", "right"]}
    assert back_edges == [("right", "fork")]
    assert order[0] == "start"
    assert "fork" in order
