# Project Research Summary

**Project:** Neurovn Workflow Control & Analysis
**Domain:** AI workflow builder with conditional branching and pre-execution cost analysis
**Researched:** 2026-03-04
**Confidence:** MEDIUM

## Executive Summary

Neurovn is an AI workflow cost estimation tool built on Next.js + React Flow + FastAPI. This research addresses adding control flow (conditional branching) and static graph analysis (reachability, risk scoring) to enable probability-weighted cost estimation before workflow execution. The recommended approach builds incrementally on the existing stack, adding OpenAI/Anthropic for NL-to-JSON Schema generation, Ajv for frontend validation, and graphlib for real-time graph analysis.

The key technical challenge is performance: real-time graph analysis (BFS, cycle detection) must complete in <16ms to avoid UI jank during node dragging. The solution is frontend-only metadata computation with aggressive memoization, debouncing, and potential Web Worker offloading for large graphs. The key business risk is LLM API cost explosion from schema generation; mitigation requires client-side debouncing, backend caching, rate limiting, and defaulting to cheaper models (GPT-4o-mini or Claude Sonnet).

Critical dependencies emerge from research: (1) Condition Node must come first as foundation for all branching features; (2) Frontend graph analysis enables immediate metadata feedback without API latency; (3) Ideal State Node requires LLM integration but can be built in parallel with frontend features; (4) Probability-weighted estimation is most complex and depends on all node types existing. A Phase 0 refactoring (split Zustand store, add tests) is strongly recommended before implementing new features to avoid compounding existing technical debt.

## Key Findings

### Recommended Stack

The research recommends incremental additions to the existing Next.js + React Flow + FastAPI + Pydantic v2 stack rather than introducing new frameworks. All additions are mature, well-documented libraries with strong TypeScript/Python support.

**Core technologies:**
- **OpenAI Python SDK (1.59.x)**: LLM API for NL-to-JSON Schema generation — industry standard with native JSON Schema mode for structured outputs; cheaper alternative is Anthropic Claude SDK
- **Ajv (8.17.x)**: Frontend JSON Schema validation — most widely adopted (50M+ weekly downloads), supports Draft 2020-12
- **graphlib (2.1.x)**: Frontend graph algorithms (BFS, topological sort, cycle detection) — lightweight (12KB), pure JS implementation
- **@radix-ui/react-slider (1.2.x)**: Probability slider for condition nodes — consistent with existing Radix UI usage, accessible

**Notable decisions:**
- Pydantic v2 already installed; no additional backend validation library needed
- Client-side graph analysis with graphlib enables real-time feedback without API round-trips
- LLM provider choice is flexible (OpenAI vs Anthropic); start with OpenAI for structured output simplicity

**Risk factors:**
- LLM API costs (mitigate with GPT-4o-mini, caching, rate limits)
- LLM hallucination producing invalid schemas (mitigate with validation layer)
- Frontend graph computation jank on large workflows (mitigate with memoization, debouncing, Web Workers)

### Expected Features

**Must have (table stakes):**
- Binary conditional (if/else) — every workflow tool has branching; n8n IF node, Node-RED Switch, LangGraph conditional edges
- Loop detection warning — infinite loops break workflows; n8n and Node-RED both detect cycles
- Connection validation — prevent invalid connections; type mismatches, multiple inputs where not allowed
- Undo/redo — standard expectation for visual editors
- Copy/paste nodes — n8n, Node-RED, LangGraph Studio all support preserving connections

**Should have (competitive advantage):**
- **Probability-weighted cost estimation** — unique to Neurovn; simulate branch probabilities to estimate cost ranges before execution
- **Natural language success criteria** — convert "workflow succeeds when..." to JSON Schema via LLM; better UX than manual authoring
- **Pre-execution reachability analysis** — static graph analysis to prove workflow can reach success state before running
- **Real-time canvas metadata overlay** — live-updating corner stats (node count, depth, loops, risk) as user edits
- **Risk scoring aggregation** — roll up tool risk tiers, loop depth, graph complexity into unified risk score

**Defer (v2+):**
- Switch/router node (multi-branch) — binary conditions handle most cases through composition
- Built-in execution engine — massive scope increase; focus on pre-run analysis value prop first
- Real-time collaborative editing — conflict resolution is hard; async collaboration (save/load, version history) is simpler
- Schema coverage analysis — requires deep type inference and execution traces; defer until post-execution validation exists

**Anti-features (commonly requested, often problematic):**
- Visual data mapping UI — breaks down with complex transforms; code/expression editor scales better
- Auto-layout/force-directed graph — destroys user's spatial memory; layout assist (snap, align) is better
- Live execution preview — mixes design and runtime concerns; state management complexity explodes

### Architecture Approach

The architecture follows a frontend-heavy analysis pattern with backend reserved for complex computation and LLM integration. Graph analysis (reachability, cycle detection, depth) runs synchronously on the frontend using memoized computations triggered by nodes/edges changes. This enables real-time metadata overlay without API latency. Backend handles probability-weighted estimation (complex traversal with branch weights), NL-to-schema generation (LLM API calls), and cost aggregation.

**Major components:**
1. **Condition Node** — React Flow custom node with dual output handles (true/false), expression field, and probability slider; unique handle IDs prevent collision bugs
2. **Canvas Metadata Overlay** — corner widget displaying real-time graph metrics; uses useMemo with nodes/edges dependencies; debounced for performance
3. **Frontend Graph Engine** — utility functions for BFS reachability, cycle detection (back-edges), depth calculation, and risk scoring; synchronous, <16ms execution target
4. **Probability-Weighted Estimator** — backend service extending existing estimator to split estimation by condition branches and compute weighted cost ranges (min/avg/max)
5. **NL-to-Schema Generator** — backend LLM integration converting natural language to JSON Schema; includes validation layer and caching to control costs
6. **Ideal State Node** — React Flow custom node defining workflow success criteria; stores generated JSON Schema and displays preview

**Critical architectural patterns:**
- **Dual-handle branching**: Condition nodes have exactly two output handles; probability slider (0-100%) determines estimation weight for each branch
- **Frontend-computed metadata**: Graph metrics computed in frontend on every nodes/edges change; zero API latency; memoized to avoid recomputation
- **Probability-weighted estimation**: Backend computes separate cost/latency for each branch path, returns weighted average based on probability sliders
- **LLM-powered schema generation**: User enters NL description, backend calls LLM with structured prompt, returns validated JSON Schema

**Integration boundaries:**
- Frontend ↔ Backend (Estimation): REST POST /api/estimate with condition node probabilities; response includes branch breakdown
- Frontend ↔ Backend (Schema Gen): REST POST /api/nl-to-schema with NL string; returns JSON Schema
- MetadataOverlay ↔ Graph Analysis: Synchronous function call; must complete <10ms for smooth UX

### Critical Pitfalls

1. **Handle ID Collisions with Conditional Branching** — React Flow nodes with multiple output handles render non-unique IDs, causing edge connection bugs. Edges connect to wrong handles or detach silently. **Avoid:** Handle IDs must include node ID + handle type (`${nodeId}-output-true`); never use static IDs like "output"; validate uniqueness in onConnect handler. **Phase:** 1 (Condition Node)

2. **Infinite Re-renders from Real-time Graph Analysis** — Canvas metadata overlay computes graph metrics on every render, causing 100+ renders per second during drag operations. UI becomes unresponsive. **Avoid:** Never compute graph metrics in render; use useMemo with [nodes, edges] dependencies; debounce computation (100-200ms after last change); move to Web Worker if graph exceeds 25 nodes. **Phase:** 2 (Canvas Metadata)

3. **Probability Math Errors in Weighted Estimation** — Condition nodes with probability sliders produce incorrect cost estimates because branch probabilities don't sum correctly across parallel paths. **Avoid:** Always normalize branch probabilities to sum to 1.0; track probability by path, not by node; use Monte Carlo simulation for 3+ nested conditions; validate that all branches sum to 1.0 ± 0.001. **Phase:** 3 (Probability-weighted Estimation)

4. **LLM Schema Generation Cost Explosion** — NL-to-schema endpoint uses LLM for every request without caching or rate limiting. Single user generates 50 LLM calls in 5 minutes; monthly bill reaches $1000+. **Avoid:** Client-side debouncing (1-2s after typing stops); request deduplication (hash prompt, return cached); rate limiting (10 req/min, 100/day); use GPT-4o-mini; backend timeout (15s). **Phase:** 4 (LLM Integration)

5. **Zustand Store Subscription Explosion** — Every node component subscribes to entire Zustand store; adding canvas metadata overlay triggers re-render of all 50+ nodes every 200ms. Canvas becomes unusable. **Avoid:** Split store into slices (workflow data, metadata, UI state); use selector hooks; never call useWorkflowStore() directly; colocate metadata in separate store. **Phase:** 0 (Foundation Refactoring)

**Technical debt requiring Phase 0 attention:**
- 967-line monolithic Zustand store will break under metadata overlay feature
- No test framework means no safety net for complex probability math
- 1729-line EstimatePanel component needs splitting before adding probability ranges

## Implications for Roadmap

Based on research, suggested phase structure contains 5 phases with Phase 0 as critical foundation work.

### Phase 0: Foundation Refactoring
**Rationale:** Existing technical debt (967-line Zustand store, no tests, 1729-line EstimatePanel) will compound with new features. Refactor before implementing to avoid performance and maintainability crisis.

**Delivers:**
- Split Zustand store into domain slices (workflow, metadata, UI)
- Add test framework (Vitest + React Testing Library for frontend, pytest for backend)
- Refactor EstimatePanel into sub-components

**Addresses:** Pitfall #8 (Zustand subscription explosion)

**Avoids:** Adding features that amplify existing problems

**Research flag:** LOW — standard refactoring patterns; no deep research needed

---

### Phase 1: Condition Node (Foundation)
**Rationale:** Conditional branching is the foundation for all control flow features. Other features (probability estimation, reachability analysis) depend on condition nodes existing. Table stakes feature that users expect.

**Delivers:**
- ConditionNode component with dual output handles (true/false)
- Expression field for condition logic
- Probability slider (0-100%) for simulation weighting
- Handle ID collision prevention (unique IDs per node)
- Orphaned edge cleanup on node deletion

**Addresses:**
- Table stakes: Binary conditional (if/else)
- Pitfall #1 (Handle ID collisions)
- Pitfall #6 (Orphaned branches)

**Avoids:** Building features that depend on branching before branching exists

**Research flag:** LOW — React Flow custom node patterns are well-established; requires implementation focus on handle uniqueness

---

### Phase 2: Frontend Graph Analysis (Metadata Layer)
**Rationale:** Provides immediate value with no backend dependency. Real-time feedback as user edits. Can be built in parallel with Phase 3. Frontend-only implementation avoids API latency.

**Delivers:**
- graphlib integration for BFS, cycle detection, depth calculation
- MetadataOverlay component (corner widget)
- Risk scoring algorithm (tool tiers + loop depth + complexity)
- Reachability analysis (Start → Ideal State path check)
- Performance optimization (memoization, debouncing)

**Uses:**
- graphlib (2.1.x) for graph algorithms
- Zustand metadata store (from Phase 0 refactoring)

**Implements:**
- Frontend Graph Engine architecture component
- Canvas Metadata Overlay architecture component

**Addresses:**
- Differentiator: Real-time canvas metadata overlay
- Differentiator: Pre-execution reachability analysis
- Differentiator: Risk scoring aggregation
- Pitfall #2 (Infinite re-renders)
- Pitfall #5 (Stale reachability analysis)

**Avoids:** API latency for metadata updates; backend becomes bottleneck

**Research flag:** LOW — BFS/DFS are standard algorithms; focus on performance optimization patterns

---

### Phase 3: Ideal State Node + NL-to-Schema (LLM Integration)
**Rationale:** More complex than Phase 2; requires external LLM API setup. Can be built in parallel with Phase 2 (no shared dependencies). Differentiator feature that makes success criteria first-class.

**Delivers:**
- IdealStateNode component with NL input and schema preview
- Backend /api/nl-to-schema endpoint
- OpenAI API integration with structured outputs
- Schema validation layer (Pydantic + JSON Schema)
- LLM cost controls (caching, rate limiting, debouncing)

**Uses:**
- OpenAI Python SDK (1.59.x) or Anthropic SDK
- Ajv (8.17.x) for frontend schema validation
- Pydantic v2 for backend schema validation

**Implements:**
- NL-to-Schema Generator architecture component
- Ideal State Node architecture component

**Addresses:**
- Differentiator: Natural language success criteria
- Pitfall #4 (LLM cost explosion)
- Pitfall #7 (Schema drift from regeneration)
- Pitfall #10 (LLM prompt injection)

**Avoids:** Manual JSON Schema authoring UX; makes goals visual and declarative

**Research flag:** MEDIUM — LLM integration patterns are straightforward, but prompt engineering for schema generation and cost control strategies need validation during implementation

---

### Phase 4: Probability-Weighted Estimation (Backend Extension)
**Rationale:** Most complex feature; depends on all node types existing (Condition Node from Phase 1, Ideal State from Phase 3). Extends existing estimator with branching logic. Key differentiator that enables "what-if" cost modeling.

**Delivers:**
- Extended estimator.py with branch detection and weighted calculation
- Cost range computation (min/avg/max based on probabilities)
- Branch breakdown visualization in EstimatePanel
- Probability validation (sum to 1.0, normalization)
- Monte Carlo simulation for nested conditions (3+ levels)

**Uses:**
- Existing estimator.py, graph_analyzer.py, pricing_registry.py
- Condition node probability data from Phase 1

**Implements:**
- Probability-Weighted Estimator architecture component

**Addresses:**
- Differentiator: Probability-weighted cost estimation (unique to Neurovn)
- Pitfall #3 (Probability math errors)
- Pitfall #9 (Missing probability validation in backend)

**Avoids:** Single-value estimates that don't reflect branch variability

**Research flag:** MEDIUM — Probability-weighted graph traversal logic needs careful design; combinatorial explosion with nested conditions requires smart sampling strategy

---

### Phase Ordering Rationale

**Sequential dependencies:**
- Phase 0 must complete before Phase 1 (store refactoring prevents performance issues)
- Phase 1 (Condition Node) must complete before Phase 4 (Probability Estimation) since estimation depends on probability slider data
- Phase 4 is last because it requires both Condition Node (Phase 1) and extending existing estimator

**Parallelizable:**
- Phase 2 (Frontend Graph Analysis) and Phase 3 (Ideal State + LLM) can be built simultaneously (no shared dependencies; Phase 2 is frontend-only, Phase 3 is backend-focused)

**Value delivery:**
- Phase 0 de-risks the entire project by addressing technical debt
- Phase 1 is foundation for all branching features
- Phase 2 provides immediate visual feedback (high value/cost ratio)
- Phase 3 is complex but can be built in parallel with Phase 2
- Phase 4 delivers the key differentiator (probability-weighted estimation) once all pieces exist

**Pitfall mitigation:**
- Phase 0 addresses Pitfall #8 (Zustand subscriptions) before adding features
- Phase 1 addresses Pitfall #1 and #6 (handle collisions, orphaned edges) at foundation
- Phase 2 addresses Pitfall #2 and #5 (re-renders, stale analysis) during implementation
- Phase 3 addresses Pitfall #4, #7, #10 (LLM costs, schema drift, prompt injection) with controls from day 1
- Phase 4 addresses Pitfall #3 and #9 (probability math, backend validation) with upfront design

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (LLM Integration):** LLM prompt engineering for schema generation needs validation; cost control strategies need real-world testing with usage patterns; schema validation edge cases need exploration
- **Phase 4 (Probability Estimation):** Probability-weighted graph traversal with nested conditions has combinatorial complexity; Monte Carlo sampling strategy needs design; may need `/gsd:research-phase` for optimal algorithm selection

**Phases with standard patterns (skip research-phase):**
- **Phase 0 (Foundation):** Standard Zustand store splitting and React component refactoring; well-documented patterns
- **Phase 1 (Condition Node):** Standard React Flow custom node pattern; existing codebase has similar nodes; focus on implementation, not research
- **Phase 2 (Frontend Graph Analysis):** Standard BFS/DFS algorithms; optimization patterns (memoization, debouncing, Web Workers) are well-established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Library recommendations are mature, well-documented choices; OpenAI/Anthropic are industry standard for LLM integration; Ajv is most popular JSON Schema validator; graphlib is established successor to dagre |
| Features | MEDIUM | Feature landscape based on n8n, Node-RED, LangGraph, Flowise training data (not verified with current documentation); table stakes vs differentiators are sound but competitor capabilities may have evolved since Jan 2025 |
| Architecture | MEDIUM | Patterns are based on codebase analysis + React Flow/Zustand training data; build order logic is sound but specific performance thresholds (16ms, 25 nodes) are estimates not tested on this codebase |
| Pitfalls | MEDIUM | Pitfalls synthesized from React/React Flow/LLM integration training data + existing codebase concerns; specific risk scenarios (cost explosion, re-render counts) are reasonable but not empirically validated |

**Overall confidence:** MEDIUM

### Gaps to Address

- **LLM provider selection:** Research recommends OpenAI for structured output simplicity, but Anthropic Claude may be cheaper; final choice should consider rate limits, pricing evolution, and team preference. **Handle:** Prototype both in Phase 3; make data-driven decision based on cost and reliability.

- **Performance thresholds:** Research suggests <16ms for graph analysis, debounce at 100-200ms, Web Worker at 25+ nodes; these are estimates not tested on actual codebase. **Handle:** Add performance monitoring in Phase 2; adjust thresholds based on profiling data.

- **Nested condition complexity:** Research identifies combinatorial explosion with 3+ nested conditions but doesn't specify optimal algorithm (exhaustive vs Monte Carlo sampling). **Handle:** Use `/gsd:research-phase` in Phase 4 to research path enumeration strategies.

- **Schema coverage analysis:** Deferred to v2+, but architecture should allow extension (e.g., tracking field origins through graph, AST analysis of agent outputs). **Handle:** Note in Phase 3 architecture; design Ideal State Node to be extensible for future validation enhancements.

- **Execution integration:** Anti-feature for v1; focus on pre-run analysis. **Handle:** Document export patterns (LangGraph, Flowise) for future integration; keep execution concerns separate from design-time analysis.

## Sources

### Primary (HIGH confidence)
- **OpenAI Structured Outputs:** https://platform.openai.com/docs/guides/structured-outputs — verified syntax for `response_format` with JSON Schema mode
- **Ajv Documentation:** https://ajv.js.org/ — JSON Schema validator spec compliance, version compatibility
- **Pydantic v2 JSON Schema:** https://docs.pydantic.dev/latest/concepts/json_schema/ — `.model_json_schema()` method, validation patterns
- **Radix UI Slider:** https://www.radix-ui.com/primitives/docs/components/slider — API for accessible slider component
- **graphlib:** https://github.com/dagrejs/graphlib — graph algorithm implementations

### Secondary (MEDIUM confidence)
- **React Flow patterns:** Training data on React Flow 11.x custom node patterns, handle management, state integration
- **n8n/Node-RED/LangGraph feature analysis:** Training data on workflow builder patterns, conditional logic implementations, success criteria approaches
- **Existing codebase analysis:** .planning/codebase/ARCHITECTURE.md, .planning/codebase/CONCERNS.md — current stack, technical debt, component structure
- **Zustand performance optimization:** Training data on store splitting, selector patterns, subscription management

### Tertiary (LOW confidence, needs validation)
- **Specific version numbers:** Latest versions as of Jan 2025 training cutoff; verify npm/PyPI for current stable releases before installation
- **Flowise capabilities:** Rapidly evolving tool; specific feature set may have changed since training data
- **LangGraph Studio features:** New tool at time of training; may have added analysis capabilities since January 2025
- **Performance thresholds:** 16ms render budget, 25-node Web Worker threshold are general guidelines not tested on this specific codebase

---
*Research completed: 2026-03-04*
*Ready for roadmap: yes*
