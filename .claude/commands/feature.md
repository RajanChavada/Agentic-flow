---
name: feature
description: Plan a new feature with MLP evaluation, external research, UX analysis, competitor comparison, and GSD-ready phase breakdown. Use --quick to skip research for small features.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
  - WebFetch
  - Task
---
<objective>
Read all product context, research UX patterns and competitor approaches, evaluate against the MLP (Minimum Lovable Product) hierarchy, then create a structured feature specification with research findings, lovemark opportunities, frontend/backend task breakdowns, acceptance criteria, and GSD-ready phase mapping.
</objective>

<context>
$ARGUMENTS

Flags:
- `--quick` -- Skip external research (Steps 4-5) and user review (Step 6). Produces a streamlined spec.
- `--no-gsd` -- Skip GSD phase mapping in the spec output.
</context>

<process>

## Step 0 -- Parse arguments

Extract the feature name/idea from `$ARGUMENTS`. Detect `--quick` and `--no-gsd` flags.

If no feature idea is provided, ask the user using AskUserQuestion:
- What feature would you like to plan? Describe it in 1-3 sentences.
- Full research mode (default) or quick mode?

## Step 1 -- Read context (mandatory, never skip)

Read these files in order:
1. `Context/CONTEXT.md` -- product goals, target users
2. `Context/FEATURE_ROADMAP.md` -- existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` -- frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` -- backend architecture and API patterns
5. `Context/memory/MEMORY.md` -- architectural decisions, file map
6. `Context/memory/AGENT_MEMORY.md` -- lessons learned, past decisions
7. `.cursor/rules/min-lovable-product.mdc` -- MLP philosophy (reference only, do not duplicate)

Check `Context/features/` for any existing spec that overlaps with this feature. If found, warn the user and ask whether to extend or replace.

## Step 2 -- Intake and scope clarification

Using AskUserQuestion, present what you understand and ask clarifying questions:

- **Scope**: frontend-only / backend-only / full-stack / database
- **Target user action**: what the user will do
- **Expected outcome**: what they should see or experience
- **Integration**: should this connect to existing features? Which ones?
- **Exclusions**: files or areas explicitly off-limits
- **Priority**: ship fast (`--quick`) or ship lovable (full research)
- **Inspiration**: any UX references, competitor examples, or design inspiration

Wait for the user's response before proceeding.

## Step 3 -- Internal research (codebase scan)

Use Glob and Grep to find:

1. **Related patterns** -- components, hooks, store slices, API endpoints, or types related to the feature domain. Search `src/components/`, `src/store/`, `src/hooks/`, `backend/`.
2. **Architecture constraints** -- determine which Zustand slice owns the state, whether React Flow nodes/edges are affected, whether Supabase tables or RLS policies are needed, whether the estimation pipeline is involved.
3. **Similar specs** -- read the most architecturally similar feature spec from `Context/features/` to learn from its structure.
4. **Do-not-touch detection** -- identify files marked as fragile, recently refactored, or stable in `MEMORY.md` or `AGENT_MEMORY.md`.

Write a brief internal research summary (hold it for now -- present in Step 6).

## Step 4 -- External research (SKIP if --quick)

Use WebFetch to query 3-5 sources. Select queries dynamically based on the feature type:

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
| Gamification | SaaS engagement loops, delight patterns, achievement systems |
| General / MLP | Minimum lovable product examples, emotional design, delight moments |

Run 1-2 additional competitor analysis queries:
- Search for how similar products (by category) implement this feature type
- Look for UX reviews or tear-downs of comparable features

Extract 5-10 actionable insights organized by category: UX patterns, competitor approaches, common pitfalls to avoid.

If WebFetch fails or returns insufficient results, fall back to known high-quality sources:
- Nielsen Norman Group (nngroup.com) for UX research
- growth.design for UX case studies
- Elena Verna's writing for MLP and product-led growth

## Step 5 -- MLP evaluation (SKIP if --quick)

Apply Elena Verna's hierarchy from `.cursor/rules/min-lovable-product.mdc`. For this feature, determine:

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

### Gamification / engagement hooks (if applicable)
- Progress indicators, celebrations, streaks, achievement unlocks, social proof

### What NOT to gold-plate
- Identify scope boundaries: polish that would delay shipping without adding lovability

## Step 6 -- Present findings to user (SKIP if --quick)

Using AskUserQuestion, present a summary of all findings:

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
- Gamification hooks (if applicable)

**Proposed scope:**
- Frontend / Backend / Database scope
- Phase count for GSD execution

Ask any remaining clarifying questions. Wait for user response before proceeding.

## Step 7 -- Create feature spec file

Create a file at `Context/features/[kebab-case-name].md` using the enhanced template below.

### Required sections (always include):

```markdown
# [Feature Name]

> **Status:** Roadmapped -- ready to implement
> **Date:** [YYYY-MM-DD]
> **Type:** [Frontend only | Backend only | Full-stack | Full-stack + Database]
> **Research mode:** [Full | Quick]

---

## Summary

[2-3 sentence plain description of what the feature does and why it matters.]

---

## UX Specifications

### User Flow
1. User [action] in [location]
2. [Component] appears showing [content]
3. User [action] -> [result]
4. System [response] with [feedback]

### Interaction Details
- **Trigger**: [how the feature is activated]
- **Transitions**: [slide, fade, expand -- with duration guidance]
- **Loading states**: [skeleton, spinner, progressive]
- **Error states**: [inline error, toast, recovery path]
- **Empty states**: [what shows when no data]
- **Success states**: [confirmation, celebration]

### Visual Specifications
- [Colors, typography, sizing, spacing notes]
- [Dark mode considerations]
- [Mobile/responsive behavior]

---

## Architecture & Internal Research

### Existing Patterns to Follow
- [Pattern] -- found in [file]

### Architecture Constraints
- **Store slice**: [which Zustand slice owns this state]
- **React Flow**: [impact on nodes/edges/handles]
- **Supabase**: [new table, RLS, or none]
- **API**: [new endpoint or extends existing]

---

## Frontend Tasks

### [src/path/to/file.tsx]
- [ ] [specific change with field/function names]

> _Omit if backend-only._

---

## Backend Tasks

### [backend/path/to/file.py]
- [ ] [specific change with endpoint/model names]

> _Omit if frontend-only._

---

## Database Tasks

### [Migration or Supabase SQL]
- [ ] [table creation, column addition, RLS policy]

> _Omit if no database changes needed._

---

## Files to Touch

| File | Change |
|------|--------|
| `path/to/file` | [description] |

---

## Do NOT Touch

- [file] -- [reason]

---

## Acceptance Criteria

### Frontend
- [ ] [testable criterion]
- [ ] `npx tsc --noEmit` passes

### Backend
- [ ] [testable criterion]
- [ ] `python -c "from main import app"` passes

### MLP Criteria
- [ ] [lovability criterion, e.g. "animation plays on first successful action"]
- [ ] [delight moment verified working]

---

## Agent Prompt

When implementing this feature, read this file in full. Then:

1. **[Agent type]**: [specific instructions]
2. **Verification**: [what to run and check]

Do not modify files in the Do NOT Touch list. Follow conventions in MEMORY.md and FRONTEND_PLAN.MD / BACKEND_PLAN.md.
```

### Additional sections (full mode only -- omit in --quick):

Insert these sections after Summary and before UX Specifications:

```markdown
## Research Findings

### UX Patterns & Best Practices
- [Pattern] -- [source/reference]

### Competitor / Similar Product Approaches
- [Product]: [how they handle this] -- [source]

### Key Takeaways for Implementation
1. [Actionable insight]
2. [Actionable insight]

---

## MLP Evaluation

### Functional Requirements (Must Work)
- [requirement]

### Reliability Requirements (Must Be Dependable)
- [requirement]

### Usability Requirements (Must Be Intuitive)
- [requirement]

### Lovability Opportunities (Must Delight)
- [opportunity] -- [implementation hint]

### Lovemark Moments

| Moment | Trigger | Delight Pattern | Effort |
|--------|---------|-----------------|--------|
| [moment] | [when it happens] | [animation/copy/celebration] | [low/med/high] |

### What NOT to Gold-Plate
- [scope boundary]
```

Insert this section at the end, before Agent Prompt:

```markdown
## Research References

- [Title](URL) -- [brief note]
```

### Rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only -- no backend code
- Backend tasks: FastAPI/Pydantic/Python only -- no frontend code
- If feature is frontend-only: omit Backend Tasks and Database Tasks
- If feature is backend-only: omit Frontend Tasks
- Always end with an Agent Prompt block for delegation

## Step 8 -- GSD phase mapping (SKIP if --no-gsd)

Append a `## GSD Phase Mapping` section to the spec file. Structure the implementation into 2-4 phases compatible with `/gsd:plan-phase` and `/gsd:execute-phase`.

Each phase should include:
- **Goal**: one sentence describing what this phase delivers
- **Depends on**: prior phase number or "None"
- **Plans**: count of parallel workstreams

Each plan should include:
- Tasks with file lists
- Verification checklist

Typical structure for a full-stack feature:

```markdown
## GSD Phase Mapping

### Phase N: Foundation
**Goal**: Set up data layer and API endpoints.
**Depends on**: None
**Plans**: 2

**Plan N-1: Database + Models**
- Task 1: [description] -- Files: [list]
- Verification: [checklist]

**Plan N-2: API Endpoints**
- Task 1: [description] -- Files: [list]
- Verification: [checklist]

### Phase N+1: Frontend Core
**Goal**: Build the UI components and integrate with API.
**Depends on**: Phase N
**Plans**: 2

**Plan (N+1)-1: Store + Types**
- Task 1: [description] -- Files: [list]

**Plan (N+1)-2: Components + Integration**
- Task 1: [description] -- Files: [list]

### Phase N+2: Polish & Delight
**Goal**: Add MLP touches -- animations, delight moments, error states.
**Depends on**: Phase N+1
**Plans**: 2

**Plan (N+2)-1: UX Polish**
- Task 1: Lovemark moments -- Files: [list]
- Task 2: Loading/error/empty states -- Files: [list]

**Plan (N+2)-2: Tests**
- Task 1: Frontend tests -- Files: [list]
- Task 2: Backend tests -- Files: [list]

### Execution
/gsd:plan-phase N
/gsd:execute-phase N
```

Adjust phase count based on feature complexity:
- Small feature (frontend-only): 1-2 phases
- Medium feature (full-stack): 2-3 phases
- Large feature (full-stack + database + polish): 3-4 phases

## Step 9 -- Update roadmap

Append a one-line entry to `Context/FEATURE_ROADMAP.md`:
```
- [ ] [Feature Name] -- `Context/features/[filename].md`
```

## Step 10 -- Log

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

If non-obvious decisions were made during research or scoping, append to `Context/memory/AGENT_MEMORY.md` with context, decision, and rationale.

</process>
