---
phase: 5
slug: action-constraints
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 (frontend) / pytest 8.0.0+ (backend) |
| **Config file** | `frontend/vitest.config.ts` / `backend/pytest.ini` |
| **Quick run command** | `cd frontend && npx vitest run --reporter=verbose` / `cd backend && python -m pytest -x` |
| **Full suite command** | `cd frontend && npx vitest run && cd ../backend && python -m pytest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command for changed layer
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | ACTN-01 | unit | `cd backend && python -m pytest tests/test_models.py -k action` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | ACTN-04 | unit | `cd backend && python -m pytest tests/test_estimator.py -k action` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | ACTN-02 | unit | `cd frontend && npx vitest run src/components/__tests__/TagInput.test.tsx` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | ACTN-03 | type-check | `cd frontend && npx tsc --noEmit` | ✅ | ⬜ pending |
| 05-03-01 | 03 | 2 | ACTN-05 | manual | Visual inspection of node badge | N/A | ⬜ pending |
| 05-03-02 | 03 | 2 | ACTN-06 | unit | `cd backend && python -m pytest tests/test_scaffold.py -k action` | ❌ W0 | ⬜ pending |
| 05-03-03 | 03 | 2 | ACTN-07 | integration | `cd frontend && npx tsc --noEmit && cd ../backend && python -c "from main import app"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/test_allowed_actions.py` — 10 tests for validation + estimation (Plan 05-00)
- [x] `frontend/src/components/__tests__/TagInput.test.tsx` — 9 tests for TagInput interactions (Plan 05-00)

*Wave 0 plan (05-00-PLAN.md) creates both test files before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Action chips display with color coding | ACTN-02 | Visual styling | Open config modal for agent node, add 3+ actions, verify distinct colors |
| Agent node face shows "N actions" badge | ACTN-05 | Canvas visual | Add actions to agent node, close modal, verify badge on node card |
| Chip add/remove animation | ACTN-02 | Animation timing | Add action, verify scale-in animation; remove action, verify fade-out |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
