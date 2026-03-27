# Neurovn — LangGraph Code Export Specification

> Deterministic transpiler: `.neurovn.json` → LangGraph Python scaffold.  
> Zero LLM calls. Pure algorithmic mapping.  
> Output is a valid-syntax scaffold, not production-ready code. Clearly labeled as such.

---

## 1. Overview

The LangGraph exporter reads a `.neurovn.json` workflow and emits a single `.py` file that:

1. Imports the correct LangChain provider libraries based on nodes present
2. Instantiates models with the correct model string
3. Defines an `AgentState` TypedDict
4. Defines one async function per agent node
5. Assembles a `StateGraph` with all nodes and edges
6. Handles conditional routing, parallel forks, and tool nodes correctly
7. Includes a cost/latency header comment from the estimation report (if available)

The output is explicitly labeled a scaffold. Engineers fill in business logic; the structure is correct.

---

## 2. Node Type Mapping Reference

### 2.1 startNode

```python
# Input:
{ "type": "startNode", "id": "start-1" }

# Output:
graph = StateGraph(AgentState)
graph.set_entry_point("{first_successor_label}")
```

The entry point is set to the label of the first node connected from start.
If start has multiple successors (parallel fork), entry point is set to the first one alphabetically and a comment notes the parallel structure.

---

### 2.2 agentNode

```python
# Input:
{
  "type": "agentNode",
  "id": "agent-1",
  "data": {
    "label": "Summarizer",
    "modelProvider": "Anthropic",
    "modelName": "Claude-3.5-Sonnet",
    "context": "Summarize the input document concisely.",
    "maxOutputTokens": 500
  }
}

# Output:
summarizer_llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    max_tokens=500,
    # api_key=os.getenv("ANTHROPIC_API_KEY")  # set in .env
)

async def summarizer(state: AgentState) -> AgentState:
    # Task: Summarization
    # TODO: adapt messages from state as needed
    system_prompt = """Summarize the input document concisely."""
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    response = await summarizer_llm.ainvoke(messages)
    return {"messages": state["messages"] + [response]}

graph.add_node("summarizer", summarizer)
```

---

### 2.3 toolNode (standalone)

```python
# Input:
{
  "type": "toolNode",
  "id": "tool-1",
  "data": {
    "label": "Web Search",
    "toolCategory": "mcp_server",
    "toolId": "mcp_web_search"
  }
}

# Output:
# TODO: implement web_search tool
# Expected schema_tokens: ~180 | avg_response_tokens: ~300 | latency: ~800ms
@tool
def web_search(query: str) -> str:
    """Search the web for current information."""
    # TODO: implement using your preferred search API
    raise NotImplementedError("Implement web_search")

web_search_node = ToolNode([web_search])
graph.add_node("web_search", web_search_node)
```

---

### 2.4 conditionNode

```python
# Input:
{
  "type": "conditionNode",
  "id": "condition-1",
  "data": {
    "label": "Condition",
    "conditionExpression": "sentiment > 0.7",
    "probability": 70
  }
}
# edges from condition-1:
#   true-edge  → agent-2
#   false-edge → agent-3

# Output:
def condition_1_router(state: AgentState) -> str:
    # Condition: sentiment > 0.7
    # Branch probability: True=70% / False=30%
    # TODO: implement routing logic based on state
    # Return "true" or "false"
    raise NotImplementedError("Implement condition_1_router")

graph.add_conditional_edges(
    "condition_1",
    condition_1_router,
    {
        "true": "agent_2",
        "false": "agent_3"
    }
)
```

---

### 2.5 finishNode

```python
# Input:
{ "type": "finishNode", "id": "finish-1" }

# Output:
graph.add_edge("{last_predecessor_label}", END)
```

If multiple nodes connect to finish (join after parallel fork):

```python
graph.add_edge("agent_2", END)
graph.add_edge("agent_3", END)
# Note: In LangGraph, use a join/aggregator node before END for parallel branches
# See: https://langchain-ai.github.io/langgraph/how-tos/map-reduce/
```

---

### 2.6 Sequential Edge

```python
# Input:
{ "source": "agent-1", "target": "agent-2" }

# Output:
graph.add_edge("summarizer", "comparator")
```

---

### 2.7 Parallel Fork

```python
# Detected when source has 2+ successors and is not a conditionNode
# Input edges: start-1 → agent-1, start-1 → agent-2

# Output comment + edges:
# ── Parallel fork detected ──────────────────────────────────────────
# Nodes 'gpt4o_responder' and 'claude_responder' run in parallel.
# Estimated latency: max(1200ms, 950ms) = 1200ms  (not sum)
# Estimated cost:    $0.011 + $0.009 = $0.020     (sum of both)
# For true parallelism in LangGraph, see: Send API / map-reduce pattern
# ────────────────────────────────────────────────────────────────────
graph.add_edge("__start__", "gpt4o_responder")
graph.add_edge("__start__", "claude_responder")
```

---

## 3. Model String Mapping

The `modelName` from the config panel maps to the official API model string:

| Display Name | API Model String | Provider Class |
|---|---|---|
| GPT-4o | `gpt-4o` | `ChatOpenAI` |
| GPT-4o mini | `gpt-4o-mini` | `ChatOpenAI` |
| GPT-4 Turbo | `gpt-4-turbo` | `ChatOpenAI` |
| o1 | `o1` | `ChatOpenAI` |
| o3-mini | `o3-mini` | `ChatOpenAI` |
| Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` | `ChatAnthropic` |
| Claude 3.5 Haiku | `claude-3-5-haiku-20241022` | `ChatAnthropic` |
| Claude 3 Opus | `claude-3-opus-20240229` | `ChatAnthropic` |
| Claude 4 Sonnet | `claude-sonnet-4-5` | `ChatAnthropic` |
| Claude 4 Opus | `claude-opus-4-5` | `ChatAnthropic` |
| Claude Opus 4.6 | `claude-opus-4-6` | `ChatAnthropic` |
| Gemini 1.5 Pro | `gemini-1.5-pro` | `ChatGoogleGenerativeAI` |
| Gemini 1.5 Flash | `gemini-1.5-flash` | `ChatGoogleGenerativeAI` |
| Gemini 2.0 Flash | `gemini-2.0-flash` | `ChatGoogleGenerativeAI` |
| Llama 3.1 70B | `llama-3.1-70b-versatile` | `ChatGroq` |
| Llama 3.1 405B | `llama-3.1-405b-reasoning` | `ChatGroq` |
| Mistral Large | `mistral-large-latest` | `ChatMistralAI` |
| DeepSeek V3 | `deepseek-chat` | `ChatOpenAI` (base_url override) |
| Command R+ | `command-r-plus` | `ChatCohere` |

---

## 4. Provider Import Resolution

The exporter scans all agentNode modelProviders in the workflow and emits only the needed imports.

```python
PROVIDER_IMPORTS = {
    "OpenAI": [
        "from langchain_openai import ChatOpenAI",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
    "Anthropic": [
        "from langchain_anthropic import ChatAnthropic",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
    "Google": [
        "from langchain_google_genai import ChatGoogleGenerativeAI",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
    "Meta": [
        "from langchain_groq import ChatGroq",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
    "Mistral": [
        "from langchain_mistralai import ChatMistralAI",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
    "DeepSeek": [
        "from langchain_openai import ChatOpenAI  # DeepSeek uses OpenAI-compatible API",
    ],
    "Cohere": [
        "from langchain_cohere import ChatCohere",
        "from langchain_core.messages import SystemMessage, HumanMessage, AIMessage",
    ],
}

BASE_IMPORTS = """
import os
import asyncio
from typing import TypedDict, Annotated, List
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool

load_dotenv()
"""
```

---

## 5. Full Output File Template

```python
# ==============================================================
# Generated by Neurovn
# https://neurovn.app
#
# Workflow:  {workflow_name}
# Exported:  {exported_at}
#
# ── Cost Estimate ──────────────────────────────────────────────
# Best case:   ${best_case_usd:.4f} / run  ({best_tokens} tokens)
# Worst case:  ${worst_case_usd:.4f} / run  ({worst_tokens} tokens)
#
# ── Latency Estimate ───────────────────────────────────────────
# Critical path: ~{critical_path_ms}ms
# Parallel forks: {parallel_forks_count} detected
#
# ── Scaffold Notes ─────────────────────────────────────────────
# This file is a scaffold — syntax is valid but logic is not.
# Before running, you must:
#   1. Copy .env.example → .env and add your API keys
#   2. Implement tool functions marked with NotImplementedError
#   3. Extend AgentState with your actual state fields
#   4. Replace/refine system prompts
#   5. Implement router functions for condition nodes
# ==============================================================

{base_imports}

{provider_imports}


# ── State Schema ───────────────────────────────────────────────
class AgentState(TypedDict):
    messages: List  # conversation history
    # TODO: add your workflow-specific state fields
    # Examples:
    #   query: str
    #   retrieved_docs: List[str]
    #   decision: str


# ── Tool Definitions ───────────────────────────────────────────
{tool_definitions}


# ── Model Instantiations ───────────────────────────────────────
{model_instantiations}


# ── Node Functions ─────────────────────────────────────────────
{node_functions}


# ── Routing Functions ──────────────────────────────────────────
{routing_functions}


# ── Graph Assembly ─────────────────────────────────────────────
graph = StateGraph(AgentState)

# Add nodes
{graph_add_nodes}

# Add edges
{graph_add_edges}

# Set entry point
{graph_set_entry}

# Compile
app = graph.compile()


# ── Run ────────────────────────────────────────────────────────
async def main():
    initial_state = {
        "messages": [],
        # TODO: populate initial state
    }
    result = await app.ainvoke(initial_state)
    print(result)

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 6. requirements.txt Generation

Generated alongside the Python file. Contents determined by providers and tool categories used.

```
# Generated by Neurovn
# Install: pip install -r requirements.txt

langgraph>=0.2.0
langchain-core>=0.3.0
python-dotenv>=1.0.0

# Provider libraries (based on your workflow)
{provider_packages}

# Tool libraries (based on your workflow)
{tool_packages}
```

**Provider package mapping:**

| Provider | Package |
|----------|---------|
| OpenAI | `langchain-openai>=0.2.0` |
| Anthropic | `langchain-anthropic>=0.2.0` |
| Google | `langchain-google-genai>=2.0.0` |
| Meta (Groq) | `langchain-groq>=0.2.0` |
| Mistral | `langchain-mistralai>=0.2.0` |
| Cohere | `langchain-cohere>=0.2.0` |

**Tool package mapping:**

| Tool Category | Package |
|---|---|
| Database | `sqlalchemy>=2.0.0` |
| Code Execution | `e2b-code-interpreter>=0.0.1` |
| Retrieval/RAG | `langchain-community>=0.3.0` |
| MCP Server | `mcp>=1.0.0` |

---

## 7. .env.example Generation

Also emitted alongside the Python file:

```bash
# Generated by Neurovn
# Copy to .env and fill in your API keys

{provider_env_vars}

# Optional
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
```

**Provider env var mapping:**

| Provider | Env var |
|---|---|
| OpenAI | `OPENAI_API_KEY=your_key_here` |
| Anthropic | `ANTHROPIC_API_KEY=your_key_here` |
| Google | `GOOGLE_API_KEY=your_key_here` |
| Groq | `GROQ_API_KEY=your_key_here` |
| Mistral | `MISTRAL_API_KEY=your_key_here` |
| Cohere | `COHERE_API_KEY=your_key_here` |

---

## 8. Export UI Flow

**Export menu new entry:**
```
WORKFLOW FILE
  ↳ Export (.neurovn.json)
  ↳ Export as Python (LangGraph)  ← NEW

GRAPH IMAGE
  ↳ Canvas as PNG
  ↳ Canvas as SVG
...
```

**On click "Export as Python (LangGraph)":**

1. If no estimation has been run: show prompt "Run estimation first to include cost/latency comments in your export. Export anyway?"
2. Open download modal with two download buttons:
   - `Download {workflow_name}_langgraph.py`
   - `Download requirements.txt`
   - `Download .env.example`
3. Show note: "This is a scaffold. See the comments in the file for what to implement."

---

## 9. Label-to-Function-Name Sanitization

Node labels from the canvas must be sanitized to valid Python identifiers for function/variable names.

```python
import re

def label_to_identifier(label: str) -> str:
    # Lowercase
    s = label.lower()
    # Replace spaces and hyphens with underscores
    s = re.sub(r"[\s\-]+", "_", s)
    # Remove all non-alphanumeric/underscore characters
    s = re.sub(r"[^\w]", "", s)
    # Ensure doesn't start with a digit
    if s and s[0].isdigit():
        s = "node_" + s
    # Truncate to 40 chars
    return s[:40] or "unnamed_node"

# Examples:
# "GPT-4o Responder"  → "gpt_4o_responder"
# "My Agent #2"       → "my_agent_2"
# "123Start"          → "node_123start"
```

---

*Document version: 1.0 — Neurovn LangGraph export spec, March 2026*