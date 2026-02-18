# Agentic Flow Designer

A visual canvas for designing, connecting, and cost‑estimating agentic (LLM) workflows — inspired by Lucidchart / Figma.

## Repository layout

```
.
├── Context/               # Project plans & agent memory docs
│   ├── CONTEXT.md         # High‑level project description
│   ├── FRONTEND_PLAN.MD   # Frontend architecture spec
│   ├── BACKEND_PLAN.md    # Backend architecture spec
│   └── AGENT_MEMORY.md    # Shared agent memory log
├── frontend/              # Next.js (App Router) + React Flow + Zustand
│   └── src/
│       ├── app/           # Next.js pages & layout
│       ├── components/    # Sidebar, Canvas, HeaderBar, EstimatePanel, modals
│       ├── store/         # Zustand workflow store
│       └── types/         # Shared TypeScript types
├── backend/               # FastAPI estimation API
│   ├── main.py            # App entrypoint & routes
│   ├── models.py          # Pydantic request/response schemas
│   ├── estimator.py       # Token/cost/latency estimation
│   ├── graph_analyzer.py  # DAG vs cyclic detection, topological sort
│   ├── pricing_data.py    # Static model pricing table
│   └── config.py          # Environment config
└── .github/
    └── copilot-instructions.md  # AI agent coding conventions
```

## Quick start

### Backend (Python 3.11+)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py                  # → http://localhost:8000
```

### Frontend (Node 18+)

```bash
cd frontend
npm install
npm run dev                     # → http://localhost:3000
```

The frontend expects the backend at `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL` in `frontend/.env.local`).

## Key features (MVP)

- Drag‑and‑drop **Start / Agent / Tool / Finish** nodes onto a React Flow canvas
- Connect nodes with edges to define workflow data flow
- Configure agent nodes with a model provider, model, and context
- **"Get Estimate"** sends the graph to the FastAPI backend and renders token, cost, and latency breakdowns
- Graph classified as **DAG** or **CYCLIC** with critical‑path analysis