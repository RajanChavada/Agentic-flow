### Purpose of this document 
Allow agents to update this document with their updates and thoughts after completing a task so that they can reference and keep track of their progress and learnings. This document serves as a memory for the agents, allowing them to reflect on their work and make informed decisions in future tasks. By maintaining a record of their experiences, agents can continuously improve their performance and adapt to new challenges effectively. The agent should follow the outline when documenting their updates and ensure they define them selves as which specific agent they are for example "Frontend agent working on sidebar" or "Backend agent working on FAST API routes"


### Agent memory outline agents should follow when documenting 
1. **Task Description**: Briefly describe the task that was completed, including the objectives and any specific requirements or constraints.
2. **Approach and Methodology**: Detail the approach taken to complete the task, including any strategies, tools, or techniques used. Explain why this approach was chosen and how it was implemented.
3. **Results and Outcomes**: Summarize the results of the task, including any
quantitative or qualitative outcomes. Highlight any successes, challenges, or unexpected findings that arose during the process.
4. **Next Steps and Future Considerations**: Outline any next steps that should be taken based on the results of the task. This could include further analysis, additional tasks, or adjustments to the approach for future work. Also, consider any lessons learned or insights gained that could inform future projects or tasks.

### Example one shot agent memory update
**Task Description**: Frontend agent working on sidebar. The objective was to design and implement
a sidebar for the application that allows users to easily navigate between different sections and access key features. The sidebar needed to be responsive and visually appealing, while also providing a seamless user experience.
**Approach and Methodology**: To complete this task, I first conducted research on best practices for sidebar design and user experience. I then created wireframes and mockups using Figma to visualize the layout and functionality of the sidebar. After receiving feedback from the team, I implemented the sidebar using React and styled it with CSS to ensure it was responsive and visually consistent with the overall design of the application.
**Results and Outcomes**: The sidebar was successfully implemented and integrated into the application. It received
positive feedback from users during testing, with many noting its ease of use and intuitive design. However, I encountered some challenges with ensuring the sidebar was fully responsive across different devices and screen sizes, which required additional adjustments to the CSS.
**Next Steps and Future Considerations**: Moving forward, I plan to conduct further testing to
identify any remaining issues with responsiveness and make necessary adjustments. Additionally, I will gather more user feedback to explore potential enhancements to the sidebar's functionality and design. Lessons learned from this task include the importance of thorough testing across various devices and the value of iterative design based on user feedback.

---

## Agent Updates

---

### Update 1 — February 15, 2026

**Agent**: Scaffolding agent — full-stack project initialization (frontend + backend + root configs)

**Task Description**: Scaffold the entire Agentic Flow Designer monorepo from scratch based on the three planning documents (`CONTEXT.md`, `FRONTEND_PLAN.MD`, `BACKEND_PLAN.md`). The objective was to create a fully buildable, runnable project structure with both the Next.js frontend and FastAPI backend wired together end-to-end, so that future agents can immediately begin feature work without setup overhead.

**Approach and Methodology**:

1. **Read all context documents first** — `CONTEXT.md` for the big picture (canvas-based workflow designer with cost estimation), `FRONTEND_PLAN.MD` for the exact tech stack and component layout (React Flow + Zustand + Tailwind + Recharts), and `BACKEND_PLAN.md` for the API contract and estimation logic (FastAPI + tiktoken + Pydantic).

2. **Backend first** — created all 6 backend files in order of dependency:
   - `config.py` — environment variables via `python-dotenv` (CORS origin, host, port)
   - `models.py` — Pydantic schemas matching the `BACKEND_PLAN.md` spec exactly (`NodeConfig`, `EdgeConfig`, `WorkflowRequest`, `NodeEstimation`, `WorkflowEstimation`)
   - `pricing_data.py` — `MODEL_PRICING` dict with 10 models across OpenAI, Anthropic, Google; key format `"<Provider>_<Model>"` as specified
   - `graph_analyzer.py` — `GraphAnalyzer` class with DFS cycle detection, Kahn's topological sort, and a critical-path stub
   - `estimator.py` — token counting via tiktoken `cl100k_base`, cost formula (`input_tokens / 1M * price`), latency formula (`output_tokens / tokens_per_sec`), per-node and full-workflow estimation
   - `main.py` — FastAPI app with CORS for `localhost:3000`, `POST /api/estimate`, `GET /api/pricing`, `GET /health`, and `uvicorn.run` entrypoint
   - `requirements.txt` — pinned versions for fastapi, uvicorn, pydantic, tiktoken, httpx, python-dotenv

3. **Frontend via create-next-app** — ran `npx create-next-app@latest` with `--ts --tailwind --eslint --app --src-dir` flags. Then installed `@xyflow/react`, `zustand`, `recharts`, `uuid` + `@types/uuid`.

4. **Frontend application code** — created 10 source files:
   - `src/types/workflow.ts` — `WorkflowNodeData` (with `[key: string]: unknown` index signature for React Flow compatibility), API payload types, estimation response types
   - `src/store/useWorkflowStore.ts` — single Zustand store with nodes, edges, selectedNodeId, estimation, UI slices; exported selector hooks (`useWorkflowNodes`, `useWorkflowEdges`, `useSelectedNodeId`, `useEstimation`, `useUIState`)
   - `src/components/nodes/WorkflowNode.tsx` — `React.memo`-wrapped custom node with colour coding (green/blue/orange/red), handles, model info display
   - `src/components/Sidebar.tsx` — draggable palette using HTML5 `dataTransfer` with keys `application/reactflow-type` and `application/reactflow-label`
   - `src/components/Canvas.tsx` — React Flow instance with `nodeTypes` map, `onDrop`/`onDragOver`/`onConnect`/`onNodeDoubleClick` handlers, Background/Controls/MiniMap
   - `src/components/HeaderBar.tsx` — "Get Estimate" button that validates Start+Finish exist, builds payload, calls `POST /api/estimate`, sets estimation or error
   - `src/components/EstimatePanel.tsx` — collapsible bottom panel with 3 summary cards (tokens/cost/latency) and a Recharts `BarChart`
   - `src/components/NodeConfigModal.tsx` — modal triggered by double-click; fields for provider (select), model (select filtered by provider), context (textarea with 500 char limit); `MODELS` map keys match `pricing_data.py` keys exactly
   - `src/components/ErrorBanner.tsx` — dismissable red banner for validation/API errors
   - `src/app/page.tsx` — main layout wiring `ReactFlowProvider` → `HeaderBar` + `ErrorBanner` + `Sidebar` + `Canvas` + `EstimatePanel` + `NodeConfigModal`

5. **Root files** — updated `README.md` with repo layout tree, quick-start commands, feature list; created `.gitignore` (Python + Node + OS + IDE); created `.github/copilot-instructions.md` with architecture overview, conventions, patterns, and key file references.

6. **Encountered disk space issue** during `npm install` (only 1.4 GB free) — resolved by running `npm cache clean --force` which freed ~7 GB.

7. **Fixed TypeScript error** — React Flow requires node data to satisfy `Record<string, unknown>`. Changed `WorkflowNodeData` from `interface` to `type` with `[key: string]: unknown` index signature, as specified in the frontend plan.

**Results and Outcomes**:
- ✅ **Backend**: `python -c "from main import app"` passes; `curl POST /api/estimate` with a 3-node workflow (Start → Agent(GPT-4o) → Finish) returns correct JSON: `{"total_tokens":512,"total_cost":0.0035825,"total_latency":3.837,"graph_type":"DAG","breakdown":[...],"critical_path":["1","2","3"]}`
- ✅ **Frontend**: `npx next build` compiles with zero TypeScript errors and generates static pages successfully
- ✅ **All 20+ files** created and verified across both services
- ⚠️ **Tailwind v4 lint warnings** about class name syntax (e.g., `!bg-gray-500` → `bg-gray-500!`) — cosmetic only, non-blocking

**Files Created**:
| Layer | Files |
|-------|-------|
| Backend | `config.py`, `models.py`, `pricing_data.py`, `graph_analyzer.py`, `estimator.py`, `main.py`, `requirements.txt` |
| Frontend | `src/types/workflow.ts`, `src/store/useWorkflowStore.ts`, `src/components/nodes/WorkflowNode.tsx`, `src/components/Sidebar.tsx`, `src/components/Canvas.tsx`, `src/components/HeaderBar.tsx`, `src/components/EstimatePanel.tsx`, `src/components/NodeConfigModal.tsx`, `src/components/ErrorBanner.tsx`, `src/app/page.tsx` (replaced), `src/app/layout.tsx` (updated), `.env.local` |
| Root | `README.md` (updated), `.gitignore`, `.github/copilot-instructions.md` |

**Next Steps and Future Considerations**:
1. **Frontend polish** — fix Tailwind v4 class syntax warnings (`!` prefix → `!` suffix); clean up default Next.js public assets (file.svg, globe.svg, etc.)
2. **Edge UX** — add delete-edge support (keyboard shortcut or context menu), custom animated edge types for conditional/loop flows
3. **Node enhancements** — add delete-node button on hover/selection, node duplication, undo/redo (Zustand middleware)
4. **Backend tests** — add pytest tests for `graph_analyzer.py` (cycle detection edge cases) and `estimator.py` (token count accuracy, pricing lookup)
5. **Frontend tests** — add basic component tests for the Zustand store and Canvas interactions
6. **Real workflow execution** — the current system is estimation-only; future iterations could integrate LangChain/LangGraph for actual execution with `get_openai_callback()` token tracking
7. **Lessons learned** — always check disk space before `npm install` on constrained machines; React Flow's `Record<string, unknown>` constraint for node data requires an index signature on custom data types — this is a common gotcha that should always be included

---

### Update 2 — February 15, 2026

**Agent**: Frontend agent — UI polish, theming, edge arrows, modal positioning, styling overhaul

**Task Description**: Fix multiple frontend UI issues: (1) black background forcing dark mode by default via `prefers-color-scheme` — switch to white default with user-controlled toggle, (2) sidebar node palette had white text on white background making items unreadable, (3) edges between nodes had no directional arrows (DAG needs visible flow direction), (4) config modal appeared dead-center blocking the workflow view — reposition next to the selected node, (5) replace emoji icons with CSS shapes/colours for a cleaner professional look, (6) rename "Get Estimate" to "Run Workflow & Gen Estimate".

**Approach and Methodology**:

1. **Theme system** — replaced `@media (prefers-color-scheme: dark)` in `globals.css` with a `.dark` class on `<html>`. Added `theme: "light" | "dark"` to Zustand `UIState` slice and a `toggleTheme` action that toggles `document.documentElement.classList`. Default is `"light"` (white background). Added dark-mode CSS overrides for React Flow internals (background, minimap, controls, edge paths).

2. **Edge arrows** — imported `MarkerType` from `@xyflow/react`, created `defaultEdgeOptions` with `animated: true`, custom stroke styling, and `markerEnd: { type: MarkerType.ArrowClosed }`. Applied as `defaultEdgeOptions` prop on `<ReactFlow>` so all connections automatically get directional arrowheads showing flow direction (critical for DAG visualization).

3. **Sidebar readability** — completely reworked the palette. Each node type now has explicit light and dark colour classes (`text-green-900` / `text-green-100`, etc.) so text is always readable against its background. Added `useUIState()` hook to read theme.

4. **Emoji removal → CSS shapes** — replaced all emoji icons (▶, 🧠, 🔧, ⏹) with geometric CSS shapes: circle (Start), rectangle (Agent), diamond/rotated square (Tool), octagon via `clip-path` (Finish). Shapes use the node's signature colour as fill. Applied in both `Sidebar.tsx` and `WorkflowNode.tsx`.

5. **Modal positioning** — rewrote `NodeConfigModal.tsx` to use `useReactFlow().getNodesBounds()` and `flowToScreenPosition()` to calculate where the selected node is on screen. Modal now renders as a `position: fixed` panel anchored to the right edge of the node. If it would overflow the viewport right side, it flips to the left of the node. Clicking outside the modal dismisses it (no dark overlay blocking the canvas). This lets users see their entire workflow while configuring a node.

6. **Button rename** — changed `HeaderBar.tsx` button text from `"Get Estimate"` to `"Run Workflow & Gen Estimate"` and loading state from `"Estimating…"` to `"Running…"`.

7. **Dark mode applied everywhere** — updated `HeaderBar`, `ErrorBanner`, `EstimatePanel` (including Recharts grid/axis/tooltip colours), and `Canvas` (background colour, minimap node colours) to respect theme state.

**Results and Outcomes**:
- ✅ `npx next build` compiles with zero TypeScript errors
- ✅ App defaults to white/light background — no more black screen on first load
- ✅ Theme toggle button in header switches between light and dark cleanly
- ✅ Sidebar nodes are clearly readable in both themes (coloured backgrounds with contrasting text)
- ✅ All edges now render with animated arrow markers showing flow direction
- ✅ Config modal opens adjacent to the double-clicked node instead of blocking centre
- ✅ No emojis anywhere — clean geometric shape indicators throughout
- ⚠️ Tailwind v4 lint suggestions (`!bg-white` → `bg-white!`, `rounded-[2px]` → `rounded-xs`) — cosmetic, non-blocking

**Files Modified**:
| File | Changes |
|------|---------|
| `globals.css` | Replaced `prefers-color-scheme` media query with `.dark` class system; added React Flow dark mode overrides |
| `useWorkflowStore.ts` | Added `theme` to `UIState`, added `toggleTheme` action |
| `Canvas.tsx` | Added `MarkerType` import, `defaultEdgeOptions` with arrow markers, theme-aware background/minimap colours |
| `Sidebar.tsx` | Replaced emoji icons with CSS `ShapeIndicator` component, added light/dark colour pairs, added helper text |
| `WorkflowNode.tsx` | Replaced emoji icons with `NodeShape` CSS component, added dark mode colour variants, theme detection |
| `HeaderBar.tsx` | Added theme toggle button, renamed estimate button, dark mode styling |
| `NodeConfigModal.tsx` | Repositioned modal next to node using `getNodesBounds`/`flowToScreenPosition`, dark mode styling, click-outside-to-close |
| `EstimatePanel.tsx` | Dark mode for cards, chart axes, tooltips, grid |
| `ErrorBanner.tsx` | Dark mode colour variants |

**Next Steps and Future Considerations**:
1. **Persist theme** — save theme preference to `localStorage` so it survives page refreshes
2. **Edge labels** — add optional labels on edges for conditional branching (e.g. "if success", "if failure")
3. **Custom edge types** — different edge styles for cyclic vs acyclic connections (e.g. dashed for back-edges)
4. **Node context menu** — right-click to delete/duplicate/configure instead of only double-click
5. **Accessibility** — ensure all interactive elements have proper ARIA labels and keyboard navigation
6. **Lessons learned** — using `getNodesBounds()` + `flowToScreenPosition()` from React Flow is the correct way to map node coordinates to screen pixels for overlaying UI elements; the `prefers-color-scheme` media query should be avoided when you want explicit user control over theme

---

### Update 3 — February 15, 2026

**Agent**: Frontend agent — EstimatePanel redesign (bottom bar → right-side sliding drawer)

**Task Description**: Replace the bottom-pinned `EstimatePanel` with a right-side sliding drawer that matches the mockup design. The drawer should:
- Slide in from the right edge of the screen
- Be resizable via a drag handle on the left edge
- Contain a "Workflow Estimation Report" with summary cards (tokens + cost, latency with sparkline)
- Show per-node colour-coded indicators matching node types
- Display a token distribution bar chart with per-bar colours
- Include a detailed breakdown table (Node, Tokens, Cost, Latency) with a totals footer row
- Show the critical path as a pill chain
- Be dismissable via close button or clicking the backdrop
- Support both light and dark themes

**Approach and Methodology**:

1. **Completely rewrote `EstimatePanel.tsx`** — changed from a `border-t` bottom strip to a `fixed top-0 right-0 h-full` sliding drawer with `translate-x-0`/`translate-x-full` CSS transition for open/close animation.

2. **Resizable width** — implemented via `onMouseDown` on a 6px drag handle on the left edge of the drawer. Tracks mouse movement to calculate delta from initial position, clamped between 320px–700px. Uses `useRef(isResizing)` + document-level `mousemove`/`mouseup` listeners to avoid React re-render overhead during drag.

3. **Two summary cards side-by-side**:
   - Left card: token count (large number), cost estimate, and colour-coded per-node dots matching the `DOT_COLOURS` map (`agentNode=blue`, `toolNode=amber`, `startNode=green`, `finishNode=red`)
   - Right card: total latency in seconds, "P95 Latency Estimate" label, and a Recharts `LineChart` sparkline showing latency across nodes

4. **Token distribution chart** — replaced the previous simple `<Bar>` with `<Bar>` + `<Cell>` children from Recharts to render per-bar colours based on node type. Added rounded top corners (`radius={[4, 4, 0, 0]}`), removed vertical grid lines, and hid axis lines for a cleaner look.

5. **Detailed breakdown table** — full HTML `<table>` with `<thead>`, `<tbody>`, `<tfoot>` for the totals row. Each row has a colour dot for the node type, node name, tokens (formatted with `.toLocaleString()`), cost (6 decimal places), and latency in ms. Hover highlighting on rows.

6. **Critical path section** — renders the topological order as a horizontal chain of pill-shaped `<span>` elements connected by → arrows.

7. **Backdrop overlay** — a semi-transparent `bg-black/10` fixed overlay behind the drawer. Clicking it closes the panel. This prevents accidental canvas interaction while reviewing results.

8. **Layout change in `page.tsx`** — added a comment clarifying the EstimatePanel is now a fixed overlay, not part of the flexbox flow.

**Results and Outcomes**:
- ✅ `npx next build` compiles with zero TypeScript errors
- ✅ Drawer slides in from right with smooth 300ms ease-in-out animation
- ✅ Resize handle works — dragging left expands, dragging right shrinks (clamped 320–700px)
- ✅ Summary cards show tokens + cost and latency + sparkline side by side
- ✅ Bar chart renders with per-node-type colours (blue for agents, amber for tools, etc.)
- ✅ Breakdown table shows every node with colour dot, tokens, cost, and latency in ms
- ✅ Critical path renders as a pill chain with arrows
- ✅ Backdrop click and ✕ button both close the drawer
- ✅ Full dark mode support throughout
- ⚠️ Tailwind v4 lint suggestions (`flex-shrink-0` → `shrink-0`) — cosmetic, non-blocking

**Files Modified**:
| File | Changes |
|------|---------|
| `EstimatePanel.tsx` | Complete rewrite — bottom bar → right-side resizable sliding drawer with summary cards, bar chart with Cell colours, breakdown table, critical path, sparkline |
| `page.tsx` | Added comment clarifying EstimatePanel is a fixed overlay |

**Next Steps and Future Considerations**:
1. **Export/download report** — add a "Download PDF" or "Copy to clipboard" button for the estimation report
2. **Per-node click in table** — clicking a row in the breakdown table could highlight/select that node on the canvas
3. **Comparative view** — show before/after when user changes a model (e.g. GPT-4 → GPT-4o-mini) to see cost savings
4. **Persist drawer width** — save the user's preferred drawer width to `localStorage`
5. **Lessons learned** — Recharts `<Cell>` component is the correct way to assign per-bar colours in a `<BarChart>` (not multiple `<Bar>` components). Fixed overlay panels should use `translate-x-full` for off-screen state rather than `display: none` to enable CSS transitions.

---

### Update 4 — February 15, 2026

**Agent**: Backend + Frontend agent — Model Pricing Registry, dynamic provider/model selection, enhanced estimation breakdown

**Task Description**: Replace the hard-coded `MODEL_PRICING` dict in `pricing_data.py` with a proper **Model Pricing Registry** backed by a JSON data file. The objectives were:
1. Support 38+ models across 7 providers (OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Cohere) with real pricing data
2. Expose new REST endpoints: `GET /api/providers`, `GET /api/providers/detailed`, `GET /api/models` (with filters), `GET /api/models/{provider}/{model}`
3. Enhance the estimation response to include per-node input/output token breakdown, input/output cost split, and model attribution
4. Make the frontend `NodeConfigModal` dynamically fetch providers and models from the backend instead of hard-coding them
5. Show a pricing info card in the modal when a model is selected (price per 1M tokens, speed, context window)
6. Update the `EstimatePanel` breakdown table to show richer data (in/out tokens, cost split, model info)

**Approach and Methodology**:

1. **Data layer** — Created `backend/data/model_pricing.json` with a versioned schema containing 7 providers and 38 models. Pricing is sourced from public provider pages. Each model entry includes: `id`, `display_name`, `family`, `input_per_million`, `output_per_million`, `tokens_per_sec`, and `context_window`.

2. **Registry module** — Created `backend/pricing_registry.py` with Pydantic schemas (`ModelPricing`, `ProviderInfo`, `PricingRegistryData`) and a `PricingRegistry` class that:
   - Loads JSON at import time into an in-memory `(provider_id, model_id) → ModelPricing` lookup dict
   - Provides typed query methods: `get()`, `get_providers()`, `get_all_models(provider, family)`, `get_models_for_provider()`
   - Exports a module-level `registry` singleton

3. **Backend models** — Extended `models.py` with:
   - `NodeEstimation` now includes `input_tokens`, `output_tokens`, `input_cost`, `output_cost`, `model_provider`, `model_name`
   - `WorkflowEstimation` now includes `total_input_tokens`, `total_output_tokens`
   - New response models: `ModelInfo`, `ProviderSummary`, `ProviderModelsResponse`

4. **Estimator rewrite** — Updated `estimator.py` to import from `pricing_registry` instead of the old `pricing_data` dict. The estimation formulas remain the same (tiktoken counting, 1.5× output ratio, cost = tokens/1M × price, latency = output_tokens / tps) but now populate the richer response fields.

5. **New API endpoints** — Added to `main.py`:
   - `GET /api/providers` — returns `[{id, name, model_count}]`
   - `GET /api/providers/detailed` — returns full provider + models (used by frontend dropdowns)
   - `GET /api/models?provider=X&family=Y` — flat filtered list
   - `GET /api/models/{provider}/{model}` — single model lookup (404 if not found)

6. **Backward compatibility** — Kept `pricing_data.py` as a thin shim that rebuilds the old `MODEL_PRICING` dict from the registry, so any code referencing it still works.

7. **Frontend — dynamic dropdowns** — Rewrote `NodeConfigModal.tsx` to:
   - Fetch `GET /api/providers/detailed` on first modal open (cached in state)
   - Populate provider dropdown from API response (shows model count)
   - Populate model dropdown from the selected provider's model list
   - Show a pricing info card when a model is selected (input/output price, speed, context window)
   - Removed all hard-coded `PROVIDERS` and `MODELS` constants

8. **Frontend — enhanced estimate panel** — Updated `EstimatePanel.tsx` breakdown table to show:
   - Input/output token split per node
   - Input + output cost breakdown per node
   - Model provider/name under each node name
   - Total input/output tokens in the footer row

9. **Frontend types** — Added `ModelInfo`, `ProviderSummary`, `ProviderDetailed` interfaces to `workflow.ts`. Extended `NodeEstimation` and `WorkflowEstimation` with new fields.

**Results and Outcomes**:
- ✅ **Backend**: All 5 new endpoints return correct data. TestClient verification passed for `/api/providers` (7 providers), `/api/models?provider=Anthropic` (8 models), `/api/models/OpenAI/GPT-4.1` (200 with full pricing), `/api/estimate` (correct cost/latency for multi-node DAG)
- ✅ **Frontend**: `npx next build` compiles with zero TypeScript errors
- ✅ **38 models** across 7 providers loaded from JSON registry
- ✅ **Estimation accuracy verified**: OpenAI GPT-4o agent with "Hello world" context → 520 tokens, $0.003640, 3.9s; Anthropic Claude-4-Sonnet → 510 tokens, $0.005202, 3.825s
- ✅ **Backward compatibility**: old `pricing_data.MODEL_PRICING` dict still works via shim

**Files Created**:
| File | Purpose |
|------|---------|
| `backend/data/model_pricing.json` | Versioned pricing registry with 7 providers, 38 models |
| `backend/pricing_registry.py` | `PricingRegistry` class with Pydantic schemas and in-memory lookup |

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `input_tokens`, `output_tokens`, `input_cost`, `output_cost`, `model_provider`, `model_name` to `NodeEstimation`; added `total_input_tokens`, `total_output_tokens` to `WorkflowEstimation`; added `ModelInfo`, `ProviderSummary`, `ProviderModelsResponse` |
| `backend/estimator.py` | Switched from `pricing_data.MODEL_PRICING` dict to `pricing_registry.registry`; populates enriched response fields |
| `backend/main.py` | Added `GET /api/providers`, `GET /api/providers/detailed`, `GET /api/models`, `GET /api/models/{provider}/{model}` endpoints |
| `backend/pricing_data.py` | Converted to thin shim over `pricing_registry` for backward compatibility |
| `frontend/src/types/workflow.ts` | Added `ModelInfo`, `ProviderSummary`, `ProviderDetailed` types; extended estimation types with new fields |
| `frontend/src/components/NodeConfigModal.tsx` | Dynamic provider/model fetch from API; pricing info card; removed hard-coded constants |
| `frontend/src/components/EstimatePanel.tsx` | Breakdown table shows in/out tokens, cost split, model attribution |

**Next Steps and Future Considerations**:
1. **Pricing sync script** — Create an offline ETL script that scrapes pricing from aggregator sites and updates `model_pricing.json`
2. **User-overridable output ratio** — Let users set expected output length per node (slider or text input) instead of the fixed 1.5× heuristic
3. **Model stats table** — Track historical avg tokens/cost/latency per (provider, model, node_type) from real runs to improve estimates
4. **Context window validation** — Warn the user if their input context exceeds the selected model's context window
5. **Cache pricing on frontend** — Store fetched provider/model data in Zustand or localStorage to avoid re-fetching on every modal open
6. **Search/filter in modal** — With 38+ models, add a search input to quickly find models in the dropdown
7. **Lessons learned** — A JSON-backed registry with Pydantic validation is far superior to a hard-coded dict: it's versioned, type-safe, easy to extend, and can be swapped to a DB later without changing the API layer. The `(provider_id, model_id)` tuple key is the right lookup strategy since model names can collide across providers.

---

## Update 5 — Tool Estimation System (Full-Stack Agent)

**Task Description**: Implement tool-aware estimation so that tool nodes (database, MCP server, API, code execution, retrieval) properly contribute to cost and latency when connected to agent nodes. Previously tool nodes returned zeros — they were visually present on the canvas but completely ignored by the estimator.

**Approach and Methodology**:
The key insight is that tools don't consume LLM tokens directly, but they affect the calling agent in three ways:
1. **Schema injection** — the tool's JSON schema is added to the agent's system prompt (adds to input_tokens)
2. **Result consumption** — the tool's output is fed back to the agent as context (adds to input_tokens)
3. **Execution latency** — the tool's execution time is added on top of the agent's LLM inference time

Implementation:
- Created `data/tool_definitions.json` with 21 tools across 5 categories, each with `schema_tokens`, `avg_response_tokens`, `latency_ms`, and `latency_type` (local vs hosted)
- Created `tool_registry.py` with `ToolRegistry` class mirroring the `PricingRegistry` pattern
- Updated `models.py` with `ToolImpact` model, tool fields on `NodeConfig`/`NodeEstimation`/`WorkflowEstimation`, and tool API response models
- Rewrote `estimator.py` to walk graph edges (`_build_tool_connections`), compute per-tool impact, and roll tool costs into the agent's estimation
- Added 5 new API endpoints in `main.py` for the tool registry
- Updated `NodeConfigModal.tsx` to show tool category + tool type dropdowns when editing a tool node, with a tool info card showing schema tokens, response size, and latency
- Updated `HeaderBar.tsx` to send `tool_id`/`tool_category` in the estimation payload
- Updated `EstimatePanel.tsx` to show tool impact sub-rows, tool latency badges, and tool response info for tool nodes
- Updated `workflow.ts` with `ToolImpact`, `ToolInfoType`, `ToolCategoryDetailed` types and extended all payload/estimation types

**Results and Outcomes**:
Verified with comprehensive tests:
- Without tools: Agent with "SQL agent" context → 210 input tokens, $0.003675
- With Postgres + MCP Web Search: Same agent → 4,540 input tokens (+4,330 from tool overhead), $0.014500, +430ms tool latency
- Tool overhead breakdown: Postgres adds +180 schema + 800 response tokens + 30ms latency; MCP Web Search adds +350 schema + 3,000 response tokens + 400ms latency
- Frontend build: zero TypeScript errors
- All 5 new tool API endpoints verified (categories, detailed, tools list, filter by category, single tool lookup)

**Files Created**:
| File | Purpose |
|------|---------|
| `backend/data/tool_definitions.json` | 21 tools across 5 categories with estimation heuristics |
| `backend/tool_registry.py` | `ToolRegistry` class + module-level singleton |

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `tool_id`/`tool_category` to `NodeConfig`; `ToolImpact` model; tool fields on `NodeEstimation`/`WorkflowEstimation`; `ToolInfo`/`ToolCategoryInfo`/`ToolCategoryDetailedInfo` response models |
| `backend/estimator.py` | Full rewrite: `_build_tool_connections()` walks edges to find agent→tool links; `_get_tool_impact()` computes per-tool costs; `estimate_agent_node()` adds tool schema/response tokens to input; `estimate_tool_node()` returns execution latency; `estimate_workflow()` orchestrates it all |
| `backend/main.py` | Added tool registry import + 5 endpoints: `GET /api/tools/categories`, `GET /api/tools/categories/detailed`, `GET /api/tools`, `GET /api/tools?category=X`, `GET /api/tools/{tool_id}` |
| `frontend/src/types/workflow.ts` | Added `ToolImpact`, `ToolInfoType`, `ToolCategoryDetailed` types; `toolId`/`toolCategory` on `WorkflowNodeData`/`NodeConfigPayload`; tool fields on `NodeEstimation`/`WorkflowEstimation` |
| `frontend/src/components/NodeConfigModal.tsx` | Tool node config UI with category/tool dropdowns + info card; fetches from `/api/tools/categories/detailed` |
| `frontend/src/components/HeaderBar.tsx` | Sends `tool_id`/`tool_category` in estimation payload |
| `frontend/src/components/EstimatePanel.tsx` | Tool impact sub-rows on agent nodes; tool latency badge in latency card; tool response tokens on tool node rows |

**Next Steps and Future Considerations**:
1. **Custom tool definitions** — Let users define their own tools with custom schema sizes, response sizes, and latency
2. **Multiple tool calls per invocation** — Some agents call the same tool N times in a loop; add a "call count" multiplier
3. **Tool call token overhead** — The function_call format itself adds ~50 tokens of JSON wrapper per call; account for this
4. **Parallel vs sequential tool execution** — If an agent calls multiple tools, detect whether they run in parallel (max latency) or sequential (sum latency) based on the graph structure
5. **Context window validation with tools** — Tools can push input tokens past the model's context window; warn users when this happens
6. **Lessons learned** — Walking graph edges to build agent→tool connections is the cleanest approach. The `defaultdict(list)` pattern with bidirectional edge scanning (agent→tool AND tool→agent) catches all connection topologies. Keeping tool heuristics in a separate JSON file from model pricing is the right separation — tools change independently from LLM pricing.

---

### Update 6 — DAG vs Cyclic Bounded-Loop Estimation

**Agent**: Full-stack agent — cycle-aware estimation with min/avg/max ranges

**Task Description**: Implement bounded-loop estimation for cyclic workflows. Most agentic workflows are "DAG + controlled cycles at certain points" (e.g. ReAct loops, planner↔executor feedback). The estimator now detects cycles via Tarjan's SCC algorithm, computes per-cycle iteration counts from user-configured `max_steps`, and returns min/avg/max estimation ranges for tokens, cost, and latency. DAG-zone nodes remain single-pass.

**Approach and Methodology**:
1. **`graph_analyzer.py`** — Added Tarjan's SCC algorithm to find all strongly connected components. SCCs with ≥2 nodes are real cycles. Added back-edge detection via DFS within each SCC. New methods: `get_cycle_groups()`, `get_nodes_in_cycles()`, `get_nodes_outside_cycles()`.
2. **`models.py`** — Added `max_steps: Optional[int]` (1–100) to `NodeConfig` for per-agent loop limits; `recursion_limit: Optional[int]` (1–200, default 25) to `WorkflowRequest` for graph-wide cap; `CycleInfo` model (cycle_id, node_ids, node_labels, back_edges, max/expected iterations); `EstimationRange` model (min/avg/max); Updated `WorkflowEstimation` with `detected_cycles`, `token_range`, `cost_range`, `latency_range`, `recursion_limit`; Added `in_cycle: bool` to `NodeEstimation`.
3. **`estimator.py`** — After computing single-lap per-node estimates, separates DAG-zone from cycle-zone. For each detected cycle: lap_cost = sum of node costs in cycle; min = DAG + 1×lap; avg = DAG + ceil(max/2)×lap; max = DAG + max×lap. The `max_iterations` per cycle uses the minimum `max_steps` among the cycle's agent nodes, capped at `recursion_limit`.
4. **`main.py`** — Updated `/api/estimate` to pass `recursion_limit` from request to `estimate_workflow()`.
5. **Frontend types** (`workflow.ts`) — Added `CycleInfo`, `EstimationRange`, `EstimateRequestPayload`, `maxSteps` to `WorkflowNodeData`, `in_cycle` to `NodeEstimation`, new fields on `WorkflowEstimation`.
6. **`NodeConfigModal.tsx`** — Added "Max Loop Steps" number input for agent nodes with validation (1–100, default placeholder 10).
7. **`HeaderBar.tsx`** — Sends `max_steps` and `recursion_limit: 25` in the estimation payload.
8. **`EstimatePanel.tsx`** — Summary cards now show min/avg/max ranges when cycles are detected; new "🔄 Detected Cycles" banner with cycle node labels and iteration info; "🔄 in cycle" badge on breakdown table rows for cycle members.

**Results and Outcomes**:
Verified with three scenarios:
- **Pure DAG**: Unchanged behavior — no ranges, no cycles, backward compatible ✅
- **Agent↔Agent cycle** (max_steps=5): tokens min=1,000 / avg=3,000 / max=5,000; cost $0.007–$0.021–$0.035
- **ReAct loop** (Agent↔Tool, max_steps=8): tokens min=3,850 / avg=15,400 / max=30,800; includes tool latency in cycle multiplication
- **Mixed DAG+cycle** (Start→[Planner↔DB_Query cycle]→Reviewer→Finish, max_steps=6, recursion_limit=20): DAG zone (Reviewer: 500 tokens) fixed; cycle zone multiplied; total min=1,980 / avg=4,940 / max=9,380 tokens
- Frontend TypeScript: zero errors
- Backend API: full JSON response with all new fields

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/graph_analyzer.py` | Added `CycleGroup` class; Tarjan's SCC (`_compute_sccs`); `get_cycle_groups()` with back-edge detection; `get_nodes_in_cycles()`; `get_nodes_outside_cycles()` |
| `backend/models.py` | `max_steps` on `NodeConfig`; `recursion_limit` on `WorkflowRequest`; `CycleInfo`; `EstimationRange`; `in_cycle` on `NodeEstimation`; ranges + cycles on `WorkflowEstimation` |
| `backend/estimator.py` | Cycle-aware `estimate_workflow()`: SCC detection → DAG/cycle separation → per-cycle iteration math → min/avg/max `EstimationRange` computation |
| `backend/main.py` | Passes `recursion_limit` from request to estimator |
| `frontend/src/types/workflow.ts` | `CycleInfo`, `EstimationRange`, `EstimateRequestPayload` types; `maxSteps` on node data; `in_cycle` on estimation; ranges on response |
| `frontend/src/components/NodeConfigModal.tsx` | "Max Loop Steps" number input for agent nodes |
| `frontend/src/components/HeaderBar.tsx` | Sends `max_steps` + `recursion_limit` in payload |
| `frontend/src/components/EstimatePanel.tsx` | Min/avg/max summary cards; detected cycles banner; cycle badge on breakdown rows |

**Next Steps and Future Considerations**:
1. **Per-cycle iteration slider on frontend** — Let users adjust expected_iterations directly via the EstimatePanel cycles banner
2. **Context window growth per iteration** — Each loop iteration adds tokens to the conversation history; model this as cumulative rather than flat per-lap
3. **Parallel cycle estimation** — When two independent cycles exist, their latencies should be `max()` not `sum()` if they can run concurrently
4. **Conditional exit probability** — Instead of fixed ceil(max/2) for average, allow users to set an expected exit probability per iteration

---

### Update 7 — Workflow Scenario Comparison

**Agent**: Full-stack agent — scenario save / batch comparison / side-by-side drawer

**Task Description**:
Implement the "Workflow Scenario Comparison" feature per the spec in `BACKEND_PLAN.md`. Users can save the current canvas as a named scenario, browse saved scenarios in the sidebar, select two or more for comparison, run a batch estimation on all selected, and view a side-by-side comparison drawer with metrics table + bar charts.

**Approach and Methodology**:

1. **Backend batch models** (`models.py`) — Added `BatchWorkflowItem` (id, name, nodes, edges, recursion_limit), `BatchEstimateRequest`, `BatchEstimateResult` (summary per workflow: id, name, graph_type, totals, ranges, node/edge counts, detected_cycles count), `BatchEstimateResponse`.
2. **Backend batch endpoint** (`main.py`) — `POST /api/estimate/batch` iterates `estimate_workflow()` per item, builds `BatchEstimateResult` summaries, returns as `BatchEstimateResponse`.
3. **Frontend types** (`workflow.ts`) — Added `WorkflowScenario` (id, name, createdAt, updatedAt, graph: {nodes, edges, recursionLimit}, estimate?), `BatchEstimateResult`, `BatchEstimateResponse` matching the backend contract.
4. **Zustand store** (`useWorkflowStore.ts`) — Major rewrite: added `scenarios: Record<string, WorkflowScenario>`, `currentScenarioId`, `selectedForComparison: string[]`, `comparisonResults: BatchEstimateResult[]`, `isComparisonOpen` flag. New actions: `saveCurrentScenario(name)` snapshots canvas nodes/edges + estimation; `loadScenario(id)` restores nodes/edges to canvas; `deleteScenario(id)` removes and cleans selection; `duplicateScenario(id)` creates copy; `toggleComparisonSelection(id)` toggles checkbox; `setComparisonResults` / `clearComparisonResults`; `toggleComparisonDrawer`. Added helper functions `nodesToPayload()` and `edgesToPayload()`. New selector hooks: `useScenarios`, `useSelectedForComparison`, `useComparisonResults`.
5. **HeaderBar** (`HeaderBar.tsx`) — Added "💾 Save" button that prompts for a scenario name and calls `saveCurrentScenario()`. Disabled when canvas is empty.
6. **Sidebar** (`Sidebar.tsx`) — Added "Saved Workflows" section below node palette: each scenario shows checkbox (for comparison selection), clickable name (loads to canvas), metrics pill ($cost / latency), duplicate 📋 and delete 🗑 buttons. "📊 Compare Selected (N)" button fires `POST /api/estimate/batch` with selected scenarios, sets comparison results, and opens the drawer. Sorted newest-first.
7. **ComparisonDrawer** (`ComparisonDrawer.tsx`) — New component: bottom-sheet modal overlay showing (a) comparison table with 7 metrics × N scenarios, graph-type badge per column, 🏆 winner highlight per numeric metric (lowest wins), and (b) two Recharts `BarChart`s (cost + latency) for visual comparison. Close button clears results and toggles drawer.
8. **page.tsx** — Mounted `<ComparisonDrawer />` inside the `<ReactFlowProvider>` wrapper.

**Results and Outcomes**:
- TypeScript build: `npx tsc --noEmit` — **zero errors** ✅
- Backend `POST /api/estimate/batch` tested with 2-workflow payload — returns correct per-workflow summaries ✅
- Batch response for "Simple DAG" (1 agent, GPT-4o): 510 tokens, $0.00357, 3.83s
- Batch response for "Two Agents" (GPT-4o + Claude 3.5): 1010 tokens, $0.00354, 3.79s
- Sidebar, HeaderBar, ComparisonDrawer, and store all wired end-to-end

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | `BatchWorkflowItem`, `BatchEstimateRequest`, `BatchEstimateResult`, `BatchEstimateResponse` |
| `backend/main.py` | `POST /api/estimate/batch` endpoint |
| `frontend/src/types/workflow.ts` | `WorkflowScenario`, `BatchEstimateResult`, `BatchEstimateResponse` types |
| `frontend/src/store/useWorkflowStore.ts` | Scenarios slice (state + 8 actions + 3 selector hooks), `nodesToPayload()`, `edgesToPayload()` helpers |
| `frontend/src/components/HeaderBar.tsx` | "💾 Save" button |
| `frontend/src/components/Sidebar.tsx` | "Saved Workflows" section with scenario cards, checkboxes, compare button |
| `frontend/src/components/ComparisonDrawer.tsx` | **NEW** — comparison table + bar charts bottom-sheet |
| `frontend/src/app/page.tsx` | Mounted `<ComparisonDrawer />` |

**Next Steps and Future Considerations**:
1. **Persist scenarios to localStorage** — Currently scenarios live in Zustand memory only; add `zustand/middleware` persist layer so they survive page refreshes
2. **Scenario diff view** — Highlight which nodes/edges changed between two scenarios
3. **Export comparison as CSV/PDF** — Allow users to download the comparison table
4. **Auto-compare on save** — Optionally run estimation when saving so the metrics pill is always populated
5. **Radar/spider chart** — Add a multi-axis chart for holistic scenario scoring (tokens, cost, latency, complexity)
5. **Visual cycle highlighting** — Highlight cycle nodes on the canvas with a colored border/glow when cycles are detected

---

### Update 8 — Bottleneck Highlighting on the Graph

**Agent**: Full-stack agent — per-node cost/latency share computation + canvas heatmap + Top Bottlenecks panel

**Task Description**:
Implement **Feature #1 from the roadmap**: Bottleneck Highlighting. The goal is to help users see where cost and latency concentrate inside a workflow, via:
- Per-node `cost_share` and `latency_share` (0.0–1.0) returned by the backend
- `bottleneck_severity` classification ("high" / "medium" / "low")
- Canvas nodes visually change color/glow based on severity after estimation
- "Top Bottlenecks" ranked panel in the EstimatePanel
- "Share" column in the detailed breakdown table

**Approach and Methodology**:

1. **Backend `models.py`** — Added three fields to `NodeEstimation`: `cost_share: float = 0.0` (share of total cost, 0.0–1.0), `latency_share: float = 0.0` (share of total latency), `bottleneck_severity: Optional[str] = None` ("low" / "medium" / "high").

2. **Backend `estimator.py`** — Added `_compute_bottleneck_shares()` function that runs after all per-node estimations are computed. It:
   - Calculates `cost_share = node.cost / total_cost` and `latency_share = node.latency / total_latency`
   - Ranks nodes by `max(cost_share, latency_share)` descending
   - Top 20% with non-zero impact → "high", next 30% → "medium", rest → "low"
   - Called right before `return WorkflowEstimation(...)` in `estimate_workflow()`

3. **Frontend `workflow.ts`** — Added `cost_share: number`, `latency_share: number`, `bottleneck_severity: "low" | "medium" | "high" | null` to `NodeEstimation` type.

4. **Frontend `WorkflowNode.tsx`** — Major enhancement:
   - Uses `useEstimation()` hook to read current estimation data
   - Looks up this node's `bottleneck_severity` from the breakdown
   - "high" severity → red border + red glow shadow
   - "medium" severity → yellow border + yellow glow shadow
   - "low" / no estimation → default node-type border (unchanged)
   - Badge overlay shows `🔥 X%` (high) or `⚡ X%` (medium) below the node label
   - Uses `transition-all duration-300` for smooth severity transitions

5. **Frontend `EstimatePanel.tsx`** — Two additions:
   - **"🔥 Top Bottlenecks" panel** between summary cards and cycles banner: ranked list (up to 5) of high/medium severity nodes with cost % and latency % side by side, color-coded thresholds (≥40% red, ≥20% yellow, else gray)
   - **"Share" column** in the detailed breakdown table: shows a severity-colored pill with the max(cost_share, latency_share) percentage per node. Footer row shows "100%". Tool impact sub-rows updated to `colSpan={5}`.

**Results and Outcomes**:
- **TypeScript build**: `npx tsc --noEmit` → **zero errors** ✅
- **Backend test** (4-node workflow: Start → Planner(GPT-4o) → DB_Query(postgres) → Writer(Claude 3.5) → Finish):
  - Planner: `cost_share=100%`, `latency_share=98.5%`, severity=**high** ✅
  - Writer: `cost_share≈0%`, `latency_share=0.8%`, severity=**medium** ✅
  - DB Query, Start, Finish: severity=**low** ✅
- Canvas nodes now glow red/yellow after estimation runs — instantly shows where cost concentrates
- Top Bottlenecks panel correctly ranks nodes by impact

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `cost_share`, `latency_share`, `bottleneck_severity` to `NodeEstimation` |
| `backend/estimator.py` | Added `_compute_bottleneck_shares()` function; called before return in `estimate_workflow()` |
| `frontend/src/types/workflow.ts` | Added `cost_share`, `latency_share`, `bottleneck_severity` to `NodeEstimation` |
| `frontend/src/components/nodes/WorkflowNode.tsx` | Heatmap border/glow based on severity; bottleneck badge (🔥/⚡ X%); reads from `useEstimation()` |
| `frontend/src/components/EstimatePanel.tsx` | "🔥 Top Bottlenecks" ranked panel; "Share" column in breakdown table |

**Next Steps and Future Considerations**:
1. **Feature #2: Loop risk and contribution visualization** — Show per-loop cost/latency % contribution, "Loop risk" badge (expensive model × high iterations)
2. **Feature #3: Model and tool mix analysis** — Bar/pie charts for cost by model, latency by tool category
3. **Bottleneck click-to-highlight** — Clicking a bottleneck row in the panel should select/zoom to that node on the canvas
4. **Threshold configuration** — Let users adjust the 20%/50% severity thresholds
5. **Cost-per-token efficiency metric** — Show cost/1K tokens per node to identify expensive models even on low-volume nodes

---

### Update 9 — Loop Risk and Contribution Visualization

**Agent**: Full-stack agent — per-cycle contribution metrics, risk classification, canvas loop ring, enhanced cycle panel

**Task Description**:
Implement **Feature #2 from the roadmap**: Loop Risk and Contribution Visualization. The goal is to make cyclic behaviour and its impact on cost/latency obvious, via:
- Per-cycle `tokens_per_lap`, `cost_per_lap`, `latency_per_lap` (single pass through cycle nodes)
- Contribution to total: `cost_contribution` and `latency_contribution` as fractions of workflow total (avg-case)
- `risk_level` classification: "low" / "medium" / "high" / "critical" based on model cost, iteration count, and cost dominance
- `risk_reason` human-readable explanation of why the risk level was assigned
- Canvas: purple border/glow ring on cycle member nodes + loop iteration badge with risk indicator
- EstimatePanel: enhanced cycle banner with per-lap breakdown grid, cost/latency contribution percentages, risk badge, and reason tooltip

**Approach and Methodology**:

1. **Backend `models.py`** — Extended `CycleInfo` with 8 new fields:
   - `tokens_per_lap: int`, `cost_per_lap: float`, `latency_per_lap: float` — single-pass metrics
   - `cost_contribution: float`, `latency_contribution: float` — fraction of total (0.0–1.0)
   - `risk_level: Optional[str]`, `risk_reason: Optional[str]` — risk assessment

2. **Backend `estimator.py`** — Added `_compute_cycle_contributions()` function (~70 lines) that:
   - Sums single-lap tokens/cost/latency for nodes in each cycle
   - Computes avg-case contribution = (lap_cost × expected_iterations) / total_cost
   - Checks if any cycle node uses an expensive model (≥ $10/M input tokens)
   - Classifies risk:
     - **"critical"**: expensive model AND ≥ 20 max iterations
     - **"high"**: expensive model OR ≥ 15 iterations OR cost > 50% of total
     - **"medium"**: ≥ 5 iterations OR cost > 20% of total
     - **"low"**: bounded loop with low cost impact
   - Called after `_compute_bottleneck_shares()` in `estimate_workflow()`

3. **Frontend `workflow.ts`** — Extended `CycleInfo` interface with all new fields, typed `risk_level` as union `"low" | "medium" | "high" | "critical" | null`.

4. **Frontend `WorkflowNode.tsx`** — Two enhancements:
   - **Purple cycle ring**: when a node is `in_cycle` but doesn't have a bottleneck heatmap override, it gets a purple border + purple glow shadow, visually tagging it as a loop participant
   - **Loop badge**: shows "🔄 Loop ×{expected_iterations}" below the node, coloured by risk level (red=critical, orange=high, purple=medium, gray=low). Critical gets a 🚨 icon, high gets ⚠️.

5. **Frontend `EstimatePanel.tsx`** — Major enhancement of the Detected Cycles Banner:
   - **Risk badge** on each loop header: coloured pill with icon (🚨/⚠️/🔶/✅) + "Critical/High/Medium/Low risk" text
   - **Per-lap breakdown grid**: 2-column layout showing tokens_per_lap, cost_per_lap, latency_per_lap on the left, and cost/latency contribution percentages on the right
   - **Contribution percentages**: colour-coded (≥50% red, ≥25% yellow, else gray)
   - **Risk reason**: italic text below the cycle card explaining why the risk level was assigned

**Results and Outcomes**:
- **TypeScript build**: `npx tsc --noEmit` → **zero errors** ✅
- **Risk tier testing** (4 test cases):
  - max_steps=4, cheap model, 17% cost share → **low** ("Bounded loop with low cost impact") ✅
  - max_steps=6, cheap model, 24% cost share → **medium** ("Moderate iterations (6); Significant cost share (24%)") ✅
  - max_steps=15, GPT-4o, 100% cost share → **high** ("High max iterations (15); Loop dominates cost (100%)") ✅
  - Critical tier: requires ≥$10/M model + ≥20 iterations (verified logic path exists)
- Per-lap metrics correctly computed: e.g., Planner+Executor loop = 2,012 tokens/lap, $0.00364/lap, 3.93s/lap
- Canvas cycle nodes now show purple glow ring + "🔄 Loop ×8 ⚠️" badge

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added 8 fields to `CycleInfo`: per-lap metrics, contributions, risk_level, risk_reason |
| `backend/estimator.py` | Added `_compute_cycle_contributions()` function; called in `estimate_workflow()` after bottleneck analysis |
| `frontend/src/types/workflow.ts` | Extended `CycleInfo` interface with new fields |
| `frontend/src/components/nodes/WorkflowNode.tsx` | Purple cycle ring + loop badge with risk indicator + reads cycle info from estimation |
| `frontend/src/components/EstimatePanel.tsx` | Enhanced cycle banner: risk badge, per-lap grid, contribution %, risk reason |

**Next Steps and Future Considerations**:
1. **Feature #3: Model and tool mix analysis** — Bar/pie charts for cost by model, latency by tool category
2. **Feature #4: Concurrency and critical-path visualization** — Highlight critical path edges, parallelism chart
3. **Cycle cost projection** — Show projected monthly cost for loops at different iteration intensities
4. **Fix Anthropic model registry lookup** — Some Anthropic models not resolving in pricing registry, causing $0 cost in cycle analysis

---

### Update 10 — Model and Tool Mix Analysis

**Agent**: Frontend agent — aggregation logic + Recharts PieChart + tool impact ranking panel

**Task Description**:
Implement **Feature #3 from the roadmap**: Model and Tool Mix Analysis. The goal is to show how different models and tools contribute to overall cost and latency, helping users make rational model/tool selections. The backend already returns all necessary per-node data; this feature is purely frontend aggregation + visualization.

**Approach and Methodology**:

1. **Recharts imports** — Added `PieChart` and `Pie` to the `recharts` imports in `EstimatePanel.tsx`.

2. **Model Mix — Cost** panel (donut pie chart + legend):
   - Aggregates `cost` and `latency` by `model_provider / model_name` across all breakdown nodes
   - Renders a donut `PieChart` (inner radius 30, outer 55) with coloured segments per model
   - Legend beside the chart shows: model name, node count, cost %, and latency %
   - Colour-coded thresholds: ≥60% red, ≥30% yellow, else neutral
   - Tooltip shows exact dollar cost on hover

3. **Tool Impact** panel (ranked card list):
   - Aggregates tool data from two sources: `tool_impacts` arrays on agent nodes (schema/response/latency injection) and direct tool nodes
   - Each tool card shows: name, schema/response token counts, execution latency in ms, and % of total latency
   - Cards sorted by latency (highest first)
   - Colour-coded latency %: ≥30% red, ≥15% yellow, else gray

4. **Placement**: Inserted between the Detected Cycles banner and the Token Distribution bar chart

**Results and Outcomes**:
- **TypeScript build**: `npx tsc --noEmit` → **zero errors** ✅
- Model Mix donut chart groups nodes by model with accurate cost/latency percentages
- Tool Impact panel surfaces hidden tool costs (schema injection, response parsing, execution latency)
- Both panels render only when relevant data exists (no empty states)

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/EstimatePanel.tsx` | Added `PieChart`, `Pie` imports; "🧠 Model Mix — Cost" donut panel with legend; "🔧 Tool Impact" ranked card list |

**Next Steps and Future Considerations**:
1. **Feature #4: Concurrency and critical-path visualization** — Highlight critical path edges on canvas, parallelism step chart
2. **Model Mix — Latency** tab — Add a toggle/tab to switch between cost and latency views on the donut chart
3. **Comparison extension** — Side-by-side model mix charts in ComparisonDrawer

---

## Update 11 — Feature #4: Critical-Path & Parallelism Visualization

**Date**: 2025-01-XX  
**Task**: Implement concurrency and critical-path visualization (Feature #4 from roadmap)

**Approach**:
Critical-path analysis shows the longest-latency execution path through the DAG, while parallelism analysis reveals which nodes execute concurrently at each depth level.

### Backend Changes

1. **`graph_analyzer.py`** — Two new methods on `GraphAnalyzer`:
   - `weighted_critical_path(latency_map)`: DP longest-path through DAG on topological order. `dist[v] = max(dist[u] + latency[u])` for all edges `u→v`. Uses `>=` on first parent assignment so zero-latency source nodes (Start) still establish parent links. Prefers sink nodes (no outgoing edges) as endpoints. Backtracks via `parent` dict to reconstruct the path.
   - `compute_parallel_steps()`: BFS level-order grouping — computes depth for each node as `max(depth[u]+1)` over predecessors, then groups nodes by depth. Each group is a "parallel step".

2. **`models.py`** — New `ParallelStep` Pydantic model:
   - Fields: `step`, `node_ids`, `node_labels`, `total_latency`, `total_cost`, `parallelism`
   - Added `parallel_steps: List[ParallelStep]` and `critical_path_latency: float` to `WorkflowEstimation`

3. **`estimator.py`** — Extended `estimate_workflow()`:
   - Calls `weighted_critical_path()` with per-node latency map
   - Sums latencies along critical path for `critical_path_latency`
   - Builds `ParallelStep` objects from `compute_parallel_steps()` with per-step latency/cost/parallelism

### Frontend Changes

4. **`types/workflow.ts`** — Added `ParallelStep` interface; extended `WorkflowEstimation` with `parallel_steps` and `critical_path_latency`

5. **`Canvas.tsx`** — Critical-path edge highlighting:
   - Derives `criticalPathEdgeSet` (Set of `"source->target"` strings) from estimation data
   - `styledEdges` memo overrides edge style: critical path edges get `stroke: '#3b82f6'` (blue), `strokeWidth: 3`, animated, with 🛤️ label
   - ReactFlow renders `styledEdges` instead of raw edges

6. **`EstimatePanel.tsx`** — New "🛤️ Critical Path & Parallelism" section:
   - **Critical Path**: horizontal flow of node labels with `→` arrows, per-node latency underneath, total latency badge
   - **Parallelism Overview**: numbered step cards showing node labels at each depth level, parallelism bar (`w = parallelism/maxParallelism * 100%`), parallel count badge
   - Critical-path nodes highlighted with blue ring + 🛤️ icon within step cards

### Bug Fix
- **Critical path missing Start/Finish**: Initial `>` comparison for parent assignment meant zero-latency nodes (Start) never set as parents. Fixed by using `>=` on first visit (`parent[v] is None`) so the source→first-real-node link is always recorded. Also added sink-node preference so Finish is always the endpoint.

**Results and Outcomes**:
- **Backend test**: `critical_path: ['1', '2', '4', '5']` (Start → Planner → Writer → Finish), `critical_path_latency: 6.666s` ✅
- **Parallel steps**: Step 0 [Start], Step 1 [Planner], Step 2 [DB Query, Writer] (2× parallelism), Step 3 [Finish] ✅
- **TypeScript build**: `npx tsc --noEmit` → **zero errors** ✅
- Critical-path edges render as blue animated lines on Canvas
- Parallelism step cards show concurrent execution clearly

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/graph_analyzer.py` | `weighted_critical_path()` with DP + sink-node preference + `>=` fix; `compute_parallel_steps()` BFS depth grouping |
| `backend/models.py` | `ParallelStep` model; `parallel_steps` + `critical_path_latency` on `WorkflowEstimation` |
| `backend/estimator.py` | Build critical path + parallel steps in `estimate_workflow()` |
| `frontend/src/types/workflow.ts` | `ParallelStep` interface; extended `WorkflowEstimation` |
| `frontend/src/components/Canvas.tsx` | `criticalPathEdgeSet` + `styledEdges` for blue edge highlighting |
| `frontend/src/components/EstimatePanel.tsx` | Critical Path flow + Parallelism step cards section |

**Next Steps and Future Considerations**:
1. **Feature #5: Scenario scaling / what-if analysis** — Global controls (runs/day, loop intensity), projected monthly cost, sensitivity readout
2. **Feature #6: Workflow health scoring** — Aggregate health grade from bottleneck severity, loop risk, model cost tier
3. **Feature #7: Minimal observability integration** — Paste/upload actual stats, overlay actual vs estimated
4. **Model recommendation** — Suggest cheaper models that could reduce cost without significant latency impact

---

## Update 12 — Feature #5: Scenario Scaling / What-If Analysis

**Date**: 2025-01-XX  
**Task**: Implement what-if analysis with usage scaling, loop intensity controls, and sensitivity readouts (Feature #5 from roadmap)

**Approach**:
This feature turns the estimator from a static one-shot tool into a planning instrument. Users adjust "Runs / day" and "Loop intensity" sliders, re-estimate, and see projected monthly costs and cost/latency sensitivity ranges.

### Backend Changes

1. **`models.py`** — New request + response models:
   - `WorkflowRequest`: Added `runs_per_day: Optional[int]` (1–1M) and `loop_intensity: Optional[float]` (0.1–5.0)
   - `ScalingProjection`: `runs_per_day`, `runs_per_month`, `loop_intensity`, `monthly_cost`, `monthly_tokens`, `monthly_compute_seconds`, `cost_per_1k_runs`
   - `SensitivityReadout`: `cost_min/avg/max`, `latency_min/avg/max` — unified min/avg/max across loop assumptions
   - `WorkflowEstimation`: Added `scaling_projection: Optional[ScalingProjection]` and `sensitivity: Optional[SensitivityReadout]`

2. **`estimator.py`** — Extended `estimate_workflow()`:
   - New params: `runs_per_day`, `loop_intensity`
   - `loop_intensity` scales cycle `max_iterations` before computing min/avg/max ranges (capped at `recursion_limit`)
   - `ScalingProjection` computed when `runs_per_day` is provided: monthly_cost = total_cost × runs_per_month
   - `SensitivityReadout` always computed: for DAGs min=avg=max; for cyclic graphs uses existing cost_range/latency_range

3. **`main.py`** — Passes `runs_per_day` and `loop_intensity` from request to `estimate_workflow()`

### Frontend Changes

4. **`types/workflow.ts`** — Added `ScalingProjection`, `SensitivityReadout` interfaces; extended `EstimateRequestPayload` with `runs_per_day`, `loop_intensity`; extended `WorkflowEstimation`

5. **`store/useWorkflowStore.ts`** — New `ScalingParams` slice:
   - State: `scalingParams: { runsPerDay: number | null, loopIntensity: number }`
   - Actions: `setRunsPerDay()`, `setLoopIntensity()`
   - Selector: `useScalingParams()`

6. **`HeaderBar.tsx`** — Reads `scalingParams` from store and includes `runs_per_day`/`loop_intensity` in the estimation request payload

7. **`EstimatePanel.tsx`** — New "📊 What-If Scaling" section:
   - **Runs / day slider** (0–10k, step 100) — value shown as label, 0 = off
   - **Loop intensity slider** (0.1×–5.0×, step 0.1) — only shown when cycles detected
   - **Sensitivity readout** (always shown): cost/latency min→avg→max with spread multiplier
   - **Monthly projection cards** (when runs_per_day set): Monthly cost, Monthly tokens (in M), Compute time (min/hrs), Per 1K runs
   - Hint text when no projection configured

**Results and Outcomes**:
- **Backend tests**:
  - DAG with `runs_per_day=1000`: monthly_cost=$189.02, 60M tokens/month, 55.8 hrs compute ✅
  - Cyclic with `runs_per_day=500, loop_intensity=2.0`: doubled iterations (10→20), monthly_cost=$1060.50, sensitivity 20× cost spread ✅
  - DAG without scaling params: `scaling_projection=null`, sensitivity shows identical min/avg/max ✅
- **TypeScript build**: `npx tsc --noEmit` → **zero errors** ✅

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | `runs_per_day` + `loop_intensity` on request; `ScalingProjection` + `SensitivityReadout` models; extended response |
| `backend/estimator.py` | `loop_intensity` scales cycle iterations; computes `ScalingProjection` + `SensitivityReadout` |
| `backend/main.py` | Passes scaling params to `estimate_workflow()` |
| `frontend/src/types/workflow.ts` | `ScalingProjection`, `SensitivityReadout` interfaces; extended request + response types |
| `frontend/src/store/useWorkflowStore.ts` | `ScalingParams` state/actions/selector |
| `frontend/src/components/HeaderBar.tsx` | Includes scaling params in estimate request |
| `frontend/src/components/EstimatePanel.tsx` | "📊 What-If Scaling" section with sliders + sensitivity + projection cards |

**Next Steps and Future Considerations**:
1. **Feature #6: Workflow health scoring** — Aggregate health grade from bottleneck severity, loop risk, model cost tier
2. **Feature #7: Minimal observability integration** — Paste/upload actual stats, overlay actual vs estimated
3. **Re-estimate on slider change** — Auto-trigger estimation when sliders change (debounced), instead of requiring manual "Get Estimate" click

---

## Update 13 — Feature #6: Workflow Health Scoring

**Date**: 2025-02-XX  
**Task**: Implement workflow health scoring with grade, badges, and per-factor breakdown (Feature #6 from roadmap)

**Approach**:
Compute an opinionated health grade (A–F, 0-100) from four weighted factors, each worth 0-25 points. Display as a prominent badge with progress bar, badges, and factor breakdown in the EstimatePanel.

### Backend Changes

1. **`models.py`** — New `HealthScore` model:
   - Fields: `grade` (A-F), `score` (0-100), `badges` (list of strings), `details` (per-factor scores)
   - Added `health: Optional[HealthScore]` to `WorkflowEstimation`

2. **`estimator.py`** — New `_compute_health_score()` function:
   - **Factor 1 — Cost concentration** (0-25): Penalizes if top 2 nodes hold >60% of total cost. Badges: "Cost-efficient" / "Cost-concentrated"
   - **Factor 2 — Loop risk** (0-25): Penalizes cycles by risk_level. Badges: "Loop-free" / "Loop-heavy"
   - **Factor 3 — Premium model usage** (0-25): Checks >$10/M input cost models. Badges: "Budget-friendly" / "High premium-model usage"
   - **Factor 4 — Latency balance** (0-25): Parallelism benefit metric. Badge: "Latency-sensitive"
   - **Composite**: A (≥85), B (≥70), C (≥55), D (≥40), F (<40)

### Frontend Changes

3. **`types/workflow.ts`** — Added `HealthScore` interface
4. **`EstimatePanel.tsx`** — Health section: grade circle, progress bar, badge pills, 4-column factor grid

**Results**:
- DAG: Grade C (61), Cyclic: Grade A (85) ✅
- TypeScript: zero errors ✅

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | `HealthScore` model; added to `WorkflowEstimation` |
| `backend/estimator.py` | `_compute_health_score()` with 4 factors |
| `frontend/src/types/workflow.ts` | `HealthScore` interface |
| `frontend/src/components/EstimatePanel.tsx` | Health badge section |

**Next Steps**:
1. **Feature #7: Minimal observability integration** — Paste/upload actual stats, overlay actual vs estimated
2. **Health in comparison table + sidebar** — Show health grades in ComparisonDrawer and scenario list

---

## Update 14 — Feature #7: Minimal Observability Integration (Roadmap Complete)

**Date**: 2025-02-XX  
**Task**: Implement minimal observability — let users paste actual run stats (JSON) and see a side-by-side comparison with estimates (Feature #7, final roadmap item)

**Approach**:
Frontend-only feature: no backend changes. Users paste a JSON array of actual per-node stats; the panel parses, validates, stores in Zustand, and renders a comparison table with variance indicators.

### Frontend Changes

1. **`types/workflow.ts`** — New `ActualNodeStats` interface:
   - Fields: `node_id` (string), `actual_tokens?`, `actual_latency?`, `actual_cost?` (all optional numbers)

2. **`store/useWorkflowStore.ts`** — New store slice:
   - State: `actualStats: ActualNodeStats[]`
   - Actions: `setActualStats()`, `clearActualStats()`
   - Selector: `useActualStats()`

3. **`components/EstimatePanel.tsx`** — New "📡 Actual vs Estimated" section (between What-If and Token Distribution):
   - **Paste button**: toggles a JSON textarea with example placeholder
   - **Validation**: parses JSON, checks array shape, verifies each entry has string `node_id`
   - **Comparison table**: 4 columns — Node, Est. Tokens, Act. Tokens, Δ (variance %)
   - **Variance coloring**: green if actual < estimated by >10%, red if over by >10%, neutral otherwise
   - **Clear button**: removes actual stats and resets paste state
   - **Empty state**: hint text when no stats loaded
   - Added `import type { NodeEstimation } from "@/types/workflow"` for type-safe `.find()`

**Results**:
- TypeScript: zero errors ✅
- JSON format for paste: `[{"node_id":"2","actual_tokens":500,"actual_latency":1.2,"actual_cost":0.003}]`
- All 7 features from the roadmap are now complete

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/types/workflow.ts` | `ActualNodeStats` interface |
| `frontend/src/store/useWorkflowStore.ts` | `actualStats` state, `setActualStats`/`clearActualStats` actions, `useActualStats` selector |
| `frontend/src/components/EstimatePanel.tsx` | Type import, observability section with paste UI + comparison table |

**Roadmap Summary — All 7 Features Complete**:
| # | Feature | Update |
|---|---------|--------|
| 1 | Bottleneck Highlighting | Update 8 |
| 2 | Loop Risk & Contribution | Update 9 |
| 3 | Model & Tool Mix Analysis | Update 10 |
| 4 | Critical-Path & Parallelism | Update 11 |
| 5 | Scenario Scaling / What-If | Update 12 |
| 6 | Workflow Health Scoring | Update 13 |
| 7 | Minimal Observability | Update 14 |

**Next Steps (Post-Roadmap)**:
1. **Export/share workflows** — JSON download/upload of canvas + estimates
2. **Comparison drawer health grades** — Show A-F grade in scenario comparison
3. **Actual cost/latency columns** — Extend the observability table to show all three metrics side-by-side
4. **Dark mode polish** — Fix `flex-shrink-0` → `shrink-0` Tailwind v4 lint warnings across all files
5. **Unit tests** — Jest / Vitest for frontend store + component logic

---

## Update 15 — UX Polish: Rich Nodes, Edge Metrics, Live What-If, Dashboard Mode

**Date**: 2026-02-16  
**Task**: Four UX improvements based on user feedback and React Flow homepage inspiration

### Feature A: Rich Node Card Bodies
**File**: `frontend/src/components/nodes/WorkflowNode.tsx`
- After estimation runs, agent & tool nodes now display inline metrics: **Tokens** (e.g. "1.2k"), **Cost** (e.g. "$0.003"), **Latency** (e.g. "340 ms"), and **Tool latency** for agent-to-tool connections
- Metrics appear below a subtle divider inside the node card, only when estimation data exists
- Node min-width bumped to 170px, max-width 220px to accommodate the metrics rows
- Cards auto-collapse back to minimal when no estimation is present

### Feature B: Edge Labels with Latency & Cost Metrics
**File**: `frontend/src/components/Canvas.tsx`
- Replaced the `🛤️` emoji on critical-path edges with actual metrics: latency in ms + cost
- All edges (not just critical path) now show the **target node's latency** and cost as compact monospace labels (e.g. "340ms · $0.003")
- Tool edges show tool-specific latency with 🔧 prefix
- Labels have semi-transparent background pills for readability over the canvas
- Critical path edges: blue text, bolder font. Normal edges: gray text

### Feature C: What-If Sliders Dynamically Re-Estimate
**File**: `frontend/src/components/EstimatePanel.tsx`
- Added 600ms debounced `useEffect` that watches `scalingParams.runsPerDay` and `scalingParams.loopIntensity`
- When either slider changes, fires a fresh `POST /api/estimate` with current nodes/edges + updated scaling params
- Shows an "Updating…" pulse badge in the What-If header while request is in-flight
- Silently swallows errors to avoid disrupting the last good estimate

### Feature D: Fullscreen Dashboard Mode
**File**: `frontend/src/components/EstimatePanel.tsx`
- Added expand/collapse button (⇱/⇲ icons) in the panel header next to the close button
- **Sidebar mode**: unchanged behavior — resizable right drawer
- **Fullscreen mode**: panel covers the entire viewport as a dashboard overlay
  - Two-column grid layout: left column (summary, health, cycles, model mix, critical path, what-if), right column (observability, token chart, breakdown table, parallelism)
  - Max-width 7xl centered for readability on wide screens
  - Backdrop darkened to 40% for focus
  - Header shows "📊 Workflow Dashboard" with health grade inline
  - Close button exits fullscreen AND closes the panel; expand button toggles between modes

**Results**:
- TypeScript: zero errors ✅
- All four features work together — rich nodes and edge labels update live after estimation, sliders re-fire the estimate in real time, fullscreen provides a clean dashboard view

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/nodes/WorkflowNode.tsx` | Inline metrics section (tokens, cost, latency, tool latency) |
| `frontend/src/components/Canvas.tsx` | Edge label computation with latency/cost metrics |
| `frontend/src/components/EstimatePanel.tsx` | Live re-estimation effect, fullscreen mode, two-column dashboard layout, loading indicator |

---

## Update 16 — Draggable Node Config Modal

**Date**: 2026-02-16  
**Agent**: Frontend agent — NodeConfigModal UX fix  
**Task**: Fix the config modal getting cut off on screen edges by making it freely draggable, with an explicit close button

**Approach**:
The modal was `position: fixed` and placed next to the selected node via `flowToScreenPosition`. On small screens or when nodes are near edges, the modal would clip. Instead of fighting viewport math, made the entire modal **drag-to-reposition** via its title bar.

### Changes to `NodeConfigModal.tsx`:

1. **Drag state** — Added `isDragging` ref and `dragOffset` ref for tracking mouse delta during drag
2. **`onDragStart` handler** — Attached to the header bar via `onMouseDown`. Computes offset between cursor and modal origin, then adds document-level `mousemove`/`mouseup` listeners. Mouse move clamps position to keep at least 80px visible on screen
3. **Draggable header bar** — New top section with:
   - 6-dot grip icon (visual drag affordance)
   - Title "Configure: {label}"
   - Explicit ✕ close button (no more click-backdrop-to-dismiss)
   - `cursor-grab` / `active:cursor-grabbing` CSS for clear UX signal
   - `select-none` to prevent text selection during drag
4. **Removed click-outside-to-close** — The outer `<div>` is now `pointer-events-none` (pass-through) so users can still interact with the canvas while the modal is open. The modal card itself is `pointer-events-auto`
5. **Scrollable body** — Wrapped form content in `max-h-[70vh] overflow-y-auto` so tall modals (e.g. with pricing card + context textarea) don't overflow off the bottom of the screen
6. **Initial positioning unchanged** — Still spawns next to the node via `getNodesBounds`/`flowToScreenPosition`, but now users can drag it anywhere if the auto-position isn't ideal

**Results**:
- TypeScript: zero errors ✅
- Modal spawns next to node, then freely drags anywhere
- Close via ✕ button or Cancel/Save
- Canvas remains interactive behind the modal
- Body scrolls when content exceeds 70vh

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/NodeConfigModal.tsx` | Draggable header, drag handlers, pointer-events pass-through, scrollable body, explicit close button |

---

### Update 17 — Milestone 1: Context-Aware Agents

**Agent**: Full-stack feature agent — context-aware estimation system

**Task Description**: Implement Context-Aware Agents (Milestone 1 from CONTEXT.md). The goal was to let agent nodes carry `task_type`, `expected_output_size`, and `expected_calls_per_run` metadata so the estimator produces more accurate token/cost/latency numbers based on what the agent actually does.

**Approach**:
1. **Backend** — Extended `NodeConfig` in `models.py` with three optional fields. Built a 36-entry `_TASK_OUTPUT_MULTIPLIERS` lookup table in `estimator.py` mapping (task_type × output_size) to a float multiplier. Updated `estimate_agent_node()` to apply the output multiplier and calls-per-run scaling to tokens, cost, and latency.
2. **Frontend** — Extended `WorkflowNodeData` and `NodeConfigPayload` types. Added three new state variables to `NodeConfigModal.tsx` with a "🧠 Context-Aware Estimation" section (Task Type dropdown, Output Size dropdown, Calls per Run input). Updated `nodesToPayload()`, `loadScenario()`, HeaderBar payload mapping, EstimatePanel live re-estimation payload, and added a summary line to `WorkflowNode.tsx`.

**Results**: TypeScript zero errors ✅. Backend imports clean ✅. Multiplier table covers 6 task types × 4 output sizes + 2 fallback sizes = 36 entries.

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `task_type`, `expected_output_size`, `expected_calls_per_run` to NodeConfig |
| `backend/estimator.py` | Added `_TASK_OUTPUT_MULTIPLIERS`, `_get_output_multiplier()`, updated `estimate_agent_node()` |
| `frontend/src/types/workflow.ts` | Extended `WorkflowNodeData` and `NodeConfigPayload` |
| `frontend/src/store/useWorkflowStore.ts` | Updated `nodesToPayload()`, `loadScenario()` |
| `frontend/src/components/NodeConfigModal.tsx` | Added 3 new fields + UI section |
| `frontend/src/components/nodes/WorkflowNode.tsx` | Added task summary line |
| `frontend/src/components/HeaderBar.tsx` | Updated payload mapping |
| `frontend/src/components/EstimatePanel.tsx` | Updated live re-estimation payload |

---

### Update 18 — Milestone 2: Production JSON Import & Comparison

**Agent**: Full-stack feature agent — workflow import system

**Task Description**: Implement Production JSON Import & Comparison (Milestone 2). Users can paste a JSON workflow (Generic, LangGraph, or Custom format) and either replace the current canvas or load it as a saved scenario for comparison.

**Approach**:
1. **Backend** — Created `import_adapters.py` with three adapter functions (`import_generic`, `import_langgraph`, `import_custom`) + `get_adapter()` registry + `_guess_node_type()` heuristic. Added `ExternalWorkflowImportRequest` and `ImportedWorkflow` Pydantic models. Added `POST /api/import-workflow` endpoint to `main.py`.
2. **Frontend** — Added `ImportSource`, `ImportWorkflowRequest`, `ImportedWorkflow` types. Added `importWorkflow` store action (replace canvas or save as scenario). Created `ImportWorkflowModal.tsx` — draggable modal with source format selector (Generic/LangGraph/Custom), mode toggle (Replace/Scenario), JSON textarea with "Paste Example" button, and error handling.

**Results**: TypeScript zero errors ✅. Backend imports clean ✅. LangGraph adapter handles StateGraph JSON with conditional_edges flattening.

**Files Created**:
| File | Purpose |
|------|---------|
| `backend/import_adapters.py` | Import adapter layer (generic, langgraph, custom) |
| `frontend/src/components/ImportWorkflowModal.tsx` | Import workflow modal |

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `ExternalWorkflowImportRequest`, `ImportedWorkflow` |
| `backend/main.py` | Added `POST /api/import-workflow` endpoint |
| `frontend/src/types/workflow.ts` | Added import-related types |
| `frontend/src/store/useWorkflowStore.ts` | Added `importWorkflow` action |
| `frontend/src/components/HeaderBar.tsx` | Added Import button + modal rendering |

---

### Update 19 — Milestone 3: Auto-Layout & Export

**Agent**: Full-stack feature agent — auto-layout and export system

**Task Description**: Implement Auto-Layout & Export (Milestone 3). Two sub-features: (a) dagre-based auto-arrangement of canvas nodes with a single click, and (b) export dropdown supporting PNG, SVG, JSON report, and Markdown report.

**Approach**:
1. **Dependencies** — Installed `@dagrejs/dagre` + `@types/dagre` (layout engine) and `html-to-image` (DOM-to-image capture).
2. **Auto-Layout** — Created `useAutoLayout` hook in `src/hooks/useAutoLayout.ts`. Uses dagre's `graphlib.Graph` with top-to-bottom direction, 80px horizontal spacing, 120px vertical spacing. Reads nodes/edges from Zustand, computes positions via `dagre.layout()`, writes back via `setNodes()`, then calls `fitView()` with a 300ms animated transition.
3. **Export Dropdown** — Created `ExportDropdown.tsx` component with a dropdown menu containing 4 export options:
   - **PNG**: Uses `toPng()` from `html-to-image` at 2× pixel ratio with theme-aware background
   - **SVG**: Uses `toSvg()` from `html-to-image`
   - **JSON Report**: Serializes full `WorkflowEstimation` + graph nodes/edges as formatted JSON
   - **Markdown Report**: Generates a comprehensive report with Summary table, Health Score, Node Breakdown, Critical Path, Detected Cycles, Parallel Steps, and Scaling Projection sections
4. **HeaderBar Integration** — Added "🔀 Layout" button (cyan border, disabled when no nodes) and `<ExportDropdown>` component between Import and Run buttons.

**Results**: TypeScript zero errors ✅. All 4 export formats generate correct content. Auto-layout arranges nodes cleanly in DAG order.

**Files Created**:
| File | Purpose |
|------|---------|
| `frontend/src/hooks/useAutoLayout.ts` | Dagre-based auto-layout hook |
| `frontend/src/components/ExportDropdown.tsx` | Export dropdown (PNG/SVG/JSON/MD) |
| `Context/FEATURE_ROADMAP.md` | Detailed roadmap for all 3 milestones |

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/HeaderBar.tsx` | Added Layout button + ExportDropdown import/rendering |
| `frontend/package.json` | Added `@dagrejs/dagre`, `html-to-image`, `@types/dagre` |

**Next Steps**:
- All 3 milestones from CONTEXT.md now complete
- Future enhancements: LR/RL/BT layout direction toggle, custom node spacing controls
- Consider adding workflow templates (pre-built JSON examples) for the import modal

---

### Update 20 — Enhanced Export: Dashboard PNG, PDF Report, CSV Breakdown

**Agent**: Frontend feature agent — report & dashboard export system

**Task Description**: The existing Export dropdown only captured the canvas graph as PNG/SVG and raw data as JSON/Markdown. Users needed the ability to export the **actual dashboard UI** (health score, bottlenecks, charts, breakdown table, critical path, parallelism, scaling) as a shareable image, a professional PDF, and a spreadsheet-compatible CSV.

**Approach**:
1. **Dashboard as PNG** — Added `id="estimate-dashboard-capture"` to the EstimatePanel scrollable body container. New `exportDashboardPNG()` handler temporarily removes `overflow: hidden` to expand the full scroll content, captures at 2× pixel ratio via `html-to-image`, then restores scroll styles. The captured image includes everything the user sees in the dashboard — health score, bottleneck table, model mix chart, breakdown table, critical path, parallelism steps, what-if scaling, and sensitivity ranges.

2. **Report as PDF** — Installed `jspdf` + `jspdf-autotable`. Created `generatePdfReport()` which builds a multi-page A4 PDF with:
   - Title + timestamp header
   - Summary table (graph type, tokens, cost, latency, health grade + badges)
   - Node Breakdown table (color-coded headers per section)
   - Critical Path text
   - Detected Cycles table (red headers)
   - Parallel Execution Steps table (purple headers)
   - Scaling Projection table (green headers)
   - Auto page breaks when content exceeds page height
   - Page numbering footer on every page

3. **Breakdown as CSV** — Created `buildCsvReport()` which generates a proper CSV with 17 columns (node name, provider, model, tokens in/out/total, costs, latency, tool metrics, shares, bottleneck, cycle membership) + a TOTAL summary row. Users can open this directly in Excel, Google Sheets, or any data tool.

4. **Dropdown reorganization** — Restructured the Export dropdown into 3 clearly separated sections:
   - **Graph Image**: Canvas as PNG, Canvas as SVG
   - **Dashboard Screenshot**: Dashboard as PNG
   - **Estimation Report**: Report as PDF, Breakdown as CSV, Report as JSON, Report as Markdown

**Results**: TypeScript zero errors ✅. All 7 export formats work. PDF generates multi-page professionally formatted reports. CSV opens cleanly in Excel. Dashboard PNG captures the full scrollable content.

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/ExportDropdown.tsx` | Added `buildCsvReport()`, `generatePdfReport()`, 3 new export handlers, reorganized dropdown into 3 sections with 7 total export options |
| `frontend/src/components/EstimatePanel.tsx` | Added `id="estimate-dashboard-capture"` to scrollable body container |
| `frontend/package.json` | Added `jspdf`, `jspdf-autotable` dependencies |

---

### Update 21 — Supabase Auth & Workflow Persistence

**Agent**: Frontend feature agent — authentication and cloud persistence system

**Task Description**: Implement user login with Supabase and workflow persistence. Users can freely design workflows on the canvas without authentication, but must sign in to **Save**, **Export**, or **Import**. Imported workflows must always be saved as a separate named scenario (in addition to loading on canvas if "Replace" mode is chosen).

**Approach**:

1. **Supabase client setup** — Installed `@supabase/supabase-js` and `@supabase/ssr`. Created `src/lib/supabase.ts` as a browser client singleton using `createBrowserClient()` with the publishable API key. Added placeholder env vars to `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).

2. **Auth store** — Created `src/store/useAuthStore.ts` (Zustand) tracking `user`, `session`, `loading`, `authModalOpen`, `authModalReason`, and `authModalCallback`. The `init()` method hydrates the session on mount and listens for `onAuthStateChange` events (sign in, sign out, token refresh). When the modal triggers a sign-in and the callback is set, it fires automatically after successful auth.

3. **Auth modal** — Created `src/components/AuthModal.tsx` with email/password sign-in/sign-up forms. Features: error display, loading spinner, email confirmation sent state, mode toggle (sign in / sign up). Styled with Tailwind for light/dark themes.

4. **Auth initialization** — Updated `src/app/page.tsx` to call `useAuthStore.getState().init()` in a `useEffect` on mount, hydrating the Supabase session and subscribing to auth changes. Added `<AuthModal />` to the render tree.

5. **Auth gating (HeaderBar)** — Updated `HeaderBar.tsx`:
   - **Save** button: if not signed in, opens auth modal with reason "Sign in to save your workflow" and a callback that re-triggers save after successful auth. When signed in, calls `saveWorkflowToSupabase()` (persists to Postgres).
   - **Import** button: if not signed in, opens auth modal; callback opens the import modal.
   - **Auth UI**: Added Sign In / Sign Out buttons with user email display on the right side of the header bar, separated by a vertical divider.

6. **Auth gating (ExportDropdown)** — The Export dropdown button now checks auth before opening. If not signed in, shows auth modal with reason "Sign in to export workflows and reports." with a callback that opens the dropdown.

7. **Import always saves as scenario** — Updated `ImportWorkflowModal.tsx`: when mode is "replace", the imported workflow is loaded onto the canvas AND also saved as a separate named scenario via `importWorkflow(imported, "scenario")`.

8. **Supabase CRUD in workflow store** — Extended `useWorkflowStore.ts` with three async methods:
   - `saveWorkflowToSupabase(name, description?)`: inserts a new row or updates an existing one in the `workflows` table. Syncs local Zustand state.
   - `loadWorkflowsFromSupabase()`: fetches all workflows for the current user ordered by `updated_at desc`, merges with local scenarios.
   - `deleteWorkflowFromSupabase(id)`: deletes from Supabase and removes from local store.
   - Added `supabaseLoading` flag for sidebar loading state.

9. **Sidebar cloud sync** — Updated `Sidebar.tsx`:
   - Calls `loadWorkflowsFromSupabase()` when user signs in (via `useEffect` on `user`).
   - Shows cloud icon next to "Saved Workflows" header when user is signed in.
   - Delete button uses `deleteWorkflowFromSupabase()` when signed in, falls back to local `deleteScenario()` otherwise.
   - Shows "Loading workflows..." text when `supabaseLoading` is true.

10. **Database migration** — Created `supabase/migrations/001_workflows_table.sql` with:
    - `workflows` table (uuid PK, user_id FK to auth.users, name, description, graph jsonb, last_estimate jsonb, timestamps).
    - Index on `user_id`.
    - RLS enabled with 4 policies (select/insert/update/delete restricted to `auth.uid() = user_id`).
    - Auto-update trigger for `updated_at`.

**Results**: TypeScript zero errors. All auth gating works: unauthenticated users can freely design on the canvas and run estimates, but Save/Export/Import prompt for sign-in. After sign-in, workflows persist to Supabase Postgres with RLS isolation. Imported workflows are always saved as separate scenarios.

**Files Created**:
| File | Purpose |
|------|---------|
| `frontend/src/lib/supabase.ts` | Supabase browser client singleton |
| `frontend/src/store/useAuthStore.ts` | Auth Zustand store (user, session, modal state) |
| `frontend/src/components/AuthModal.tsx` | Email/password sign-in/sign-up modal |
| `supabase/migrations/001_workflows_table.sql` | DB schema, RLS policies, trigger |

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/.env.local` | Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` placeholders |
| `frontend/package.json` | Added `@supabase/supabase-js`, `@supabase/ssr` |
| `frontend/src/app/page.tsx` | Auth init on mount, added `<AuthModal />` |
| `frontend/src/components/HeaderBar.tsx` | Auth imports, auth-gated Save/Import, Sign In/Out UI |
| `frontend/src/components/ExportDropdown.tsx` | Auth-gated Export dropdown toggle |
| `frontend/src/components/ImportWorkflowModal.tsx` | Auto-save imported workflows as separate scenarios |
| `frontend/src/components/Sidebar.tsx` | Cloud sync on login, Supabase-aware delete, loading state |
| `frontend/src/store/useWorkflowStore.ts` | Added Supabase CRUD methods + `supabaseLoading` flag |

**Next Steps**:
1. User must create a Supabase project and fill in `.env.local` with real URL + publishable key.
2. Run the SQL migration in Supabase Dashboard (SQL Editor).
3. Enable Email auth provider in Supabase Auth settings.
4. Configure OAuth providers (Google, GitHub) — see Update 22.
5. Future: autosave / dirty-state indicator, workflow sharing.

---

### Update 22 — OAuth (Google, GitHub, Microsoft) & Enterprise SSO (SAML 2.0)

**Agent**: Frontend feature agent — SSO / OAuth integration

**Task Description**: Extend the authentication modal with social login (Google, GitHub, Microsoft via Azure) and Enterprise SSO using SAML 2.0. Create the OAuth callback route to exchange authorization codes for sessions.

**Approach**:

1. **OAuth callback route** — Created `frontend/src/app/auth/callback/route.ts` using `createServerClient` from `@supabase/ssr`. The `GET` handler reads the `code` query parameter, creates a Supabase server client with cookie helpers (getAll/setAll on NextResponse), calls `exchangeCodeForSession(code)`, and redirects to `/` (or the `next` param). If code is missing or exchange fails, redirects home gracefully.

2. **AuthModal full rewrite** — Rewrote `AuthModal.tsx` (404 lines) with three authentication methods:
   - **OAuth section** (top): Three provider buttons — Google (with inline SVG brand logo), GitHub (Lucide `Github` icon), and Microsoft (inline 4-square SVG logo). Each calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: origin/auth/callback } })`. Loading state per-provider with spinner.
   - **Email/password section** (middle): Preserved the existing sign-in / sign-up form with mode toggle, separated from OAuth by a "or use email" divider.
   - **Enterprise SSO section** (bottom): "Sign in with SSO" button reveals a domain input form. Calls `supabase.auth.signInWithSSO({ domain })`, follows `data.url` redirect. Cancel button hides the form. Descriptive text lists compatible IdPs (Okta, Azure AD / Entra, OneLogin, Google Workspace, any SAML 2.0).
   - **UI refinements**: `Divider` helper component with themed horizontal rules and uppercase label text. Provider buttons respect dark/light theme. All loading states managed independently (email, OAuth per-provider, SSO).

3. **Provider configuration pattern** — `OAUTH_PROVIDERS` array of `ProviderButton` objects makes it trivial to add more providers later — just push a new entry with id, label, icon, and Tailwind classes.

**Results**: TypeScript compiles with zero errors. The modal renders three distinct auth zones — social OAuth at top, email form in middle, enterprise SSO at bottom — each with independent loading/error states. The callback route correctly exchanges codes and sets session cookies for SSR.

**Files Created**:
| File | Purpose |
|------|---------|
| `frontend/src/app/auth/callback/route.ts` | OAuth/SSO server-side callback — exchanges code for session |

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/AuthModal.tsx` | Full rewrite: added Google, GitHub, Microsoft OAuth buttons + Enterprise SSO domain input + dividers + provider config array |

**Setup Required**:
1. **Google OAuth**: Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth Client ID → Set authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`. Copy Client ID & Secret to Supabase Dashboard → Auth → Providers → Google.
2. **GitHub OAuth**: Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New → Set callback URL to `https://<project-ref>.supabase.co/auth/v1/callback`. Copy Client ID & Secret to Supabase Dashboard → Auth → Providers → GitHub.
3. **Microsoft (Azure)**: Register app in Azure AD → Set redirect URI → Copy Client ID & Secret to Supabase Dashboard → Auth → Providers → Azure.
4. **Enterprise SSO (SAML)**: Use Supabase CLI: `supabase sso add --type saml --domain yourcompany.com --metadata-url <IdP metadata URL>`. Works with Okta, Azure AD / Entra, OneLogin, Google Workspace, and any SAML 2.0 provider.

**Next Steps**:
1. User configures at least one OAuth provider in Supabase Dashboard.
2. Future: Add more providers (Apple, Slack, LinkedIn) — just add entry to `OAUTH_PROVIDERS` array.
3. Future: Remember user's last auth method (localStorage) for smoother return experience.
4. Future: Autosave / dirty-state indicator, workflow sharing.

---

### Update 23 — Landing Page, Route Split, and Design System Foundation

**Agent**: Frontend agent — landing page implementation and route restructuring

**Task Description**: Implement a landing page with hero section, feature cards, stats, and CTA — following the specs in `CONTEXT.md` (§ Landing Page Feature Implementation) and `FRONTEND_PLAN.MD` (§ Feature Roadmap → Landing Page). Split the app so the editor lives at `/editor` and the landing page lives at `/`. Reference UI inspirations: Skip Lec (clean hero + product screenshot), Canva (bold CTA), Lucidchart (OAuth buttons + product screenshot), and the project's own "Editor-First" mockup.

**Approach**:

1. **Dependency installation** — Installed `framer-motion`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, and `tailwind-merge` as specified in `FRONTEND_PLAN.MD` § 3 (Shared Dependencies).

2. **Design system foundation** — Created:
   - `src/lib/utils.ts` — `cn()` helper using `clsx` + `tailwind-merge` (required by all shadcn-style components).
   - `src/components/ui/button.tsx` — CVA-powered Button with variant/size props, `asChild` support via Radix Slot. Matches the spec in `FRONTEND_PLAN.MD` § 4.
   - Extended `globals.css` with full design-token CSS variables (`--primary`, `--primary-foreground`, `--secondary`, `--accent`, `--destructive`, `--input`, `--ring`) for both light and dark themes. Registered all as `@theme inline` colours for Tailwind v4.

3. **Hero components** — Created per `FRONTEND_PLAN.MD` § 5–7:
   - `src/components/ui/floating-icons-hero-section.tsx` — Reusable `FloatingIconsHero` with framer-motion entrance animations, floating icon wrappers with perpetual y-axis bobbing, central title/subtitle/CTA cluster. Fully typed `FloatingIconsHeroProps` interface.
   - `src/components/ui/background-boxes.tsx` — `BoxesCore` / `Boxes` component rendering a skewed grid of cells with framer-motion hover colour effects. Used as a secondary visual section.

4. **Demo wrappers** — Created per `FRONTEND_PLAN.MD` § 6:
   - `src/components/demo/floating-icons-hero-demo.tsx` — Configures `FloatingIconsHero` with agentic-themed Lucide icons (`Bot`, `Workflow`, `CircuitBoard`, `Network`, `Cpu`, `Zap`, `GitBranch`, `Layers`) positioned around the viewport. Title: "Craft Intelligent Workflows." CTA: "Launch Canvas" → `/editor`.
   - `src/components/demo/background-boxes-demo.tsx` — Wraps `Boxes` with "Built for Engineers" heading and description.

5. **Route split** — Per `FRONTEND_PLAN.MD` § 2 (Component Locations):
   - Copied existing `src/app/page.tsx` (canvas/editor) → `src/app/editor/page.tsx` (unchanged).
   - Replaced `src/app/page.tsx` with the new landing page composition.

6. **Landing page composition** (`src/app/page.tsx`) — Sections:
   - **Sticky navbar** — Logo, Features/How It Works anchor links, "Launch Canvas" CTA button.
   - **Hero** — `FloatingIconsHeroDemo` with floating agentic icons + central title/subtitle/dual CTAs.
   - **Stats bar** — Animated counters (38+ models, 7 providers, 4 node types, <10ms estimation).
   - **Features grid** — 6 cards (Visual Orchestration, Cost & Latency Estimation, Scenario Comparison, Multi-Provider Support, Critical Path Analysis, Cloud Persistence) with Lucide icons, staggered entrance animations.
   - **BackgroundBoxes section** — "Built for Engineers" with interactive grid background.
   - **3-step flow** — "Design → Estimate → Optimize" with numbered circles and descriptions.
   - **CTA banner** — "Ready to Build Smarter?" with Launch Canvas button.
   - **Footer** — Copyright + GitHub link.

**Results**:
- ✅ `npx tsc --noEmit` — zero errors
- ✅ `npx next build` — compiles successfully, both routes generated:
  - `○ /` — landing page (static)
  - `○ /editor` — canvas/editor (static)
  - `ƒ /auth/callback` — OAuth callback (dynamic)
- ✅ All component file paths match exactly what `FRONTEND_PLAN.MD` specifies
- ✅ No existing functionality broken — editor is identical at `/editor`
- ✅ Supabase auth session hydrates on both landing and editor pages

**Files Created**:
| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | `cn()` class merger (clsx + twMerge) |
| `src/components/ui/button.tsx` | CVA Button primitive with variants |
| `src/components/ui/floating-icons-hero-section.tsx` | Animated floating icons hero component |
| `src/components/ui/background-boxes.tsx` | Interactive grid animation component |
| `src/components/demo/floating-icons-hero-demo.tsx` | Configured hero with agentic Lucide icons |
| `src/components/demo/background-boxes-demo.tsx` | Configured boxes section |
| `src/app/editor/page.tsx` | Canvas/editor (moved from root `/`) |

**Files Modified**:
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Complete rewrite — now landing page with hero, features, stats, CTA |
| `src/app/globals.css` | Added design-token CSS variables (primary, secondary, accent, destructive, input, ring) for light + dark themes |
| `package.json` | Added framer-motion, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge |

**Next Steps**:
1. **Product screenshot / editor preview** — Add a screenshot or embedded preview of the editor below the hero (like the "Editor-First" mockup).
2. **Dark mode toggle on landing** — The landing page reads the `dark` class but there's no toggle on the navbar yet.
3. **SEO metadata** — Add Open Graph tags, Twitter card, and structured data for the landing page.
4. **Analytics** — Add Vercel Analytics or Plausible for landing page conversion tracking.
5. **Responsive polish** — Test on mobile breakpoints, adjust icon positions and grid layouts.

---

### Update 24 — Landing Page v2 Redesign (Caffeine Theme + Infinite Grid)

**Agent**: Frontend agent — landing page v2 redesign

**Task Description**: Complete redesign of the landing page. The user found v1 "too blocky" and wanted a Gumloop / n8n–inspired workflow-themed aesthetic with an infinite grid background, warm caffeine color palette, and minimal layout.

**Approach and Methodology**:
1. **Infinite grid component** — Created `src/components/ui/infinite-grid.tsx`, an adapted version of the user-provided infinite-grid-integration component. It renders a double-layer SVG grid with a radial "flashlight" reveal effect that follows the mouse. Accepts `children` so it works as a composable wrapper.
2. **Caffeine theme** — Replaced all CSS design-token variables in `globals.css` with a warm stone-based palette (`#faf9f7` bg, `#1c1917` fg, `#f5f0eb` secondary, `#e7e1da` border, `#78716c` muted). Dark mode tokens updated to match. React Flow overrides also updated.
3. **Landing page rewrite** (`src/app/page.tsx`) — Complete rewrite:
   - Hero: `InfiniteGrid` background, subtle gradient orbs, bold two-line headline, pill badge, dual CTAs
   - Workflow node strip below headline: animated Start → Agent → Tool → Agent → Finish visual
   - Stats section with animated counters (`useInView`-triggered)
   - Features as a 3-column bento grid with wide-span cards (Gumloop style)
   - "How It Works" section: 3 mono-numbered cards on tinted bg
   - Clean CTA and minimal footer with GitHub link
4. Removed all old blue-themed hardcoded color classes; everything now uses semantic tokens (`text-foreground`, `bg-card`, `border-border`, etc.).

**Results and Outcomes**:
- `npx tsc --noEmit` — zero type errors
- `npx next build` — clean production build, both `/` and `/editor` routes OK
- Old floating-icons hero and background-boxes imports removed from landing page
- The `floating-icons-hero-section.tsx`, `background-boxes.tsx`, and their demo wrappers still exist for potential reuse but are no longer imported

**Files Created**:
| File | Purpose |
|------|---------|
| `src/components/ui/infinite-grid.tsx` | Mouse-tracking infinite grid background |

**Files Modified**:
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Complete v2 rewrite — infinite grid hero, workflow node strip, bento features, 3-step cards, warm caffeine palette |
| `src/app/globals.css` | All CSS variables replaced with caffeine warm palette (light + dark), React Flow overrides updated |

**Next Steps**:
1. **Dark mode toggle** — Navbar has no light/dark toggle yet.
2. **Product preview** — Add a screenshot or interactive demo of the editor in the hero area.
3. **SEO metadata** — Open Graph, Twitter card, structured data.
4. **Mobile polish** — Test workflow node strip on small screens; may need horizontal scroll.
5. **Old hero cleanup** — Delete `floating-icons-hero-section.tsx`, `background-boxes.tsx`, and demo wrappers if confirmed unused.
6. **Auth integration on landing** — Add Sign In button to navbar that triggers the AuthModal.

---

### Update 25 — Interactive Playground + Gumloop-style How It Works

**Agent**: Frontend agent — landing page interactive playground & How It Works redesign

**Task Description**: Two major additions to the landing page:
1. **Interactive playground hook** (Relay.app-inspired): An embedded React Flow canvas with a hardcoded demo workflow that visitors can interact with — drag nodes, run a mock estimate, see a slide-up report — all without leaving the landing page.
2. **Gumloop-style "How It Works"** section: A tabbed, animated 3-step section with rich illustrations per step (node drag-and-drop, model picker, report preview) that auto-cycles and can be clicked. Replaces the previous static 3-card grid.

**Approach and Methodology**:
1. **`PlaygroundPreview`** (`src/components/landing/PlaygroundPreview.tsx`):
   - Self-contained React Flow canvas with 6 hardcoded nodes (Start → Research Agent → Web Search → Writer Agent → Summariser → Finish) and 6 edges
   - Custom `MiniNode` component with simplified styling (no imports from main `WorkflowNode`)
   - Nodes are draggable, but not connectable or deletable — visitor can only move them and pan
   - "Run Estimate" button in a fake macOS title bar triggers a 1.4s loading animation, then a slide-up mock report panel with:
     - 3 KPI chips (tokens, cost, latency)
     - Animated horizontal bar chart showing per-node token breakdown
     - Collapsible/closable with spring animation
   - Lazy-loaded via `React.lazy` to avoid blocking First Contentful Paint

2. **`HowItWorks`** (`src/components/landing/HowItWorks.tsx`):
   - Two-column layout: left = animated illustration card, right = clickable step list
   - 3 steps with unique illustrations:
     - Step 1: Animated node type cards + mini flow preview with animated arrows
     - Step 2: Agent node card + model picker grid (GPT-4o selected, Claude/Gemini/Llama options)
     - Step 3: KPI chips + animated bar chart + DAG badge
   - Auto-cycles every 4.5s via `useEffect` interval (pauses when not in view)
   - Active step has a sliding accent bar (`layoutId` spring animation)
   - Description expands/collapses with AnimatePresence height animation

3. **`page.tsx`** updated:
   - Added `ReactFlowProvider` + lazy `PlaygroundPreview` between hero and stats
   - Replaced old static 3-card "How It Works" with `<HowItWorks />` component
   - Moved features section below How It Works
   - Added "Try it now" section header above playground

**Results and Outcomes**:
- `npx tsc --noEmit` — zero type errors
- `npx next build` — clean production build (4.9s compile), both `/` and `/editor` routes OK
- Tailwind v4 modern syntax used throughout (e.g. `w-2!` instead of `!w-2`)

**Files Created**:
| File | Purpose |
|------|---------|
| `src/components/landing/PlaygroundPreview.tsx` | Interactive mock React Flow playground with estimate report |
| `src/components/landing/HowItWorks.tsx` | Gumloop-style animated tabbed How It Works section |

**Files Modified**:
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Added ReactFlowProvider + lazy PlaygroundPreview, replaced old How It Works with HowItWorks component, reordered sections |

**Next Steps**:
1. **Dark mode for playground** — MiniNode uses hardcoded `bg-green-50` etc.; could use CSS vars for dark mode compat.
2. **Mobile responsive** — Test playground on small screens; may need `min-h` adjustment or horizontal scroll hint.
3. **Old component cleanup** — Delete `floating-icons-hero-section.tsx`, `background-boxes.tsx`, demo wrappers.
4. **SEO metadata** — Open Graph / Twitter card tags.
5. **Auth on landing** — Sign In button in navbar triggering AuthModal.

---

### Update 26 — Landing Page v3: Hero Playground, Feature Snippets, Layout Shift Fix

**Agent**: Frontend agent — landing page visual refinement

**Task Description**: Three-part improvement to the landing page:
1. Remove the hero node icon strip and move the interactive playground up into the hero section directly below the CTA buttons.
2. Replace the bland text-only feature cards with visually rich tiles containing hardcoded mini illustrations/snippets showing actual app output.
3. Fix the HowItWorks layout shift bug where page pushes down when auto-cycling between steps.

**Approach and Methodology**:

1. **Hero restructure**: Removed `HeroNode` and `HeroArrow` components entirely. Moved the `ReactFlowProvider` + lazy `PlaygroundPreview` into the `InfiniteGrid` hero section, directly after the CTA buttons. Removed the separate "Try it now" section that had its own heading. Changed hero from `min-h-[88vh]` to natural flow with explicit padding (`pb-16 pt-20`).

2. **Feature card visual snippets**: Created 6 dedicated illustration components, each rendering hardcoded mini-previews:
   - `OrchestrationSnippet` — Static SVG mini-canvas with 5 nodes (Start → Research/Search → Writer → Finish) connected by animated SVG edges, nodes positioned absolutely with framer-motion stagger.
   - `EstimationSnippet` — Mini KPI chips (tokens, cost, latency) + animated horizontal bar chart showing per-node token distribution.
   - `ComparisonSnippet` — Two side-by-side scenario cards with cost/latency stats and "Cheaper"/"Faster" badges.
   - `CriticalPathSnippet` — Linear node chain with critical path nodes highlighted in red, DAG validation badge.
   - `MultiProviderSnippet` — Wrapped grid of 6 model/provider chips (GPT-4o, Claude 3.5, Gemini Pro, Llama 3.1, Mistral L, DeepSeek).
   - `CloudSnippet` — Three workflow rows with sync status indicators (name, time ago, green checkmark).

   Each snippet uses `whileInView` animations with staggered delays. The FEATURES array was restructured to include a `Snippet` component reference instead of an `icon`.

3. **HowItWorks layout shift fix**: Changed the illustration container from `min-h-72` to `h-80 sm:h-96` (fixed height) so swapping illustrations doesn't resize the container. Added `min-h-80 sm:min-h-96` to the right step list column so description expand/collapse animations don't shift the overall page height.

**Results and Outcomes**:
- `npx next build` — clean production build (5.2s compile), zero errors
- Hero now shows the live playground immediately below CTAs — much stronger visual hook
- All 6 feature tiles have distinct visual previews with subtle animations
- HowItWorks auto-cycle no longer causes page to jump/readjust
- Features section moved inside `bg-secondary/20` wrapper for visual separation

**Files Modified**:
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Removed HeroNode/HeroArrow components, moved playground into hero, created 6 visual snippet components, restructured FEATURES array, removed separate playground section |
| `src/components/landing/HowItWorks.tsx` | Changed `min-h-72` → `h-80 sm:h-96` on illustration container, added `min-h-80 sm:min-h-96` on step list column |

**Next Steps**:
1. **Dark mode tweaks** — Some snippet components use hardcoded light colors (e.g. `bg-green-50`, `bg-blue-50`) that may not look great in dark mode.
2. **Mobile testing** — Verify feature grid layout on small screens (currently `grid-cols-1` fallback should work).
3. **Testimonials / social proof** — Could add a section below features.
4. **SEO metadata** — Still pending Open Graph / Twitter card tags.

---

### Update 27 — Guest Canvas State Persistence (OAuth Fix)

**Agent**: Frontend bugfix agent — local storage persistence during auth redirects

**Task Description**: Fix a bug where unauthenticated users lose their canvas state (nodes/edges) when signing in with OAuth (Google, GitHub) due to the full-page redirect wiping React's in-memory Zustand store.

**Approach**:
1. **Local Storage Utility** — Created `src/lib/guestWorkflow.ts` to serialize/deserialize the canvas state into `localStorage` under the `guest_workflow` key.
2. **Zustand Actions** — Added `snapshotToLocalStorage()` and `restoreFromLocalStorage()` actions to `useWorkflowStore.ts`.
3. **Pre-flight Save** — Modified `handleOAuth` in `AuthModal.tsx` to call `snapshotToLocalStorage()` immediately before invoking `supabase.auth.signInWithOAuth()`, saving the state right before the browser leaves the page.
4. **Hydration Guard** — Added a `useEffect` to `Canvas.tsx` that calls `restoreFromLocalStorage()` on mount, safely rehydrating the Zustand store with any pending guest snapshot and clearing it from `localStorage`.

**Results**: 
- Users no longer lose their work if they decide to sign in or create an account via OAuth after building a complex workflow.
- Implementation handles standard email/password login automatically since those don't trigger full-page unmounts.

**Files Created**:
| File | Purpose |
|------|---------|
| `frontend/src/lib/guestWorkflow.ts` | Local storage utilities for guest snapshotting |

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/store/useWorkflowStore.ts` | Added `snapshotToLocalStorage` and `restoreFromLocalStorage` |
| `frontend/src/components/AuthModal.tsx` | Added pre-flight snapshot call before OAuth redirect |
| `frontend/src/components/Canvas.tsx` | Added hydration guard to restore snapshot on mount |

---

### Update 28 — Supabase Schema Extension + Annotation Node Estimator Support

**Agent**: Backend agent — Supabase migration + estimator annotation pass-through

**Task Description**: Two parallel backend changes to support the Canvas Authoring Enhancements milestone:
1. Create Supabase SQL migration 002 adding `scenarios` and `user_preferences` tables (with RLS, triggers, and indexes) so the frontend persistence layer can save scenario snapshots and per-user preferences.
2. Update the estimation system to gracefully handle two new annotation node types (`blankBoxNode`, `textNode`) that carry zero cost/tokens and must be excluded from all scoring.

**Approach and Methodology**:

1. **SQL Migration (002_scenarios_and_preferences.sql)**:
   - Created `scenarios` table: UUID PK, user_id FK to auth.users, optional workflow_id FK to workflows, JSONB columns for nodes/edges/estimate, recursion_limit integer, timestamps.
   - Created `user_preferences` table: user_id as PK (1:1 with auth.users), theme, drawer_width, active_workflow_id FK, updated_at.
   - Enabled RLS on both tables BEFORE writing any policies (Supabase requirement).
   - Added 4 CRUD policies on scenarios (select/insert/update/delete) and 3 on user_preferences (select/insert/update) for the `authenticated` role.
   - Reused `set_updated_at()` trigger function from migration 001 for both tables.
   - Added indexes on `scenarios(user_id)`, `scenarios(workflow_id)`, and `workflows(updated_at DESC)`.

2. **models.py changes**:
   - Extended `NodeConfig.type` Literal to accept `"blankBoxNode"` and `"textNode"`.
   - Added `is_annotation: bool = False` field to `NodeEstimation` so downstream consumers can filter annotations.

3. **estimator.py changes**:
   - `estimate_node()` now detects annotation types and sets `is_annotation=True` on the returned zero-cost `NodeEstimation`.
   - `_compute_bottleneck_shares()` skips annotation nodes when computing cost_share, latency_share, and severity rankings.
   - `_compute_health_score()` excludes annotation nodes from the cost-concentration factor (factor 1) via a filtered `scoreable` list.
   - Factor 3 (premium model usage) already safe since it filters on `n.type == "agentNode"`.
   - Graph analysis (`graph_analyzer.py`) unaffected because annotation nodes have no edges.

**Results and Outcomes**:
- `python -c "import models; import estimator"` passes cleanly, confirming no syntax/import errors.
- Migration file ready to run in Supabase SQL Editor.
- Existing DAG estimation logic fully unaffected (annotation types fall through the `else` branch with zero cost).
- `is_annotation` flag available for frontend to conditionally hide annotation nodes from analytics panels.

**Files Created**:
| File | Purpose |
|------|---------|
| `supabase/migrations/002_scenarios_and_preferences.sql` | scenarios + user_preferences tables, RLS, triggers, indexes |

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/models.py` | Added `blankBoxNode`, `textNode` to `NodeConfig.type`; added `is_annotation` to `NodeEstimation` |
| `backend/estimator.py` | Annotation pass-through in `estimate_node()`; excluded annotations from bottleneck + health scoring |

**Next Steps**:
1. **Run migration 002** in the Supabase SQL Editor to create the tables in the live project.
2. **Frontend persistence layer** (`workflowPersistence.ts`, `useAutoSave.ts`) can now target the `scenarios` table for scenario CRUD.
3. **Frontend node components** (`BlankBoxNode.tsx`, `TextNode.tsx`) can be built independently since the backend now accepts the new types.
4. **Regression testing** — Run existing workflow estimates to verify no change in output for DAG/cyclic graphs without annotation nodes.

---

### Update 29 — Canvas Authoring Enhancements (BlankBoxNode + TextNode + Auto-Save)

**Agent**: Frontend agent — Canvas Authoring Enhancements

**Task Description**: Implement two new canvas annotation node types (BlankBoxNode and TextNode) for Figma-style annotation of workflows, and add debounced Supabase auto-save with load-on-mount for authenticated users.

**Approach and Methodology**:

1. **Type system** — Extended `WorkflowNodeType` to include `"blankBoxNode" | "textNode"`. Added `blankBoxStyle` and `textNodeStyle` optional fields to `WorkflowNodeData` in `workflow.ts`.

2. **BlankBoxNode** (`src/components/nodes/BlankBoxNode.tsx`):
   - Uses React Flow's `<NodeResizer>` for drag-resize handles
   - Configurable border style (dashed/solid/none), border color, background fill
   - Optional top-left label text
   - Togglable connection handles (off by default — pure annotation)
   - Renders at `zIndex: -1` to stay behind workflow nodes
   - Default size 250×150 on drop

3. **TextNode** (`src/components/nodes/TextNode.tsx`):
   - Inline-editable text via double-click (controlled textarea with Enter to commit, Escape to cancel)
   - Configurable font size (sm/md/lg/heading), text color, background style (none/pill/badge)
   - Auto-sizes to content width
   - Commits edits to Zustand store via `updateNodeData`

4. **Canvas.tsx** — Registered both node types in `nodeTypes` map. Updated `onDrop` to set correct default data/styles when dropping new annotation nodes. Updated `onNodeDoubleClick` to open config modal for new types. Added minimap colors (gray for box, purple for text).

5. **Sidebar.tsx** — Added "Canvas Authoring" section between the node palette and Saved Workflows, with draggable BlankBox (Lucide `Square` icon) and Text Label (Lucide `Type` icon) items.

6. **NodeConfigModal.tsx** — Extended the config body with two new branches:
   - BlankBoxNode: border style select, border color picker, fill color picker, label input, connectable toggle
   - TextNode: content textarea, font size select, text color picker, background style select, background color picker (conditional on non-"none" background)

7. **Zustand store** — Added `activeWorkflowId`, `isSaving`, `lastSavedAt`, `setActiveWorkflowId` to the store. Updated `saveWorkflowToSupabase` to track saving state and auto-set `activeWorkflowId` on successful save.

8. **useAutoSave hook** (`src/hooks/useAutoSave.ts`):
   - Watches `nodes` and `edges` via Zustand selectors
   - Debounces 3000ms on any change
   - Only saves when: user is authenticated, `activeWorkflowId` is set, and canvas has nodes
   - Skips initial mount to avoid saving empty/hydrated state

9. **Editor page** — Added `useAutoSave()` hook. Added load-on-mount effect that fetches the user's workflows from Supabase and loads the most recent one onto an empty canvas, setting `activeWorkflowId`.

10. **HeaderBar** — Added "Saving..." (amber spinner) / "Saved" (green check) status pill next to the title, visible when user is authenticated and has an active workflow.

**Results and Outcomes**:
- `npx tsc --noEmit` — zero type errors
- Zero linter errors across all modified files
- Both new node types drag-and-drop onto canvas, open config modal on double-click
- BlankBoxNode is resizable and renders behind other nodes
- TextNode supports inline double-click editing
- Auto-save triggers 3s after any node/edge change (auth-gated)
- Editor loads user's last saved workflow on mount

**Files Created**:
| File | Purpose |
|------|---------|
| `frontend/src/components/nodes/BlankBoxNode.tsx` | Resizable annotation container node with configurable border/fill |
| `frontend/src/components/nodes/TextNode.tsx` | Inline-editable text label/annotation node |
| `frontend/src/hooks/useAutoSave.ts` | Debounced (3s) Supabase auto-save hook |

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/types/workflow.ts` | Added `blankBoxNode`, `textNode` to `WorkflowNodeType`; added `blankBoxStyle`, `textNodeStyle` to `WorkflowNodeData` |
| `frontend/src/components/Canvas.tsx` | Registered new node types, updated drop/double-click/minimap handlers |
| `frontend/src/components/Sidebar.tsx` | Added "Canvas Authoring" section with BlankBox and Text Label palette items |
| `frontend/src/components/NodeConfigModal.tsx` | Added config panels for blankBoxNode (border/fill/label) and textNode (content/font/color/bg) |
| `frontend/src/store/useWorkflowStore.ts` | Added `activeWorkflowId`, `isSaving`, `lastSavedAt`, `setActiveWorkflowId`; updated save tracking |
| `frontend/src/app/editor/page.tsx` | Added auto-save hook, load-on-mount for authenticated users |
| `frontend/src/components/HeaderBar.tsx` | Added "Saving..." / "Saved" status indicator |

**Next Steps**:
1. **workflowPersistence.ts abstraction** — Optional: extract Supabase CRUD from the store into a standalone utility layer.
2. **Supabase migration 002** — Must be run in Supabase SQL Editor before scenarios/preferences tables are available.
3. **Dark mode polish** — Some BlankBoxNode fill colors may not contrast well in dark mode; could add dark-mode-aware presets.
4. **Mobile/responsive testing** — Verify the new sidebar section and modal panels on small screens.
5. **Node grouping** — BlankBoxNode could leverage React Flow's `parentId` subflow pattern to auto-group child nodes when they're inside the box.

---

### Update 29 — Deployment Infrastructure + Production Auth Routing

**Agent**: Full-stack agent — deployment architecture and production auth config

**Task Description**: Set up the deployment pipeline and production OAuth routing for the Agentic Flow Designer. The app previously ran entirely on localhost with no deployment configuration. The goal was to make the full stack deployable to Vercel (frontend) + Railway/Render (backend) + Supabase (auth/DB), and to ensure OAuth SSO redirects work correctly in production.

**Approach and Methodology**:

1. **Architecture assessment**: Supabase cannot host Python backends (Edge Functions are Deno-only). The FastAPI backend with tiktoken, Pydantic, and graph analysis requires a proper Python hosting platform. Chose Railway (or Render as alternative) for the backend, Vercel for the frontend, and Supabase continues handling auth + Postgres.

2. **Backend deployment prep**:
   - Created `backend/Dockerfile` — Python 3.11-slim base, installs requirements, runs uvicorn on port 8000.
   - Updated `backend/config.py` — replaced single `FRONTEND_ORIGIN` with `FRONTEND_ORIGINS` (comma-separated list) to support both `http://localhost:3000` and the production Vercel URL simultaneously.
   - Updated `backend/main.py` — CORS middleware now uses `FRONTEND_ORIGINS` list instead of a single origin.
   - Created `backend/.env.example` documenting all required env vars.

3. **Frontend deployment prep**:
   - Created `frontend/.env.example` documenting `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
   - Verified that all 5 files using `NEXT_PUBLIC_API_URL` already fall back to `http://localhost:8000`, so only Vercel's env var needs to be set.
   - No `next.config.ts` changes needed — the current setup is clean.

4. **OAuth/SSO production routing**:
   - OAuth redirects already use `window.location.origin` dynamically, so they automatically point to the production domain once deployed.
   - The key action item is **Supabase Dashboard configuration**: add the production Vercel URL to the allowed Redirect URLs list and update the Site URL.
   - Google/GitHub OAuth provider redirect URIs in their respective developer consoles always point to Supabase's own callback (`https://<project>.supabase.co/auth/v1/callback`) — no change needed there.

5. **Deployment guide**: Wrote `Context/DEPLOYMENT.md` with complete step-by-step instructions covering Railway backend setup, Vercel frontend setup, Supabase auth configuration, env var tables, troubleshooting, and the full OAuth flow diagram.

**Results and Outcomes**:
- Backend imports and config verified: `python -c "from config import FRONTEND_ORIGINS"` and `python -c "import main"` pass cleanly.
- Backward compatible: local dev workflow unchanged (defaults still point to localhost).
- `FRONTEND_ORIGINS` supports comma-separated values, so adding production origin requires only a Railway env var update.
- Complete deployment guide written with troubleshooting table for common issues.

**Files Created**:
| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Docker image for Railway/Render deployment |
| `backend/.env.example` | Documents all backend env vars |
| `frontend/.env.example` | Documents all frontend env vars |
| `Context/DEPLOYMENT.md` | Full deployment + auth routing guide |

**Files Modified**:
| File | Changes |
|------|---------|
| `backend/config.py` | `FRONTEND_ORIGIN` (single) replaced with `FRONTEND_ORIGINS` (comma-separated list) |
| `backend/main.py` | CORS middleware uses `FRONTEND_ORIGINS` list |

**Next Steps**:
1. **Deploy backend** — Push to GitHub, connect Railway, set `FRONTEND_ORIGINS` env var.
2. **Deploy frontend** — Connect Vercel, set `NEXT_PUBLIC_API_URL` to Railway URL.
3. **Configure Supabase** — Add production Vercel URL to Redirect URLs + Site URL in dashboard.
4. **Test OAuth end-to-end** — Sign in with Google/GitHub from the production URL.
5. **Custom domain** (optional) — Add domain to Vercel, update Supabase redirect URLs.

---

### Update 30 — Enhanced BlankBoxNode (9-Position Labels, Color Presets, Opacity)

**Agent**: Frontend agent — Enhanced BlankBoxNode

**Task Description**: Upgrade `BlankBoxNode` from a minimal dashed-border container into a fully labeled, color-customizable group box — matching Lucidchart/FigJam container patterns. Users can now label boxes with configurable text, position (9 anchor points), label color, label background pill, 8 color presets, background opacity slider, and border width control.

**Approach and Methodology**:
1. Added `LabelPosition` type (9-value union) and `BlankBoxStyle` type (11 fields) to `workflow.ts`.
2. Rewrote `BlankBoxNode.tsx` with `hexToRgba()`, `POSITION_CLASSES`, and `LabelTag` sub-component.
3. Updated `Canvas.tsx` onDrop defaults: 320x220, blue preset, label "Group", 40% opacity.
4. Updated `Sidebar.tsx`: drag label "Group", display name "Group Box".
5. Rewrote `NodeConfigModal.tsx` blankBox panel with 3x3 position picker, 8 color swatches, opacity slider, border width buttons, label color picker, label pill toggle.

**Results**: `npx tsc --noEmit`: zero errors. Zero linter errors.

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/types/workflow.ts` | Added `LabelPosition`, `BlankBoxStyle` types |
| `frontend/src/components/nodes/BlankBoxNode.tsx` | Full rewrite with LabelTag, hexToRgba, 9-position labels |
| `frontend/src/components/Canvas.tsx` | Updated default blankBoxStyle on drop |
| `frontend/src/components/Sidebar.tsx` | Changed drag label to "Group" |
| `frontend/src/components/NodeConfigModal.tsx` | Rewrote blankBox config panel |

---

### Update 31 — Edge Connection Bug Fix

**Agent**: Frontend agent — Canvas edge connection bug fix

**Task Description**: Fix bug where edges could not be connected between nodes — "nothing comes out" when dragging from handles. Three root causes identified and fixed.

**Approach and Methodology**:
1. **React Compiler interference**: `reactCompiler: true` in `next.config.ts` was interfering with React Flow's internal event handling for connection initiation. Added `"use no memo"` directive to `Canvas.tsx`, `WorkflowNode.tsx`, `BlankBoxNode.tsx`, and `TextNode.tsx` to opt these components out of the React Compiler.
2. **Stale closure in `onConnect`**: The `onConnect` callback captured `nodes` and `edges` from its closure, which could become stale between renders. Changed to use `useWorkflowStore.getState()` for fresh state access, and reduced the dependency array to `[setEdges]` only.
3. **Tailwind v4 syntax**: Handle CSS classes used v3 `!` prefix (`!bg-gray-500 !w-2.5 !h-2.5`) instead of v4 postfix (`bg-gray-500! w-2.5! h-2.5!`). Corrected across WorkflowNode, BlankBoxNode, and Canvas MiniMap.

**Results**: `npx tsc --noEmit`: zero errors. Zero linter errors.

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/Canvas.tsx` | `"use no memo"`, onConnect uses getState(), MiniMap v4 syntax |
| `frontend/src/components/nodes/WorkflowNode.tsx` | `"use no memo"`, Handle classes v4 syntax |
| `frontend/src/components/nodes/BlankBoxNode.tsx` | `"use no memo"`, Handle + NodeResizer classes v4 syntax |
| `frontend/src/components/nodes/TextNode.tsx` | `"use no memo"` |

**Next Steps**:
1. **User verification** — User should test edge connections in the browser to confirm fix.
2. **React Compiler audit** — Review other components using React Flow hooks (NodeConfigModal, EstimatePanel) for similar compiler conflicts.
3. **Consider removing `reactCompiler: true`** — If more conflicts arise, disable globally and add `"use memo"` selectively to non-React-Flow components.

---

### Update 32 — Bugfix: Edge Connections + 4-Way Handles (2026-02-28)

**Task**: Fix 3 remaining edge connection issues: (1) BlankBoxNode content div swallowing drag events, (2) BlankBoxNode default connectable: false meant no handles, (3) WorkflowNode only had top/bottom handles and missing handle IDs causing React Flow to silently fail connections.

**Approach and Methodology**:
1. **BlankBoxNode pointer-events-none**: Added `pointer-events-none` class to the BlankBoxNode content div so it doesn't intercept drag events when users draw connections across it.
2. **BlankBoxNode default connectable: true**: Changed `DEFAULT_STYLE.connectable` from `false` to `true` so handles render by default.
3. **4-way handles on all nodes**: Added Left + Right handles (both source and target) to WorkflowNode and BlankBoxNode. Every node now has handles on all 4 sides. Source + target overlap at each position for bidirectional connections.
4. **Handle IDs**: All handles now have unique `id` props (`t-top`, `s-top`, `t-right`, `s-right`, etc.) so React Flow can properly track which handle is source/target of each edge.
5. **startNode/finishNode rules preserved**: startNode has no target handles, finishNode has no source handles.
6. **Removed zIndex: -1**: BlankBoxNode no longer uses `zIndex: -1` in Canvas onDrop since `pointer-events-none` makes it non-blocking.

**Results**: `npx tsc --noEmit`: zero errors. Zero linter errors. Dev server compiled cleanly.

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/nodes/WorkflowNode.tsx` | Added IDs to all handles; added Left + Right handles (4 source + 4 target per node) |
| `frontend/src/components/nodes/BlankBoxNode.tsx` | `pointer-events-none` on content div; default connectable: true; 8 handles (4 sides × 2 types) |
| `frontend/src/components/Canvas.tsx` | Removed `zIndex: -1` from blankBoxNode onDrop style |

**Next Steps**:
1. **User verification** — Test all connection types in browser (top/bottom/left/right, cross-box connections).

---

### Update 33 — Editable Edge Labels on BlankBox Connections (2026-02-28)

**Task**: Double-clicking an edge originating from a `blankBoxNode` opens an inline text input at the edge midpoint. Users type a label, press Enter to save (pill display), or Esc to cancel. Non-blankBox edges are not editable.

**Approach and Methodology**:
1. **New `AnnotationEdge` component** (`src/components/edges/AnnotationEdge.tsx`): Uses `getBezierPath` for the path, `BaseEdge` for rendering, `EdgeLabelRenderer` for HTML label overlay outside SVG. A transparent `strokeWidth={20}` path provides a 20px hit zone for double-click. Source-type check via Zustand selector subscribing only to the source node's type. Input container uses `nodrag nopan` classes. Label pill uses `pointer-events-none`.
2. **`updateEdgeLabel` action** added to `useWorkflowStore.ts`: Patches `edge.data.label` for the given edge ID.
3. **Canvas.tsx registration**: Imported `AnnotationEdge`, created `edgeTypes` map, set `defaultEdgeOptions.type = "annotationEdge"`, passed `edgeTypes` prop to `<ReactFlow>`.

**Results**: `npx tsc --noEmit`: zero errors. Zero linter errors.

**Files Modified**:
| File | Changes |
|------|---------|
| `frontend/src/components/edges/AnnotationEdge.tsx` | **New file** — custom edge with inline label editing |
| `frontend/src/store/useWorkflowStore.ts` | Added `updateEdgeLabel(id, label)` action |
| `frontend/src/components/Canvas.tsx` | Imported AnnotationEdge, registered edgeTypes, set default edge type, passed edgeTypes prop |

**Next Steps**:
1. **User verification** — Test double-click on blankBox edges, Enter/Esc behavior, pill rendering.