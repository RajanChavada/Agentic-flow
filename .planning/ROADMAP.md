# Roadmap: Neurovn Workflow Control & Analysis

## Overview

Transform Neurovn from a static workflow designer into an intelligent control system with conditional branching, success criteria definition, and real-time graph analysis. Users will be able to model if/else decisions, define what "done" looks like in natural language, and see cost ranges, risk scores, and reachability analysis before any execution. The journey starts with foundational refactoring to prevent technical debt, then builds control flow primitives, frontend graph analysis, LLM-powered schema generation, and probability-weighted cost estimation.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Foundation** - Refactor store, EstimatePanel, and add test framework
- [ ] **Phase 1: Condition Node** - Binary branching with probability sliders
- [ ] **Phase 2: Canvas Metadata** - Real-time graph analysis and risk scoring
- [ ] **Phase 3: Ideal State Node** - NL-to-schema success criteria definition
- [ ] **Phase 4: Probability-Weighted Estimation** - Cost ranges across conditional branches

## Phase Details

### Phase 0: Foundation
**Goal**: Codebase is refactored to support new features without performance degradation
**Depends on**: Nothing (first phase)
**Requirements**: FNDX-01, FNDX-02, FNDX-03
**Success Criteria** (what must be TRUE):
  1. User can add/remove nodes without visible UI lag (store subscriptions are efficient)
  2. Developer can run frontend tests via npm and backend tests via pytest
  3. User viewing EstimatePanel sees organized sub-sections instead of single monolithic view
**Plans**: 3 plans

Plans:
- [ ] 00-1-PLAN.md - Test framework setup (Vitest + pytest with smoke tests)
- [ ] 00-2-PLAN.md - Zustand store splitting (4 domain slices)
- [ ] 00-3-PLAN.md - EstimatePanel decomposition (6 sub-components)

### Phase 1: Condition Node
**Goal**: Users can model conditional branching in workflows with simulation probabilities
**Depends on**: Phase 0
**Requirements**: COND-01, COND-02, COND-03, COND-04, COND-05, COND-06
**Success Criteria** (what must be TRUE):
  1. User can drag Condition Node from toolbar to canvas
  2. User can connect nodes to True (green) and False (red) output handles separately
  3. User can enter condition expression and adjust probability slider (0-100%) where True + False = 100%
  4. User deletes Condition Node and all connected edges are removed automatically
  5. User clicks "Get Estimate" and backend recognizes condition branches
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 2: Canvas Metadata
**Goal**: Users see real-time graph health, risk assessment, and reachability feedback as they design
**Depends on**: Phase 1
**Requirements**: META-01, META-02, META-03, META-04, META-05, META-06, ESTM-04
**Success Criteria** (what must be TRUE):
  1. User adds/removes nodes and sees corner overlay update with node count, depth, and loop count
  2. User adds tool nodes and sees risk surface breakdown update (read/write/exec/network counts)
  3. User creates complex graph and sees risk score indicator (low/medium/high)
  4. User adds Ideal State Node and sees reachability flag showing whether workflow can reach it from Start
  5. User drags nodes rapidly and experiences no visible UI jank or lag
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Graph analysis utilities (TDD: BFS depth, DFS cycle detection, risk scoring, reachability)
- [ ] 02-02-PLAN.md — Canvas metadata overlay component (frosted glass HUD + Canvas integration)

### Phase 3: Ideal State Node
**Goal**: Users can define workflow success criteria in natural language and get structured schemas
**Depends on**: Phase 2
**Requirements**: IDST-01, IDST-02, IDST-03, IDST-04, IDST-05, IDST-06, IDST-07
**Success Criteria** (what must be TRUE):
  1. User adds Ideal State Node to canvas (system enforces maximum of one per canvas)
  2. User enters natural language success description and clicks "Generate Schema"
  3. User sees generated JSON schema with required fields, type constraints, and performance bounds
  4. User can manually edit generated schema after generation
  5. Invalid schemas are rejected by backend validation before returning to frontend
**Plans**: TBD

Plans:
- [ ] TBD

### Phase 4: Probability-Weighted Estimation
**Goal**: Users see cost and latency ranges reflecting branch probabilities across conditional paths
**Depends on**: Phase 1, Phase 3
**Requirements**: ESTM-01, ESTM-02, ESTM-03
**Success Criteria** (what must be TRUE):
  1. User creates workflow with condition branches and clicks "Get Estimate"
  2. User sees min/expected/max cost ranges instead of single values in EstimatePanel
  3. User adjusts condition probability sliders and sees estimate ranges update accordingly
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 0 -> 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Foundation | 0/3 | Planned | - |
| 1. Condition Node | 0/TBD | Not started | - |
| 2. Canvas Metadata | 0/2 | Planned | - |
| 3. Ideal State Node | 0/TBD | Not started | - |
| 4. Probability-Weighted Estimation | 0/TBD | Not started | - |
