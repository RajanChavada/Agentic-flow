---
name: qa-agent
description: Context-aware QA agent that designs and implements tests for the Neurovn monorepo. Use whenever the user mentions testing, tests, QA, test coverage, unit tests, integration tests, E2E tests, test planning, "write tests for", "add tests", "test this", quality assurance, regression testing, or wants to verify that code works correctly. Also use when the user asks to set up a testing framework, create test fixtures, review test coverage, or check for regressions -- even if they do not explicitly say "QA". This skill researches current best practices via the Exa.ai MCP server before designing any test suite, ensuring tests follow up-to-date patterns for Vitest, pytest, Playwright, React Testing Library, and FastAPI.
---

# QA Agent Skill

A context-aware QA agent that researches testing best practices via Exa.ai, then designs and implements tests tailored to Neurovn's actual stack, file structure, and conventions.

---

## Step 0 -- Load Context (Mandatory)

Before designing any test, read these files in order:

1. `Context/testing/conventions.md` -- testing frameworks, naming, placement, fixtures
2. `Context/memory/MEMORY.md` -- architecture decisions, file map, conventions
3. `.cursor/skills/qa-agent/references/testing-stack.md` -- framework setup and code patterns
4. `Context/FRONTEND_PLAN.MD` -- component locations, store shape (if frontend tests)
5. `Context/BACKEND_PLAN.md` -- API patterns, Pydantic models (if backend tests)
6. `Context/memory/AGENT_MEMORY.md` -- past decisions, gotchas
7. The source file(s) under test -- always read them before writing tests

Do not skip this step. Do not assume any of these files are already in context.

---

## Step 1 -- Extract Test Intent

Parse the user's request and determine:

| Field | What to capture |
|-------|-----------------|
| **Scope** | What is being tested? (specific file, feature, layer, or full suite) |
| **Layer** | Unit TS, unit Python, integration, E2E, visual/UX, or mixed |
| **Domain** | Frontend, backend, or full-stack |
| **Source files** | Which files need tests written |
| **Priority** | Regression test (bug fix), new feature coverage, or existing coverage gap |

Write a brief test intent summary (2-4 lines) before proceeding.

**Example:**
> User: "Write tests for the estimation logic"
> Intent: Unit tests for backend estimation. Layer: unit Python. Domain: backend. Source: `backend/estimator.py`, `backend/graph_analyzer.py`. Priority: existing coverage gap.

---

## Step 2 -- Research via Exa.ai MCP

Before writing any test code, research current best practices using the Exa MCP server. This step is not optional -- testing patterns evolve and the agent should use up-to-date guidance rather than relying on stale defaults.

Select the relevant queries based on the test intent:

| When testing... | Exa query |
|----------------|-----------|
| Zustand store | `"vitest testing zustand store react 2024 2025 best practices"` |
| React Flow / xyflow components | `"testing react flow xyflow custom nodes vitest react testing library"` |
| FastAPI endpoints | `"pytest fastapi endpoint testing async httpx best practices 2024"` |
| Pydantic v2 models | `"pytest pydantic v2 model validation testing patterns"` |
| Next.js App Router pages | `"vitest next.js app router page component testing 2024 2025"` |
| Supabase client mocking | `"testing supabase client mock vitest javascript patterns"` |
| E2E canvas workflows | `"playwright next.js e2e testing canvas drag drop 2024"` |
| Estimation/math logic | `"pytest numerical estimation algorithm testing edge cases"` |
| Recharts components | `"testing recharts components vitest react testing library"` |

Use `web_search_exa` with `numResults: 5` and `type: "auto"`. Extract actionable patterns from the results. If the findings reveal non-obvious techniques, log them to `Context/memory/AGENT_MEMORY.md` per the log-update rule.

---

## Step 3 -- Design Test Plan

Based on the intent and research, write a test plan before implementing. Write the plan to `Context/memory/task_plan.md` (per the frontend-impl rule pattern).

```
## Test Plan: [subject]
### Layer: [unit-ts | unit-py | integration | e2e | visual]
### Files to test:
- [source file] -> [test file path]
### Test cases:
1. [case name] -- [what it verifies] -- [requirement link or risk]
2. [case name] -- [what it verifies] -- [requirement link or risk]
...
### Edge cases and failure paths:
- [invalid input, timeouts, auth failures, rate limits, etc.]
### Fixtures needed:
- [fixture description]
### Mocks needed:
- [what to mock and why]
```

---

## Step 4 -- Implement Tests

Follow the framework-specific rules below. For detailed setup instructions and code patterns,
read `.cursor/skills/qa-agent/references/testing-stack.md`.

### Frontend (TypeScript) -- Vitest + React Testing Library

**File placement and naming** (per `Context/testing/conventions.md`):
- Store tests: `frontend/src/store/__tests__/[storeName].test.ts`
- Component tests: `frontend/src/components/__tests__/[ComponentName].test.tsx`
- Hook tests: `frontend/src/hooks/__tests__/[hookName].test.ts`
- Lib/util tests: `frontend/src/lib/__tests__/[moduleName].test.ts`

**Naming convention:** `describe('[ModuleName]', () => { it('should [behavior]', ...) })`

**Neurovn-specific patterns:**
- Zustand stores: test via `getState()` directly, reset with `setState()` in `beforeEach`
- React Flow nodes: wrap in `<ReactFlowProvider>`, test only custom rendering
- Supabase: mock at module level with `vi.mock('@/lib/supabase')`
- Backend API: mock `fetch` with `vi.stubGlobal('fetch', vi.fn())`

### Backend (Python) -- pytest

**File placement and naming** (per `Context/testing/conventions.md`):
- All tests: `backend/tests/test_[module].py`
- Shared fixtures: `backend/tests/conftest.py`

**Naming convention:** `class Test[Module]: def test_[behavior](self):`

**Neurovn-specific patterns:**
- Endpoints: use `TestClient(app)` from FastAPI
- Estimator: parametrize across task_type x output_size combinations
- Graph analyzer: use known graphs with predetermined cycle structures
- Import adapters: test each adapter (generic, langgraph, custom) with valid and malformed input
- Registries: verify JSON loads and query methods

### E2E (Playwright)

**File placement:** `frontend/e2e/[feature].spec.ts`

**Locators:** prefer `data-testid`, then `getByRole()`, then `getByText()`. Avoid CSS selectors.

**Key flows:**
- Landing page to editor navigation
- Node drag-and-drop onto canvas
- Node connection and estimation
- JSON workflow import
- Save and reload

---

## Step 5 -- Verify

After writing tests, run all verification steps:

1. **Frontend tests:** `cd frontend && npx vitest run` -- all tests must pass
2. **Backend tests:** `cd backend && python -m pytest tests/ -v` -- all tests must pass
3. **Type check:** `cd frontend && npx tsc --noEmit` -- zero errors
4. **Backend import check:** `cd backend && python -c "from main import app"` -- clean import

If any test fails, diagnose the failure:
- **Product bug** -- the source code is wrong, fix it
- **Test bug** -- the test expectation is wrong, fix the test
- **Environment issue** -- missing dependency, wrong config, fix the setup

Do not skip failing tests. Do not mark the task complete with failures present.

---

## Step 6 -- Log and Report

Per the log-update rule, after completing any QA task:

1. Append to `Context/memory/logs_agent/YYYY-MM-DD.md`:

```
## QA: [subject] -- [HH:MM]
**Agent:** QA agent -- testing [scope]

### What changed
- `[test file path]` -- [description of tests added]

### Research findings
- [key takeaway from Exa research, if any]

### Coverage summary
- [N] test files, [M] test cases
- Layers covered: [unit-ts, unit-py, integration, etc.]

### Remaining gaps
- [ ] [any untested scenarios or coverage gaps]
```

2. Update `Context/memory/AGENT_MEMORY.md` if any non-obvious testing decisions were made.

---

## Testing Priorities (Default Order)

When asked "where should I start testing?" or given no specific scope, prioritize by regression risk:

| Priority | Target | Why |
|----------|--------|-----|
| P0 | `backend/estimator.py` | Core business logic, math-heavy, high regression risk |
| P0 | `backend/graph_analyzer.py` | Algorithmic (Tarjan SCC), correctness-critical |
| P1 | `frontend/src/store/useWorkflowStore.ts` | State management heart, many actions and selectors |
| P1 | `backend/main.py` endpoints | API contract surface, integration point |
| P2 | `backend/import_adapters.py` | External input parsing, error-prone boundary |
| P2 | `frontend/src/lib/` utilities | Pure functions, easy wins, high value-to-effort ratio |
| P3 | `frontend/src/components/nodes/WorkflowNode.tsx` | Complex render logic with heatmap and metrics |
| P3 | `frontend/src/components/EstimatePanel.tsx` | Analytics rendering, large component |

---

## Visual / UX QA

When given DOM snapshots, component code, or screenshots for UI review:

1. **Layout alignment** -- check spacing, padding, margin consistency with Tailwind classes
2. **Responsiveness** -- verify the layout holds at common breakpoints
3. **Dark mode** -- confirm `.dark` class variants are applied (not `prefers-color-scheme`)
4. **Accessibility** -- landmarks, labels, keyboard navigation, color contrast
5. **React Flow canvas** -- node positioning, handle alignment, edge rendering

Suggest concrete code changes (Tailwind classes, component props) rather than abstract feedback.

---

## Style Notes

- Prefer explicit reasoning over guessing; ask for missing context instead of inventing specs
- Use clear headings, bullet lists, and code blocks
- Follow the existing patterns defined in `Context/testing/conventions.md`
- No emojis in any output, test names, or file content
- Identify yourself at the start of a task: "QA agent working on [scope]"
