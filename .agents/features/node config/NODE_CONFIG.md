# Neurovn — Node Configuration Panel Specification

> Defines the structure, fields, and behaviour of each node's configuration panel.  
> Covers: Agent, Tool (standalone), Condition, Start, Finish nodes.  
> Includes the tabbed panel redesign and multi-tool binding spec.

---

## 1. Panel Architecture — Tabbed Design

The current single-scroll config panel becomes a **3-tab panel** for Agent nodes.
All other node types (Tool, Condition) keep a single-panel layout (they have fewer fields).

### Tab Structure for Agent Nodes

```
┌──────────────────────────────────────┐
│  Configure: {Node Label}          ×  │
├──────────────┬─────────────┬─────────┤
│    Model     │  Estimation │  Tools  │
│    (active)  │             │         │
├──────────────┴─────────────┴─────────┤
│                                      │
│  [tab content]                       │
│                                      │
│                                      │
│  ─────────────────────────────────   │
│  [ Cancel ]              [ Save ]    │
└──────────────────────────────────────┘
```

- Save and Cancel are always visible, pinned to the bottom, regardless of active tab
- If a tab has an incomplete required field, show a red dot `●` on the tab label
- Active tab state persists until the panel is closed — reopening the same node resumes on the last active tab

---

## 2. Agent Node — Model Tab

### Fields

| Field | Type | Required | Default |
|-------|------|----------|---------|
| Model Provider | dropdown | yes | none |
| Model Name | searchable dropdown | yes | none |
| Pricing Card | display only | — | auto-populated |
| System Prompt | textarea | no | "" |
| Max Output Tokens | number input | no | null |
| Temperature | slider (0.0–2.0, step 0.1) | no | 1.0 |
| Max Loop Steps | number input | no | 10 |

### Model Provider Dropdown

**Tier 1 (always visible):**
- OpenAI (N models)
- Anthropic (N models)
- Google (N models)
- Meta / Groq (N models)

**Tier 2 (under "+ See more providers"):**
- Mistral (N models)
- DeepSeek (N models)
- Cohere (N models)
- Kimi / Moonshot AI (N models)
- GLM / Zhipu AI (N models)
- Together AI (N models)
- Perplexity (N models)
- Amazon Bedrock (N models)

**Footer row:** `+ Request a model →` (opens request modal)

Each provider shows `(N models)` count and `· updated {month} {year}` in muted text.
If last_updated age > 30 days: show ⚠ icon with tooltip "Pricing data may be outdated."

### Model Name Dropdown

- If provider has ≤ 5 models: plain dropdown
- If provider has > 5 models: dropdown with a search input at top
  - Placeholder: "Search models..."
  - Filters by partial match, case-insensitive
  - Shows filtered results in real time

### Pricing Card

Auto-populated when a model is selected. Format:

```
┌──────────────────────────────────────────┐
│ Claude 3.5 Sonnet          claude-3-5   │
│ Input:    $3.00 / 1M tokens              │
│ Output:   $15.00 / 1M tokens             │
│ Speed:    ~70 tok/s                      │
│ Context:  200K tokens                    │
└──────────────────────────────────────────┘
```

### System Prompt Field

- Label: `System Prompt`
- Char counter shown as `(N/500)` — current token estimate / limit
- Token count updates live as user types (using the `count_tokens` approximation)
- Placeholder: `e.g. You are a helpful assistant that summarizes documents.`

### Max Output Tokens

- Label: `Max Output Tokens`
- Input type: number, min 1, max determined by model's context window
- Helper text: `Sets a hard ceiling on output length. Overrides Expected Output Size when set.`
- When set, the Estimation tab's "Expected Output Size" dropdown becomes secondary/muted

### Temperature

- Label: `Temperature`
- Slider: 0.0 to 2.0, step 0.1, default 1.0
- Helper text shown below slider:
  - 0.0–0.3: "Deterministic — consistent, predictable outputs"
  - 0.4–0.8: "Balanced — slight variation, generally reliable"
  - 0.9–1.4: "Creative — more varied responses"
  - 1.5–2.0: "High variance — may produce unexpected results. Increases effective retry probability."
- Temperature does NOT affect cost estimate — show a tooltip: "Temperature doesn't change token costs, but high values may increase retries."

### Max Loop Steps

- Label: `Max Loop Steps`
- Only shown when the node is part of a detected loop (back-edge in graph)
- Otherwise: hidden (not greyed out — fully hidden to reduce clutter)
- Helper text: `Max iterations if this node is in a loop. Used for worst-case cost estimation.`
- Default: 10, Min: 1, Max: 100

---

## 3. Agent Node — Estimation Tab

### Fields

| Field | Type | Required | Default | (i) Tooltip |
|-------|------|----------|---------|-------------|
| Task Type | dropdown | no | generic | "Adjusts assumed input token usage based on task complexity" |
| Expected Output Size | dropdown | no | medium | "Approximate length of this node's output. Used to estimate output token cost. Overridden by Max Output Tokens if set." |
| Expected Calls per Run | number | no | 1 | "For orchestrators that execute multiple times per workflow run. Multiplies this node's cost." |
| Retry Budget | number | no | 1 | "Maximum retries before this node is considered failed. Multiplies the per-call cost estimate for worst-case." |

### Task Type Options

| Value | Label |
|-------|-------|
| `generic` | — none (generic) — |
| `classification` | Classification |
| `summarization` | Summarization |
| `code_generation` | Code Generation |
| `rag_answering` | RAG Answering |
| `tool_orchestration` | Tool Orchestration |
| `routing` | Routing |

### Expected Output Size Options

| Value | Label | Token range |
|-------|-------|-------------|
| `auto` | — auto (1.5× heuristic) — | computed |
| `short` | Short (≤ 200 tokens) | 100 midpoint |
| `medium` | Medium (200–600 tokens) | 400 midpoint |
| `long` | Long (600–1500 tokens) | 1050 midpoint |
| `very_long` | Very Long (> 1500 tokens) | 2000 midpoint |

When `Max Output Tokens` is set in the Model tab, this field renders with a note:
> "Max Output Tokens is set — this field is used as a fallback estimate only."

### Retry Budget

- Number input: min 1, max 5
- Default: 1
- Helper: `Default: 1 · Max: 5`

---

## 4. Agent Node — Tools Tab

This tab replaces the need for standalone Tool nodes in most workflows. The agent can have tools bound directly, reflecting how LLM tool-use actually works.

### Layout

```
Tools attached to this agent

[ Search tools... ]

DATABASE (6)
  ☐ PostgreSQL Query
  ☐ MySQL Query
  ☑ Supabase Query        ← selected
  ☐ SQLite Query
  ☐ MongoDB Query
  ☐ Redis Get/Set

MCP SERVER (7)
  ☐ MCP Web Search
  ☑ MCP GitHub            ← selected
  ☐ MCP Filesystem
  ...

API INTEGRATION (3)
  ...

CODE EXECUTION (2)
  ...

RETRIEVAL / RAG (3)
  ...

─────────────────────────────────────
2 tools selected
Adds ~380 schema tokens to input
Adds ~600 avg response tokens to input
```

### Behaviour

- Multi-select (checkboxes)
- Up to 8 tools can be selected
- Live counter below: "N tools selected"
- Running token impact shown live:
  - "Adds ~{sum(schema_tokens)} schema tokens to input"
  - "Adds ~{sum(avg_response_tokens)} avg response tokens to input"
- Selecting a tool immediately updates the live cost preview on the node card when Save is clicked

### Node Card Display

When tools are bound, the node card renders tool chips:

```
┌──────────────────────────────────┐
│  🔵  Summarizer                  │
│  Anthropic / Claude-3.5-Sonnet   │
│  Summarization · Medium          │
│  🔧 supabase  🔧 mcp_github      │
│  ~$0.006 / call                  │
└──────────────────────────────────┘
```

- Max 3 chips visible on card; if > 3: show `+N more`
- Chips are not clickable on the canvas — clicking the node opens config

### JSON Export

Tools bound to an agent are stored under `data.tools`:

```json
{
  "type": "agentNode",
  "data": {
    "label": "Summarizer",
    "modelProvider": "Anthropic",
    "modelName": "Claude-3.5-Sonnet",
    "tools": ["supabase_query", "mcp_github"]
  }
}
```

---

## 5. Tool Node (Standalone) — Config Panel

The standalone Tool node remains for use cases where a tool executes independently (without an LLM wrapper), e.g. a retrieval step, a database lookup before any agent runs.

### Fields

| Field | Type | Required |
|-------|------|----------|
| Tool Category | dropdown | yes |
| Tool | dropdown (dependent on category) | yes |
| Label override | text input | no |

No tabs — single-panel layout.

### Node Card Display

```
┌──────────────────────────────────┐
│  🟠  MCP Web Search              │
│  MCP Server · ~800ms             │
│  schema: 180 tok                 │
└──────────────────────────────────┘
```

After configuration, the node card subtitle updates from `"double-click to configure"` to:
- `{category} · ~{latency_ms}ms`

---

## 6. Condition Node — Config Panel

Single-panel layout (no tabs).

### Fields

| Field | Type | Notes |
|-------|------|-------|
| Condition Expression | text input | Human-readable. Placeholder: "e.g. sentiment > 0.7" |
| Branch Probability | slider (0–100) | True% / False% shown live |
| Label override | text input | |

### Branch Probability Slider

The slider controls the True branch probability. False = 100 - True.

Used by the estimator as a weighted average for cost:
```
branch_cost = (true_probability * true_branch_cost) + (false_probability * false_branch_cost)
```

### Node Card Display

```
◆  Condition
   sentiment > 0.7
   True: 70%  /  False: 30%
```

---

## 7. Start + Finish Nodes

These nodes have no configuration panel. Double-clicking them does nothing (or shows a read-only tooltip: "Start node — connects to the first step in your workflow").

No config fields, no modal.

---

## 8. Shared Panel Behaviours

### Inline Node Renaming

Available on all configurable nodes (Agent, Tool, Condition):

- Config panel header shows: `Configure: {current_label}`
- An edit icon (✏) next to the label in the header
- Clicking it makes the label text inline-editable within the panel header
- Or: double-clicking the node label directly on the canvas enters edit mode (see P0-02)

### Validation on Save

Before closing the panel on Save:

| Node Type | Required fields | Validation |
|-----------|----------------|------------|
| Agent | modelProvider, modelName | Show inline red message if missing |
| Tool | toolCategory, toolId | Show inline red message if missing |
| Condition | none required | No validation |

If required fields are missing:
- Red border appears on the empty field
- "Save" button remains clickable but shows an error toast: "Please complete required fields"
- Panel does not close

### Panel Positioning

- Panel slides in from the right side of the canvas
- Does not obstruct the left sidebar
- On narrow viewports (< 1200px): panel overlays the canvas as a drawer
- Close button (×) in top-right
- Clicking outside the panel does NOT close it (prevents accidental data loss)

---

## 9. Request a Model Modal

Accessible from the provider dropdown footer row.

```
┌──────────────────────────────────────┐
│  Request a Model               ×    │
├──────────────────────────────────────┤
│                                      │
│  Provider Name                       │
│  [ e.g. Kimi / Moonshot AI     ]     │
│                                      │
│  Model Name                          │
│  [ e.g. kimi-k2                ]     │
│                                      │
│  Pricing (optional)                  │
│  [ e.g. $0.15/$0.60 per 1M tok ]     │
│                                      │
│  Notes (optional)                    │
│  [ any other context...        ]     │
│                                      │
│  [ Cancel ]         [ Submit →  ]    │
└──────────────────────────────────────┘
```

On submit:
- POST to `/api/model-request` which creates a GitHub Issue via GitHub API
- Issue label: `model-request`
- Issue title: `[Model Request] {provider} — {model_name}`
- Show success toast: "Request submitted — thank you! We review these weekly."

---

*Document version: 1.0 — Neurovn node configuration spec, March 2026*