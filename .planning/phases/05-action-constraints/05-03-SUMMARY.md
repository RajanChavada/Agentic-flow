---
phase: 05-action-constraints
plan: 03
subsystem: scaffold-backend
tags: [backend, scaffold, system-prompt, tests]
dependency_graph:
  requires: ["05-00", "05-01"]
  provides: [scaffold-action-awareness, scaffold-tests]
  affects: [scaffold_generator, test_allowed_actions]
tech_stack:
  added: []
  patterns: [scaffold-prompt-engineering, pytest-class-grouping]
key_files:
  created: []
  modified:
    - backend/scaffold_generator.py
    - backend/tests/test_allowed_actions.py
decisions:
  - scaffold_generator.py already had allowed_actions awareness from commit 1ccda4d
  - test_allowed_actions.py already had TestScaffoldActionAwareness class (3 tests)
  - All 13 tests pass; no implementation work required in this wave
metrics:
  duration: 60
  tasks: 2
  files: 2
  tests_passing: 13
  completed: 2026-03-10T14:02:34Z
---

# Phase 05 Plan 03: Scaffold Awareness + Backend Tests Summary

**One-liner:** Verified the pre-existing scaffold system prompt update and `TestScaffoldActionAwareness` test class — all 13/13 backend tests GREEN with no implementation work required.

## What Was Built

Plan 05-03 covers scaffold generator awareness of `allowed_actions` and the scaffold-specific backend tests. Both were pre-existing from commits `1ccda4d` and `8ab2d1e`.

### Scaffold Generator Update (`backend/scaffold_generator.py`)

From commit `1ccda4d`, the `SCAFFOLD_SYSTEM_PROMPT` was updated (3 insertions):
1. `allowed_actions` added to agentNode fields list in the NODE TYPES section
2. `ALLOWED_ACTIONS` description line added after `TASK TYPES` — defines it as an optional list of discrete output labels
3. Rule 10 added: instructs LLM to populate `allowed_actions` when NL description mentions specific action labels (e.g., "classify as positive, negative, or neutral"). Set to null when no specific actions mentioned.
4. `_fallback_workflow` unchanged — fallback agent node does not include `allowed_actions`

### Backend Tests (`backend/tests/test_allowed_actions.py`)

File already contained `TestScaffoldActionAwareness` class (added in commit `8ab2d1e`) with 3 tests:
- `test_scaffold_prompt_mentions_allowed_actions`: asserts `"allowed_actions" in SCAFFOLD_SYSTEM_PROMPT`
- `test_scaffold_prompt_has_action_population_rule`: asserts action + populate/include/set keywords present
- `test_fallback_workflow_no_allowed_actions`: calls `_fallback_workflow("test prompt")` and asserts no node has `allowed_actions` set (null or absent)

## Tasks Completed

| Task | Name | Status | Commit | Notes |
|------|------|--------|--------|-------|
| 1 | Update scaffold system prompt | ✓ | 1ccda4d | Pre-existing — verified via import assertion |
| 2 | Extend backend tests with scaffold tests | ✓ | 8ab2d1e | Pre-existing — 3 tests already in file |

## Deviations from Plan

None. Both tasks were pre-implemented. Wave 2 execution was pure verification.

## Verification

All verification steps passed:

- ✓ `python -c "from scaffold_generator import SCAFFOLD_SYSTEM_PROMPT; assert 'allowed_actions' in SCAFFOLD_SYSTEM_PROMPT; print('OK')"` → OK
- ✓ `python -m pytest tests/test_allowed_actions.py -v` → 13/13 pass
- ✓ `python -c "from main import app"` → OK
- ✓ Fallback workflow nodes do not include `allowed_actions`

## Full Test Results (13/13 pass)

```
TestAllowedActionsValidation::test_accepts_valid_allowed_actions_list    PASSED
TestAllowedActionsValidation::test_accepts_allowed_actions_none          PASSED
TestAllowedActionsValidation::test_rejects_empty_string_item             PASSED
TestAllowedActionsValidation::test_rejects_more_than_20_items            PASSED
TestAllowedActionsValidation::test_rejects_item_over_50_chars            PASSED
TestAllowedActionsValidation::test_strips_whitespace_from_items          PASSED
TestAllowedActionsEstimation::test_classification_with_actions_fewer_output_tokens PASSED
TestAllowedActionsEstimation::test_routing_with_actions_fewer_output_tokens        PASSED
TestAllowedActionsEstimation::test_summarization_with_actions_unchanged_output_tokens PASSED
TestAllowedActionsEstimation::test_classification_with_actions_adds_input_tokens   PASSED
TestScaffoldActionAwareness::test_scaffold_prompt_mentions_allowed_actions PASSED
TestScaffoldActionAwareness::test_scaffold_prompt_has_action_population_rule PASSED
TestScaffoldActionAwareness::test_fallback_workflow_no_allowed_actions    PASSED
```

## Requirements Coverage

- **ACTN-06**: Scaffold auto-populates `allowed_actions` from NL action keywords ✓

## Self-Check: PASSED

- ✓ `SCAFFOLD_SYSTEM_PROMPT` contains `allowed_actions` instruction
- ✓ Fallback workflow has no `allowed_actions` on any node
- ✓ All 13 backend tests pass (6 validation + 4 estimation + 3 scaffold)
- ✓ Backend import check passes
