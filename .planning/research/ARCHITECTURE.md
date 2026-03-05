# Architecture Research: Workflow Control Systems

**Domain:** Canvas-based workflow builder with conditional branching, schema validation, and real-time graph analysis
**Researched:** 2026-03-04
**Confidence:** MEDIUM (based on existing codebase patterns + training data on workflow systems)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER (React)                     │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Canvas   │  │ Condition│  │  Ideal   │  │ Metadata │          │
│  │ Editor   │  │   Node   │  │  State   │  │ Overlay  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │             │              │             │                │
├───────┴─────────────┴──────────────┴─────────────┴────────────────┤
│                    STATE MANAGEMENT (Zustand)                      │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐      │
│  │            Graph Analysis Engine (Frontend)             │      │
│  │  • Reachability check • Path finding • Risk scoring    │      │
│  └──────────────────────┬──────────────────────────────────┘      │
│                         │                                         │
├─────────────────────────┼─────────────────────────────────────────┤
│                         │         API BOUNDARY                    │
│                         ↓                                         │
├───────────────────────────────────────────────────────────────────┤
│                      BACKEND API (FastAPI)                        │
├───────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │  Probability-    │  │  NL-to-Schema    │  │   Estimation   │  │
│  │  Weighted        │  │  Generator       │  │   Engine       │  │
│  │  Estimator       │  │  (LLM)           │  │   (existing)   │  │
│  └────┬─────────────┘  └────┬─────────────┘  └────┬───────────┘  │
│       │                     │                     │              │
├───────┴─────────────────────┴─────────────────────┴──────────────┤
│                   COMPUTATION & DATA STORES                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Graph      │  │   Pricing    │  │   Schema     │            │
│  │  Analyzer    │  │   Registry   │  │  Validator   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Condition Node** | Visual representation of if/else branching with two outputs (true/false handles); stores condition expression + probability slider | React Flow custom node with NodeResizer, true/false Handle components, Monaco editor for condition expression |
| **Ideal State Node** | Success criteria definition using NL-to-schema conversion; single per canvas; renders generated JSON schema | React Flow custom node with textarea for NL input, button to trigger schema generation, collapsible schema preview |
| **Canvas Metadata Overlay** | Real-time display of graph metrics (node count, depth, loops, risk score); updates on every graph change | React component positioned absolutely in canvas corner; memoized computation triggered by nodes/edges changes |
| **Frontend Graph Engine** | Static analysis for reachability, path finding, depth calculation, loop detection; runs synchronously on graph updates | Utility functions using BFS/DFS for reachability, longest-path for depth, cycle detection via back-edges |
| **Probability-Weighted Estimator** | Extends existing estimator to handle conditional branches; calculates cost/latency ranges based on branch probabilities | Backend computation layer that walks graph, identifies condition nodes, splits estimation into weighted branches |
| **NL-to-Schema Endpoint** | LLM-powered conversion from natural language to JSON Schema; validates generated schema | FastAPI endpoint calling OpenAI/Anthropic API with structured prompt, returns JSON Schema with types/constraints |
| **Schema Validator** | Validates generated JSON schema correctness; future: checks if workflow can produce required fields | Python jsonschema library for structural validation; AST analysis for field coverage (future phase) |

## Recommended Project Structure

### Frontend Additions

```
frontend/src/
├── components/
│   ├── nodes/
│   │   ├── ConditionNode.tsx        # Binary branching node with true/false handles
│   │   └── IdealStateNode.tsx       # Success criteria node with NL-to-schema
│   ├── canvas/
│   │   └── MetadataOverlay.tsx      # Real-time graph metrics display
│   └── modals/
│       └── SchemaPreviewModal.tsx   # Preview generated JSON schema
├── lib/
│   ├── graphAnalysis.ts             # Frontend graph utilities (reachability, depth, risk)
│   └── schemaValidation.ts          # Client-side schema validation helpers
├── store/
│   └── useWorkflowStore.ts          # Add idealStateNodeId, metadata fields
└── types/
    └── workflow.ts                  # Add ConditionNodeData, IdealStateNodeData types
```

### Backend Additions

```
backend/
├── endpoints/
│   └── nl_to_schema.py              # POST /api/nl-to-schema endpoint
├── estimator.py                     # Extend with probability-weighted calculation
├── schema_generator.py              # LLM prompt engineering for schema generation
├── schema_validator.py              # JSON Schema structural validation
└── models.py                        # ConditionNodeConfig, IdealStateConfig, ProbabilityWeightedEstimation
```

### Structure Rationale

- **Frontend graph analysis separate from backend:** Enables real-time feedback without API latency; backend handles complex estimation only
- **NL-to-schema as dedicated module:** Isolates LLM integration; easier to swap providers or add caching
- **Metadata overlay colocated with canvas:** Tight coupling with React Flow; needs direct access to nodes/edges
- **Probability-weighted estimator extends existing:** Preserves current estimation logic; adds branching multipliers on top

## Architectural Patterns

### Pattern 1: Dual-Handle Branching Node

**What:** Condition nodes have two output handles (true/false) that connect to different downstream paths. Probability slider (0-100%) determines estimation weight for each branch.

**When to use:** Binary decision points in workflows (if/else, success/failure, threshold checks)

**Trade-offs:**
- **Pro:** Clear visual semantics (true/false labels); easy to follow execution paths
- **Pro:** Probability slider enables pre-run cost estimation across branches
- **Con:** Limited to binary branches (no switch-case or multi-way branching)
- **Con:** Frontend must enforce "exactly 2 outgoing edges" validation

**Example:**
```typescript
// ConditionNode.tsx
export function ConditionNode({ data, id }: NodeProps<ConditionNodeData>) {
  return (
    <div className="condition-node">
      <Handle type="target" position={Position.Top} id={`${id}-input`} />

      {/* Condition expression editor */}
      <textarea
        value={data.expression}
        onChange={(e) => updateNodeData(id, { expression: e.target.value })}
        placeholder="Enter condition (e.g., response.confidence > 0.8)"
      />

      {/* Probability slider for estimation */}
      <label>True branch probability: {data.probability}%</label>
      <input
        type="range"
        min="0"
        max="100"
        value={data.probability}
        onChange={(e) => updateNodeData(id, { probability: Number(e.target.value) })}
      />

      {/* Dual output handles */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-true`}
        style={{ top: '30%', background: 'green' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id={`${id}-false`}
        style={{ top: '70%', background: 'red' }}
      />
    </div>
  );
}
```

### Pattern 2: Frontend-Computed Metadata Layer

**What:** Graph metrics (node count, max depth, cycle count, risk score) are computed in the frontend on every nodes/edges change and displayed in a corner overlay. No backend round-trip.

**When to use:** Metrics that need instant feedback as user edits; don't require heavy computation (BFS/DFS under 10ms for graphs <500 nodes)

**Trade-offs:**
- **Pro:** Zero latency; updates instantly as user drags nodes
- **Pro:** Reduces backend API calls
- **Con:** Duplicates some graph analysis logic between frontend/backend
- **Con:** Complex metrics (e.g., probabilistic cost) still need backend

**Example:**
```typescript
// lib/graphAnalysis.ts
export function computeGraphMetrics(
  nodes: Node[],
  edges: Edge[]
): GraphMetrics {
  const nodeCount = nodes.length;

  // BFS for max depth from start node
  const startNode = nodes.find(n => n.type === 'startNode');
  const depth = startNode ? computeMaxDepth(startNode.id, edges) : 0;

  // Detect back-edges for loop count
  const loops = detectBackEdges(nodes, edges).length;

  // Risk scoring (tool tier + loop depth + complexity)
  const riskScore = computeRiskScore(nodes, edges, loops, depth);

  return { nodeCount, depth, loops, riskScore };
}

// MetadataOverlay.tsx
export function MetadataOverlay() {
  const nodes = useNodes();
  const edges = useEdges();

  const metrics = useMemo(
    () => computeGraphMetrics(nodes, edges),
    [nodes, edges] // Recompute only when graph changes
  );

  return (
    <div className="absolute top-4 left-4 bg-white/90 p-3 rounded shadow">
      <div>Nodes: {metrics.nodeCount}</div>
      <div>Max Depth: {metrics.depth}</div>
      <div>Loops: {metrics.loops}</div>
      <div>Risk: {metrics.riskScore}</div>
    </div>
  );
}
```

### Pattern 3: Probability-Weighted Estimation

**What:** When estimating workflows with condition nodes, compute separate cost/latency for each branch, then return weighted average based on probability sliders. Produces min/avg/max ranges.

**When to use:** Pre-run cost estimation for workflows with conditional branching

**Trade-offs:**
- **Pro:** Provides realistic cost ranges before execution
- **Pro:** User can tune probabilities to see impact on total cost
- **Con:** Assumes independence (doesn't model correlated branches)
- **Con:** Nested conditions multiply complexity (combinatorial explosion)

**Example:**
```python
# estimator.py
def estimate_with_branches(
    nodes: list[NodeConfig],
    edges: list[EdgeConfig],
    recursion_limit: int
) -> ProbabilityWeightedEstimation:
    # Find all condition nodes
    condition_nodes = [n for n in nodes if n.node_type == "conditionNode"]

    if not condition_nodes:
        # No branching, use existing estimator
        return estimate_workflow(nodes, edges, recursion_limit)

    # Walk graph, compute cost for each branch path
    branches = []
    for condition in condition_nodes:
        # Find outgoing edges from true/false handles
        true_edge = next(e for e in edges if e.source_handle == f"{condition.id}-true")
        false_edge = next(e for e in edges if e.source_handle == f"{condition.id}-false")

        # Estimate cost down each branch
        true_path = compute_branch_cost(condition.id, true_edge, nodes, edges)
        false_path = compute_branch_cost(condition.id, false_edge, nodes, edges)

        # Weight by probability
        prob_true = condition.data.get("probability", 50) / 100
        prob_false = 1 - prob_true

        weighted_cost = (true_path.cost * prob_true) + (false_path.cost * prob_false)

        branches.append({
            "condition_id": condition.id,
            "true_branch": true_path,
            "false_branch": false_path,
            "weighted_cost": weighted_cost
        })

    # Roll up total cost with ranges
    total_min = sum(b["false_branch"].cost for b in branches)  # Cheapest path
    total_avg = sum(b["weighted_cost"] for b in branches)
    total_max = sum(b["true_branch"].cost for b in branches)  # Most expensive path

    return ProbabilityWeightedEstimation(
        min_cost=total_min,
        avg_cost=total_avg,
        max_cost=total_max,
        branches=branches
    )
```

### Pattern 4: LLM-Powered Schema Generation

**What:** User enters natural language description of success criteria (e.g., "Response must include a list of products with name and price fields"). Backend calls LLM with structured prompt to generate JSON Schema.

**When to use:** When manual JSON Schema authoring is too complex for target users; success criteria are human-readable

**Trade-offs:**
- **Pro:** Much better UX than raw JSON editing
- **Pro:** LLM can infer types/constraints from context
- **Con:** Requires API key management and cost per generation
- **Con:** LLM may hallucinate invalid schemas (need validation layer)

**Example:**
```python
# schema_generator.py
import anthropic

SCHEMA_GENERATION_PROMPT = """
You are a JSON Schema generator. Convert the following natural language description of success criteria into valid JSON Schema (draft-07).

Requirements:
- Output ONLY valid JSON Schema
- Include "type", "properties", "required" fields
- Infer field types from description (string, number, boolean, array, object)
- Add "description" fields for clarity

User description:
{nl_description}

JSON Schema:
"""

async def generate_schema_from_nl(nl_description: str) -> dict:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": SCHEMA_GENERATION_PROMPT.format(nl_description=nl_description)
        }]
    )

    schema_json = json.loads(message.content[0].text)

    # Validate structure
    validate_schema_structure(schema_json)

    return schema_json

# endpoints/nl_to_schema.py
@app.post("/api/nl-to-schema", response_model=GeneratedSchema)
async def nl_to_schema(request: NLSchemaRequest):
    try:
        schema = await generate_schema_from_nl(request.description)
        return GeneratedSchema(schema=schema, confidence="high")
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="LLM generated invalid JSON")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=f"Invalid schema structure: {e}")
```

### Pattern 5: Reachability Analysis via BFS

**What:** Before workflow can be considered valid, check if there exists a path from Start node to Ideal State node. Uses breadth-first search to traverse graph, ignoring probability weighting.

**When to use:** Workflow validation; detecting unreachable success criteria

**Trade-offs:**
- **Pro:** Fast (O(V+E)); can run on every graph edit
- **Pro:** Catches common mistakes (orphaned nodes, disconnected ideal state)
- **Con:** Doesn't account for runtime conditions (e.g., if false branch never reaches ideal state)
- **Con:** Cycles complicate analysis (need visited set to prevent infinite loops)

**Example:**
```typescript
// lib/graphAnalysis.ts
export function checkReachability(
  startNodeId: string,
  targetNodeId: string,
  edges: Edge[]
): { reachable: boolean; path?: string[] } {
  const adjacency = buildAdjacencyList(edges);

  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const parent = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current === targetNodeId) {
      // Reconstruct path
      const path: string[] = [];
      let node = targetNodeId;
      while (node !== startNodeId) {
        path.unshift(node);
        node = parent.get(node)!;
      }
      path.unshift(startNodeId);

      return { reachable: true, path };
    }

    for (const neighbor of adjacency.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return { reachable: false };
}
```

## Data Flow

### Request Flow: Condition Node Estimation

```
User adjusts probability slider
    ↓
updateNodeData(id, { probability: X })
    ↓
useWorkflowStore.setState({ nodes: [...updated] })
    ↓
User clicks "Get Estimate"
    ↓
POST /api/estimate { nodes, edges, ... }
    ↓
Backend: detect condition nodes → split paths → weighted calculation
    ↓
Return ProbabilityWeightedEstimation { min_cost, avg_cost, max_cost, branches }
    ↓
EstimatePanel displays ranges as bar chart (min | avg | max)
```

### Request Flow: NL-to-Schema Generation

```
User types NL description in Ideal State Node
    ↓
Click "Generate Schema"
    ↓
POST /api/nl-to-schema { description: "..." }
    ↓
Backend: call LLM with structured prompt
    ↓
LLM returns JSON Schema
    ↓
Validate schema structure (jsonschema library)
    ↓
Return GeneratedSchema { schema, confidence }
    ↓
Update IdealStateNode data with schema
    ↓
Display schema in collapsible preview
```

### State Flow: Real-Time Metadata

```
User drags node / adds edge
    ↓
React Flow triggers onNodesChange / onEdgesChange
    ↓
Zustand store updates nodes/edges
    ↓
MetadataOverlay useMemo re-runs
    ↓
computeGraphMetrics(nodes, edges) → GraphMetrics
    ↓
Overlay re-renders with new metrics (no API call)
```

### Key Data Flows

1. **Condition branching:** Probability slider changes trigger Zustand update → no backend call until estimation requested → backend splits estimation by branch → returns weighted ranges
2. **Schema generation:** NL input → backend LLM call → JSON Schema validation → stored in node data → displayed in preview
3. **Reachability check:** Graph edit → frontend BFS from Start to Ideal State → display warning if unreachable
4. **Risk scoring:** Graph edit → frontend computes risk (tool tiers + loop depth + complexity) → displayed in metadata overlay

## Component Boundaries

### Frontend Components

| Component | Owns | Communicates With |
|-----------|------|-------------------|
| **ConditionNode** | Expression string, probability slider state, true/false handle positions | Zustand (node data updates), React Flow (handle connections) |
| **IdealStateNode** | NL description, generated JSON Schema, schema preview visibility | Zustand (node data), Backend (/api/nl-to-schema) |
| **MetadataOverlay** | Graph metrics computation (node count, depth, loops, risk) | Zustand (subscribes to nodes/edges), graphAnalysis utility |
| **EstimatePanel** | Probability-weighted estimation display (ranges, branch breakdowns) | Backend (/api/estimate), Zustand (estimation results) |

### Backend Services

| Service | Owns | Communicates With |
|---------|------|-------------------|
| **Probability-Weighted Estimator** | Branch splitting logic, weighted cost calculation | GraphAnalyzer (existing), PricingRegistry (existing) |
| **NL-to-Schema Generator** | LLM API integration, prompt engineering | Anthropic/OpenAI API, SchemaValidator |
| **Schema Validator** | JSON Schema structural validation | jsonschema library (Python) |
| **Graph Analyzer** (existing) | Cycle detection, topological sort, SCC | Estimator (existing) |

### Integration Boundaries

| Boundary | Protocol | Notes |
|----------|----------|-------|
| **Frontend ↔ Backend (Estimation)** | REST (POST /api/estimate) | Payload includes condition node probabilities; response includes branch breakdown |
| **Frontend ↔ Backend (Schema Gen)** | REST (POST /api/nl-to-schema) | Single NL string input; JSON Schema output |
| **MetadataOverlay ↔ Graph Analysis** | Synchronous function call | No async; must complete <10ms for smooth UX |
| **ConditionNode ↔ React Flow** | Handle connection events | React Flow validates "exactly 2 outgoing edges" rule |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-500 nodes per workflow** | Current architecture sufficient; frontend graph analysis under 10ms |
| **500-2000 nodes** | Move complex metrics (risk scoring, deep path analysis) to Web Worker; debounce metadata computation |
| **2000+ nodes** | Backend-only graph analysis; frontend shows stale metrics until estimation completes; consider graph pagination/virtualization |

### Scaling Priorities

1. **First bottleneck: Frontend graph analysis on large graphs**
   - **Symptom:** Metadata overlay causes jank when dragging nodes
   - **Fix:** Debounce computation (300ms after last change), move to Web Worker, memoize intermediate results

2. **Second bottleneck: LLM schema generation latency**
   - **Symptom:** User waits 2-5s for schema generation
   - **Fix:** Add loading spinner, cache common patterns, consider streaming response

3. **Third bottleneck: Probability-weighted estimation with nested conditions**
   - **Symptom:** Exponential cost computation time with 3+ nested conditions
   - **Fix:** Limit nesting depth (warn user), sample paths instead of exhaustive search, cache intermediate branch costs

## Anti-Patterns

### Anti-Pattern 1: Computing All Graph Metrics on Every Render

**What people do:** Call `computeGraphMetrics()` in component body without useMemo
**Why it's wrong:** Causes BFS/DFS to re-run 60 times per second; locks UI thread; terrible UX
**Do this instead:** Wrap in `useMemo` with `[nodes, edges]` dependencies; debounce if still sluggish

### Anti-Pattern 2: Storing JSON Schema in Zustand as String

**What people do:** Store `schema: string` in node data, then `JSON.parse()` every time needed
**Why it's wrong:** Repeated parsing overhead; type safety lost; hard to validate
**Do this instead:** Store as `schema: object` (parsed JSON); Zustand handles serialization; validate once on generation

### Anti-Pattern 3: Blocking UI on LLM Schema Generation

**What people do:** Await schema generation without loading state; UI freezes
**Why it's wrong:** LLM calls take 2-5s; user thinks app crashed
**Do this instead:** Show loading spinner immediately, disable "Generate" button during call, allow cancel

### Anti-Pattern 4: Exhaustive Path Enumeration for Probability-Weighted Estimation

**What people do:** Generate all possible execution paths through nested conditions, compute cost for each
**Why it's wrong:** Combinatorial explosion (2^N paths for N conditions); backend times out
**Do this instead:** Limit nesting depth (e.g., 3 levels), warn user, or use Monte Carlo sampling (run 1000 simulations, report distribution)

### Anti-Pattern 5: Frontend-Backend Graph Analysis Inconsistency

**What people do:** Duplicate graph algorithms in frontend/backend with different implementations
**Why it's wrong:** Reachability check says "OK" but backend estimation fails; user confusion
**Do this instead:** Share algorithm via TypeScript/Python code generation, or make backend source of truth (frontend shows "checking..." until backend validates)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Anthropic API (Claude)** | HTTP REST via `anthropic` Python library | For NL-to-schema generation; requires `ANTHROPIC_API_KEY` env var; rate limits apply (5 req/min on free tier) |
| **OpenAI API (alternative)** | HTTP REST via `openai` Python library | Alternative to Anthropic; use structured outputs feature for schema generation |
| **JSON Schema Library** | Python `jsonschema` package | Validates generated schemas against draft-07 spec; no external API |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Zustand ↔ React Flow** | Bidirectional state sync | `onNodesChange`/`onEdgesChange` callbacks update Zustand; Zustand changes re-render React Flow |
| **MetadataOverlay ↔ GraphAnalysis** | Synchronous function call | Pure utility functions; no side effects; memoize results |
| **Estimator ↔ GraphAnalyzer** | Function call with NodeConfig/EdgeConfig | Existing pattern; extend to pass condition probabilities |
| **Backend ↔ LLM API** | Async HTTP request | Use `httpx.AsyncClient` for non-blocking; timeout after 30s |

## Build Order Implications

### Phase 1: Condition Node (Foundation)
**Why first:** Other features depend on branching being functional
- Add ConditionNode component with dual handles
- Extend WorkflowNodeData type
- Implement frontend validation (exactly 2 outgoing edges)
- Update React Flow node registry
- **Dependency:** None (builds on existing React Flow setup)

### Phase 2: Frontend Graph Analysis (Metadata Layer)
**Why second:** Provides immediate value; no backend dependency
- Build graphAnalysis utility (BFS, depth, cycle detection)
- Create MetadataOverlay component
- Add risk scoring algorithm
- Wire up to Zustand store
- **Dependency:** Needs node types defined (Phase 1)

### Phase 3: Ideal State Node + NL-to-Schema (LLM Integration)
**Why third:** More complex; requires external API setup
- Add IdealStateNode component
- Build backend NL-to-schema endpoint
- Integrate Anthropic API
- Add schema validation
- Create schema preview UI
- **Dependency:** None (parallel to Phase 1-2)

### Phase 4: Probability-Weighted Estimation (Backend Extension)
**Why last:** Most complex; depends on all node types existing
- Extend estimator.py with branch detection
- Implement weighted cost calculation
- Update EstimatePanel to show ranges
- Add branch breakdown visualization
- **Dependency:** Needs ConditionNode (Phase 1), existing estimator logic

### Critical Path
```
Phase 1 (ConditionNode) → Phase 2 (Metadata) → Phase 4 (Weighted Estimation)
                       ↘
                         Phase 3 (Ideal State + NL-to-Schema) → Phase 4
```

**Parallelizable:** Phase 2 and Phase 3 can be built simultaneously (no shared dependencies)
**Blocker:** Phase 4 requires Phase 1 complete; Phase 2 needs Phase 1 types defined

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| **Condition Node Architecture** | HIGH | Standard React Flow pattern; existing codebase has similar nodes; dual-handle is common in workflow tools |
| **Frontend Graph Analysis** | HIGH | BFS/DFS are well-understood algorithms; existing codebase already uses Tarjan in backend |
| **Probability-Weighted Estimation** | MEDIUM | Logic is sound, but combinatorial complexity with nested conditions needs careful handling |
| **NL-to-Schema Generation** | MEDIUM | LLM integration is straightforward, but schema validation and hallucination risk require testing |
| **Reachability Analysis** | HIGH | Standard BFS; existing backend has graph traversal infrastructure |

## Open Questions

1. **Nested condition depth limit:** Should we hard-cap at 3 levels or let users nest arbitrarily and warn on performance?
2. **Schema coverage analysis:** Deferred to future phase, but architecture should allow extension (e.g., AST analysis of agent outputs)
3. **Ideal State validation at runtime:** How does post-execution validation fit into this architecture? (Out of scope but worth considering)
4. **LLM provider selection:** Start with Anthropic or OpenAI? Should we support both and let user configure?
5. **Metadata overlay performance threshold:** At what node count do we move computation to Web Worker?

## Sources

- **Existing codebase:** `.planning/codebase/ARCHITECTURE.md` (HIGH confidence source)
- **React Flow patterns:** Training data on React Flow state management and custom nodes (MEDIUM confidence)
- **Graph algorithms:** Standard CS textbooks (BFS, DFS, Tarjan SCC) (HIGH confidence)
- **Workflow builder patterns:** Training data on tools like n8n, Zapier, Temporal (MEDIUM confidence)
- **LLM schema generation:** Training data on structured outputs and prompt engineering (MEDIUM confidence)

---
*Architecture research for: Workflow Control Systems*
*Researched: 2026-03-04*
*Confidence: MEDIUM (codebase analysis + training data; external verification unavailable)*
