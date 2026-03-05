# Phase 1: Condition Node - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can add a binary Condition Node (if/else) to the workflow canvas with True/False output handles, a condition expression, and a probability slider for simulation. The backend recognizes the conditionNode type and routes estimation through both branches. This phase does NOT include multi-way routing (3+ branches), runtime execution, or probability-weighted cost calculation (that's Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Node Visual Identity
- Shape: Diamond (classic flowchart decision symbol)
- Color palette: Purple / violet (distinct from all existing nodes)
- toolNode shape swap: toolNode moves from diamond to hexagon (frees diamond for conditionNode)
- Size: Same dimensions as other nodes (consistent canvas feel)

### Branch Handle Layout
- Input handles: Top only (single entry point -- one way in, two ways out)
- True output: Right side, green colored, with "True" text label
- False output: Bottom side, red colored, with "False" text label
- Edge coloring: Edges connected to True/False handles inherit the handle color (green/red) for visual path tracing across the canvas

### Configuration Surface
- Pattern: Modal only (follows existing NodeConfigModal pattern used by agentNode/toolNode)
- Click the conditionNode to open the config modal
- No inline configuration on the node face

### Condition Expression (COND-03)
- Input type: Plain text field (no validation, no autocomplete)
- Purpose: Human-readable label for the branch logic (e.g., "sentiment > 0.7", "has_attachment == true")
- This is for pre-run analysis -- the expression does not execute

### Probability Slider (COND-04)
- Mechanism: Single slider controlling True probability (0-100%)
- False probability auto-computed as complement (100% - True)
- Default: 50% True / 50% False when a new Condition Node is added
- Constraint: True + False always sums to 100% (enforced by single-slider design)

### Node Face Content
- Display: Title only (minimal) -- fixed label "Condition"
- No condition expression or probability shown on the node face
- Lucide icon alongside title (e.g., GitBranch, Split, or ArrowLeftRight)
- All configuration details visible only in the modal

### Claude's Discretion
- Specific Lucide icon choice (GitBranch, Split, ArrowLeftRight, or similar)
- Modal layout and field ordering
- Exact purple/violet shade for light and dark mode
- Hexagon rendering approach for toolNode swap
- Handle size and interaction affordance details
- Edge color implementation approach (custom edge component vs connection style)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **WorkflowNode.tsx**: Main node component with STYLE map keyed by node type. conditionNode needs a new entry in STYLE with shape "diamond" and purple colour values
- **NodeConfigModal.tsx**: Existing config modal for agentNode/toolNode. Needs extension to handle conditionNode fields (condition expression text, probability slider)
- **Canvas.tsx**: nodeTypes map registration. conditionNode must be added here. Connection validation rules exist and may need updating for handle-specific connections
- **Sidebar.tsx**: PALETTE array with PaletteItem interface. conditionNode needs a new palette entry with type, label, shape ("diamond"), and purple colour values

### Established Patterns
- Node directive pattern: `"use client"` + `"use no memo"` at top of node components
- React.memo() wrapper on all node components
- Handle IDs: `t-{position}` for target, `s-{position}` for source (e.g., t-top, s-right)
- HTML5 drag-and-drop: `dataTransfer` with keys `application/reactflow-type` and `application/reactflow-label`
- WorkflowNodeData with `[key: string]: unknown` index signature for arbitrary data

### Integration Points
- **Frontend type system**: `WorkflowNodeType` union in `workflow.ts` needs `"conditionNode"` added
- **Backend NodeConfig**: `models.py` Literal type needs `"conditionNode"` added
- **Backend estimator**: `estimator.py` needs to recognize conditionNode type and route through both branches (COND-06)
- **Backend graph_analyzer**: May need updates for conditionNode branching in adjacency/DFS logic
- **Zustand store**: Connection/deletion handlers need cascade logic for conditionNode edges (COND-05)

</code_context>

<specifics>
## Specific Ideas

- The diamond shape is the classic flowchart decision symbol -- user explicitly chose this over alternatives
- Purple/violet was chosen because it's visually distinct from all four existing node colors (green, blue, orange, red)
- toolNode moves to hexagon shape to free up diamond for conditionNode -- this is a visual breaking change for existing workflows
- Edge coloring (green for True path, red for False path) enables visual path tracing across complex branching workflows
- Text labels ("True"/"False") are always visible next to handles, not hover-only

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 01-condition-node*
*Context gathered: 2026-03-04*
