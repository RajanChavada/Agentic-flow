---
description: Backend implementation with FastAPI/Pydantic patterns. Enforces Neurovn's registry conventions, model separation, and verification steps. Use when the user mentions backend, API, FastAPI, endpoint, Pydantic, Python, estimator, pricing, or any backend file path.
---

# Backend Implementation Workflow

Implement backend changes following Neurovn's FastAPI/Pydantic conventions. Enforces mandatory context loading, registry patterns, and verification steps.

---

## Step 1 -- Read before writing any code

Use `view_file` to read:
1. `Context/BACKEND_PLAN.md` -- API contract, Pydantic model conventions
2. `Context/memory/MEMORY.md` -- past decisions and constraints
3. `Context/supabase.md` -- if the task touches the database

## Step 2 -- Patterns to follow

### Registries (pricing, tools)
- Data lives in `backend/data/*.json` -- never hardcode pricing or tool data in Python
- Registry class follows the `PricingRegistry` pattern: loads JSON at import, exposes typed query methods, exports a module-level singleton
- Add new data types as new JSON files + new registry, not as dicts in Python

### Pydantic models
- All request/response shapes are Pydantic models in `models.py`
- Extend existing models with `Optional` fields -- never break existing field names
- New models go in `models.py`, not inline in route handlers

### Endpoints
- All routes in `main.py` -- prefix all paths with `/api/`
- Never remove or rename existing endpoints -- add new ones
- 422 validation is handled by Pydantic automatically
- Add `404`/`403` error raises explicitly when working with user-owned resources

### Enum values the frontend depends on (do NOT change these strings)
- `task_type`: `classification`, `summarization`, `code_generation`, `rag_answer`, `tool_orchestration`, `routing`
- `expected_output_size`: `short`, `medium`, `long`, `very_long`
- `border_style`: `solid`, `dashed`, `none`

## Step 3 -- Implement

Execute the changes following the patterns above.

Use `replace_file_content` or `multi_replace_file_content` for edits to existing files.
Use `write_to_file` for new files.

## Step 4 -- Verify

Use `run_command` to execute:
- `cd backend && python -c "from main import app"` -- clean import required

## Step 5 -- Log

Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:
```
## Backend: [short title] -- [HH:MM]
**Agent:** Antigravity -- Backend implementation
**Files changed:** [list]
**Notes:** [anything non-obvious]
```

Update `Context/memory/AGENT_MEMORY.md` if non-obvious decisions were made.
