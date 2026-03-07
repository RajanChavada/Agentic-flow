---
name: feature
description: Plan a new feature. Creates a structured feature spec with frontend/backend task breakdown, acceptance criteria, and agent prompt.
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - AskUserQuestion
---
<objective>
Read all product context, then create a structured feature specification file with frontend tasks, backend tasks, files to touch, and acceptance criteria.
</objective>

<context>
$ARGUMENTS
</context>

<process>

## Step 1 -- Read context before writing anything

Read these files in order:
1. `Context/CONTEXT.md` -- big picture and product goals
2. `Context/FEATURE_ROADMAP.md` -- existing roadmap to avoid duplication
3. `Context/FRONTEND_PLAN.MD` -- frontend architecture and conventions
4. `Context/BACKEND_PLAN.md` -- backend architecture and API patterns
5. `Context/memory/MEMORY.md` -- any relevant past decisions

## Step 2 -- Create feature spec

Create a file at `Context/features/[kebab-case-name].md` with these sections:

### Required sections:
- **Summary** -- 2-3 sentence plain description
- **Frontend Tasks** -- checkboxes per file, with exact field/function names
- **Backend Tasks** -- checkboxes per file, with exact endpoint and Pydantic model names
- **Files to Touch** -- markdown table with File | Change
- **Do NOT Touch** -- files explicitly excluded
- **Acceptance Criteria** -- testable checkboxes, both frontend and backend

### Rules:
- Frontend tasks: React/Next.js/Zustand/Tailwind only -- no backend code
- Backend tasks: FastAPI/Pydantic/Python only -- no frontend code
- If feature is frontend-only: omit Backend Tasks section
- If feature is backend-only: omit Frontend Tasks section
- Always end with a copy-paste **Agent Prompt** block for delegation

## Step 3 -- Update roadmap

Append a one-line entry to `Context/FEATURE_ROADMAP.md`:
```
- [ ] [Feature Name] -- Context/features/[filename].md
```

## Step 4 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Feature Spec: [name] -- [HH:MM]
**Agent:** Feature planning
**Created:** Context/features/[filename].md
**Scope:** [frontend-only | backend-only | full-stack]
```

</process>
