"""NL-to-workflow scaffold generation using OpenAI."""

import json
from typing import Optional

from config import OPENAI_API_KEY, SCAFFOLD_MODEL


SCAFFOLD_SYSTEM_PROMPT = """You are a workflow graph generator for an AI agent workflow designer.

Given a natural language description, generate a workflow as a JSON object with:
- "name": A short descriptive name for the workflow (2-5 words)
- "nodes": Array of node objects
- "edges": Array of edge objects connecting nodes

NODE TYPES:
- startNode: Entry point. Every workflow must have exactly one. Fields: { id, type: "startNode", label: "Start", output_schema }
- agentNode: An AI agent. Fields: { id, type: "agentNode", label, model_provider, model_name, context, task_type, expected_output_size, allowed_actions, output_schema, input_schema }
- toolNode: An external tool. Fields: { id, type: "toolNode", label, tool_id, output_schema, input_schema }
- finishNode: Exit point. Every workflow must have exactly one. Fields: { id, type: "finishNode", label: "Finish", input_schema }

SCHEMAS (output_schema / input_schema):
These are optional JSON Schema objects describing the data a node produces (output_schema) or consumes (input_schema).
Use them when the description implies specific structured data flowing between agents, e.g.:
- "classify intent and route" → classifier agent output_schema: { type: "object", properties: { intent: { type: "string" }, confidence: { type: "number" } }, required: ["intent"] }
- "summarize document" → summarizer output_schema: { type: "object", properties: { summary: { type: "string" }, key_points: { type: "array", items: { type: "string" } } }, required: ["summary"] }
- "validate and approve" → decision agent output_schema: { type: "object", properties: { decision: { type: "string", enum: ["approve", "reject"] }, reason: { type: "string" } }, required: ["decision"] }
Schemas must always have type: "object" at the root with a "properties" object.
Set output_schema/input_schema to null if the data flow is unstructured or the prompt does not imply specific field names.

AVAILABLE MODELS:
- OpenAI: GPT-4o (complex tasks), GPT-4o-mini (simple/fast tasks)
- Anthropic: Claude-3.5-Sonnet (complex reasoning, long output)

AVAILABLE TOOLS (tool_id values):
- postgres: PostgreSQL database queries
- mysql: MySQL database queries
- mongodb: MongoDB document queries
- redis: Redis key-value store
- pinecone: Pinecone vector database
- chromadb: ChromaDB vector database
- mcp_web_search: Web search via MCP
- mcp_filesystem: File read/write via MCP
- mcp_github: GitHub API via MCP
- mcp_slack: Slack messaging via MCP
- mcp_browser: Browser automation via MCP
- rest_api: Generic REST API call
- graphql: GraphQL query endpoint
- webhook: Outbound webhook trigger
- python_repl: Python code execution
- shell_exec: Shell command execution
- rag_retriever: RAG document retrieval
- web_scraper: Web page scraping
- pdf_reader: PDF text extraction

TASK TYPES for agentNode: classification, summarization, code_generation, rag_answer, tool_orchestration, routing
ALLOWED_ACTIONS for agentNode: optional list of string labels representing discrete output options (e.g., ["approve", "reject", "escalate"]). Only populate when the description explicitly mentions specific action/category labels.
OUTPUT SIZES for agentNode: short (<=200 tokens), medium (200-600), long (600-1500), very_long (>1500)

RULES:
1. Always start with exactly one startNode (id: "start-1"), end with exactly one finishNode (id: "finish-1")
2. All nodes must be connected and reachable from startNode
3. Use descriptive labels (e.g. "Classify Intent", not "Agent 1")
4. Assign appropriate models based on task complexity
5. Use sequential IDs like "start-1", "agent-1", "agent-2", "tool-1", "finish-1"
6. Set context to a brief instruction for what the agent should do
7. Include tool nodes when the description mentions search, database, API, code execution, or file operations
8. For cyclic workflows (review loops, iterative refinement), add back-edges and set max_steps on the looping agent
9. Connect tool nodes to agent nodes that use them (tool output feeds into agent)
10. If the user description mentions specific actions an agent should take (e.g., "classify as positive, negative, or neutral", "route to escalate, auto-resolve, or request-info"), populate the `allowed_actions` field as a list of those action labels. Only include allowed_actions on agentNode type. Set allowed_actions to null if no specific actions are mentioned.
11. Add output_schema and input_schema when the description implies structured data flowing between nodes (specific field names, types, or data shapes). Adjacent nodes should have compatible schemas: the upstream node's output_schema should cover the downstream node's input_schema required fields. Set both to null for unstructured or conversational data flow.

Return ONLY valid JSON. No markdown, no explanations, no code blocks."""

REFINE_USER_TEMPLATE = """Current workflow:
{current_graph}

Modification requested: {prompt}

Return the complete updated workflow with the same JSON format (name, nodes, edges). Keep existing nodes where possible, add/remove/modify as needed."""


def scaffold_workflow(prompt: str) -> dict:
    """Generate a workflow graph from a natural language prompt.

    Returns { nodes: [...], edges: [...], name: str }.
    Falls back to a simple Start->Agent->Finish if LLM fails.
    """
    if not OPENAI_API_KEY:
        return _fallback_workflow(prompt)

    try:
        import openai

        client = openai.OpenAI(api_key=OPENAI_API_KEY)

        response = client.chat.completions.create(
            model=SCAFFOLD_MODEL,
            messages=[
                {"role": "system", "content": SCAFFOLD_SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate a workflow for: {prompt}"},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        is_valid, errors = validate_scaffold(result)
        if not is_valid:
            return _fallback_workflow(prompt)

        return result

    except Exception:
        return _fallback_workflow(prompt)


def refine_workflow(prompt: str, current_nodes: list, current_edges: list) -> dict:
    """Refine an existing workflow graph based on a follow-up instruction.

    Sends current graph + instruction to LLM.
    Returns updated { nodes: [...], edges: [...], name: str }.
    """
    if not OPENAI_API_KEY:
        return _fallback_workflow(prompt)

    try:
        import openai

        client = openai.OpenAI(api_key=OPENAI_API_KEY)

        current_graph = json.dumps(
            {"nodes": current_nodes, "edges": current_edges},
            indent=2,
        )

        response = client.chat.completions.create(
            model=SCAFFOLD_MODEL,
            messages=[
                {"role": "system", "content": SCAFFOLD_SYSTEM_PROMPT},
                {"role": "user", "content": REFINE_USER_TEMPLATE.format(
                    current_graph=current_graph,
                    prompt=prompt,
                )},
            ],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        is_valid, errors = validate_scaffold(result)
        if not is_valid:
            # Return the original graph unchanged on validation failure
            return {
                "name": "Refined Workflow",
                "nodes": current_nodes,
                "edges": current_edges,
            }

        return result

    except Exception:
        return {
            "name": "Refined Workflow",
            "nodes": current_nodes,
            "edges": current_edges,
        }


def validate_scaffold(result: dict) -> tuple[bool, list[str]]:
    """Validate that a scaffold result is a well-formed workflow graph.

    Returns (is_valid, error_messages).
    """
    errors: list[str] = []

    if not isinstance(result, dict):
        errors.append("Result must be a JSON object")
        return False, errors

    nodes = result.get("nodes")
    if not isinstance(nodes, list) or len(nodes) == 0:
        errors.append("Result must have a non-empty 'nodes' array")
        return False, errors

    edges = result.get("edges")
    if not isinstance(edges, list):
        errors.append("Result must have an 'edges' array")
        return False, errors

    valid_types = {"startNode", "agentNode", "toolNode", "finishNode"}
    node_ids = set()
    has_start = False
    has_finish = False

    for node in nodes:
        if not isinstance(node, dict):
            errors.append("Each node must be a JSON object")
            continue

        node_id = node.get("id")
        if not node_id:
            errors.append("Each node must have an 'id'")
            continue

        node_ids.add(node_id)
        node_type = node.get("type")

        if node_type not in valid_types:
            errors.append(f"Node '{node_id}' has invalid type '{node_type}'")

        if node_type == "startNode":
            has_start = True
        if node_type == "finishNode":
            has_finish = True

    if not has_start:
        errors.append("Workflow must have at least one startNode")
    if not has_finish:
        errors.append("Workflow must have at least one finishNode")

    for edge in edges:
        if not isinstance(edge, dict):
            errors.append("Each edge must be a JSON object")
            continue
        source = edge.get("source")
        target = edge.get("target")
        if source not in node_ids:
            errors.append(f"Edge source '{source}' not found in nodes")
        if target not in node_ids:
            errors.append(f"Edge target '{target}' not found in nodes")

    return len(errors) == 0, errors


def _fallback_workflow(prompt: str) -> dict:
    """Generate a basic 3-node workflow when LLM is unavailable."""
    return {
        "name": "Generated Workflow",
        "nodes": [
            {"id": "start-1", "type": "startNode", "label": "Start"},
            {
                "id": "agent-1",
                "type": "agentNode",
                "label": "Agent",
                "model_provider": "OpenAI",
                "model_name": "GPT-4o",
                "context": prompt,
                "task_type": "summarization",
                "expected_output_size": "medium",
            },
            {"id": "finish-1", "type": "finishNode", "label": "Finish"},
        ],
        "edges": [
            {"source": "start-1", "target": "agent-1"},
            {"source": "agent-1", "target": "finish-1"},
        ],
    }
