# Plan: NL-to-Schema Backend

**Phase:** 3 - Ideal State Node
**Requirement(s):** IDST-03, IDST-05, IDST-06
**Depends on:** 03-1-PLAN.md (type contracts)

## Goal

Create a backend endpoint that accepts a natural language success description, calls an LLM to generate a JSON schema, validates the result, and returns it. Also add `idealStateNode` to backend NodeConfig.

## Tasks

### Task 1: Add idealStateNode to Backend Models

**Files:**
- `backend/models.py`

**Action:**
1. Add `"idealStateNode"` to NodeConfig type Literal
2. Add optional fields:
   - `ideal_state_description: Optional[str]`
   - `ideal_state_schema: Optional[dict]`

### Task 2: Create Schema Generation Models

**Files:**
- `backend/models.py`

**Action:**
1. Add `SchemaGenerateRequest(BaseModel)`:
   - `description: str` (NL success description, required, max_length=2000)
   - `context: Optional[str]` (optional workflow context for better generation)
2. Add `SchemaGenerateResponse(BaseModel)`:
   - `schema: dict` (generated JSON schema)
   - `description: str` (echoed back)
3. Add `SchemaValidateRequest(BaseModel)`:
   - `schema: dict` (JSON schema to validate)
4. Add `SchemaValidateResponse(BaseModel)`:
   - `valid: bool`
   - `errors: List[str]`

### Task 3: Create Schema Generator Module

**Files:**
- `backend/schema_generator.py` (create)

**Action:**
1. Create `generate_schema(description: str, context: str | None) -> dict`:
   - Uses OpenAI API (or compatible) to generate JSON schema from NL
   - System prompt defines expected schema structure: required_fields, type_constraints, performance_bounds
   - Falls back to a template schema if API key not configured
   - Returns validated JSON schema dict
2. Create `validate_schema(schema: dict) -> tuple[bool, list[str]]`:
   - Checks schema has `type: "object"` at root
   - Checks `properties` exists and is non-empty
   - Validates field types are valid JSON Schema types
   - Returns (valid, error_messages)
3. Read `OPENAI_API_KEY` from environment (via config.py)

### Task 4: Add Config for LLM API Key

**Files:**
- `backend/config.py`

**Action:**
1. Add `OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")`
2. Add `SCHEMA_GEN_MODEL: str = os.getenv("SCHEMA_GEN_MODEL", "gpt-4o-mini")`

### Task 5: Add Endpoints to main.py

**Files:**
- `backend/main.py`

**Action:**
1. `POST /api/generate-schema` - accepts SchemaGenerateRequest, returns SchemaGenerateResponse
   - Calls `generate_schema()` from schema_generator module
   - Returns 503 if API key not configured (with helpful message)
   - Returns 422 if generation fails validation
2. `POST /api/validate-schema` - accepts SchemaValidateRequest, returns SchemaValidateResponse
   - Calls `validate_schema()` from schema_generator module

## Verification

- `python -c "from main import app"` succeeds
- Backend tests pass including new schema endpoint tests
- Schema validation rejects invalid schemas
- Schema generation works with API key (or returns graceful fallback)
