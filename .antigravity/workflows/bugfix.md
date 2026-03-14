---
description: Root-cause-first bug diagnosis and fix. Forces identification of ALL root causes before writing any fix code. Use when the user mentions bug, fix, broken, error, crash, regression, or "not working".
---

# Bug Fix Workflow

Diagnose and fix a bug using root-cause-first thinking. Identify all stacked root causes before writing any fix. Prevent patch-over-patch fixes.

---

## Step 1 -- Read history before touching anything

Use `view_file` to read:
- `Context/memory/AGENT_MEMORY.md` -- check if this bug or a similar one was seen before
- Recent files in `Context/memory/logs_agent/` -- recent agent logs for related changes

Use `find_by_name` to list recent log files, then read the most recent ones.

## Step 2 -- Identify ALL root causes

There are usually 2-3 stacked causes. Write them out explicitly before writing any fix:

```
Root cause 1: [exact file, line, why it breaks]
Root cause 2: [exact file, line, why it breaks]
Root cause 3: [if any]
```

Use `grep_search`, `view_file`, `view_code_item`, and `view_file_outline` to trace the issue through the codebase.

Do not start fixing until all causes are listed.

## Step 3 -- Fix rules

- Fix the root cause, not the symptom
- One fix per root cause -- no omnibus patches
- Never add `try/catch` to silence an error without fixing the underlying issue
- If the fix requires changing a Pydantic model field name or enum value:
  - Check `Context/FRONTEND_PLAN.MD` and `Context/BACKEND_PLAN.md` for all places that string is used
  - Use `grep_search` to find ALL occurrences across the codebase
  - Fix ALL of them together (frontend enum value + backend Literal must match exactly)

### Enum values the frontend depends on (do NOT change these strings):
- `task_type`: `classification`, `summarization`, `code_generation`, `rag_answer`, `tool_orchestration`, `routing`
- `expected_output_size`: `short`, `medium`, `long`, `very_long`
- `border_style`: `solid`, `dashed`, `none`

## Step 4 -- Verify

Use `run_command` to execute:
- `cd frontend && npx tsc --noEmit` (if frontend changes)
- `cd backend && python -c "from main import app"` (if backend changes)

## Step 5 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Bug Fix: [short title] -- [HH:MM]
**Agent:** Antigravity -- Bug fix
**Root causes:** [list]
**Files changed:** [list]
```

Update `Context/memory/AGENT_MEMORY.md` with context, decision, and "don't repeat" notes.
