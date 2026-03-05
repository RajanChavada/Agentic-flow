# Codebase Structure

**Analysis Date:** 2026-03-04

## Directory Layout

```
Agentic-flow/
├── backend/                           # FastAPI Python backend
│   ├── main.py                        # FastAPI app definition, route handlers
│   ├── models.py                      # Pydantic schemas (requests, responses, data models)
│   ├── estimator.py                   # Core estimation logic (token, cost, latency)
│   ├── graph_analyzer.py              # Graph utilities (cycle detection, topological sort)
│   ├── pricing_registry.py            # Model pricing registry (reads from JSON)
│   ├── tool_registry.py               # Tool definitions registry
│   ├── import_adapters.py             # Workflow import converters (generic, LangGraph, custom)
│   ├── config.py                      # Environment variables and constants
│   ├── requirements.txt                # Python dependencies
│   ├── Dockerfile                     # Container configuration
│   ├── data/
│   │   ├── model_pricing.json         # Model pricing data (providers, models, costs)
│   │   └── tool_definitions.json      # Tool metadata (schema tokens, latency)
│   └── .venv/                         # Virtual environment (not committed)
│
├── frontend/                          # Next.js TypeScript frontend
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root layout (fonts, metadata)
│   │   │   ├── page.tsx               # Landing page (/)
│   │   │   ├── auth/
│   │   │   │   └── callback/
│   │   │   │       └── route.ts       # OAuth callback endpoint
│   │   │   ├── editor/
│   │   │   │   ├── page.tsx           # Explorer/selector page
│   │   │   │   └── [canvasId]/
│   │   │   │       └── page.tsx       # Main editor canvas (guest or authenticated)
│   │   │   ├── canvases/
│   │   │   │   └── page.tsx           # List of user's canvases
│   │   │   ├── marketplace/
│   │   │   │   └── page.tsx           # Template/workflow marketplace
│   │   │   ├── settings/
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx       # User profile settings
│   │   │   ├── share/
│   │   │   │   └── [token]/
│   │   │   │       └── page.tsx       # Public shared workflow view
│   │   │   └── globals.css            # Global styles
│   │   │
│   │   ├── components/                # React components
│   │   │   ├── Canvas.tsx             # React Flow wrapper (nodes, edges, controls)
│   │   │   ├── EstimatePanel.tsx      # Estimation results display (charts, breakdown)
│   │   │   ├── HeaderBar.tsx          # Top navigation (title, buttons, export)
│   │   │   ├── Sidebar.tsx            # Left sidebar (scenario list, comparison)
│   │   │   ├── NodeConfigModal.tsx    # Node config dialog (model/tool selection)
│   │   │   ├── AuthModal.tsx          # Login/signup modal
│   │   │   ├── nodes/
│   │   │   │   ├── WorkflowNode.tsx   # Generic agent/tool/start/finish node component
│   │   │   │   ├── BlankBoxNode.tsx   # Annotation box node (styling options)
│   │   │   │   └── TextNode.tsx       # Annotation text node
│   │   │   ├── edges/
│   │   │   │   └── AnnotationEdge.tsx # Custom edge renderer
│   │   │   ├── landing/               # Landing page sections
│   │   │   │   ├── HowItWorks.tsx
│   │   │   │   ├── ProblemSolution.tsx
│   │   │   │   ├── PlaygroundPreview.tsx
│   │   │   │   └── ScrollJourney.tsx
│   │   │   ├── ui/                    # Primitive UI components (Radix + custom)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── ...
│   │   │   ├── demo/                  # Demo/preview components
│   │   │   ├── marketplace/           # Marketplace UI
│   │   │   ├── profile/               # Profile settings UI
│   │   │   │
│   │   │   ├── ComparisonDrawer.tsx   # Side drawer for scenario comparison
│   │   │   ├── NameWorkflowModal.tsx  # Save workflow dialog
│   │   │   ├── ShareWorkflowModal.tsx # Generate share link
│   │   │   ├── ImportWorkflowModal.tsx# Import from external format
│   │   │   ├── ExportDropdown.tsx     # Export options (PDF, PNG, JSON)
│   │   │   ├── Sidebar.tsx
│   │   │   └── ... (other modals, components)
│   │   │
│   │   ├── store/                     # Zustand state management
│   │   │   ├── useWorkflowStore.ts    # Main workflow state (nodes, edges, estimation, scenarios)
│   │   │   ├── useAuthStore.ts        # Authentication state
│   │   │   └── useProfileStore.ts     # User profile state
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAutoLayout.ts       # Apply dagre layout algorithm
│   │   │   └── useAutoSave.ts         # Debounced auto-save to storage
│   │   │
│   │   ├── lib/                       # Utilities and library functions
│   │   │   ├── supabase.ts            # Supabase client initialization
│   │   │   ├── supabase/
│   │   │   │   └── (server queries if any)
│   │   │   ├── guestWorkflow.ts       # localStorage serialization for guest workflows
│   │   │   ├── marketplacePersistence.ts # Marketplace template loading/saving
│   │   │   ├── profilePersistence.ts  # User profile CRUD via Supabase
│   │   │   ├── shareWorkflows.ts      # Public share link generation/validation
│   │   │   ├── userMetrics.ts         # User analytics/metrics fetching
│   │   │   └── utils.ts               # General utility functions
│   │   │
│   │   ├── types/                     # TypeScript type definitions
│   │   │   ├── workflow.ts            # Workflow, node, estimation types
│   │   │   └── profile.ts             # User profile types
│   │   │
│   │   └── middleware.ts              # Next.js middleware (if auth checks)
│   │
│   ├── public/                        # Static assets
│   ├── scripts/
│   │   ├── clear-supabase-data.mjs    # Dev utility: clear DB
│   │   └── delete-all-users.mjs       # Dev utility: delete users
│   ├── package.json                   # Node.js dependencies
│   ├── next.config.ts                 # Next.js configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── tailwind.config.ts             # Tailwind CSS configuration
│   └── .eslintrc.json                 # ESLint configuration
│
├── supabase/                          # Supabase configuration
│   └── (migrations, SQL schema defs)
│
├── .claude/                           # GSD (Get Shit Done) system
│   └── (agent definitions, workflows, templates)
│
├── Context/                           # Context/memory for agents
│   ├── features/                      # Feature definitions
│   ├── memory/                        # Agent memory logs
│   └── testing/                       # Test scenarios
│
├── .planning/                         # This codebase analysis
│   └── codebase/
│       ├── ARCHITECTURE.md
│       ├── STRUCTURE.md
│       └── (others: STACK.md, CONVENTIONS.md, TESTING.md, CONCERNS.md)
│
├── README.md                          # Project overview
├── CLAUDE.md                          # Claude-specific instructions
└── LICENSE
```

## Directory Purposes

**Backend (`backend/`):**
- Purpose: FastAPI service providing estimation, registry lookups, and workflow imports
- Contains: Python modules for computation, data models, registries
- Key files: `main.py` (entry point), `estimator.py` (core logic), `models.py` (schemas)
- External data: `data/model_pricing.json`, `data/tool_definitions.json`

**Frontend (`frontend/src/`):**
- Purpose: Next.js React application for visual workflow editor and UI
- Contains: Page routes, React components, state management, utilities
- Key files: `app/editor/[canvasId]/page.tsx` (main editor), `components/Canvas.tsx` (React Flow), `store/useWorkflowStore.ts` (state)

**App Routes (`frontend/src/app/`):**
- Purpose: Define URL paths and page components
- Patterns: File-based routing; `page.tsx` = route component, `route.ts` = API route (OAuth callback)
- Guest mode: `/editor/guest`; authenticated: `/editor/[canvasId]`; public share: `/share/[token]`

**Components (`frontend/src/components/`):**
- Purpose: Reusable React components for UI
- Organization: By feature (nodes, edges, landing, marketplace, profile, ui) + modals (NodeConfigModal, AuthModal, etc.)
- Node types: WorkflowNode (main), BlankBoxNode (annotation), TextNode (label)
- Edge types: AnnotationEdge (custom)

**Store (`frontend/src/store/`):**
- Purpose: Zustand stores for centralized state
- Slices in `useWorkflowStore`: nodes, edges, estimation, scenarios, UI flags, scaling parameters
- Selector hooks exported for fine-grained subscriptions (e.g., `useEstimation()`)

**Hooks (`frontend/src/hooks/`):**
- Purpose: Reusable React hooks
- `useAutoLayout`: Applies dagre layout when nodes need layout (import/template)
- `useAutoSave`: Debounced auto-save to localStorage or Supabase

**Lib (`frontend/src/lib/`):**
- Purpose: Utility functions and client initialization
- Supabase client: `supabase.ts`, `supabase/*` (server-side queries)
- Persistence: `guestWorkflow.ts` (localStorage), `marketplacePersistence.ts`, `profilePersistence.ts`, `shareWorkflows.ts`
- Metrics: `userMetrics.ts` (analytics)

**Types (`frontend/src/types/`):**
- Purpose: Shared TypeScript interfaces
- `workflow.ts`: WorkflowNodeType, WorkflowEstimation, NodeEstimation, etc.
- `profile.ts`: User profile types

## Key File Locations

**Entry Points:**

- **Backend**: `backend/main.py`
  - FastAPI app initialization
  - Route definitions for `/api/estimate`, `/api/providers`, `/api/tools`, etc.
  - CORS middleware setup

- **Frontend (Landing)**: `frontend/src/app/page.tsx`
  - Hero section, features, CTA buttons
  - Links to `/editor/guest` and `/auth`

- **Frontend (Editor)**: `frontend/src/app/editor/[canvasId]/page.tsx`
  - Exports `EditorContent` component
  - Wraps Canvas + Sidebar + EstimatePanel + modals
  - Initializes auth and workflow loading

**Configuration:**

- **Backend**: `backend/config.py`
  - HOST, PORT, FRONTEND_ORIGINS (for CORS)
  - Environment variable loading

- **Frontend**: `frontend/next.config.ts`
  - Next.js compiler settings
  - Experimental React 19 compiler

- **Frontend Build**: `frontend/tailwind.config.ts`, `frontend/tsconfig.json`

**Core Logic:**

- **Estimation**: `backend/estimator.py`
  - `estimate_workflow()` function (main entry point)
  - Per-node cost/token/latency calculation
  - Tool impact computation
  - Cycle-aware estimation

- **Graph Analysis**: `backend/graph_analyzer.py`
  - `GraphAnalyzer` class
  - Tarjan's SCC for cycle detection
  - Topological sort for DAG analysis

- **Registries**: `backend/pricing_registry.py`, `backend/tool_registry.py`
  - Load JSON data at startup
  - Provide lookup methods for estimator

- **Workflow State**: `frontend/src/store/useWorkflowStore.ts`
  - Zustand store with all workflow data
  - Selector hooks for component subscriptions
  - Save/load methods for Supabase and localStorage

**Visualization:**

- **Canvas**: `frontend/src/components/Canvas.tsx`
  - React Flow setup (nodes, edges, controls, minimap)
  - Registered node/edge types
  - Connection/change handlers

- **Estimation Display**: `frontend/src/components/EstimatePanel.tsx`
  - Charts (bar, line, pie) for cost/tokens/latency
  - Per-node breakdown table
  - Cycle info, health score display

**Testing:**

- **Test scripts** (dev utilities): `frontend/scripts/clear-supabase-data.mjs`, `frontend/scripts/delete-all-users.mjs`
- No unit tests in project structure; testing via integration testing in `Context/testing/`

## Naming Conventions

**Files:**

- **Pages** (route handlers): `page.tsx`, `route.ts` (Next.js)
- **Components**: `CamelCase.tsx` (e.g., `NodeConfigModal.tsx`, `Canvas.tsx`)
- **Hooks**: `use[Name].ts` (e.g., `useAutoLayout.ts`, `useAutoSave.ts`)
- **Stores**: `use[Name]Store.ts` (e.g., `useWorkflowStore.ts`)
- **Utils/Lib**: `camelCase.ts` (e.g., `guestWorkflow.ts`, `supabase.ts`)
- **Types**: `camelCase.ts` (e.g., `workflow.ts`, `profile.ts`)
- **Backend**: `snake_case.py` (e.g., `import_adapters.py`, `pricing_registry.py`)
- **Backend JSON data**: `snake_case.json` (e.g., `model_pricing.json`)

**Directories:**

- **Feature-based** in components: `nodes/`, `edges/`, `landing/`, `marketplace/`, `profile/`, `ui/`, `demo/`
- **Type-based** (backend): `data/` for JSON
- **Purpose-based** (frontend): `store/`, `hooks/`, `lib/`, `types/`

## Where to Add New Code

**New Feature (e.g., new estimation parameter):**
- **Backend computation**: Add field to `NodeConfig` in `backend/models.py`; update estimation logic in `backend/estimator.py`
- **Frontend UI**: Add UI field to `NodeConfigModal.tsx`; add to `WorkflowNodeData` in `frontend/src/types/workflow.ts`
- **Store integration**: Update Zustand store in `frontend/src/store/useWorkflowStore.ts` to track new parameter
- **API communication**: Frontend component sends parameter in fetch request to `/api/estimate`

**New Node Type:**
- **Backend**: Add type to `NodeConfig.type` literal in `backend/models.py`
- **Frontend component**: Create `New[Type]Node.tsx` in `frontend/src/components/nodes/`
- **Canvas registration**: Register in `nodeTypes` object in `frontend/src/components/Canvas.tsx`
- **Estimates**: Add handling in `EstimatePanel.tsx` UI rendering

**New External API Integration (e.g., new pricing provider):**
- **Data**: Add provider to `backend/data/model_pricing.json`
- **Frontend dropdown**: Automatically available in model selector (pulls from `/api/providers`)
- **No backend code needed** unless custom pricing logic

**New Tool Type:**
- **Data**: Add to `backend/data/tool_definitions.json`
- **Backend registry**: Automatically loaded by `ToolRegistry`
- **Frontend dropdown**: Automatically available in tool selector (pulls from `/api/tools/categories/detailed`)

**Utilities:**
- **Shared helpers**: `frontend/src/lib/utils.ts` (currently minimal; add general-purpose utilities here)
- **Supabase queries**: New files in `frontend/src/lib/supabase/` if adding server-side logic

**Test Scenarios:**
- Location: `Context/testing/` (agent testing framework, not unit tests)

## Special Directories

**Backend Data (`backend/data/`):**
- Purpose: JSON registry files for pricing and tools
- Generated: No (manually maintained)
- Committed: Yes (source of truth)
- Format: Pydantic-validated JSON (see schemas in `backend/models.py`)

**Supabase (`supabase/`):**
- Purpose: Database schema, migrations, edge functions
- Generated: Partially (migrations auto-generated by Supabase CLI)
- Committed: Yes (schema versioning)

**Context (`Context/`):**
- Purpose: Context and memory for GSD agents
- Generated: Yes (logs, memories auto-generated)
- Committed: Some (features committed; logs typically not)

**.claude/ (GSD System):**
- Purpose: Agent definitions, workflow templates, skill libraries
- Generated: Mostly committed (system definition)
- Location of agent tasks/workflows: `.claude/commands/gsd/`

**.planning/codebase/ (Analysis Documents):**
- Purpose: Architecture, structure, conventions, testing, concerns analysis
- Generated: Yes (by GSD map-codebase agent)
- Committed: Yes (used by planner/executor agents)

---

*Structure analysis: 2026-03-04*
