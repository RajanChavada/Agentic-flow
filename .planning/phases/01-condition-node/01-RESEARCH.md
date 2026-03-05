# Phase 1: Condition Node - Research

**Researched:** 2026-03-04
**Domain:** React Flow custom nodes, conditional branching, multi-handle nodes
**Confidence:** HIGH

## Summary

Phase 1 adds a Condition Node (if/else) to enable binary branching in workflow graphs. Research focused on React Flow's multi-handle API, custom edge styling, shape rendering (diamond/hexagon), and backend graph routing patterns.

**Primary recommendation:** Use React Flow's Handle component with unique IDs for True/False outputs, leverage EdgeProps.sourceHandleId for color inheritance, implement hexagon shape via CSS clip-path, and extend backend estimator to route through both branches sequentially (probability weighting deferred to Phase 4).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Shape:** Diamond (classic flowchart decision symbol) — purple/violet color palette
- **toolNode shape change:** toolNode moves from diamond to hexagon to free diamond for conditionNode
- **Handle layout:**
  - Input: Top only (single entry point)
  - True output: Right side, green colored, with "True" text label
  - False output: Bottom side, red colored, with "False" text label
- **Edge coloring:** Edges connected to True/False handles inherit the handle color (green/red) for visual path tracing
- **Configuration:** Modal only (follows existing NodeConfigModal pattern, no inline config on node face)
- **Condition expression:** Plain text field, no validation, no autocomplete — human-readable label only (e.g., "sentiment > 0.7")
- **Probability slider:** Single slider controlling True probability (0-100%), False auto-computed as 100% - True
- **Default split:** 50% True / 50% False when new Condition Node is added
- **Node face display:** Title + Lucide icon only, no condition text or probability shown on node face
- **Phase scope:** Backend recognizes conditionNode and routes estimation through both branches — does NOT include:
  - Multi-way routing (3+ branches)
  - Runtime execution
  - Probability-weighted cost calculation (deferred to Phase 4)

### Claude's Discretion
- Specific Lucide icon choice (GitBranch, Split, ArrowLeftRight, or similar)
- Modal layout and field ordering
- Exact purple/violet shade for light and dark mode
- Hexagon rendering approach for toolNode swap
- Handle size and interaction affordance details
- Edge color implementation approach (custom edge component vs connection style)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COND-01 | User can add a Condition Node to the canvas via drag-and-drop from the toolbar | Sidebar PALETTE pattern + Canvas onDrop handler |
| COND-02 | Condition Node has two output handles: True (green) and False (red) with visual labels | React Flow Handle component with unique IDs + style prop for colors |
| COND-03 | User can enter a condition expression (text field) in the node configuration | NodeConfigModal extension pattern (already used for agentNode/toolNode) |
| COND-04 | User can set branch probability via slider (0-100%) where True + False always sums to 100% | Controlled input with complement calculation |
| COND-05 | Deleting a Condition Node removes all connected edges (cascade deletion) | Zustand deleteNode action already handles this via onNodesChange |
| COND-06 | Backend recognizes `conditionNode` type and routes estimation through both branches | Backend models.py Literal type + estimator.py branch routing logic |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.0 | Flow diagram library | Project's canvas foundation — handles nodes, edges, interactions |
| React | 19.2.3 | UI framework | Next.js App Router base, memo pattern for node components |
| Zustand | 5.0.11 | State management | Existing workflow store, fine-grained subscriptions for node updates |
| Tailwind CSS | v4 | Styling | Project-wide utility framework — note v4 syntax (`bg-white!` not `!bg-white`) |
| Lucide React | 0.564.0 | Icons | Project standard for all UI icons (no emojis) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FastAPI | (backend) | REST API | Backend estimation endpoint — Pydantic validation |
| Pydantic | v2 | Data validation | Backend models.py — NodeConfig type validation |
| tiktoken | (backend) | Token counting | Backend estimator.py — token estimation for LLM nodes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom edge component | Edge style prop only | Custom component needed for handle-based color inheritance (EdgeProps.sourceHandleId) |
| SVG shapes | CSS clip-path | clip-path is simpler, hardware-accelerated, no extra DOM elements |
| Separate True/False node types | Single conditionNode type | Single type with handle IDs is React Flow best practice |

**Installation:**
No new dependencies — all features use existing stack.

## Architecture Patterns

### Recommended Project Structure
Follows existing `.cursor/rules/new-node-type.mdc` pattern:

```
frontend/src/
├── components/
│   ├── nodes/
│   │   ├── WorkflowNode.tsx       # Update STYLE map + toolNode shape swap
│   │   └── ConditionNode.tsx      # NEW — custom component for condition logic
│   ├── Canvas.tsx                  # Add conditionNode to nodeTypes registration
│   ├── Sidebar.tsx                 # Add Condition to PALETTE array
│   └── ContextToolbar.tsx          # Add ConditionToolbarSection
├── types/
│   └── workflow.ts                 # Add "conditionNode" to WorkflowNodeType union
backend/
├── models.py                       # Add "conditionNode" to NodeConfig.type Literal
└── estimator.py                    # Add conditionNode branch routing logic
```

### Pattern 1: Multi-Handle Node
**What:** Node with multiple source handles on different sides with unique IDs
**When to use:** When a single node needs multiple typed outputs (True/False, success/error, etc.)
**Example:**
```tsx
// Source: React Flow docs — /learn/customization/handles + existing WorkflowNode.tsx pattern
import { Handle, Position } from "@xyflow/react";

export default function ConditionNode({ data }: NodeProps<ConditionNodeData>) {
  return (
    <div>
      {/* Single input handle at top */}
      <Handle id="t-top" type="target" position={Position.Top} />

      {/* True output: right side, green */}
      <Handle
        id="s-right-true"
        type="source"
        position={Position.Right}
        style={{ background: "#22c55e" }}  // Tailwind green-500
      />
      <span className="absolute right-[-40px] top-1/2 text-xs text-green-600">True</span>

      {/* False output: bottom side, red */}
      <Handle
        id="s-bottom-false"
        type="source"
        position={Position.Bottom}
        style={{ background: "#ef4444" }}  // Tailwind red-500
      />
      <span className="absolute bottom-[-20px] left-1/2 text-xs text-red-600">False</span>

      <div className="px-4 py-2">Condition</div>
    </div>
  );
}
```

**Key points:**
- Each handle MUST have unique `id` prop (React Flow requirement)
- Pattern: `"s-{position}-{type}"` for source, `"t-{position}"` for target
- Use `style` prop for custom colors (inline styles override default gray)
- Text labels positioned absolutely next to handles

### Pattern 2: Edge Color Inheritance from Handle
**What:** Custom edge component that reads sourceHandleId and applies color based on handle type
**When to use:** When edges should visually match their source handle (True=green, False=red)
**Example:**
```tsx
// Source: React Flow EdgeProps API + project AnnotationEdge.tsx pattern
import { EdgeProps, getBezierPath } from "@xyflow/react";

export default function ConditionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourceHandleId,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  // Determine color based on source handle
  let strokeColor = "#6b7280"; // default gray
  if (sourceHandleId?.includes("true")) {
    strokeColor = "#22c55e"; // green for True
  } else if (sourceHandleId?.includes("false")) {
    strokeColor = "#ef4444"; // red for False
  }

  return (
    <path
      id={id}
      d={edgePath}
      fill="none"
      stroke={strokeColor}
      strokeWidth={2}
      markerEnd={markerEnd}
      style={{ ...style, stroke: strokeColor }}
    />
  );
}
```

**Key points:**
- `EdgeProps.sourceHandleId` is `string | null` — check for null before parsing
- ID naming convention enables pattern matching (e.g., `includes("true")`)
- Apply color to both `stroke` attribute and `style.stroke` for consistency
- Update `markerEnd.color` to match stroke for arrow color coordination

### Pattern 3: Hexagon Shape (CSS clip-path)
**What:** Hexagon shape via CSS clip-path polygon (for toolNode swap)
**When to use:** Any non-standard geometric shape (hexagon, pentagon, star, etc.)
**Example:**
```tsx
// Source: CSS-Tricks polygon guide + existing WorkflowNode.tsx ShapeIndicator
function NodeShape({ shape, color }: { shape: string; color: string }) {
  if (shape === "hexagon") {
    return (
      <span
        className={`inline-block w-4 h-4 ${color}`}
        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
      />
    );
  }
  // ... other shapes
}
```

**Key points:**
- `clip-path` is hardware-accelerated and works with any background
- Polygon coordinates: 6 points for hexagon, clockwise from top
- Alternative octagon-like variant: `polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)`
- Browser support: all modern browsers (Chrome 24+, Firefox 3.5+, Safari 7+)

### Pattern 4: Backend Branch Routing
**What:** Estimator recognizes conditionNode and runs estimation through both True and False branches
**When to use:** Any node type that has multiple output paths
**Example:**
```python
# Source: Existing backend/estimator.py pattern + graph_analyzer.py
def estimate_workflow(nodes: List[NodeConfig], edges: List[EdgeConfig]) -> WorkflowEstimation:
    # Build adjacency for graph traversal
    adjacency = build_adjacency_list(nodes, edges)

    for node in nodes:
        if node.type == "conditionNode":
            # Find True and False child nodes
            true_children = [e.target for e in edges if e.source == node.id and e.sourceHandle == "s-right-true"]
            false_children = [e.target for e in edges if e.source == node.id and e.sourceHandle == "s-bottom-false"]

            # Estimate both branches (Phase 1: sequential, no probability weighting)
            true_branch_cost = estimate_subgraph(true_children, adjacency)
            false_branch_cost = estimate_subgraph(false_children, adjacency)

            # For now: max cost (conservative) — Phase 4 will add probability weighting
            node_estimation.cost = max(true_branch_cost, false_branch_cost)
```

**Key points:**
- Check `edge.sourceHandle` to distinguish True vs False paths
- Phase 1: estimate both branches, return conservative max (no probability math)
- Phase 4 will add: `true_prob * true_cost + false_prob * false_cost`
- Prevent infinite loops: track visited nodes during subgraph traversal

### Anti-Patterns to Avoid
- **Don't use zIndex: -1 on conditionNode** — pointer-events-none makes nodes non-blocking; zIndex breaks stacking
- **Don't hardcode handle positions with top/left CSS** — use React Flow's Position enum for auto-layout
- **Don't create separate edge types for True/False** — single custom edge with color logic is cleaner
- **Don't add probability weighting in Phase 1** — deferred to Phase 4 per user constraint

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-handle node | Custom drag-and-drop connection logic | React Flow Handle component with unique IDs | React Flow handles all connection validation, snapping, and state management |
| Edge routing | Custom bezier curve calculations | React Flow `getBezierPath` / `getStraightPath` | Automatic path calculation with collision avoidance |
| Node selection | Custom click/drag handlers | React Flow built-in selection | Keyboard shortcuts, multi-select, and focus management included |
| Graph traversal | Recursive walk with manual cycle detection | Existing graph_analyzer.py + Tarjan's SCC | Already handles cycles, topological sort, critical path |
| Token counting | Regex-based word splitting | tiktoken library (backend) | Accurate OpenAI-compatible tokenization |

**Key insight:** React Flow is a full workflow engine, not a drawing library — leverage its connection/selection system instead of implementing custom interaction handlers.

## Common Pitfalls

### Pitfall 1: Handle ID Collisions
**What goes wrong:** Multiple handles without IDs cause React Flow to merge them into a single connection point
**Why it happens:** React Flow defaults to single source/target per side; multiple handles require unique IDs
**How to avoid:**
- Always provide `id` prop when using 2+ handles of same type on same node
- Use consistent naming: `"s-right-true"`, `"s-bottom-false"` (position + semantic type)
- Test by dragging from both handles — should create distinct edges
**Warning signs:** Only one edge can connect from node; second connection replaces first

### Pitfall 2: Edge Color Update Lag
**What goes wrong:** Edge color doesn't update immediately when changing handle colors
**Why it happens:** React Flow edge memo — doesn't re-render unless edge data/id changes
**How to avoid:**
- Register custom edge in `edgeTypes` and set as `defaultEdgeOptions.type`
- Force re-render by updating edge `data` object when handle colors change
- Or use edge `style` prop with color derived from node color state
**Warning signs:** Edge color changes only after canvas pan/zoom

### Pitfall 3: Node Shape Breaks Handle Hit Area
**What goes wrong:** Diamond/hexagon shape clips handles, making them unclickable
**Why it happens:** CSS clip-path cuts off overflow content including handles
**How to avoid:**
- Apply `clip-path` only to inner content div, NOT the node wrapper
- Keep handles outside clipped area (use absolute positioning on parent)
- Test handle click zones at all node sizes
**Warning signs:** Can't drag connections from handles near shape edges

### Pitfall 4: Backend Missing sourceHandle Check
**What goes wrong:** Backend treats conditionNode as single-output, doesn't route both branches
**Why it happens:** Default edge iteration ignores `sourceHandle` field — assumes one child per edge
**How to avoid:**
- Filter edges by `sourceHandle` field when finding conditionNode children
- Example: `[e for e in edges if e.source == node_id and e.sourceHandle == "s-right-true"]`
- Add validation: conditionNode with <2 outgoing edges should warn user
**Warning signs:** Estimation only considers one branch; some nodes show 0 cost

### Pitfall 5: Cascade Delete Doesn't Remove All Edges
**What goes wrong:** Deleting conditionNode leaves orphaned edges on canvas
**Why it happens:** Multiple sourceHandles mean edges exist with different sourceHandle values
**How to avoid:**
- Already handled by React Flow's `onNodesChange` + Zustand `applyNodeChanges`
- Verify: delete node → check `edges` array → all edges with `source: deletedNodeId` removed
- No special code needed — React Flow handles this by default
**Warning signs:** Ghost edges remain after node deletion (regression test in Phase 0)

## Code Examples

Verified patterns from official sources and existing codebase:

### Multi-Handle Node Registration
```tsx
// Source: React Flow docs + frontend/src/components/Canvas.tsx (lines 34-41)
import ConditionNode from "@/components/nodes/ConditionNode";

const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  conditionNode: ConditionNode,  // NEW
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};
```

### Handle Color Styling
```tsx
// Source: React Flow Handle API + Tailwind CSS color system
<Handle
  id="s-right-true"
  type="source"
  position={Position.Right}
  style={{
    background: "#22c55e",  // Tailwind green-500
    width: "12px",
    height: "12px",
  }}
  className="border-2 border-white dark:border-slate-800"
/>
```

### Edge Color Based on Source Handle
```tsx
// Source: frontend/src/components/edges/AnnotationEdge.tsx pattern + EdgeProps API
function ConditionEdge({ sourceHandleId, ...props }: EdgeProps) {
  const getHandleColor = (handleId: string | null) => {
    if (!handleId) return "#6b7280"; // default gray
    if (handleId.includes("true")) return "#22c55e"; // green
    if (handleId.includes("false")) return "#ef4444"; // red
    return "#6b7280";
  };

  const strokeColor = getHandleColor(sourceHandleId);

  return (
    <path
      stroke={strokeColor}
      strokeWidth={2}
      fill="none"
      {...props}
    />
  );
}
```

### Hexagon Shape Rendering
```tsx
// Source: frontend/src/components/nodes/WorkflowNode.tsx (lines 77-95) + CSS clip-path spec
function NodeShape({ shape, color }: { shape: string; color: string }) {
  switch (shape) {
    case "hexagon":
      return (
        <span
          className={`inline-block w-3.5 h-3.5 ${color}`}
          style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
        />
      );
    case "diamond":
      return <span className={`inline-block w-3 h-3 rotate-45 rounded-[2px] ${color}`} />;
    // ... other shapes
  }
}
```

### Backend Branch Recognition
```python
# Source: backend/models.py (lines 28-31) + backend/estimator.py pattern
class NodeConfig(BaseModel):
    type: Literal[
        "startNode", "agentNode", "toolNode", "finishNode",
        "blankBoxNode", "textNode",
        "conditionNode",  # NEW
    ]
    # ... other fields

# In estimator.py:
def estimate_node(node: NodeConfig, edges: List[EdgeConfig]) -> NodeEstimation:
    if node.type == "conditionNode":
        # Find True and False branches
        true_edges = [e for e in edges if e.source == node.id and "true" in (e.sourceHandle or "")]
        false_edges = [e for e in edges if e.source == node.id and "false" in (e.sourceHandle or "")]

        # Estimate both branches (Phase 1: max cost, no probability weighting)
        # Phase 4 will add: true_prob * true_cost + false_prob * false_cost
        return NodeEstimation(
            node_id=node.id,
            node_name=node.label or "Condition",
            tokens=0,  # conditionNode has no LLM tokens
            cost=0.0,  # routing only, no cost
            latency=0.0,  # negligible decision latency
        )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single handle per side | Multiple handles per side with IDs | React Flow 10+ (2022) | Enables multi-output nodes (conditions, routers) |
| Hardcoded edge colors | EdgeProps.sourceHandleId | React Flow 11.7+ (2023) | Edge styling can react to source handle type |
| Canvas plugins for shapes | CSS clip-path | CSS3 (stable 2018+) | Simpler, hardware-accelerated, no dependencies |
| Redux for flow state | Zustand | Project decision (2024) | Less boilerplate, better memo performance |
| Separate node types per output | Single node type + handle IDs | React Flow best practice | Easier to maintain, consistent UX |

**Deprecated/outdated:**
- **React Flow <= 9.x API**: Used string literals for Position (removed in v10)
- **NodeProps.isHidden**: Replaced by `hidden` field on node data (v11+)
- **Custom connection line**: Built-in now handles colored connection line from handles

## Open Questions

1. **Probability slider granularity**
   - What we know: Single slider 0-100%, False = 100% - True
   - What's unclear: Should slider snap to 5% increments or allow free 1% steps?
   - Recommendation: Start with 1% granularity (finer control), add snap if users request it

2. **Edge color priority when mixed node types**
   - What we know: Condition edges are green/red, other edges are gray
   - What's unclear: If conditionNode True connects to another conditionNode, does edge inherit first node's True color or default gray?
   - Recommendation: Only apply color to edges directly from conditionNode (one-level inheritance)

3. **Backend branch cost calculation**
   - What we know: Phase 1 estimates both branches, no probability weighting
   - What's unclear: Should Phase 1 return max cost, sum cost, or both in a range?
   - Recommendation: Return max cost (conservative) + note in breakdown that it's conservative until Phase 4

4. **Handle label positioning on small nodes**
   - What we know: Text labels next to True/False handles
   - What's unclear: Do labels overlap edges at small zoom levels?
   - Recommendation: Position labels with `pointer-events-none` and test at 50% zoom

## Validation Architecture

> Nyquist validation is enabled per .planning/config.json (nyquist_validation: true)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library (frontend), pytest (backend) |
| Config file | frontend/vitest.config.ts, backend/pytest.ini — see Wave 0 gaps if missing |
| Quick run command | `cd frontend && npm run test -- ConditionNode.test.tsx` (frontend), `cd backend && pytest tests/test_condition_node.py -x` (backend) |
| Full suite command | `cd frontend && npm run test` (frontend), `cd backend && pytest` (backend) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COND-01 | Drag Condition Node from sidebar to canvas | integration | `npm run test -- Sidebar.test.tsx::test_condition_node_drag` | ❌ Wave 0 |
| COND-02 | Render True (green, right) and False (red, bottom) handles | unit | `npm run test -- ConditionNode.test.tsx::test_handle_rendering` | ❌ Wave 0 |
| COND-03 | Edit condition expression in modal | integration | `npm run test -- NodeConfigModal.test.tsx::test_condition_expression` | ❌ Wave 0 |
| COND-04 | Adjust probability slider, verify complement | unit | `npm run test -- ConditionNode.test.tsx::test_probability_slider` | ❌ Wave 0 |
| COND-05 | Delete node, verify edges cascade | integration | `npm run test -- Canvas.test.tsx::test_cascade_delete` | ❌ Wave 0 |
| COND-06 | Backend /api/estimate recognizes conditionNode | unit | `pytest tests/test_estimator.py::test_condition_node_routing -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Quick tests for modified component (e.g., `npm run test -- ConditionNode`)
- **Per wave merge:** Full frontend suite + backend suite
- **Phase gate:** All 6 tests green + manual smoke test (drag node, connect branches, verify estimate)

### Wave 0 Gaps
- [ ] `frontend/vitest.config.ts` — if not present, install: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
- [ ] `frontend/src/components/nodes/__tests__/ConditionNode.test.tsx` — covers COND-02, COND-04
- [ ] `frontend/src/components/__tests__/Sidebar.test.tsx` — covers COND-01
- [ ] `frontend/src/components/__tests__/NodeConfigModal.test.tsx` — covers COND-03
- [ ] `frontend/src/components/__tests__/Canvas.test.tsx` — covers COND-05 (may exist, add test case)
- [ ] `backend/tests/test_estimator.py` — add test_condition_node_routing for COND-06
- [ ] `backend/pytest.ini` — if not present, install: `pip install pytest pytest-asyncio`

*(If existing test files cover all reqs: "None — existing test infrastructure covers all phase requirements")*

## Sources

### Primary (HIGH confidence)
- React Flow official docs: /learn/customization/handles — multi-handle API, unique IDs requirement
- React Flow API reference: /api-reference/types/edge-props — EdgeProps.sourceHandleId and targetHandleId properties
- Existing codebase: frontend/src/components/nodes/WorkflowNode.tsx — STYLE map pattern, shape rendering, handle IDs
- Existing codebase: frontend/src/components/Canvas.tsx — nodeTypes registration, connection validation
- Existing codebase: backend/models.py — NodeConfig.type Literal pattern, Pydantic validation
- Project rule: .cursor/rules/new-node-type.mdc — 8-file checklist for new node types

### Secondary (MEDIUM confidence)
- CSS clip-path specification (MDN Web Docs) — hexagon polygon coordinates, browser support
- Existing codebase: frontend/src/components/edges/AnnotationEdge.tsx — custom edge pattern for color inheritance
- React Flow examples index — confirmed no pre-built conditional node examples (need custom implementation)

### Tertiary (LOW confidence)
- CSS-Tricks archived articles on hexagons — verified clip-path approach is current best practice (404 error on direct article, but polygon coordinates validated against MDN)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions confirmed from package.json
- Architecture: HIGH — patterns verified in existing codebase files (WorkflowNode.tsx, Canvas.tsx, models.py)
- Multi-handle API: HIGH — official React Flow docs confirm ID-based differentiation
- Edge color inheritance: HIGH — EdgeProps.sourceHandleId verified in React Flow API docs
- Hexagon rendering: HIGH — CSS clip-path is standard, tested in existing WorkflowNode.tsx ShapeIndicator
- Backend routing: MEDIUM — pattern inferred from existing estimator.py structure, not yet implemented for conditionNode
- Pitfalls: MEDIUM — based on React Flow common issues + project patterns, not all verified in this codebase

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — stable stack, React Flow 12.x is LTS)
