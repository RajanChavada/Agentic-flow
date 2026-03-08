---
name: feature-planner
description: Use when asked to roadmap, plan, design, spec, or architect any new feature. Includes MLP (Minimum Lovable Product) evaluation, external research via Exa, competitor analysis, UX pattern discovery, gamification opportunities, and GSD-ready phase mapping. Replaces the older feature-roadmap rule. Trigger keywords -- feature, roadmap, plan, design, spec, lovable, MLP, gamify, delight, UX.
---

# Feature Planner

Research-backed feature planning with MLP evaluation, competitor analysis, UX pattern discovery, and GSD-ready phase mapping.

**Modes:**
- **Full mode** (default) -- external research, MLP evaluation, user review loop
- **Quick mode** (say "quick mode" or "skip research") -- skip research for small/obvious features
- **No GSD** (say "no GSD" or "skip phases") -- skip GSD phase mapping

---

## Process

### Step 1 -- Read context (mandatory, never skip)

Read these files in order:
1. `Context/CONTEXT.md` -- product goals, target users
2. `Context/FEATURE_ROADMAP.md` -- existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` -- frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` -- backend architecture and API patterns
5. `Context/memory/MEMORY.md` -- architectural decisions, file map
6. `Context/memory/AGENT_MEMORY.md` -- lessons learned, past decisions
7. `.cursor/rules/min-lovable-product.mdc` -- MLP philosophy (reference only)

Check `Context/features/` for overlapping specs. If found, warn and ask whether to extend or replace.

### Step 2 -- Intake and scope clarification

Ask the user clarifying questions:
- **Scope**: frontend-only / backend-only / full-stack / database
- **Target user action**: what the user will do
- **Expected outcome**: what they should see or experience
- **Integration**: should this connect to existing features?
- **Exclusions**: files or areas off-limits
- **Priority**: ship fast (quick mode) or ship lovable (full research)
- **Inspiration**: UX references, competitor examples, design inspiration

Wait for response before proceeding.

### Step 3 -- Internal research (codebase scan)

Search the codebase for:
1. **Related patterns** -- components, hooks, store slices, API endpoints, types
2. **Architecture constraints** -- Zustand slice ownership, React Flow impact, Supabase needs, estimation pipeline
3. **Similar specs** -- read the most architecturally similar feature spec from `Context/features/`
4. **Do-not-touch detection** -- files marked fragile or recently refactored

### Step 4 -- External research (SKIP in quick mode)

Use Exa MCP (`web_search_exa`) for external research. Select 3-5 queries based on feature type. See `references/research-queries.md` for query patterns by feature category.

Run 1-2 competitor analysis queries for how similar products implement this feature.

Extract 5-10 actionable insights organized by: UX patterns, competitor approaches, pitfalls to avoid.

Fallback sources if Exa is unavailable:
- Nielsen Norman Group (nngroup.com) for UX research
- growth.design for UX case studies
- Elena Verna's writing for MLP and product-led growth

### Step 5 -- MLP evaluation (SKIP in quick mode)

Apply Elena Verna's hierarchy from `.cursor/rules/min-lovable-product.mdc`:

1. **Functional** -- What must work at minimum?
2. **Reliable** -- Error states, edge cases, loading states?
3. **Usable** -- Can a first-time user figure it out?
4. **Lovable** -- What creates a "this is actually nice" moment?

Identify 2-4 lovemark opportunities (trigger, delight pattern, effort level).
Identify gamification/engagement hooks if applicable.
Identify what NOT to gold-plate (scope boundaries).

### Step 6 -- Present findings (SKIP in quick mode)

Present a summary to the user:
- Internal findings (patterns, constraints)
- External research highlights (top 3 UX patterns, competitor approaches)
- MLP opportunities (top 3 lovemark moments)
- Proposed scope and phase count

Ask remaining questions. Wait for response.

### Step 7 -- Create feature spec file

Create `Context/features/[kebab-case-name].md` using the template in `references/spec-template.md`.

**Always include:** Summary, UX Specifications, Architecture & Internal Research, Frontend/Backend/Database Tasks, Files to Touch, Do NOT Touch, Acceptance Criteria (with MLP criteria), Agent Prompt.

**Full mode only:** Research Findings, MLP Evaluation, Research References.

Rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only
- Backend tasks: FastAPI/Pydantic/Python only
- Omit irrelevant task sections based on scope
- Always end with Agent Prompt block

### Step 8 -- GSD phase mapping (SKIP if user said "no GSD")

Append a GSD Phase Mapping section. Structure into 2-4 phases:
- Small feature: 1-2 phases
- Medium feature: 2-3 phases
- Large feature: 3-4 phases

Each phase has Goal, Depends on, Plans with Tasks/Files/Verification.

Typical full-stack structure:
- Phase N: Foundation (DB + backend)
- Phase N+1: Frontend Core (components + integration)
- Phase N+2: Polish & Delight (animations, error states, tests)

### Step 9 -- Update roadmap

Append to `Context/FEATURE_ROADMAP.md`:
```
- [ ] [Feature Name] -- `Context/features/[filename].md`
```

### Step 10 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Feature Spec: [name] -- [HH:MM]
**Agent:** Feature planning (enhanced)
**Created:** Context/features/[filename].md
**Scope:** [frontend-only | backend-only | full-stack]
**Research:** [full | quick (skipped)]
**MLP evaluation:** [yes | skipped]
**GSD phases:** [N phases mapped | skipped]
```

Update `Context/memory/AGENT_MEMORY.md` for non-obvious decisions.

---

## Quick Reference

| User says | Mode | Steps skipped |
|-----------|------|---------------|
| "plan a feature" | Full | None |
| "quick mode" / "skip research" | Quick | Steps 4, 5, 6; spec omits Research/MLP sections |
| "no GSD" / "skip phases" | No GSD | Step 8; spec omits GSD Phase Mapping |
| "quick mode, no GSD" | Both | Steps 4, 5, 6, 8 |
