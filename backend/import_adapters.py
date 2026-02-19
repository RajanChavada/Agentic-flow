"""Import adapters – convert external workflow JSON to internal NodeConfig / EdgeConfig.

Supported formats:
  • generic  – simple { nodes: [...], edges: [...] } with minimal mapping
  • langgraph – LangGraph StateGraph-style JSON
  • custom   – passthrough with validation

Each adapter returns an ImportedWorkflow (list of NodeConfig + EdgeConfig + metadata).
"""

from __future__ import annotations

from typing import Callable, Dict, List

from models import (
    NodeConfig,
    EdgeConfig,
    ImportedWorkflow,
)

# ── Generic adapter ────────────────────────────────────────────


def import_generic(payload: dict) -> ImportedWorkflow:
    """Import a generic workflow JSON.

    Expected shape:
    {
      "nodes": [
        { "id": "a", "type": "agentNode", "label": "Researcher", ... },
        ...
      ],
      "edges": [
        { "source": "a", "target": "b" },
        ...
      ],
      "recursion_limit": 25   // optional
    }

    Node fields are mapped 1:1 to NodeConfig.  Unknown fields are
    silently dropped by Pydantic.
    """
    raw_nodes = payload.get("nodes", [])
    raw_edges = payload.get("edges", [])

    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
        raise ValueError("'nodes' and 'edges' must be arrays")

    nodes: List[NodeConfig] = []
    for i, rn in enumerate(raw_nodes):
        if not isinstance(rn, dict):
            raise ValueError(f"nodes[{i}] must be an object")
        if "id" not in rn:
            rn["id"] = f"imported-{i}"
        # Map common aliases
        rn.setdefault("type", _guess_node_type(rn))
        rn.setdefault("label", rn.get("name", rn["type"]))
        nodes.append(NodeConfig(**{k: v for k, v in rn.items() if k in NodeConfig.model_fields}))

    edges: List[EdgeConfig] = []
    for i, re in enumerate(raw_edges):
        if not isinstance(re, dict):
            raise ValueError(f"edges[{i}] must be an object")
        if "source" not in re or "target" not in re:
            raise ValueError(f"edges[{i}] must have 'source' and 'target'")
        edges.append(EdgeConfig(
            id=re.get("id", f"ie-{i}"),
            source=re["source"],
            target=re["target"],
        ))

    metadata = {}
    if "recursion_limit" in payload:
        metadata["recursion_limit"] = payload["recursion_limit"]
    if "name" in payload:
        metadata["name"] = payload["name"]

    return ImportedWorkflow(nodes=nodes, edges=edges, metadata=metadata)


# ── LangGraph adapter ──────────────────────────────────────────

_LANGGRAPH_TYPE_MAP: Dict[str, str] = {
    "__start__": "startNode",
    "__end__": "finishNode",
    "start": "startNode",
    "end": "finishNode",
    "tool": "toolNode",
    "tools": "toolNode",
    "agent": "agentNode",
}


def import_langgraph(payload: dict) -> ImportedWorkflow:
    """Import a LangGraph StateGraph-style JSON.

    Accepted shapes:
    1. { "nodes": [...], "edges": [...], "conditional_edges": [...] }
    2. { "graph": { "nodes": [...], "edges": [...] } }

    Node type mapping:
      __start__ → startNode
      __end__   → finishNode
      tool / tools → toolNode
      everything else → agentNode
    """
    # Unwrap "graph" wrapper if present
    if "graph" in payload and isinstance(payload["graph"], dict):
        graph = payload["graph"]
    else:
        graph = payload

    raw_nodes = graph.get("nodes", [])
    raw_edges = graph.get("edges", [])
    conditional_edges = graph.get("conditional_edges", [])

    if not isinstance(raw_nodes, list):
        raise ValueError("LangGraph payload must contain a 'nodes' array")

    nodes: List[NodeConfig] = []
    for i, rn in enumerate(raw_nodes):
        if isinstance(rn, str):
            # Simple format: nodes are just string names
            rn = {"id": rn, "name": rn}
        if not isinstance(rn, dict):
            raise ValueError(f"nodes[{i}] must be an object or string")
        node_id = rn.get("id", rn.get("name", f"lg-{i}"))
        node_name = rn.get("name", rn.get("id", f"LG Node {i}"))
        node_type = _LANGGRAPH_TYPE_MAP.get(node_name.lower(),
                    _LANGGRAPH_TYPE_MAP.get(rn.get("type", "").lower(), "agentNode"))

        nc = NodeConfig(
            id=str(node_id),
            type=node_type,
            label=node_name,
            model_provider=rn.get("model_provider", rn.get("llm_provider")),
            model_name=rn.get("model_name", rn.get("llm_model")),
            context=rn.get("system_prompt", rn.get("context", "")),
            task_type=rn.get("task_type"),
            expected_output_size=rn.get("expected_output_size"),
        )
        nodes.append(nc)

    edges: List[EdgeConfig] = []
    edge_idx = 0

    # Regular edges
    for re in raw_edges:
        if isinstance(re, (list, tuple)) and len(re) >= 2:
            edges.append(EdgeConfig(id=f"lge-{edge_idx}", source=str(re[0]), target=str(re[1])))
            edge_idx += 1
        elif isinstance(re, dict) and "source" in re and "target" in re:
            edges.append(EdgeConfig(
                id=re.get("id", f"lge-{edge_idx}"),
                source=str(re["source"]),
                target=str(re["target"]),
            ))
            edge_idx += 1

    # Conditional edges → flatten to regular edges for estimation
    for ce in conditional_edges:
        if isinstance(ce, dict):
            source = str(ce.get("source", ""))
            targets = ce.get("targets", ce.get("mapping", {}))
            if isinstance(targets, dict):
                for _cond, tgt in targets.items():
                    edges.append(EdgeConfig(id=f"lge-{edge_idx}", source=source, target=str(tgt)))
                    edge_idx += 1
            elif isinstance(targets, list):
                for tgt in targets:
                    edges.append(EdgeConfig(id=f"lge-{edge_idx}", source=source, target=str(tgt)))
                    edge_idx += 1

    metadata = {
        "source": "langgraph",
        "original_node_count": len(raw_nodes),
        "conditional_edge_count": len(conditional_edges),
    }

    return ImportedWorkflow(nodes=nodes, edges=edges, metadata=metadata)


# ── Custom adapter ─────────────────────────────────────────────


def import_custom(payload: dict) -> ImportedWorkflow:
    """Passthrough adapter – expects exact internal format."""
    return import_generic(payload)


# ── Adapter registry ───────────────────────────────────────────

_ADAPTERS: Dict[str, Callable[[dict], ImportedWorkflow]] = {
    "generic": import_generic,
    "langgraph": import_langgraph,
    "custom": import_custom,
}


def get_adapter(source: str) -> Callable[[dict], ImportedWorkflow]:
    """Return the import adapter for the given source format."""
    adapter = _ADAPTERS.get(source)
    if adapter is None:
        raise ValueError(f"Unknown import source: '{source}'. Supported: {list(_ADAPTERS.keys())}")
    return adapter


# ── Helpers ────────────────────────────────────────────────────


def _guess_node_type(node_dict: dict) -> str:
    """Heuristically guess the node type from common field names."""
    name = (node_dict.get("name", "") or node_dict.get("label", "") or "").lower()
    ntype = (node_dict.get("type", "") or "").lower()

    for keyword, mapped in _LANGGRAPH_TYPE_MAP.items():
        if keyword in name or keyword in ntype:
            return mapped

    if "model" in node_dict or "llm" in node_dict or "model_provider" in node_dict:
        return "agentNode"
    if "tool" in name or ntype == "tool":
        return "toolNode"
    return "agentNode"
