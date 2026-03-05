---
phase: 03-ideal-state-node
plan: 02
subsystem: api
tags: [fastapi, pydantic, openai, json-schema, llm, validation]

# Dependency graph
requires:
  - phase: 03-ideal-state-node
    provides: Frontend type contracts for idealStateNode (03-1-PLAN)
provides:
  - idealStateNode type recognized by backend NodeConfig
  - POST /api/generate-schema endpoint (NL-to-JSON Schema via LLM)
  - POST /api/validate-schema endpoint (JSON Schema validation)
  - schema_generator.py module with fallback generation
  - SchemaGenerateRequest/Response and SchemaValidateRequest/Response models
affects: [03-ideal-state-node frontend integration, 04-probability-weighted-estimation]

# Tech tracking
tech-stack:
  added: [openai (optional, for LLM schema generation)]
  patterns: [fallback-when-no-api-key, NL-to-structured-output via LLM]

key-files:
  created:
    - backend/schema_generator.py
  modified:
    - backend/models.py
    - backend/config.py
    - backend/main.py
    - backend/tests/test_smoke.py

key-decisions:
  - "Fallback schema generation when OPENAI_API_KEY is not set ensures backend works without external API dependency"
  - "Schema validation checks root type=object, non-empty properties, valid field types, and required field consistency"
  - "Used Pydantic Field alias (schema_obj with alias='schema') to avoid Python keyword collision"

patterns-established:
  - "LLM-powered generation with graceful fallback: always return valid output even without API key"
  - "Schema validation as a reusable function used by both generate and validate endpoints"

requirements-completed: [IDST-03, IDST-05, IDST-06]

# Metrics
duration: 10min
completed: 2026-03-05
---

# Phase 3 Plan 2: NL-to-Schema Backend Summary

**Backend schema generation and validation endpoints with LLM-powered NL-to-JSON Schema conversion and graceful fallback**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-05
- **Completed:** 2026-03-05
- **Tasks:** 6
- **Files modified:** 5

## Accomplishments
- Added `idealStateNode` type to backend `NodeConfig` with `ideal_state_description` and `ideal_state_schema` fields
- Created `SchemaGenerateRequest/Response` and `SchemaValidateRequest/Response` Pydantic models
- Built `schema_generator.py` module with OpenAI LLM integration and fallback template generation
- Added `POST /api/generate-schema` and `POST /api/validate-schema` FastAPI endpoints
- Added 3 smoke tests covering schema validation (valid + invalid) and fallback generation
- Added `OPENAI_API_KEY` and `SCHEMA_GEN_MODEL` config variables

## Task Commits

Note: Git write operations were blocked in this environment. All code changes are staged but uncommitted. The user should commit manually.

1. **Task 1: Add idealStateNode to Backend Models** - (uncommitted)
2. **Task 2: Create Schema Generation Models** - (uncommitted)
3. **Task 3: Add Config for LLM API Key** - (uncommitted)
4. **Task 4: Create Schema Generator Module** - (uncommitted)
5. **Task 5: Add Endpoints to main.py** - (uncommitted)
6. **Task 6: Add Backend Smoke Tests** - (uncommitted)

Recommended commit command:
```bash
git add backend/models.py backend/config.py backend/main.py backend/schema_generator.py backend/tests/test_smoke.py
git commit -m "feat(03-2): add NL-to-schema backend for Ideal State Node

- Add idealStateNode type and fields to NodeConfig
- Add SchemaGenerate/Validate request/response Pydantic models
- Create schema_generator.py with LLM and fallback generation
- Add OPENAI_API_KEY and SCHEMA_GEN_MODEL config
- Add /api/generate-schema and /api/validate-schema endpoints
- Add smoke tests for schema validation and generation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Files Created/Modified
- `backend/schema_generator.py` - NL-to-schema generation with OpenAI LLM and fallback, plus JSON Schema validation
- `backend/models.py` - Added idealStateNode to NodeConfig Literal type, ideal_state_description/schema fields, and 4 schema generation/validation request/response models
- `backend/config.py` - Added OPENAI_API_KEY and SCHEMA_GEN_MODEL environment variable config
- `backend/main.py` - Added imports for schema models + generator, added POST /api/generate-schema and POST /api/validate-schema endpoints
- `backend/tests/test_smoke.py` - Added 3 tests: valid schema validation, invalid schema rejection, and fallback schema generation

## Decisions Made
- **Fallback-first design:** When OPENAI_API_KEY is not configured, `generate_schema()` returns a template schema with `success` (bool), `output` (string), and `confidence` (number 0-1) fields rather than failing. This keeps the feature usable during development and in environments without LLM access.
- **Pydantic alias pattern:** Used `Field(..., alias="schema")` with `model_config = {"populate_by_name": True}` on `schema_obj` field to avoid collision with Python's `schema` reserved patterns while keeping the JSON API field named "schema".
- **Validation rules:** Root must be `type: "object"`, must have non-empty `properties`, all property types must be valid JSON Schema types, and `required` fields must exist in `properties`.
- **Temperature 0.2:** Low temperature for deterministic, structured JSON Schema output from the LLM.
- **response_format json_object:** Forces JSON output from the LLM to avoid markdown wrapping.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **Git write operations blocked:** The execution environment prevented `git add` and `git commit` commands (auto-denied). All file changes were written and verified by re-reading, but commits must be performed manually by the user.

## User Setup Required

**Optional LLM Configuration:**
To enable LLM-powered schema generation (instead of fallback templates), set these environment variables:
```bash
# In backend/.env or system environment
OPENAI_API_KEY=sk-your-key-here
SCHEMA_GEN_MODEL=gpt-4o-mini  # optional, defaults to gpt-4o-mini
```

Without these, the `/api/generate-schema` endpoint returns a valid fallback template schema.

## Next Phase Readiness
- Backend schema generation ready for frontend integration
- Endpoints accept and return proper JSON with Pydantic validation
- Frontend can call POST /api/generate-schema with description text and receive JSON schema
- Frontend can call POST /api/validate-schema to check user-edited schemas

---
*Phase: 03-ideal-state-node*
*Completed: 2026-03-05*
