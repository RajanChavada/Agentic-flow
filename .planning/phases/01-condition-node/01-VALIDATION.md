---
phase: 1
slug: condition-node
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library (frontend), pytest (backend) |
| **Config file** | frontend/vitest.config.ts, backend/pytest.ini — Wave 0 installs if missing |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` (frontend), `cd backend && pytest -x` (backend) |
| **Full suite command** | `cd frontend && npx vitest run` (frontend), `cd backend && pytest` (backend) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick tests for modified component
- **After every plan wave:** Run full frontend + backend suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | COND-01 | integration | `cd frontend && npx vitest run src/components/__tests__/Sidebar.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | COND-02 | unit | `cd frontend && npx vitest run src/components/nodes/__tests__/ConditionNode.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | COND-03 | integration | `cd frontend && npx vitest run src/components/__tests__/NodeConfigModal.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | COND-04 | unit | `cd frontend && npx vitest run src/components/nodes/__tests__/ConditionNode.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | COND-05 | integration | `cd frontend && npx vitest run src/components/__tests__/Canvas.test.tsx` | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | COND-06 | unit | `cd backend && pytest tests/test_estimator.py::test_condition_node_routing -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/vitest.config.ts` — install Vitest + RTL if missing
- [ ] `frontend/src/components/nodes/__tests__/ConditionNode.test.tsx` — stubs for COND-02, COND-04
- [ ] `frontend/src/components/__tests__/Sidebar.test.tsx` — stubs for COND-01
- [ ] `frontend/src/components/__tests__/NodeConfigModal.test.tsx` — stubs for COND-03
- [ ] `frontend/src/components/__tests__/Canvas.test.tsx` — stubs for COND-05
- [ ] `backend/tests/test_estimator.py` — add test_condition_node_routing for COND-06
- [ ] `backend/pytest.ini` — install pytest if missing

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag from sidebar to canvas creates node at drop position | COND-01 | HTML5 drag-and-drop requires real browser | 1. Open canvas 2. Drag "Condition" from sidebar 3. Drop on canvas 4. Verify purple diamond appears |
| Edge colors visible on canvas | COND-02 | Visual verification of green/red edge colors | 1. Connect True handle 2. Verify green edge 3. Connect False handle 4. Verify red edge |

*Automated tests verify the data flow and state; manual tests confirm visual rendering.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
