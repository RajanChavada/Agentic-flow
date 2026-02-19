# Copilot Instructions — Agentic Flow Designer

## Project overview

Agentic Flow is a **monorepo** with two independent services:

| Layer | Path | Stack | Dev server |
|-------|------|-------|------------|
| Frontend | `frontend/` | Next.js 15 (App Router), React 19, TypeScript, React Flow (`@xyflow/react`), Zustand, Tailwind CSS, Recharts | `npm run dev` → `:3000` |
| Backend | `backend/` | Python 3.11+, FastAPI, Pydantic, tiktoken, Uvicorn | `python main.py` → `:8000` |

The frontend is a Lucidchart‑style canvas; the backend estimates token cost & latency for agentic workflows.

## Architecture at a glance

```
User drags nodes → Zustand store → React Flow canvas
               ↓
 "Get Estimate" → POST /api/estimate (FastAPI)
               ↓
 estimator.py  ← graph_analyzer.py + pricing_data.py
               ↓
 WorkflowEstimation JSON → EstimatePanel (Recharts)
```

## Frontend conventions

- **State lives in one Zustand store** (`src/store/useWorkflowStore.ts`). Use the exported selector hooks (`useWorkflowNodes`, `useEstimation`, etc.) — never subscribe to the whole store.
- **Custom React Flow nodes** are in `src/components/nodes/`. Each node component must be wrapped in `React.memo` and registered in the `nodeTypes` map in `Canvas.tsx`.
- Node types enum: `startNode | agentNode | toolNode | finishNode`. Colours: green / blue / orange / red respectively.
- **Drag‑and‑drop** uses HTML5 `dataTransfer` with keys `application/reactflow-type` and `application/reactflow-label`.
- Styling: Tailwind utility classes only — no CSS modules. shadcn/ui is optional but not installed yet.
- The `WorkflowNodeData` type **must** include `[key: string]: unknown` to satisfy React Flow's `Record<string, unknown>` constraint.

## Backend conventions

- **File roles** (keep the separation clean):
  - `main.py` — FastAPI app, CORS, route handlers only.
  - `models.py` — Pydantic request/response schemas.
  - `estimator.py` — token counting (`tiktoken`), cost math, latency math.
  - `graph_analyzer.py` — adjacency list, DFS cycle detection, Kahn's topological sort.
  - `pricing_data.py` — `MODEL_PRICING` dict; key format `"<Provider>_<Model>"`.
  - `config.py` — env vars via `python-dotenv`.
- **Adding a new model**: add an entry to `MODEL_PRICING` in `pricing_data.py` — the estimator picks it up automatically.
- **Adding a new endpoint**: define the Pydantic models in `models.py` first, then the route in `main.py`.

## Running & testing

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py                      # http://localhost:8000/docs for Swagger

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
```

Frontend expects backend at `http://localhost:8000` (override with `NEXT_PUBLIC_API_URL` in `frontend/.env.local`).

## Context documents

Planning docs live in `Context/` — agents should **read before starting work** and **append updates** to `Context/AGENT_MEMORY.md` after completing tasks (follow the template in that file).

| File | Purpose |
|------|---------|
| `CONTEXT.md` | High‑level project description |
| `FRONTEND_PLAN.MD` | Frontend architecture, component spec, Zustand store design |
| `BACKEND_PLAN.md` | Backend API spec, estimation logic, pricing strategy |
| `AGENT_MEMORY.md` | Shared log — agents record task description, approach, results, next steps |

## Key patterns to follow

1. **One Zustand store, selector hooks** — avoid prop‑drilling or React Context for workflow state.
2. **Memoize node components** — canvas can have 100+ nodes; unnecessary re‑renders kill perf.
3. **Backend estimation is pure computation** — no external API calls in MVP; keep response < 10 ms.
4. **Pricing key format** — `"<Provider>_<Model>"`, e.g. `"OpenAI_GPT-4o"`. Must match exactly between `pricing_data.py` and the frontend `MODELS` map in `NodeConfigModal.tsx`.
5. **Graph validation** — frontend validates Start + Finish nodes exist before calling `/api/estimate`; backend classifies DAG vs CYCLIC via DFS.
