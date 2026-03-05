---
phase: 2
slug: canvas-metadata
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react |
| **Config file** | `frontend/vitest.config.ts` (none — Wave 0 installs) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | META-01 | unit | `npm test -- graphAnalysis.test.ts -t "computes basic metrics"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | META-02 | unit | `npm test -- graphAnalysis.test.ts -t "computes tool risk surface"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | META-03 | unit | `npm test -- graphAnalysis.test.ts -t "computes risk score"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | META-04 | unit | `npm test -- graphAnalysis.test.ts -t "checks ideal state reachability"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 0 | ESTM-04 | unit | `npm test -- graphAnalysis.test.ts -t "handles edge cases"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | META-05 | unit | `npm test -- CanvasMetadataOverlay.test.tsx -t "memoizes graph analysis"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | META-06 | manual | Drag 10+ nodes rapidly; check React DevTools Profiler | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react` — test framework install
- [ ] `frontend/vitest.config.ts` — Vitest config with jsdom, path aliases, React plugin
- [ ] `frontend/vitest.setup.ts` — setup file with `@testing-library/jest-dom` import
- [ ] `frontend/package.json` scripts — add `"test": "vitest"`
- [ ] `frontend/src/lib/__tests__/graphAnalysis.test.ts` — stubs for META-01, META-02, META-03, META-04, ESTM-04
- [ ] `frontend/src/lib/__tests__/fixtures/mockNodes.ts` — reusable test workflows (DAG, cyclic, disconnected, high-risk)
- [ ] `frontend/src/components/__tests__/CanvasMetadataOverlay.test.tsx` — stubs for META-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No jank during rapid drag operations | META-06 | Frame time measurement requires browser DevTools Profiler; automated test would need Playwright + custom frame timing (complex, brittle) | 1. Open canvas with 10+ nodes. 2. Rapidly drag nodes around. 3. Open React DevTools Profiler. 4. Verify render times < 16ms. 5. Verify overlay updates without visible lag. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
