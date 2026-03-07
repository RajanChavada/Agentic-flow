---
name: bugfix
description: Root-cause-first bug diagnosis and fix. Forces identification of ALL root causes before writing any fix code.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Diagnose and fix a bug using root-cause-first thinking. Identify all stacked root causes before writing any fix. Prevent patch-over-patch fixes.
</objective>

<context>
$ARGUMENTS
</context>

<process>

## Step 1 -- Read history before touching anything

- `Context/memory/AGENT_MEMORY.md` -- check if this bug or a similar one was seen before
- `Context/memory/logs_agent/` -- recent agent logs for related changes

## Step 2 -- Identify ALL root causes

There are usually 2-3 stacked causes. Write them out explicitly before writing any fix:

```
Root cause 1: [exact file, line, why it breaks]
Root cause 2: [exact file, line, why it breaks]
Root cause 3: [if any]
```

Do not start fixing until all causes are listed.

## Step 3 -- Fix rules

- Fix the root cause, not the symptom
- One fix per root cause -- no omnibus patches
- Never add `try/catch` to silence an error without fixing the underlying issue
- If the fix requires changing a Pydantic model field name or enum value:
  - Check `Context/FRONTEND_PLAN.MD` and `Context/BACKEND_PLAN.md` for all places that string is used
  - Fix ALL of them in the same commit (frontend enum value + backend Literal must match exactly)

### Enum values the frontend depends on (do NOT change these strings):
- `task_type`: `classification`, `summarization`, `code_generation`, `rag_answer`, `tool_orchestration`, `routing`
- `expected_output_size`: `short`, `medium`, `long`, `very_long`
- `border_style`: `solid`, `dashed`, `none`

## Step 4 -- Verify

- `cd frontend && npx tsc --noEmit` (if frontend changes)
- `cd backend && python -c "from main import app"` (if backend changes)

## Step 5 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Bug Fix: [short title] -- [HH:MM]
**Agent:** Bug fix
**Root causes:** [list]
**Files changed:** [list]
```

Update `Context/memory/AGENT_MEMORY.md` with context, decision, and "don't repeat" notes.

</process>
