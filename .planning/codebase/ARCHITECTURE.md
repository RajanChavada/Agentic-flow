# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Distributed monorepo with backend-driven computation and frontend-driven visualization.

**Key Characteristics:**
- **Separation of Concerns**: Backend (FastAPI) handles all computation/estimation; frontend (Next.js) handles UI/visualization
- **Graph-based Workflow Model**: Nodes represent agents/tools/control flow; edges represent data flow
- **Registry Pattern**: Centralized pricing and tool definitions loaded at startup, queried throughout estimation
- **Client-Server Architecture**: Frontend communicates with backend via REST API; backend is stateless
- **Guest + Authenticated Flows**: Anonymous workflows stored in localStorage; authenticated workflows persisted to Supabase

## Layers

**Presentation (Frontend):**
- Purpose: Visual workflow editor, estimation results display, user authentication UI
- Location: `frontend/src/app`, `frontend/src/components`
- Contains: Next.js pages, React components, modals, sidebars, canvas visualizations
- Depends on: Zustand stores, React Flow library, Supabase client, backend API
- Used by: End users (browser)

**State Management (Frontend):**
- Purpose: Single source of truth for workflow state, estimation results, UI flags, authentication
- Location: `frontend/src/store/`
- Contains: Zustand stores (`useWorkflowStore`, `useAuthStore`, `useProfileStore`)
- Depends on: Supabase, localStorage APIs
- Used by: All React components; hooks for fine-grained subscriptions

**API Layer (Frontend):**
- Purpose: Fetch calls to backend endpoints for estimation, model registry, tool registry, imports
- Location: Scattered in components (`EstimatePanel.tsx`, `HeaderBar.tsx`, `Sidebar.tsx`) and hooks
- Contains: Direct `fetch()` calls to `/api/estimate`, `/api/providers`, `/api/tools`, `/api/import-workflow`
- Depends on: Backend API endpoints
- Used by: Components that need fresh data (estimation, provider/tool dropdowns)

**Application (Backend):**
- Purpose: FastAPI REST API serving estimation logic, registries, and workflow imports
- Location: `backend/main.py`
- Contains: Route handlers for `/api/estimate`, `/api/providers`, `/api/tools`, `/api/import-workflow`, `/api/estimate/batch`
- Depends on: Estimator, graph analyzer, registries, import adapters
- Used by: Frontend via HTTP

**Estimation Engine (Backend):**
- Purpose: Core calculation logic for workflow token/cost/latency estimation
- Location: `backend/estimator.py`
- Contains: `estimate_workflow()` function, token counting (tiktoken), cost calculation per node, tool impact computation
- Depends on: Pricing registry, tool registry, graph analyzer, Pydantic models
- Used by: Main API layer for `/api/estimate` and `/api/estimate/batch`

**Graph Analysis (Backend):**
- Purpose: Detect cycles, find strongly connected components (SCCs), compute critical paths
- Location: `backend/graph_analyzer.py`
- Contains: `GraphAnalyzer` class using Tarjan's SCC algorithm, topological sort, back-edge identification
- Depends on: Pydantic models for edge configuration
- Used by: Estimator for cycle detection and iteration count heuristics

**Data Registries (Backend):**
- Purpose: In-memory lookup for model pricing and tool definitions
- Location: `backend/pricing_registry.py`, `backend/tool_registry.py`, backed by `backend/data/`
- Contains: `PricingRegistry` and tool registry classes; loaded from JSON at startup
- Depends on: JSON data files (`model_pricing.json`, `tool_definitions.json`)
- Used by: Estimator for cost calculations and tool impact estimation

**Import Adapters (Backend):**
- Purpose: Convert external workflow formats (generic, LangGraph, custom) to internal NodeConfig/EdgeConfig
- Location: `backend/import_adapters.py`
- Contains: `import_generic()`, `import_langgraph()`, `import_custom()` functions, adapter registry
- Depends on: Pydantic models
- Used by: Main API layer for `/api/import-workflow`

**Persistence (Frontend):**
- Purpose: Save/load workflows from Supabase (authenticated) or localStorage (guest)
- Location: `frontend/src/lib/` (`supabase.ts`, `marketplacePersistence.ts`, `profilePersistence.ts`, `guestWorkflow.ts`)
- Contains: Supabase client initialization, CRUD operations for workflows/canvases, guest workflow serialization
- Depends on: Supabase JS client, localStorage API
- Used by: Zustand stores during load/save operations

## Data Flow

**Workflow Estimation Flow:**

1. **User creates/modifies workflow** on canvas (`Canvas.tsx`)
   - Nodes and edges stored in Zustand (`useWorkflowStore`)
   - Real-time state updates trigger component subscriptions

2. **User requests estimation** (click "Estimate" in header or panel)
   - Frontend converts React Flow nodes/edges to `NodeConfigPayload[]` and `EdgeConfigPayload[]`
   - Applies scaling parameters (runs_per_day, loop_intensity)
   - POST to `/api/estimate` with request body

3. **Backend receives estimation request** (`main.py` → `estimate()` handler)
   - Validates request via Pydantic
   - Calls `estimate_workflow(nodes, edges, recursion_limit, runs_per_day, loop_intensity)`

4. **Graph analysis phase** (`estimator.py` calls `GraphAnalyzer`)
   - `GraphAnalyzer` detects cycles using Tarjan's SCC
   - Identifies back-edges and strongly connected components
   - Classifies graph as DAG or CYCLIC

5. **Per-node estimation phase** (`estimator.py`)
   - For each node, fetch model details from `PricingRegistry` if agent/tool
   - Count input/output tokens using tiktoken
   - Calculate cost: (input_tokens * input_price) + (output_tokens * output_price)
   - Lookup tool latency from `ToolRegistry` if agent connected to tools
   - Accumulate tool schema tokens and response tokens into agent's input

6. **Cycle iteration estimation** (if CYCLIC)
   - For each SCC: calculate cost per single lap
   - Estimate iteration count (min=1, avg=ceil(max/2), max=recursion_limit)
   - Multiply lap cost by iteration count (min/avg/max ranges)

7. **Critical path computation**
   - Find longest latency path through DAG portion
   - Add cycle latency contributions

8. **Scaling projection** (if runs_per_day provided)
   - `monthly_cost = total_cost * (runs_per_day * 30)`
   - `monthly_tokens = total_tokens * (runs_per_day * 30)`

9. **Health scoring** (opinionated summary)
   - Assign grade (A–F) based on cost efficiency, loop heaviness, bottleneck severity

10. **Return `WorkflowEstimation`** to frontend
    - Includes breakdown (per-node), ranges, critical path, cycles, health score

11. **Frontend receives and displays**
    - `EstimatePanel.tsx` renders breakdown table, charts (bar/line/pie)
    - Color-codes by node type and bottleneck severity

**Workflow Import Flow:**

1. User opens "Import" modal, selects format (generic/LangGraph), pastes JSON
2. Frontend POST to `/api/import-workflow` with `source` and `payload`
3. Backend looks up adapter from `import_adapters.py`
4. Adapter parses external format → normalizes to NodeConfig/EdgeConfig
5. Returns `ImportedWorkflow` with normalized nodes/edges + metadata
6. Frontend loads workflow on canvas, marks `needsLayout = true`
7. `useAutoLayout` hook applies dagre layout before rendering

**Workflow Persistence Flow (Authenticated):**

1. User authenticates via Supabase OAuth
2. `useAuthStore.init()` initializes auth listener
3. On save: `useWorkflowStore.saveWorkflowToSupabase()` sends workflow JSON to Supabase DB
4. On load: `useWorkflowStore.loadWorkflowsFromSupabase()` fetches all scenarios for canvas
5. Workflows stored with metadata: `id`, `name`, `nodes`, `edges`, `canvasId`, `userId`, `updatedAt`

## Key Abstractions

**WorkflowEstimation:**
- Purpose: Complete estimation breakdown for a single workflow
- Examples: `frontend/src/types/workflow.ts`, `backend/models.py` → `WorkflowEstimation`
- Pattern: Pydantic model with nested `NodeEstimation[]`, `CycleInfo[]`, ranges, health score

**NodeEstimation:**
- Purpose: Per-node cost/latency/token breakdown with tool impacts
- Examples: `backend/models.py`
- Pattern: Includes `tool_impacts` field linking to connected tools, `cost_share`/`latency_share` for bottleneck analysis

**WorkflowNodeData:**
- Purpose: Data payload attached to React Flow nodes
- Examples: `frontend/src/types/workflow.ts`
- Pattern: Supports node-type-specific fields (modelProvider, toolId, blankBoxStyle, etc.)

**CycleInfo:**
- Purpose: Metadata about detected strongly connected components with risk assessment
- Examples: `backend/models.py`
- Pattern: Contains `node_ids`, `back_edges`, `max_iterations`, `expected_iterations`, cost/latency per lap, risk level

**GraphAnalyzer:**
- Purpose: Stateless graph utilities for cycle detection and path analysis
- Examples: `backend/graph_analyzer.py`
- Pattern: Tarjan's SCC algorithm, kahn topological sort, back-edge identification

## Entry Points

**Backend:**
- Location: `backend/main.py` (if __name__ == "__main__")
- Triggers: `python main.py` or Docker container startup
- Responsibilities: FastAPI app initialization, CORS middleware, route registration

**Frontend:**
- Location: `frontend/src/app/layout.tsx` → `frontend/src/app/page.tsx` (landing) or `frontend/src/app/editor/[canvasId]/page.tsx` (editor)
- Triggers: Browser navigation to `/`, `/editor/guest`, `/editor/[canvasId]`
- Responsibilities: Auth verification, workflow loading, canvas initialization, hook setup

**Editor Page:**
- Location: `frontend/src/app/editor/[canvasId]/page.tsx` (exports `EditorContent`)
- Triggers: Navigation to editor route
- Responsibilities: Load workflows from Supabase or localStorage, initialize Canvas and peripheral components, set up auto-save hook

## Error Handling

**Strategy:** Client-side UI reporting with server-side JSON error responses.

**Patterns:**

- **Backend API errors**: Return HTTPException with status codes
  - 404 Not Found: Model/tool not in registry
  - 422 Unprocessable Entity: Import adapter fails to parse
  - 400 Bad Request: Workflow validation failure
  - Example: `backend/main.py` → `get_model()` endpoint

- **Frontend API errors**: Catch fetch errors, set error banner in Zustand
  - Example: `EstimatePanel.tsx` → catch in estimation fetch, call `setErrorBanner(err.message)`
  - User sees toast/banner notification

- **Validation errors**: Pydantic validates at API boundary
  - NodeConfig, EdgeConfig, WorkflowRequest validated on entry
  - Invalid fields rejected before estimation begins

- **Graph anomalies**: Estimator handles gracefully
  - Orphaned nodes (no edges): Estimated as single-pass
  - Empty workflows: Return valid but zero-cost estimation
  - Self-loops: Detected as cycle, iteration count capped at recursion_limit

## Cross-Cutting Concerns

**Logging:**
- Backend uses Python print/logging (not configured)
- Frontend uses `console.log/error` in components and stores
- No structured logging pipeline

**Validation:**
- Pydantic schemas at API boundary (backend)
- React Hook Form with Zod in config modals (frontend) — if used, otherwise manual
- Type safety via TypeScript on frontend

**Authentication:**
- Supabase Auth (OAuth providers)
- Auth state in `useAuthStore` (Zustand)
- Protected pages check `user` before rendering
- Example: `ProfileOnboardingGate.tsx` blocks unauthenticated users

**Authorization:**
- User can only view/edit own workflows (Supabase RLS if enabled)
- Public share workflows via token-based share links
- No role-based access control (RBAC)

**Styling:**
- Tailwind CSS (frontend)
- Radix UI components + custom components
- Dynamic color palettes for charts and nodes

---

*Architecture analysis: 2026-03-04*
