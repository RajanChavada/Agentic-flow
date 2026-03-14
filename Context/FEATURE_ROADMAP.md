# Feature Roadmap — Next Milestones

## Executive Summary

Three strategic milestones that deepen Neurovn from a layout + estimation tool into a **context-aware, interoperable, exportable** workflow analysis platform.

| # | Milestone | Goal | Backend scope | Frontend scope |
|---|-----------|------|--------------|----------------|
| 1 | Context-Aware Agents | Smarter per-agent estimation using task type, expected output size, and optional historical traces | New estimation heuristics, extended `NodeConfig`, task-type multipliers | Extended config modal, agent node summary, new fields in Zustand store |
| 2 | Production JSON Import & Comparison | Import real-world workflows (generic / LangGraph) and compare against canvas designs | New `POST /api/import-workflow` endpoint, adapter layer | Import modal in header, "Load as scenario" toggle, canvas visualization |
| 3 | Auto-Layout & Export | Auto-tidy graphs + export PNG/SVG/JSON/Markdown reports | Optional `POST /api/export/report` for Markdown generation | dagre layout engine, `html-to-image` for PNG/SVG, JSON/MD download buttons |

---

## Milestone 1 — Context-Aware Agents

### 1.1 Overview

Move from "context length × generic multiplier" to **task-aware** estimation. Each agent node captures:
- **Task type** — classification, summarization, code_generation, rag_answer, tool_orchestration, routing
- **Expected output size** — short (≤200 tokens), medium (200–600), long (600–1500), very_long (>1500)
- **Expected calls per run** — optional integer for orchestrator/tool-heavy agents

The estimator uses a task-type × output-size multiplier table instead of a flat `_OUTPUT_RATIO = 1.5`.

### 1.2 Backend Changes

**`models.py`** — Extend `NodeConfig`:
```python
task_type: Optional[Literal[
    "classification", "summarization", "code_generation",
    "rag_answer", "tool_orchestration", "routing"
]] = None

expected_output_size: Optional[Literal[
    "short", "medium", "long", "very_long"
]] = None

expected_calls_per_run: Optional[int] = Field(
    default=None, ge=1, le=50,
    description="Expected number of LLM calls this agent makes per run"
)
```

**`estimator.py`** — New `_TASK_OUTPUT_MULTIPLIERS` dict:
```python
_TASK_OUTPUT_MULTIPLIERS = {
    ("classification", "short"):   0.3,
    ("classification", "medium"):  0.5,
    ("summarization", "short"):    0.8,
    ("summarization", "medium"):   1.2,
    ("summarization", "long"):     1.8,
    ("code_generation", "medium"): 2.0,
    ("code_generation", "long"):   3.0,
    ("code_generation", "very_long"): 4.5,
    ("rag_answer", "short"):       0.6,
    ("rag_answer", "medium"):      1.2,
    ("rag_answer", "long"):        2.0,
    ("tool_orchestration", "short"):  0.5,
    ("tool_orchestration", "medium"): 1.0,
    ("routing", "short"):          0.2,
    # fallback: _OUTPUT_RATIO (1.5)
}
```

Logic change in `estimate_agent_node()`:
- If `task_type` and `expected_output_size` are set → use the multiplier table
- Multiply `expected_calls_per_run` into token/cost/latency if set
- Otherwise fall back to `_OUTPUT_RATIO = 1.5`

### 1.3 Frontend Changes

**`types/workflow.ts`** — Add to `WorkflowNodeData` and `NodeConfigPayload`:
- `taskType?: string`
- `expectedOutputSize?: string`
- `expectedCallsPerRun?: number | null`

**`NodeConfigModal.tsx`** — For agent nodes, add:
- Task Type dropdown (6 options)
- Expected Output Size dropdown (4 options)
- Expected Calls per Run number input (optional)

**`WorkflowNode.tsx`** — Show compact context summary on agent nodes:
- e.g. "Summarization · Medium · ×3 calls"

**`useWorkflowStore.ts`** — Update `nodesToPayload()` to include new fields.

**`HeaderBar.tsx`** — Update `handleEstimate()` payload mapping.

### 1.4 Implementation Order
1. Backend: Extend `NodeConfig` in `models.py`
2. Backend: Add multiplier table + update `estimate_agent_node()` in `estimator.py`
3. Frontend: Extend types in `workflow.ts`
4. Frontend: Add fields to `NodeConfigModal.tsx`
5. Frontend: Update payload mapping in store + HeaderBar
6. Frontend: Show context summary on `WorkflowNode.tsx`
7. Verify TypeScript + Python builds clean

---

## Milestone 2 — Production JSON Import & Comparison

### 2.1 Overview

Developers can paste or upload a JSON workflow definition (from LangGraph, generic node/edge format, or custom) and either:
- **Replace** the current canvas with the imported graph
- **Load as a comparison scenario** to estimate alongside canvas designs

### 2.2 Backend Changes

**`models.py`** — New models:
```python
class ExternalWorkflowImportRequest(BaseModel):
    source: Literal["generic", "langgraph", "custom"]
    payload: dict

class ImportedWorkflow(BaseModel):
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]
    metadata: dict = {}   # source-specific extra info
```

**New file: `import_adapters.py`**:
- `import_generic(payload) → ImportedWorkflow` — expects `{ nodes: [...], edges: [...] }`
- `import_langgraph(payload) → ImportedWorkflow` — maps LangGraph state-graph JSON (nodes, edges, conditional edges) to internal format
- `import_custom(payload) → ImportedWorkflow` — passthrough with validation

**`main.py`** — New endpoint:
```python
@app.post("/api/import-workflow")
async def import_workflow(request: ExternalWorkflowImportRequest):
    adapter = get_adapter(request.source)
    result = adapter(request.payload)
    return result
```

### 2.3 Frontend Changes

**`ImportWorkflowModal.tsx`** — New component:
- JSON textarea (with syntax highlighting hint)
- Source dropdown: Generic / LangGraph / Custom
- Toggle: "Replace current canvas" vs "Load as comparison scenario"
- Import button → calls `POST /api/import-workflow` → on success:
  - Replace mode: loads nodes/edges onto canvas
  - Scenario mode: saves as a WorkflowScenario with `(Imported)` suffix

**`HeaderBar.tsx`** — Add "📥 Import" button between Save and Run.

**`useWorkflowStore.ts`** — Add `importWorkflow(nodes, edges, mode)` action.

### 2.4 Implementation Order
1. Backend: Models in `models.py`
2. Backend: Create `import_adapters.py` with generic + LangGraph adapters
3. Backend: Add route in `main.py`
4. Frontend: Create `ImportWorkflowModal.tsx`
5. Frontend: Add store action + HeaderBar button
6. Verify end-to-end import → estimate flow

---

## Milestone 3 — Auto-Layout & Export

### 3.1 Overview

Two capabilities:
1. **Auto-layout** — dagre positions all nodes in a clean top-to-bottom DAG layout
2. **Export** — PNG/SVG of the canvas + JSON/Markdown reports

### 3.2 Frontend Changes (Auto-Layout)

**Install**: `npm install @dagrejs/dagre`

**`Canvas.tsx`** or new `useAutoLayout.ts` hook:
- Read current nodes + edges from store
- Run dagre layout (direction: TB, node spacing: 80, rank spacing: 120)
- Write computed positions back to store via `setNodes()`
- Call `fitView()` on the React Flow instance

**`HeaderBar.tsx`** — Add "🔀 Auto Layout" button.

### 3.3 Frontend Changes (Export)

**Install**: `npm install html-to-image`

**Graph export** (PNG/SVG):
- Capture the `.react-flow` DOM node using `toPng()` / `toSvg()` from `html-to-image`
- Trigger browser download

**Report export** (JSON / Markdown):
- JSON: serialize `WorkflowEstimation` + nodes/edges directly
- Markdown: template-render a human-readable report with:
  - Workflow summary (graph type, node count, edge count)
  - Cost/latency/token totals
  - Per-node breakdown table
  - Critical path
  - Health score
  - Scaling projection (if available)

**`ExportDropdown.tsx`** — New component in HeaderBar:
- "📤 Export" dropdown with options:
  - Export Graph as PNG
  - Export Graph as SVG
  - Export Report as JSON
  - Export Report as Markdown

### 3.4 Backend Changes (Optional)

**`POST /api/export/report`** — Optional server-side Markdown generation if we want consistent formatting. For MVP, client-side is sufficient.

### 3.5 Implementation Order
1. Install `@dagrejs/dagre` + `html-to-image`
2. Implement auto-layout in Canvas/hook
3. Add Auto Layout button to HeaderBar
4. Implement PNG/SVG export
5. Implement JSON/Markdown report export
6. Build ExportDropdown component
7. Verify all exports produce valid output

---

## Suggested Execution Sequence

| Phase | Work | Est. complexity |
|-------|------|----------------|
| **Phase A** | Milestone 1: Context-Aware Agents (backend + frontend) | Medium |
| **Phase B** | Milestone 2: JSON Import & Comparison (backend + frontend) | Medium |
| **Phase C** | Milestone 3a: Auto-Layout (frontend only) | Small |
| **Phase D** | Milestone 3b: Export PNG/SVG + JSON/MD reports (frontend only) | Small-Medium |

Each phase is independently shippable and builds on the existing codebase without breaking changes.

---

## Canvas UX Features

- [x] Modal popups for agent/tool nodes, toolbar for boxes/text — `.ai/context/features/agentic-node-modals-toolbar-split.md`
- [x] Canvas Dashboard and Workflow Pull — My Canvases page, plus button, pull from canvas modal, canvas-scoped workflows
- [ ] Editable canvas/workflow names + workflow thumbnails — `Context/features/canvas-workflow-names-and-thumbnails.md`
- [ ] Template Preview Modal & Browse Visual Guide — `Context/features/template-preview-modal.md`
- [x] User Profile Settings & Metrics — `Context/features/user-profile-settings-and-metrics.md`
- [x] Profile Sleek Metrics Dashboard — `.ai/context/features/profile-sleek-metrics-dashboard.md`
- [ ] New User Profile Onboarding Modal — `.ai/context/features/new-user-profile-onboarding-modal.md`
- [x] Canvases Info Modal — `.ai/context/features/canvases-info-modal.md`
- [x] Workflow Share Links — `.ai/context/features/workflow-share-links.md`
- [ ] Stripe Integration & Subscription Tiers — `Context/features/stripe-integration-subscription-tiers.md`

## Workflow Resilience & Error Handling

- [ ] Failure Path Edges (Error Handling / Retry) -- `Context/features/failure-path-edges.md`

## Security & Production Hardening

- [ ] Security Guardrails & Production Hardening -- `Context/features/security-guardrails-production-hardening.md`

## Blank Canvas & Onboarding

- [x] Blank Canvas Workflow Scaffolding (Phase 1) -- `Context/features/blank-canvas-workflow-scaffold.md`
- [x] AI-Powered NLP Scaffolding (Phase 2) -- backend `POST /api/scaffold` + NL prompt enablement + refine bar

## Agent Intelligence

- [ ] Edge Data Contracts (Typed Schemas) -- `Context/features/edge-data-contracts.md`
- [ ] Action Constraints on Agent Nodes -- `Context/features/action-constraints-agent-nodes.md`

- [ ] Output Dashboard Redesign -- `Context/features/dashboard-redesign.md`
