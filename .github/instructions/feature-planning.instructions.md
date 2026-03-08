---
applyTo: "Context/features/**,.ai/context/features/**"
---

# Feature Planning Workflow

## Before writing anything, read these files in order:
1. `Context/CONTEXT.md` -- big picture and product goals
2. `Context/FEATURE_ROADMAP.md` -- existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` -- frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` -- backend architecture and API patterns
5. `Context/memory/MEMORY.md` -- any relevant past decisions
6. `Context/memory/AGENT_MEMORY.md` -- lessons learned
7. `.cursor/rules/min-lovable-product.mdc` -- MLP philosophy

## Product philosophy: Minimum Lovable Product

Every feature spec should be evaluated against the MLP hierarchy:
- **Functional** -- Does it work? What breaks if it doesn't?
- **Reliable** -- Is it dependable? Error states, loading states, edge cases?
- **Usable** -- Is it intuitive? Can a first-time user figure it out?
- **Lovable** -- Does it delight? What creates a "this is actually nice" moment?

Don't stop at usable. Aim for lovable.

## Research (when creating a new spec)

Before writing the spec, research UX patterns and competitor approaches for this feature type:
1. Search for UX best practices relevant to the feature domain
2. Look at how similar products implement the same feature
3. Identify common pitfalls to avoid
4. Paste findings into the **Research Findings** section of the spec

For quick/small features, skip research and omit the Research Findings and MLP Evaluation sections.

## Output: create a feature file at `Context/features/[kebab-case-name].md`

The file must contain these sections:

### Always include:
- **Summary** -- 2-3 sentence plain description
- **UX Specifications** -- user flow, interaction details, transitions, loading/error/empty/success states, visual specs
- **Architecture & Internal Research** -- existing patterns to follow, architecture constraints (store slice, React Flow, Supabase, API)
- **Frontend Tasks** -- checkboxes per file, with exact field/function names
- **Backend Tasks** -- checkboxes per file, with exact endpoint and Pydantic model names
- **Database Tasks** -- if applicable (table creation, RLS policy)
- **Files to Touch** -- markdown table with File | Change
- **Do NOT Touch** -- files explicitly excluded
- **Acceptance Criteria** -- testable checkboxes (frontend, backend, and MLP criteria)
- **Agent Prompt** -- copy-paste delegation block

### Full research mode only:
- **Research Findings** -- UX patterns with sources, competitor approaches, key takeaways
- **MLP Evaluation** -- hierarchy analysis, lovemark moments table (Moment | Trigger | Delight Pattern | Effort), what not to gold-plate
- **Research References** -- URLs with notes

### GSD Phase Mapping (recommended):
- **GSD Phase Mapping** -- structure implementation into 2-4 phases with Goals, Plans, Tasks, Files, Verification
- Include execution commands: `/gsd:plan-phase N`, `/gsd:execute-phase N`

## Naming and delegation rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only -- no backend code
- Backend tasks: FastAPI/Pydantic/Python only -- no frontend code
- If feature is frontend-only: omit Backend Tasks and Database Tasks
- If feature is backend-only: omit Frontend Tasks
- Always end with a copy-paste **Agent Prompt** block

## After creating the feature file:
1. Append a one-line entry to `Context/FEATURE_ROADMAP.md`:
   `- [ ] [Feature Name] -- Context/features/[filename].md`
2. Append to `Context/memory/logs_agent/YYYY-MM-DD.md` with agent, scope, research mode, and GSD phase count
