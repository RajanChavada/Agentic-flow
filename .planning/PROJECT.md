# Neurovn — Workflow Control & Analysis Milestone

## What This Is

Neurovn is a canvas-based AI workflow designer (Next.js + FastAPI) that lets users visually build, estimate, and analyze agent workflows. This milestone evolves the canvas from a static flowchart into a control system — adding conditional branching, success criteria definition, and real-time graph analysis so users can reason about cost, risk, and reachability before execution.

## Core Value

Users can define what "done" looks like for a workflow and see, before any execution, whether their graph can reach that goal, how much it will cost across different branches, and where the risk surfaces are.

## Requirements

### Validated

<!-- Existing capabilities confirmed working in current codebase -->

- ✓ Visual workflow editor with drag-and-drop nodes (Start, Agent, Tool, Finish) — existing
- ✓ Token/cost/latency estimation via backend API — existing
- ✓ Cycle detection using Tarjan SCC and iteration-aware estimation — existing
- ✓ Model pricing registry and tool registry (JSON-backed) — existing
- ✓ Workflow persistence (Supabase for auth users, localStorage for guests) — existing
- ✓ Workflow import from external formats (LangGraph, generic) — existing
- ✓ Scenario comparison and estimation panel with charts — existing

### Active

<!-- This milestone's scope -->

- [ ] Condition Node — binary branch (if/else) with real condition expression and probability slider for simulation
- [ ] Ideal State Node — one per canvas; NL-to-schema for success definition; captures required fields, type constraints, performance bounds
- [ ] Canvas metadata overlay — real-time corner overlay showing node count, depth, loops, risk surface, risk score
- [ ] Graph reachability analysis — static path check from Start to Ideal State
- [ ] Probability-weighted estimation — condition branch probabilities feed into token/cost/latency ranges
- [ ] NL-to-schema generation — LLM-powered endpoint to convert natural language success description to JSON schema
- [ ] Risk scoring algorithm — roll up tool tiers, loop depth, graph complexity into low/medium/high score

### Out of Scope

- Runtime execution of workflows — this milestone is pre-run analysis only
- Schema coverage analysis (checking if agents/tools can produce required schema fields) — future phase
- Multi-condition routing (3+ branches) — Condition Node is binary (if/else) only for now
- Ideal State comparison across runs (post-run delta measurement) — future milestone
- Real-time collaboration on canvas — not in scope

## Context

**Existing codebase:** Monorepo with Next.js 16 (App Router, React 19, Zustand, React Flow, Tailwind v4) frontend and FastAPI (Pydantic v2, tiktoken) backend. GraphAnalyzer already implements Tarjan SCC, topological sort, and back-edge identification. Estimator handles per-node cost calculation with cycle-aware iteration multipliers.

**Node types today:** `startNode | agentNode | toolNode | finishNode | blankBoxNode | textNode`. This milestone adds `conditionNode` and `idealStateNode`.

**Canvas metadata:** No real-time graph analysis currently exists on the frontend. All analysis happens in the backend during estimation. The metadata overlay will be a new frontend-only computation layer.

**Estimation integration:** The existing `/api/estimate` endpoint processes all nodes linearly or with cycle multipliers. Condition nodes require probability-weighted branching in the estimator — each branch path gets weighted by the slider probability.

**LLM integration:** No existing LLM API integration in the backend. A new endpoint for NL-to-schema generation will require an API key configuration (backend-managed).

## Constraints

- **Tech stack**: Must use existing stack — React Flow for canvas, Zustand for state, FastAPI for backend
- **Node pattern**: New nodes must follow existing pattern — `"use client"` + `"use no memo"`, unique handle IDs, registered in `nodeTypes` map
- **Styling**: Tailwind v4 syntax, Lucide icons, no emojis in UI
- **Data**: Pricing and tool data stay in JSON files under `backend/data/`
- **Dark mode**: `.dark` class on `<html>`, not `prefers-color-scheme`
- **Performance**: Canvas metadata overlay must not cause jank — compute on graph change, not every render

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Condition Node has real expression + probability slider | User needs both actual branching logic and simulation probabilities | — Pending |
| True/False output handles on Condition Node | Clearest visual pattern for binary branching | — Pending |
| Ideal State uses NL-to-schema (LLM-powered) | Better UX than manual JSON schema authoring | — Pending |
| Canvas metadata computes frontend-only | Real-time updates as user edits, no API round-trip | — Pending |
| Reachability is graph path check only (v1) | Schema coverage analysis deferred to avoid complexity | — Pending |
| LLM calls use backend API key | Simpler than per-user key management for v1 | — Pending |
| All 4 features in single milestone | Tightly coupled — condition branching affects estimation, ideal state affects reachability, metadata aggregates all | — Pending |

---
*Last updated: 2026-03-04 after initialization*
