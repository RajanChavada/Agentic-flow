---
applyTo: "backend/**/*.py"
---

# Backend Implementation Rules

## Read before writing any code
1. `Context/BACKEND_PLAN.md` — API contract, Pydantic model conventions
2. `Context/memory/MEMORY.md` — past decisions and constraints
3. `Context/supabase.md` — if the task touches the database

## Patterns to follow — this codebase uses them consistently

### Registries (pricing, tools)
- Data lives in `backend/data/*.json` — never hardcode pricing or tool data in Python
- Registry class follows the `PricingRegistry` pattern: loads JSON at import, exposes typed query methods, exports a module-level singleton
- Add new data types as new JSON files + new registry, not as dicts in Python

### Pydantic models
- All request/response shapes are Pydantic models in `models.py`
- Extend existing models with `Optional` fields — never break existing field names
- New models go in `models.py`, not inline in route handlers

### Endpoints
- All routes in `main.py` (current scale) — prefix all paths with `/api/`
- Never remove or rename existing endpoints — add new ones
- 422 validation is handled by Pydantic automatically
- Add `404`/`403` error raises explicitly when working with user-owned resources

### Enum values the frontend depends on (do NOT change these strings)
- `task_type`: `classification`, `summarization`, `code_generation`, `rag_answer`, `tool_orchestration`, `routing`
- `expected_output_size`: `short`, `medium`, `long`, `very_long`
- `border_style`: `solid`, `dashed`, `none`

## After changes
- Confirm `python -c "from main import app"` imports cleanly
- Update `Context/memory/logs_agent/YYYY-MM-DD.md`
