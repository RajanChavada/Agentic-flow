# Phase 2: Canvas Metadata - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see real-time graph health, risk assessment, and reachability feedback as they design workflows. A corner overlay displays node count, max depth, loop count, tool risk surface breakdown, an aggregate risk score, and Ideal State reachability -- all computed frontend-only with no API calls. The overlay updates in real-time as users add/remove/connect nodes with no visible UI jank during drag operations.

</domain>

<decisions>
## Implementation Decisions

### Overlay Placement & Style
- Top-right corner of canvas, positioned above or near MiniMap
- Compact chip format showing key numbers inline (e.g., "5 nodes | depth 3 | 0 loops | Low")
- Always visible -- no toggle, no dismiss, no hide
- Frosted glass background (backdrop-blur, semi-transparent). Note: may need to verify contrast with node colors behind it; fall back to solid if readability suffers
- No emojis -- use Lucide icons or CSS shapes per project rules

### Tool Risk Categorization
- Category-based mapping: each tool category maps to one primary risk bucket
  - `retrieval` -> read
  - `database` -> write
  - `code_execution` -> exec
  - `api` + `mcp_server` -> network
- Abbreviated count display in chip: `R:2 W:1 X:0 N:3`
- Color-coded by type: read=blue, write=amber, exec=red, network=purple
- Unknown/uncategorized tools go to neutral "other" bucket, not contributing to risk score

### Risk Score Formula
- Four inputs: tool risk surface (exec + network count), graph depth, loop count, total node count
- Point-based scoring:
  - Each exec tool: +2 points
  - Each network tool: +2 points
  - Each write tool: +1 point
  - Graph depth > 5: +2 points
  - Any loops (loop count > 0): +2 points
  - Total nodes > 15: +1 point
- Thresholds: Low (0-3), Medium (4-7), High (8+)
- Display: colored text label -- green "Low", amber "Medium", red "High"
- Empty/minimal canvas defaults to "Low" (green)

### Reachability Display
- Build BFS reachability logic now in Phase 2
- Forward BFS from startNode to check if Ideal State Node is in reachable set
- Display: binary flag with Lucide icon -- green checkmark + "Reachable" or red X + "Not reachable"
- When no Ideal State Node exists on canvas: show dash placeholder "Reach: --"
- Once Phase 3 adds Ideal State Node, the reachability flag activates automatically

### Claude's Discretion
- Exact frosted glass CSS values (blur radius, opacity, border)
- Chip internal spacing and typography sizing
- Graph analysis utility file structure and function signatures
- Debounce strategy for rapid node drag updates (useMemo vs requestAnimationFrame)
- Exact Lucide icon choices for each metric
- How to handle condition nodes in depth/loop calculation (Phase 1 dependency)

</decisions>

<specifics>
## Specific Ideas

- Abbreviated risk surface format: `R:2 W:1 X:0 N:3` -- each letter color-coded
- Risk score as simple colored text label, not a bar or gauge
- The overlay should feel like a HUD -- informational without being distracting
- Frosted glass aesthetic -- modern, see-through, but still readable

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EstimatePanel.tsx`: Badge styling patterns (severity colors), section headers with Lucide icons, dark mode conditional classes
- `WorkflowNode.tsx`: Heatmap styles (red high / yellow medium borders), inline metric display pattern
- `useWorkflowNodes()` / `useWorkflowEdges()`: Fine-grained Zustand selectors for nodes and edges
- `useEstimation()`: Access to `detected_cycles`, `parallel_steps`, `graph_type` from backend
- `useUIState()`: Theme access for dark mode styling

### Established Patterns
- Tailwind v4 syntax: `bg-white!` not `!bg-white`; `shrink-0` not `flex-shrink-0`
- Dark mode via `.dark` class on `<html>`, never `prefers-color-scheme`
- `useMemo` for derived computations (see `styledEdges` in Canvas.tsx)
- Lucide icons for all UI icons (no emojis)
- `"use client"` + `"use no memo"` directives for React Flow node components

### Integration Points
- Canvas.tsx: New overlay component renders as sibling to `<Background>`, `<Controls>`, `<MiniMap>` inside `<ReactFlow>`
- Zustand store: New graph analysis utilities consume `nodes` and `edges` from existing selectors
- Backend `graph_analyzer.py`: Has BFS depth grouping (`compute_parallel_steps`) and cycle detection (`get_cycle_groups`) -- frontend utilities can mirror this logic
- `tool_definitions.json`: 5 tool categories (database, mcp_server, api, code_execution, retrieval) for risk surface mapping
- Node data: `toolId` and `toolCategory` fields already exist on `WorkflowNodeData` for tool nodes

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 02-canvas-metadata*
*Context gathered: 2026-03-04*
