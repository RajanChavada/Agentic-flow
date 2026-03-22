# Neurovn — Feature Roadmap

> Generated from product audit session, March 2026.  
> Scope: Pre-launch blockers → Post-launch expansions.  
> Agent instructions: each feature block contains an **Acceptance Criteria** section with implementable, testable requirements.

---

## How to Read This Document

| Priority | Meaning |
|----------|---------|
| 🔴 P0 | Launch blocker — ship is held until this is done |
| 🟡 P1 | Launch week — ship within 1 week of launch |
| 🟢 P2 | Post-launch — next sprint after initial release |
| 🔵 P3 | Future — backlog, not time-boxed |

---

## P0 — Launch Blockers

---

### [P0-01] Undo / Redo on Canvas

**Why:** Every diagramming tool has this. Users will break a workflow, have no recovery path, and churn.

**Scope:**
- Ctrl+Z / Cmd+Z undoes the last canvas mutation (node add, node delete, edge add, edge delete, node move, node config save)
- Ctrl+Shift+Z / Cmd+Shift+Z redoes
- History stack depth: 50 operations minimum
- History is per-session (does not persist across page reloads)

**Acceptance Criteria:**
- [ ] Adding a node and pressing Cmd+Z removes it from canvas
- [ ] Deleting an edge and pressing Cmd+Z restores it
- [ ] Configuring a node (Save in panel) and pressing Cmd+Z reverts to prior config
- [ ] Moving a node and pressing Cmd+Z returns it to prior position
- [ ] Undo stack does not exceed 50; oldest operations are dropped when full
- [ ] Redo stack clears when a new operation is performed after an undo

---

### [P0-02] Inline Node Label Editing

**Why:** Users cannot rename nodes on canvas. The JSON exports `"label": "GPT-4o"` but that label is set only by the model selected, not by the user. Named nodes are critical for team communication ("Summarizer", "Intent Router", etc.)

**Scope:**
- Double-clicking a node's label text enters edit mode inline on the canvas
- Pressing Enter or clicking outside commits the new label
- Pressing Escape cancels and reverts
- Label persists in the node's `data.label` field in exported JSON
- Max label length: 40 characters

**Acceptance Criteria:**
- [ ] Double-clicking label text on any node type shows an inline text input
- [ ] Edited label is reflected on the node card immediately
- [ ] Edited label is included in `.neurovn.json` export under `data.label`
- [ ] Empty label is not accepted — reverts to previous value
- [ ] Label change is captured in undo history

---

### [P0-03] Replace Canvas Stats Bar (R/W/X/N → Graph Complexity)

**Why:** The current top-right bar shows `R:0 W:0 X:0 N:0 | Low` — neither the team nor users know what this means. It occupies prime real estate and creates confusion.

**Replace with:**
```
[nodes: 5] [depth: 3] [loops: 1] [branches: 2] [complexity: Medium]
```

**Field Definitions:**

| Field | Definition |
|-------|-----------|
| nodes | Total number of nodes on canvas (excluding Start/Finish) |
| depth | Longest path from Start to Finish in hops |
| loops | Number of back-edges (cycles) detected in graph |
| branches | Number of Condition nodes |
| complexity | Derived label: Low / Medium / High / Very High (see below) |

**Complexity Scoring (additive):**

| Condition | Points |
|-----------|--------|
| nodes > 5 | +1 |
| nodes > 10 | +1 |
| depth > 4 | +1 |
| loops >= 1 | +1 |
| loops > 3 | +1 |
| branches >= 2 | +1 |
| parallel fork detected | +1 |

Score → Label: 0–1 = Low, 2–3 = Medium, 4–5 = High, 6+ = Very High

**Acceptance Criteria:**
- [ ] Bar updates live as nodes/edges are added or removed
- [ ] Complexity label changes dynamically with score
- [ ] Hovering over "complexity" shows a tooltip: "Agentic complexity score based on node count, depth, loops, and branching"
- [ ] Parallel fork (one source → multiple targets) increments branch count and triggers complexity bump
- [ ] Old R/W/X/N labels are fully removed

---

### [P0-04] Model Pricing Data Freshness

**Why:** The current registry shows Claude 3.5 Sonnet at $3.00/$15.00 per 1M tokens — this is outdated. If cost estimation is the product's core value, stale prices destroy trust immediately.

**Architecture:**

1. `models.json` in repo contains a top-level `last_updated: "YYYY-MM-DD"` field per provider
2. A GitHub Action (`/.github/workflows/model-audit.yml`) runs weekly — opens a PR if pricing or model list changes (manual curation, not scraping)
3. In the UI, the provider dropdown subtitle shows: `Anthropic (8 models · updated Mar 2026)`
4. If `last_updated` is > 30 days ago, show a yellow warning icon next to the provider name with tooltip: "Pricing data may be outdated"

**Acceptance Criteria:**
- [ ] `models.json` has `last_updated` field per provider
- [ ] Provider dropdown renders the updated date in muted text below the provider name
- [ ] If `last_updated` age > 30 days, yellow ⚠ icon appears next to provider name
- [ ] GitHub Action file exists at `.github/workflows/model-audit.yml` with weekly cron schedule
- [ ] Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro pricing verified against current provider documentation before launch

---

### [P0-05] Disconnected Node Validation

**Why:** Users can drop nodes on canvas and never connect them. The estimator silently ignores them, producing wrong results with no explanation.

**Scope:**
- A node with no edges (in or out) shows a subtle red dashed border
- Tooltip on hover: "This node is disconnected and will not be included in estimation"
- "Run Workflow & Gen Estimate" button checks for disconnected nodes before running
- If disconnected nodes exist: show a modal listing them with "Proceed anyway" and "Go back" options

**Acceptance Criteria:**
- [ ] Unconnected node renders with red dashed border
- [ ] Tooltip appears on hover of disconnected node
- [ ] Pre-estimation modal lists disconnected nodes by label
- [ ] "Proceed anyway" runs estimation excluding disconnected nodes
- [ ] Connected nodes lose the dashed border immediately when an edge is added

---

## P1 — Launch Week

---

### [P1-01] Live Per-Node Cost Update on Model Change

**Why:** Currently cost only updates after clicking "Run Workflow & Gen Estimate." Changing a model in the config panel should instantly reflect on the node card.

**Scope:**
- Node card subtitle (currently `Anthropic / Claude-3.5-Sonnet`) gains a third line: estimated cost per single call
- Format: `~$0.004 / call` in muted text
- Updates immediately when model is changed in config and "Save" is clicked
- Does not require a full estimation run

**Calculation for live preview (single node, no context accumulation):**
```
input_tokens  = len(system_prompt_tokens) + 500  // 500 = default assumed input
output_tokens = expected_output_size midpoint
cost = (input_tokens / 1_000_000 * input_price) + (output_tokens / 1_000_000 * output_price)
```

**Acceptance Criteria:**
- [ ] Node card shows `~$X.XXX / call` after first Save
- [ ] Value updates within 100ms of saving a new model selection
- [ ] Zero-state (unconfigured node) shows "configure to estimate"
- [ ] Value shown is clearly labeled as "per call" not "per run"

---

### [P1-02] Read-Only Shareable Canvas Link

**Why:** Teams need to share workflows without giving edit access. Essential for async review, demos, and the virality loop.

**Architecture:**
- On Save, canvas is assigned a UUID stored in DB: `canvases` table with `id`, `user_id`, `json`, `is_public`, `created_at`
- "Share" button in header (next to Save) opens a modal with:
  - Toggle: "Enable public link" (off by default)
  - When enabled: generates `neurovn.app/view/[uuid]`
  - Copy button for URL
- `/view/[uuid]` route renders canvas in read-only mode — no sidebar, no config panels, no edit actions
- Read-only view still shows the estimation report if one was generated

**Acceptance Criteria:**
- [ ] Share modal appears on clicking Share button
- [ ] Public link toggle defaults to off
- [ ] Enabling toggle generates URL immediately
- [ ] Disabling toggle invalidates the URL (returns 404)
- [ ] `/view/[uuid]` renders canvas without any edit controls
- [ ] Read-only view is accessible without login

---

### [P1-03] Tabbed Agent Node Config Panel

**Why:** The config panel will grow to 10+ fields with the additions in this roadmap. A single-scroll panel becomes unusable.

**Tab Structure:**

```
[ Model ] [ Estimation ] [ Tools ]
```

**Model tab:** Provider, Model Name, pricing card, system prompt/context, Max Output Tokens, Temperature, Max Loop Steps

**Estimation tab:** Task Type, Expected Output Size, Retry Budget, Expected Calls per Run, (i) icons on each field

**Tools tab:** Multi-tool binding selector (see P1-04)

**Acceptance Criteria:**
- [ ] Config panel renders 3 tabs
- [ ] Active tab persists until panel is closed (does not reset to Model on each open)
- [ ] All existing fields are preserved under the correct tab
- [ ] Save / Cancel buttons are always visible regardless of active tab
- [ ] Tab with incomplete required fields shows a red dot indicator

---

### [P1-04] Multi-Tool Binding on Agent Node

**Why:** Real agents call multiple tools. Currently tool nodes must be dragged separately and connected via edges, which creates visual noise and doesn't reflect how tools are actually bound to an agent (they're passed as a list, not sequential nodes).

**Scope:**
- Inside the Agent node config panel, "Tools" tab shows a multi-select tool picker
- Tool picker is the same category → tool hierarchy as the standalone Tool node
- Selected tools are displayed as small chips inside the agent node card on canvas
- Each bound tool adds its `schema_tokens` and `avg_response_tokens` to the agent's estimation automatically
- Standalone Tool node still exists for cases where a tool is used independently (e.g., a retrieval step without an LLM)

**Node card display:**
```
┌─────────────────────────────┐
│ 🔵 Summarizer               │
│ Anthropic / Claude-3.5      │
│ Summarization · Medium      │
│ 🔧 web_search  🔧 mcp_slack │  ← tool chips
│ ~$0.006 / call              │
└─────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Tools tab in agent config shows categorized multi-select
- [ ] Up to 8 tools can be bound to a single agent node
- [ ] Tool chips render inside node card (truncated if > 3, show "+N more")
- [ ] Each bound tool's `schema_tokens` is added to node's estimated input tokens
- [ ] Bound tools appear in exported JSON under `data.tools[]`
- [ ] Removing a tool from the binding updates the cost estimate on Save

---

### [P1-05] Rename "Context-Aware Estimation" → "Estimation Inputs" + Add (i) Tooltips

**Why:** "Context-Aware Estimation" sounds like a system feature name, not a user-facing section header. Users don't know what to do with it.

**Changes:**
- Section header: `CONTEXT-AWARE ESTIMATION` → `ESTIMATION INPUTS`
- Add `(i)` icon next to each field with tooltips:

| Field | Tooltip |
|-------|---------|
| Task Type | Adjusts expected token usage based on the kind of task this agent performs (e.g. summarization uses fewer output tokens than code generation) |
| Expected Output Size | How long this agent's response typically is. Used to estimate output token cost. |
| Max Output Tokens | Hard ceiling on output length. Overrides Expected Output Size if set. |
| Expected Calls per Run | For orchestrator agents that call sub-agents or loop — how many times does this node execute per workflow run? |
| Retry Budget | How many times this node might retry before succeeding. Multiplies the per-call cost estimate. |

**Acceptance Criteria:**
- [ ] Section header text updated
- [ ] (i) icon rendered next to each label using a tooltip component
- [ ] Tooltip appears on hover (desktop) and tap (mobile)
- [ ] Tooltip text matches the table above

---

## P2 — Post-Launch

---

### [P2-01] LangGraph Code Export (Deterministic Transpiler)

**Why:** Turns Neurovn from a diagram tool into a development accelerator. Zero LLM tokens — pure algorithmic transpilation from `.neurovn.json`.

**Node → LangGraph Mapping:**

| Neurovn Node | LangGraph Output |
|---|---|
| `startNode` | `graph = StateGraph(AgentState)` + `graph.set_entry_point(first_node)` |
| `agentNode` | `async def {label}(state: AgentState)` function + `graph.add_node("{label}", {label})` |
| `toolNode` | `ToolNode([...])` + `graph.add_node("tools", tool_node)` |
| `conditionNode` | `def router(state)` returning branch key + `graph.add_conditional_edges(src, router, {"true": x, "false": y})` |
| `finishNode` | `graph.add_edge(last_node, END)` |
| sequential edge | `graph.add_edge(source, target)` |
| parallel fork | Multiple `graph.add_edge(source, target_N)` calls |

**Generated File Structure:**
```python
# ============================================================
# Generated by Neurovn
# Workflow: {workflow_name}
# Exported: {timestamp}
#
# Estimated cost:  ${best_case}/run (best) · ${worst_case}/run (worst)
# Estimated latency: ~{latency_ms}ms critical path
#
# This is a scaffold. You need to:
#   1. Add API keys to environment variables
#   2. Implement tool functions
#   3. Extend AgentState with your state fields
#   4. Replace placeholder prompts with your actual prompts
# ============================================================

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
{provider_imports}

# --- State Schema ---
class AgentState(TypedDict):
    messages: list
    # TODO: add your state fields here

# --- Model Definitions ---
{model_instantiations}

# --- Node Functions ---
{node_functions}

# --- Routing Functions ---
{routing_functions}

# --- Graph Assembly ---
graph = StateGraph(AgentState)

{graph_add_nodes}
{graph_add_edges}
{graph_set_entry}

app = graph.compile()
```

**Export Entry Point:**
- New export option in the Export menu: `Export as Python (LangGraph)`
- Downloads a single `.py` file named `{workflow_name}_langgraph.py`
- Also offer `requirements.txt` as a secondary download

**requirements.txt contents (derived from providers used):**
```
langgraph>=0.2.0
langchain-core>=0.3.0
langchain-anthropic>=0.2.0    # if Anthropic nodes present
langchain-openai>=0.2.0       # if OpenAI nodes present
langchain-google-genai>=0.0.1 # if Google nodes present
python-dotenv>=1.0.0
```

**Acceptance Criteria:**
- [ ] Export menu shows "Export as Python (LangGraph)" option
- [ ] All node types produce syntactically valid Python
- [ ] Generated file includes cost/latency comment block
- [ ] Provider imports are derived from nodes present (no unused imports)
- [ ] Parallel forks produce correct multi-target edge calls
- [ ] Condition nodes produce `add_conditional_edges` with true/false keys
- [ ] File is named `{workflow_label}_langgraph.py`
- [ ] Secondary `requirements.txt` download offered in same modal

---

### [P2-02] Model Registry Expansion + "See More Providers"

**Why:** Adding all providers to the main dropdown creates cognitive overload. The tiered approach mirrors how Windsurf and Cursor handle model selection.

**Provider Tiers:**

**Tier 1 (always visible):** OpenAI, Anthropic, Google, Meta (Llama via Groq/Together)

**Tier 2 ("See more providers" expander):** Mistral, DeepSeek, Cohere, Kimi (Moonshot AI), GLM (Zhipu AI), Perplexity, Together AI, Groq, Amazon Bedrock, Azure OpenAI

**UI:**
- Tier 1 providers render as normal dropdown options
- Below them: a `+ See more providers (N)` row that expands inline to show Tier 2
- Tier 2 selection persists for the session (does not collapse after pick)

**Model Search:**
- After a provider is selected, the Model Name dropdown gains a search input at the top
- Filters model list in real time
- Placeholder: "Search models..."
- Only visible when provider has > 5 models

**Acceptance Criteria:**
- [ ] Tier 1 providers always visible in dropdown
- [ ] "+ See more providers" row expands to Tier 2 inline
- [ ] Model search input appears for providers with > 5 models
- [ ] Search filters by model name (case-insensitive, partial match)
- [ ] Selected Tier 2 provider does not reset to Tier 1 on panel reopen

---

### [P2-03] "Request a Model" Feedback Integration

**Why:** Providers release new models constantly. Outsourcing discovery to engaged users is more sustainable than internal tracking.

**Scope:**
- At the bottom of the provider dropdown: `+ Request a model` link
- Opens a lightweight modal: provider name input, model name input, optional pricing info, submit
- On submit: creates a GitHub Issue via GitHub API with label `model-request` OR posts to a feedback endpoint (Formspree / Linear / Notion DB — team's choice)
- Submitted requests visible in a public GitHub repo Issues tab

**Acceptance Criteria:**
- [ ] "Request a model" link visible at bottom of provider dropdown
- [ ] Modal collects: provider, model name, optional pricing, optional notes
- [ ] Submit creates a GitHub Issue or posts to configured feedback endpoint
- [ ] User sees confirmation toast: "Request submitted — thank you!"
- [ ] No authentication required to submit

---

### [P2-04] Canvas Thumbnail Previews in Saved Workflows

**Why:** A list of workflow names with no visual preview forces users to open each one to find what they want.

**Scope:**
- When a workflow is saved, generate a canvas thumbnail (PNG, max 300×200px) using the same export-to-PNG logic
- Store thumbnail URL alongside canvas JSON in DB
- Saved Workflows panel in sidebar renders thumbnail cards instead of text list
- Clicking a card opens the workflow

**Acceptance Criteria:**
- [ ] Thumbnail generated on every Save
- [ ] Thumbnail stored in object storage (S3/Supabase Storage) keyed by canvas UUID
- [ ] Sidebar shows thumbnail grid (2 columns) when > 0 saved workflows
- [ ] Thumbnail updates when workflow is re-saved
- [ ] Fallback: if no thumbnail, show a placeholder icon

---

### [P2-05] Extended Template Library

**Why:** Templates are activation drivers. Users who load a template are far more likely to complete an estimation run than those who start from scratch.

**New Templates to Add:**

| Template | Category | Description |
|----------|----------|-------------|
| ReAct Agent | orchestration | Single agent with tool loop and condition exit |
| Plan & Execute | orchestration | Planner agent → parallel executor agents → aggregator |
| Multi-Agent Handoff | orchestration | Agent A routes to Agent B or Agent C via condition |
| Self-Critique Loop | research | Agent generates → critic agent reviews → loop until pass |
| Structured Extraction | rag | Input → chunker → embedder → retriever → extractor |
| Cost Comparison | custom | Same task routed to 3 different models for cost benchmarking |
| Human-in-the-Loop | custom | Agent → approval gate → continue or reroute |

**Each template must:**
- Be a valid `.neurovn.json` that imports correctly
- Have all agent nodes pre-configured with sensible defaults
- Produce a non-zero estimation on first "Run Workflow & Gen Estimate"
- Have a category tag and description visible in the template picker modal

**Acceptance Criteria:**
- [ ] All 7 templates load without error
- [ ] Each template generates a valid estimation on first run
- [ ] Template picker modal shows category filter tabs
- [ ] "Browse all templates" opens full template library view
- [ ] Templates are searchable by name

---

## P3 — Future / Backlog

---

### [P3-01] Parallel Branch Visual Indicator

Visual treatment for detected fork/join patterns on canvas — "⚡ parallel" edge label, branch cost/latency breakdown shown inline between fork and join nodes.

---

### [P3-02] Multi-Select + Group Nodes

Shift-click or drag-select to select multiple nodes. Group them into a named Group Box. Move, copy, or delete as a unit.

---

### [P3-03] Mini-Map

Small overview map in bottom-right corner for canvases with > 15 nodes. Toggle on/off.

---

### [P3-04] Zoom to Fit Keyboard Shortcut

`Shift+1` or `Cmd+Shift+F` fits all nodes into the viewport. Already partially present (fit button in toolbar) — add keyboard shortcut and expose it in the Help modal.

---

### [P3-05] Mobile-Responsive Landing + Dashboard

Canvas itself stays desktop-only. Landing page and saved workflows dashboard must be fully usable on mobile. Canvas routes show a "Canvas requires a desktop browser" interstitial on viewports < 768px.

---

*Document version: 1.0 — Neurovn product audit, March 2026*








Read .agents/features/UI_UX.md section 5 (Read-Only Shareable Canvas Link) in full.

Implement the shareable read-only link feature.

DATABASE:
Add to the canvases table:
  is_public: boolean, default false
  public_uuid: uuid, default gen_random_uuid()
  last_estimation_report: jsonb, nullable

If using Supabase, write the migration SQL. If using another ORM,
write the equivalent migration.

BACKEND:
- On Save: if last_estimation_report is available in the current session,
  persist it alongside the canvas JSON
- New endpoint: GET /api/canvas/public/[uuid]
  Returns canvas JSON + last_estimation_report if is_public = true
  Returns 404 if is_public = false or uuid not found

FRONTEND:
1. Add a "Share" button to the header between Save and Sign In
   Icon: share/link icon

2. Share modal (see UI_UX_SPEC.md section 5 for layout):
   - Toggle "Public link" (default off)
   - When toggled on: show the share URL, Copy button
   - When toggled off: URL is hidden, backend sets is_public = false

3. New route /view/[uuid]:
   - Fetches canvas from GET /api/canvas/public/[uuid]
   - Renders canvas in read-only mode:
     - No left sidebar
     - No config panels on double-click
     - No drag-to-connect
     - No node drag (nodes are fixed)
     - Header shows: "Neurovn / {workflow_name} [Read-only]"
   - If estimation report exists: show it below the canvas (read-only)
   - "Open in Neurovn" button: redirects to /signup, then forks workflow
     into the new user's account
   - Accessible without login

✅ Verify: Save a workflow. Click Share. Toggle on. Copy the link.
Open it in an incognito window. Canvas renders correctly, no edit
controls. Double-clicking a node does nothing. Toggle off in original tab.
Reload the incognito tab — 404.