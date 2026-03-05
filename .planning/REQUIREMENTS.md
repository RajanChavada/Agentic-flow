# Requirements: Neurovn Workflow Control & Analysis

**Defined:** 2026-03-04
**Core Value:** Users can define what "done" looks like and see, before execution, whether their workflow can reach that goal, how much it will cost across branches, and where risk surfaces are.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Foundation

- [ ] **FNDX-01**: Zustand workflow store is split into domain-specific slices (workflow, metadata, estimation) to prevent subscription explosion
- [ ] **FNDX-02**: EstimatePanel component is refactored into smaller sub-components for maintainability
- [ ] **FNDX-03**: Test framework (Vitest + pytest) is installed and configured with at least one smoke test per layer

### Condition Node

- [ ] **COND-01**: User can add a Condition Node to the canvas via drag-and-drop from the toolbar
- [ ] **COND-02**: Condition Node has two output handles: True (green) and False (red) with visual labels
- [ ] **COND-03**: User can enter a condition expression (text field) in the node configuration
- [ ] **COND-04**: User can set branch probability via slider (0-100%) where True + False always sums to 100%
- [ ] **COND-05**: Deleting a Condition Node removes all connected edges (cascade deletion)
- [ ] **COND-06**: Backend recognizes `conditionNode` type and routes estimation through both branches

### Ideal State Node

- [ ] **IDST-01**: User can add an Ideal State Node to the canvas (maximum one per canvas enforced)
- [ ] **IDST-02**: User can enter a natural language description of success criteria in the node
- [ ] **IDST-03**: User can click "Generate Schema" to convert NL description to JSON schema via backend LLM endpoint
- [ ] **IDST-04**: Generated schema is displayed in a read-only preview within the node
- [ ] **IDST-05**: Schema captures required fields, type constraints, and performance bounds (max tokens, latency budget, cost ceiling)
- [ ] **IDST-06**: Backend `/api/generate-schema` endpoint validates LLM output before returning to frontend
- [ ] **IDST-07**: User can manually edit the generated schema after generation

### Canvas Metadata

- [ ] **META-01**: Canvas displays a corner overlay showing real-time graph metrics (node count, max depth, loop count)
- [ ] **META-02**: Overlay shows tool risk surface breakdown (count of read/write/exec/network tools)
- [ ] **META-03**: Overlay shows canvas risk score (low/medium/high) computed from tool tiers + loop depth + graph complexity
- [ ] **META-04**: Overlay shows Ideal State reachability flag (reachable/not reachable from Start)
- [ ] **META-05**: All metadata updates in real-time as user adds/removes/connects nodes (frontend-only computation, no API call)
- [ ] **META-06**: Metadata computation does not cause visible UI jank during node drag operations

### Estimation Enhancement

- [ ] **ESTM-01**: Backend estimation handles Condition Node branches with probability-weighted cost calculation
- [ ] **ESTM-02**: Estimation returns min/expected/max cost ranges when workflow contains condition nodes
- [ ] **ESTM-03**: EstimatePanel displays cost/token/latency as ranges (min-expected-max) instead of single values for branching workflows
- [ ] **ESTM-04**: Reachability analysis (BFS from Start to Ideal State) is computed and shown in metadata overlay

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Advanced Branching

- **ADVB-01**: Switch/Router node with 3+ output handles for multi-way routing
- **ADVB-02**: Loop breaker node that caps iteration count

### Schema Coverage

- **SCHM-01**: Analysis of whether agents/tools on reachable paths can produce required schema fields
- **SCHM-02**: Post-run ideal-state delta measurement (how far off was the actual output?)

### Editor Polish

- **PLSH-01**: Undo/redo support for canvas operations
- **PLSH-02**: Copy/paste nodes with connection preservation
- **PLSH-03**: Node enable/disable toggle

## Out of Scope

| Feature | Reason |
|---------|--------|
| Runtime workflow execution | This milestone is pre-run analysis only |
| Multi-condition routing (3+ branches) | Binary if/else is sufficient for v1; compose for complex logic |
| Real-time collaboration | Not needed for a single-user design tool |
| Per-user LLM API keys | Backend API key simplifies v1; add user keys when needed |
| Schema coverage analysis | Requires execution traces; deferred to v2 |
| Post-run ideal-state delta | Requires execution engine; deferred to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FNDX-01 | Phase 0 | Pending |
| FNDX-02 | Phase 0 | Pending |
| FNDX-03 | Phase 0 | Pending |
| COND-01 | Phase 1 | Pending |
| COND-02 | Phase 1 | Pending |
| COND-03 | Phase 1 | Pending |
| COND-04 | Phase 1 | Pending |
| COND-05 | Phase 1 | Pending |
| COND-06 | Phase 1 | Pending |
| IDST-01 | Phase 3 | Pending |
| IDST-02 | Phase 3 | Pending |
| IDST-03 | Phase 3 | Pending |
| IDST-04 | Phase 3 | Pending |
| IDST-05 | Phase 3 | Pending |
| IDST-06 | Phase 3 | Pending |
| IDST-07 | Phase 3 | Pending |
| META-01 | Phase 2 | Pending |
| META-02 | Phase 2 | Pending |
| META-03 | Phase 2 | Pending |
| META-04 | Phase 2 | Pending |
| META-05 | Phase 2 | Pending |
| META-06 | Phase 2 | Pending |
| ESTM-01 | Phase 4 | Pending |
| ESTM-02 | Phase 4 | Pending |
| ESTM-03 | Phase 4 | Pending |
| ESTM-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

**Phase breakdown:**
- Phase 0: 3 requirements (Foundation)
- Phase 1: 6 requirements (Condition Node)
- Phase 2: 7 requirements (Canvas Metadata + Reachability)
- Phase 3: 7 requirements (Ideal State Node)
- Phase 4: 3 requirements (Probability-Weighted Estimation)

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after roadmap creation*
