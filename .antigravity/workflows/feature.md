---
description: Plan a new feature with MLP evaluation, external research, UX analysis, competitor comparison, and GSD-ready phase breakdown. Use when the user mentions feature, roadmap, plan, design, spec, lovable, MLP, gamify, delight, or UX. Use --quick to skip research for small features.
---

# Feature Planning Workflow

Research-backed feature planning with MLP (Minimum Lovable Product) evaluation, competitor analysis, UX pattern discovery, and GSD-ready phase mapping.

**Modes:**
- **Full mode** (default) -- external research, MLP evaluation, user review loop
- **Quick mode** (say "quick" or "--quick") -- skip research for small/obvious features
- **No GSD** (say "no GSD" or "--no-gsd") -- skip GSD phase mapping

---

## Step 1 -- Read context (mandatory, never skip)

Use `view_file` to read these files in order:
1. `Context/CONTEXT.md` -- product goals, target users
2. `Context/FEATURE_ROADMAP.md` -- existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` -- frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` -- backend architecture and API patterns
5. `Context/memory/MEMORY.md` -- architectural decisions, file map
6. `Context/memory/AGENT_MEMORY.md` -- lessons learned, past decisions

Use `find_by_name` to check `Context/features/` for any existing spec that overlaps with this feature. If found, warn the user via `notify_user` and ask whether to extend or replace.

## Step 2 -- Intake and scope clarification

Use `notify_user` to present what you understand and ask clarifying questions:

- **Scope**: frontend-only / backend-only / full-stack / database
- **Target user action**: what the user will do
- **Expected outcome**: what they should see or experience
- **Integration**: should this connect to existing features? Which ones?
- **Exclusions**: files or areas explicitly off-limits
- **Priority**: ship fast (quick) or ship lovable (full research)
- **Inspiration**: any UX references, competitor examples, or design inspiration

Wait for the user's response before proceeding.

## Step 3 -- Internal research (codebase scan)

Use `grep_search` and `find_by_name` to find:

1. **Related patterns** -- components, hooks, store slices, API endpoints, or types related to the feature domain. Search `src/components/`, `src/store/`, `src/hooks/`, `backend/`.
2. **Architecture constraints** -- determine which Zustand slice owns the state, whether React Flow nodes/edges are affected, whether Supabase tables or RLS policies are needed, whether the estimation pipeline is involved.
3. **Similar specs** -- read the most architecturally similar feature spec from `Context/features/` to learn from its structure.
4. **Do-not-touch detection** -- identify files marked as fragile, recently refactored, or stable in `MEMORY.md` or `AGENT_MEMORY.md`.

## Step 4 -- External research (SKIP if --quick)

Use `search_web` to query 3-5 sources. Select queries dynamically based on the feature type:

| Feature involves | Query focus |
|-----------------|-------------|
| Canvas / drag-drop UX | UX patterns for canvas-based tools (Figma, Lucidchart, Miro) |
| Dashboard / analytics | Dashboard design patterns, SaaS analytics UX |
| Onboarding / setup | Onboarding flow patterns, B2B SaaS, first-run experience |
| Pricing / billing | SaaS pricing page design, subscription tier UX |
| Data visualization | Interactive chart best practices, data storytelling |
| AI / LLM features | AI workflow builder UX, agent canvas design patterns |
| Collaboration | Real-time collaboration UX, multiplayer design tools |
| Export / import | File export UX, progressive disclosure patterns |
| General / MLP | Minimum lovable product examples, emotional design, delight moments |

Use `read_url_content` for deep-diving into the most relevant results.

Run 1-2 additional competitor analysis queries. Extract 5-10 actionable insights organized by: UX patterns, competitor approaches, common pitfalls.

## Step 5 -- MLP evaluation (SKIP if --quick)

Apply Elena Verna's Minimum Lovable Product hierarchy:

### Level 1 -- Functional
What must this feature DO at minimum? What would break if it doesn't work?

### Level 2 -- Reliable
What makes it dependable? Error states, edge cases, loading states, data validation?

### Level 3 -- Usable
What makes it intuitive? Can a first-time user figure it out without instructions?

### Level 4 -- Lovable
What creates a "wait, this is actually nice" moment? Where are the delight opportunities?

### Lovemark opportunities
Identify 2-4 specific moments where the feature can create emotional connection:
- What trigger causes the moment?
- What delight pattern applies? (animation, copy, celebration, easter egg, personality)
- What is the effort level? (low / medium / high)

### What NOT to gold-plate
Identify scope boundaries: polish that would delay shipping without adding lovability.

## Step 6 -- Present findings to user (SKIP if --quick)

Use `notify_user` to present a summary of all findings:

**Internal findings:**
- Existing patterns found in codebase
- Architecture constraints identified
- Similar specs for reference

**External research highlights:**
- Top 3 UX patterns (with sources)
- Competitor approaches worth considering
- Common pitfalls to avoid

**MLP opportunities:**
- Top 3 lovemark moments
- Recommended delight patterns

**Proposed scope:**
- Frontend / Backend / Database scope
- Phase count for GSD execution

Ask any remaining clarifying questions. Wait for user response.

## Step 7 -- Create feature spec file

Use `write_to_file` to create `Context/features/[kebab-case-name].md` with these sections:

### Required sections (always include):
- Summary
- UX Specifications (user flow, interaction details, visual specs)
- Architecture & Internal Research (existing patterns, constraints)
- Frontend Tasks (with file paths and checkboxes)
- Backend Tasks (with file paths and checkboxes)
- Database Tasks (if applicable)
- Files to Touch (table)
- Do NOT Touch (with reasons)
- Acceptance Criteria (frontend, backend, MLP criteria)
- Agent Prompt (implementation instructions)

### Full mode only (omit in --quick):
- Research Findings (UX patterns, competitor approaches, key takeaways)
- MLP Evaluation (functional, reliable, usable, lovable, lovemark moments)
- Research References (URLs with notes)

### Rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only -- no backend code
- Backend tasks: FastAPI/Pydantic/Python only -- no frontend code
- If feature is frontend-only: omit Backend Tasks and Database Tasks
- If feature is backend-only: omit Frontend Tasks
- Always end with an Agent Prompt block for delegation

## Step 8 -- GSD phase mapping (SKIP if --no-gsd)

Append a `## GSD Phase Mapping` section to the spec file. Structure into 2-4 phases:

- Small feature (frontend-only): 1-2 phases
- Medium feature (full-stack): 2-3 phases
- Large feature (full-stack + database + polish): 3-4 phases

Each phase: Goal, Depends on, Plans with Tasks/Files/Verification.

Typical structure:
- Phase N: Foundation (DB + backend)
- Phase N+1: Frontend Core (components + integration)
- Phase N+2: Polish & Delight (animations, error states, tests)

## Step 9 -- Update roadmap

Append a one-line entry to `Context/FEATURE_ROADMAP.md`:
```
- [ ] [Feature Name] -- `Context/features/[filename].md`
```

## Step 10 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Feature Spec: [name] -- [HH:MM]
**Agent:** Antigravity -- Feature planning
**Created:** Context/features/[filename].md
**Scope:** [frontend-only | backend-only | full-stack]
**Research:** [full | quick (skipped)]
**MLP evaluation:** [yes | skipped]
**GSD phases:** [N phases mapped | skipped]
```

If non-obvious decisions were made, append to `Context/memory/AGENT_MEMORY.md` with context, decision, and rationale.
