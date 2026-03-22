"""Deterministic LangGraph transpiler.

Pure algorithmic functions — zero LLM calls, zero API calls.
Converts a .neurovn.json workflow definition into a LangGraph Python scaffold.
"""

from __future__ import annotations

import re
import keyword
from datetime import datetime, timezone
from typing import Any, Optional


# ── Section 3: Model string mapping ──────────────────────────────────────────

# Maps (provider_id_lower, model_name_lower_prefix) → (class_name, model_string)
# The model_name is passed through as-is when it is already a valid model id.
_PROVIDER_CLASS: dict[str, str] = {
    "openai": "ChatOpenAI",
    "anthropic": "ChatAnthropic",
    "google": "ChatGoogleGenerativeAI",
    "mistral": "ChatMistralAI",
    "groq": "ChatGroq",
    "cohere": "ChatCohere",
}

# ── Section 4: Provider import mapping ───────────────────────────────────────

_PROVIDER_IMPORTS: dict[str, str] = {
    "openai": "from langchain_openai import ChatOpenAI",
    "anthropic": "from langchain_anthropic import ChatAnthropic",
    "google": "from langchain_google_genai import ChatGoogleGenerativeAI",
    "mistral": "from langchain_mistralai import ChatMistralAI",
    "groq": "from langchain_groq import ChatGroq",
    "cohere": "from langchain_cohere import ChatCohere",
}

# ── Section 6: requirements.txt content ──────────────────────────────────────

_BASE_REQUIREMENTS = """\
langgraph>=0.2.0
langchain-core>=0.3.0
python-dotenv>=1.0.0
"""

_PROVIDER_REQUIREMENTS: dict[str, str] = {
    "openai": "langchain-openai>=0.2.0",
    "anthropic": "langchain-anthropic>=0.2.0",
    "google": "langchain-google-genai>=0.0.1",
    "mistral": "langchain-mistralai>=0.1.0",
    "groq": "langchain-groq>=0.1.0",
    "cohere": "langchain-cohere>=0.1.0",
}

# ── Section 7: .env.example content ──────────────────────────────────────────

_PROVIDER_ENV: dict[str, str] = {
    "openai": "OPENAI_API_KEY=sk-...",
    "anthropic": "ANTHROPIC_API_KEY=sk-ant-...",
    "google": "GOOGLE_API_KEY=...",
    "mistral": "MISTRAL_API_KEY=...",
    "groq": "GROQ_API_KEY=...",
    "cohere": "COHERE_API_KEY=...",
}


# ── Section 9: label_to_identifier ───────────────────────────────────────────

def label_to_identifier(label: str) -> str:
    """Sanitize a node label to a valid Python function/variable name.

    Rules:
    - Replace spaces and hyphens with underscores.
    - Remove all characters that are not alphanumeric or underscore.
    - Collapse consecutive underscores into one.
    - Strip leading/trailing underscores.
    - If the result starts with a digit, prefix with 'node_'.
    - If empty after sanitisation, return 'unnamed_node'.
    - If the result is a Python keyword, append '_node'.
    - Convert to lowercase.
    - Truncate to 64 characters.
    """
    if not label or not label.strip():
        return "unnamed_node"

    # Lowercase first
    s = label.lower()
    # Replace spaces and hyphens with underscores
    s = re.sub(r"[\s\-]+", "_", s)
    # Remove chars that are not alphanumeric or underscore
    s = re.sub(r"[^\w]", "", s)
    # Collapse consecutive underscores
    s = re.sub(r"_+", "_", s)
    # Strip leading/trailing underscores
    s = s.strip("_")

    if not s:
        return "unnamed_node"

    # Prefix if starts with digit
    if s[0].isdigit():
        s = "node_" + s

    # Avoid Python keywords
    if keyword.iskeyword(s):
        s = s + "_node"

    # Truncate
    return s[:64]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _provider_key(node: dict[str, Any]) -> str | None:
    """Return a normalised provider key (lowercase) for a node, or None."""
    provider = node.get("model_provider") or node.get("data", {}).get("model_provider")
    if not provider:
        return None
    return provider.lower().strip()


def build_node_map(workflow_json: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Build a mapping of node_id → node dict from a workflow JSON."""
    nodes = workflow_json.get("nodes", [])
    result: dict[str, dict[str, Any]] = {}
    for node in nodes:
        # Support both flat and nested (React Flow) shapes
        node_id = node.get("id", "")
        flat = dict(node)
        # If the node has a 'data' sub-dict, hoist its fields to the top level
        data = node.get("data", {})
        if isinstance(data, dict):
            for k, v in data.items():
                if k not in flat:
                    flat[k] = v
        result[node_id] = flat
    return result


def _build_successors(workflow_json: dict[str, Any]) -> dict[str, list[str]]:
    """Build adjacency list: node_id → [successor_ids]."""
    edges = workflow_json.get("edges", [])
    succ: dict[str, list[str]] = {}
    for edge in edges:
        src = edge.get("source", "")
        tgt = edge.get("target", "")
        succ.setdefault(src, [])
        if tgt not in succ[src]:
            succ[src].append(tgt)
    return succ


def _build_forks(successors: dict[str, list[str]]) -> dict[str, list[str]]:
    """Returns only nodes that have > 1 successor (parallel forks)."""
    return {k: v for k, v in successors.items() if len(v) > 1}


def _get_node_type(node: dict[str, Any]) -> str:
    return node.get("type", "") or ""


def _get_label(node: dict[str, Any]) -> str:
    return node.get("label") or node.get("data", {}).get("label") or node.get("id", "node")


def _get_model_name(node: dict[str, Any]) -> str | None:
    return node.get("model_name") or node.get("data", {}).get("model_name")


# ── Section 4: resolve_provider_imports ──────────────────────────────────────

def resolve_provider_imports(node_map: dict[str, dict[str, Any]]) -> list[str]:
    """Return only the import lines needed for providers actually used in the workflow.

    Returns one import line per unique provider, in consistent order.
    """
    seen: set[str] = set()
    imports: list[str] = []
    for node in node_map.values():
        pk = _provider_key(node)
        if pk and pk in _PROVIDER_IMPORTS and pk not in seen:
            seen.add(pk)
            imports.append(_PROVIDER_IMPORTS[pk])
    return sorted(imports)  # sorted for determinism


# ── Section 3: generate_model_instantiation ───────────────────────────────────

def generate_model_instantiation(node: dict[str, Any]) -> str:
    """Return the LLM variable declaration for one agent node.

    Example output:
        llm_my_agent = ChatOpenAI(model="gpt-4o")
    """
    label = _get_label(node)
    ident = label_to_identifier(label)
    pk = _provider_key(node)
    model_name = _get_model_name(node) or "gpt-4o"
    class_name = _PROVIDER_CLASS.get(pk or "", "ChatOpenAI")
    return f'llm_{ident} = {class_name}(model="{model_name}")'


# ── Section 4: generate_node_function ────────────────────────────────────────

def generate_node_function(node: dict[str, Any]) -> str:
    """Return the async def function for one agent node."""
    label = _get_label(node)
    ident = label_to_identifier(label)
    pk = _provider_key(node)
    model_name = _get_model_name(node) or "gpt-4o"
    class_name = _PROVIDER_CLASS.get(pk or "", "ChatOpenAI")

    lines = [
        f"async def {ident}(state: AgentState) -> dict:",
        f'    """Agent node: {label}."""',
        f"    # TODO: replace with your actual system prompt",
        f'    system = "{label}: describe what this agent should do."',
        f"    messages = state[\"messages\"]",
        f"    response = await llm_{ident}.ainvoke([",
        f'        {{"role": "system", "content": system}},',
        f"        *messages,",
        f"    ])",
        f'    return {{"messages": [response]}}',
    ]
    return "\n".join(lines)


# ── Section 5: generate_tool_node ─────────────────────────────────────────────

def generate_tool_node(node: dict[str, Any]) -> str:
    """Return the @tool decorated function + ToolNode for standalone tool nodes."""
    label = _get_label(node)
    ident = label_to_identifier(label)
    tool_id = node.get("tool_id") or ident

    lines = [
        f"@tool",
        f"def {ident}(query: str) -> str:",
        f'    """Tool: {label}.',
        f"",
        f"    TODO: Implement {tool_id} tool logic here.",
        f'    """',
        f"    raise NotImplementedError(\"Implement {ident} tool\")",
        f"",
        f"{ident}_tool_node = ToolNode([{ident}])",
    ]
    return "\n".join(lines)


# ── Section 6: generate_condition_router ─────────────────────────────────────

def generate_condition_router(
    node: dict[str, Any],
    successors: list[str],
    node_map: dict[str, dict[str, Any]],
) -> str:
    """Return the router function + add_conditional_edges call.

    Uses source handles (true/false) when available; falls back to index-based keys.
    """
    label = _get_label(node)
    ident = label_to_identifier(label)

    # Build branch map: key → target function name
    # Condition nodes typically have exactly 2 successors: true, false
    branch_lines: list[str] = []
    routing_map_entries: list[str] = []

    for i, succ_id in enumerate(successors):
        succ_node = node_map.get(succ_id, {"id": succ_id, "label": succ_id})
        succ_label = _get_label(succ_node)
        succ_ident = label_to_identifier(succ_label)
        branch_key = "true" if i == 0 else "false"
        branch_lines.append(f'        # TODO: define condition logic for "{branch_key}" branch')
        routing_map_entries.append(f'        "{branch_key}": "{succ_ident}"')

    router_lines = [
        f"def {ident}_router(state: AgentState) -> str:",
        f'    """Condition router for: {label}."""',
        f"    # TODO: implement routing logic — return 'true' or 'false'",
        f"    messages = state[\"messages\"]",
        f"    last = messages[-1] if messages else None",
        f"    # Example: return 'true' if condition met, else 'false'",
        f"    return \"true\"",
    ]

    map_str = ",\n".join(routing_map_entries)
    add_cond = (
        f"graph.add_conditional_edges(\n"
        f'    "{ident}",\n'
        f"    {ident}_router,\n"
        f"    {{\n{map_str}\n    }},\n"
        f")"
    )

    return "\n".join(router_lines) + "\n\n" + add_cond


# ── Section 7: generate_graph_assembly ───────────────────────────────────────

def generate_graph_assembly(
    node_map: dict[str, dict[str, Any]],
    successors: dict[str, list[str]],
    forks: dict[str, list[str]],
) -> str:
    """Return all graph.add_node, graph.add_edge, set_entry_point calls.

    Parallel forks get a comment block.
    """
    add_nodes: list[str] = []
    add_edges: list[str] = []
    entry_point: str = ""
    routing_calls: list[str] = []

    # Find start node
    start_node_id: str | None = None
    for nid, node in node_map.items():
        if _get_node_type(node) == "startNode":
            start_node_id = nid

    # Find the first non-start successor for entry point
    if start_node_id and start_node_id in successors:
        for succ_id in successors[start_node_id]:
            succ_node = node_map.get(succ_id, {})
            if _get_node_type(succ_node) not in ("finishNode",):
                entry_label = _get_label(succ_node)
                entry_ident = label_to_identifier(entry_label)
                entry_point = f'graph.set_entry_point("{entry_ident}")'
                break

    # add_node for every non-start/non-finish node
    for nid, node in node_map.items():
        ntype = _get_node_type(node)
        if ntype in ("startNode", "finishNode", "blankBoxNode", "textNode"):
            continue
        label = _get_label(node)
        ident = label_to_identifier(label)
        if ntype == "toolNode":
            add_nodes.append(f'graph.add_node("{ident}", {ident}_tool_node)')
        else:
            add_nodes.append(f'graph.add_node("{ident}", {ident})')

    # add_edge calls
    edges_added: set[tuple[str, str]] = set()
    for src_id, tgt_ids in successors.items():
        src_node = node_map.get(src_id, {})
        src_type = _get_node_type(src_node)
        src_label = _get_label(src_node)
        src_ident = label_to_identifier(src_label)

        if src_type == "conditionNode":
            # Handled via add_conditional_edges — skip plain edges
            continue

        is_fork = src_id in forks
        if is_fork:
            add_edges.append(f"# ── Parallel fork from '{src_label}' ─────────────────")

        for tgt_id in tgt_ids:
            if (src_id, tgt_id) in edges_added:
                continue
            edges_added.add((src_id, tgt_id))

            tgt_node = node_map.get(tgt_id, {})
            tgt_type = _get_node_type(tgt_node)
            tgt_label = _get_label(tgt_node)
            tgt_ident = label_to_identifier(tgt_label)

            if src_type == "startNode":
                # Start → first node handled by set_entry_point; but if parallel, use add_edge
                if is_fork:
                    add_edges.append(f'graph.add_edge("{src_ident}", "{tgt_ident}")')
                # else: single entry, handled by set_entry_point
            elif tgt_type == "finishNode":
                add_edges.append(f'graph.add_edge("{src_ident}", END)')
            else:
                add_edges.append(f'graph.add_edge("{src_ident}", "{tgt_ident}")')

    return "\n".join(add_nodes) + "\n\n" + "\n".join(add_edges) + (
        f"\n{entry_point}" if entry_point else ""
    )


# ── Section 5 template: generate_full_file ───────────────────────────────────

def generate_full_file(
    workflow_json: dict[str, Any],
    estimation_report: Optional[dict[str, Any]] = None,
) -> str:
    """Assemble all parts into the final LangGraph scaffold file.

    Args:
        workflow_json: The .neurovn.json workflow definition.
        estimation_report: Optional WorkflowEstimation dict. If provided,
            the cost/latency comment header is populated with real numbers.
            If None, placeholder values are used.
    """
    workflow_name = workflow_json.get("name", "Workflow")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # ── Cost / latency header values ─────────────────────────────────────────
    if estimation_report:
        best_cost = estimation_report.get("best_case_cost", 0.0) or estimation_report.get("total_cost", 0.0)
        worst_cost = estimation_report.get("worst_case_cost", 0.0) or estimation_report.get("total_cost", 0.0)
        # latency is stored in seconds in the estimation report
        latency_s = estimation_report.get("critical_path_latency", 0.0) or estimation_report.get("total_latency", 0.0)
        latency_ms = int(latency_s * 1000)
        cost_header = f"${best_cost:.5f}/run (best) · ${worst_cost:.5f}/run (worst)"
        latency_header = f"~{latency_ms}ms critical path"
    else:
        cost_header = "run estimation first for real numbers"
        latency_header = "run estimation first for real numbers"

    # ── Build node map + graph structure ─────────────────────────────────────
    node_map = build_node_map(workflow_json)
    successors = _build_successors(workflow_json)
    forks = _build_forks(successors)

    # ── Provider imports ──────────────────────────────────────────────────────
    provider_imports_list = resolve_provider_imports(node_map)
    provider_imports = "\n".join(provider_imports_list) if provider_imports_list else ""

    # ── Model instantiations ──────────────────────────────────────────────────
    model_insts: list[str] = []
    for node in node_map.values():
        if _get_node_type(node) == "agentNode":
            model_insts.append(generate_model_instantiation(node))
    model_instantiations = "\n".join(model_insts) if model_insts else "# No agent nodes — add models here"

    # ── Node functions ────────────────────────────────────────────────────────
    node_funcs: list[str] = []
    tool_funcs: list[str] = []
    routing_funcs: list[str] = []

    for node in node_map.values():
        ntype = _get_node_type(node)
        if ntype == "agentNode":
            node_funcs.append(generate_node_function(node))
        elif ntype == "toolNode":
            tool_funcs.append(generate_tool_node(node))
        elif ntype == "conditionNode":
            label = _get_label(node)
            nid = node.get("id", "")
            succ_ids = successors.get(nid, [])
            routing_funcs.append(generate_condition_router(node, succ_ids, node_map))

    all_node_funcs = "\n\n\n".join(node_funcs + tool_funcs) if (node_funcs or tool_funcs) else "# No node functions generated"
    all_routing_funcs = "\n\n\n".join(routing_funcs) if routing_funcs else ""

    # ── Graph assembly ────────────────────────────────────────────────────────
    graph_assembly = generate_graph_assembly(node_map, successors, forks)

    # ── Entry point ───────────────────────────────────────────────────────────
    # Find start node successor(s)
    start_node_id: str | None = None
    for nid, node in node_map.items():
        if _get_node_type(node) == "startNode":
            start_node_id = nid
            break

    graph_set_entry = ""
    if start_node_id and start_node_id in successors:
        succ_list = successors[start_node_id]
        if len(succ_list) == 1:
            succ_node = node_map.get(succ_list[0], {})
            if _get_node_type(succ_node) not in ("finishNode",):
                entry_ident = label_to_identifier(_get_label(succ_node))
                graph_set_entry = f'graph.set_entry_point("{entry_ident}")'

    # ── Assemble final file ───────────────────────────────────────────────────
    sections = [
        # Header comment
        f"# {'=' * 60}",
        f"# Generated by Neurovn",
        f"# Workflow: {workflow_name}",
        f"# Exported: {timestamp}",
        f"#",
        f"# Estimated cost:    {cost_header}",
        f"# Estimated latency: {latency_header}",
        f"#",
        f"# This is a scaffold. You need to:",
        f"#   1. Add API keys to environment variables",
        f"#   2. Implement tool functions",
        f"#   3. Extend AgentState with your state fields",
        f"#   4. Replace placeholder prompts with your actual prompts",
        f"# {'=' * 60}",
        "",
        "from __future__ import annotations",
        "",
        "import os",
        "from typing import TypedDict, Annotated, Sequence",
        "from dotenv import load_dotenv",
        "from langgraph.graph import StateGraph, END",
        "from langgraph.prebuilt import ToolNode",
        "from langchain_core.tools import tool",
        "from langchain_core.messages import BaseMessage",
    ]

    if provider_imports:
        sections.append(provider_imports)

    sections += [
        "",
        "load_dotenv()",
        "",
        "",
        "# --- State Schema ---",
        "class AgentState(TypedDict):",
        "    messages: list",
        "    # TODO: add your state fields here",
        "",
        "",
        "# --- Model Definitions ---",
        model_instantiations,
        "",
        "",
        "# --- Node Functions ---",
        all_node_funcs,
    ]

    if all_routing_funcs:
        sections += [
            "",
            "",
            "# --- Routing Functions ---",
            all_routing_funcs,
        ]

    sections += [
        "",
        "",
        "# --- Graph Assembly ---",
        "graph = StateGraph(AgentState)",
        "",
        graph_assembly,
    ]

    if graph_set_entry and graph_set_entry not in graph_assembly:
        sections.append(graph_set_entry)

    sections += [
        "",
        "",
        "app = graph.compile()",
    ]

    return "\n".join(sections) + "\n"


# ── Section 9: generate_requirements_txt ─────────────────────────────────────

def generate_requirements_txt(node_map: dict[str, dict[str, Any]]) -> str:
    """Return requirements.txt content based on providers present."""
    lines = _BASE_REQUIREMENTS.strip().splitlines()
    seen: set[str] = set()
    for node in node_map.values():
        pk = _provider_key(node)
        if pk and pk in _PROVIDER_REQUIREMENTS and pk not in seen:
            seen.add(pk)
            lines.append(_PROVIDER_REQUIREMENTS[pk])
    return "\n".join(sorted(set(lines))) + "\n"


# ── Section 10: generate_env_example ─────────────────────────────────────────

def generate_env_example(node_map: dict[str, dict[str, Any]]) -> str:
    """Return .env.example content based on providers present."""
    lines = ["# Environment variables for your LangGraph workflow", "# Copy this file to .env and fill in your API keys", ""]
    seen: set[str] = set()
    for node in node_map.values():
        pk = _provider_key(node)
        if pk and pk in _PROVIDER_ENV and pk not in seen:
            seen.add(pk)
            lines.append(_PROVIDER_ENV[pk])
    if len(lines) == 3:
        lines.append("# No API keys required for this workflow")
    return "\n".join(lines) + "\n"
