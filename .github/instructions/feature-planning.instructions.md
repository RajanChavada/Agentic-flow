---
applyTo: "Context/features/**,.ai/context/features/**"
---

# Feature Planning Workflow

## Before writing anything, read these files in order:
1. `Context/CONTEXT.md` — big picture and product goals
2. `Context/FEATURE_ROADMAP.md` — existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` — frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` — backend architecture and API patterns
5. `Context/memory/MEMORY.md` — any relevant past decisions

## Output: create a feature file at `Context/features/[kebab-case-name].md`

The file must contain these sections:
- **Summary** — 2-3 sentence plain description
- **Frontend Tasks** — checkboxes per file, with exact field/function names
- **Backend Tasks** — checkboxes per file, with exact endpoint and Pydantic model names
- **Files to Touch** — markdown table with File | Change
- **Do NOT Touch** — files explicitly excluded
- **Acceptance Criteria** — testable checkboxes, both frontend and backend

## Naming and delegation rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only — no backend code
- Backend tasks: FastAPI/Pydantic/Python only — no frontend code
- If feature is frontend-only: omit Backend Tasks section
- If feature is backend-only: omit Frontend Tasks section
- Always end with a copy-paste **Agent Prompt** block

## After creating the feature file, append a one-line entry to `Context/FEATURE_ROADMAP.md`:
`- [ ] [Feature Name] — Context/features/[filename].md`
