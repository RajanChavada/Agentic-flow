---
phase: 05-action-constraints
plan: 01
subsystem: data-layer
tags: [types, models, estimator, pydantic, zustand]
dependency_graph:
  requires: [05-00]
  provides: [frontend-allowed-actions-types, backend-allowed-actions-model, action-estimation-logic]
  affects: [api-contract, estimation-pipeline]
tech_stack:
  added: []
  patterns: [pydantic-field-validator, zustand-payload-mapping, tiktoken-action-tokens]
key_files:
  modified:
    - frontend/src/types/workflow.ts
    - frontend/src/store/utils.ts
    - backend/models.py
    - backend/estimator.py
decisions:
  - Implementation was already present from prior work; plan verified and confirmed all changes correct
  - Estimation uses 0.15 * len(allowed_actions) multiplier for classification/routing (replaces table-based multiplier)
  - Action labels counted via tiktoken and added to input_tokens (LLM sees them in system prompt)
metrics:
  duration: 0
  tasks: 2
  files: 4
  tests_passed: 13
  completed: 2026-03-10T14:00:00Z
---

# Phase 05 Plan 01: Data Layer Summary

**One-liner:** All data layer contracts for allowed_actions are in place -- frontend types, store payload mapping, backend Pydantic validation, and action-aware estimator logic. All 13 backend tests pass.

## What Was Built

The full data contract for `allowed_actions` flowing from frontend UI to backend estimation:

1. **Frontend Types** (`frontend/src/types/workflow.ts`)
   - `WorkflowNodeData.allowedActions?: string[]` -- stores actions on node
   - `NodeConfigPayload.allowed_actions?: string[] | null` -- sends to backend API

2. **Store Payload Mapping** (`frontend/src/store/utils.ts`)
   - `nodesToPayload()` maps `n.data.allowedActions` → `allowed_actions` (camelCase → snake_case)

3. **Backend Model** (`backend/models.py`)
   - `NodeConfig.allowed_actions: Optional[List[str]]` with `@field_validator`
   - Validation: max 20 items, each 1–50 chars, whitespace stripped, empty strings rejected

4. **Estimator Logic** (`backend/estimator.py`)
   - When `allowed_actions` set AND `task_type in ("classification", "routing")`:
     - `output_multiplier = 0.15 * len(allowed_actions)` (overrides table-based multiplier)
     - `action_label_tokens = count_tokens(", ".join(allowed_actions))` added to input_tokens

## Tasks Completed

| Task | Name | Status | Verification |
|------|------|--------|--------------|
| 1 | Frontend types + payload mapping | ✓ | `npx tsc --noEmit` passes |
| 2 | Backend model + estimator | ✓ | 13/13 pytest tests pass |

## Verification Results

- ✓ `npx tsc --noEmit` -- zero errors
- ✓ `pytest tests/test_allowed_actions.py -v` -- 13/13 passed
  - 6 validation tests (accept valid, accept None, reject empty, reject >20, reject >50 chars, strip whitespace)
  - 4 estimation tests (classification reduces output, routing reduces output, summarization unaffected, classification adds input tokens)
  - 3 scaffold awareness tests (prompt mentions allowed_actions, has population rule, fallback workflow clean)

## Requirements Coverage

- **ACTN-04**: Backend NodeConfig validates `allowed_actions` with field_validator ✓
- **ACTN-05**: Estimator adjusts output tokens for classification/routing with actions ✓
