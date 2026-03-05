# Plan: Ideal State Node Frontend Foundation

**Phase:** 3 - Ideal State Node
**Requirement(s):** IDST-01, IDST-02
**Depends on:** Phase 2 (graph analysis reachability already detects idealState)

## Goal

Add the `idealStateNode` type to the frontend type system, create the visual component, register it in Canvas and Sidebar, and enforce the one-per-canvas constraint.

## Tasks

### Task 1: Add idealStateNode to Type System

**Files:**
- `frontend/src/types/workflow.ts`

**Action:**
1. Add `"idealStateNode"` to `WorkflowNodeType` union
2. Add ideal state fields to `WorkflowNodeData`:
   - `idealStateDescription?: string` (NL success description)
   - `idealStateSchema?: object | null` (generated JSON schema)
3. Add fields to `NodeConfigPayload`:
   - `ideal_state_description?: string | null`
   - `ideal_state_schema?: object | null`

### Task 2: Create IdealStateNode Component

**Files:**
- `frontend/src/components/nodes/IdealStateNode.tsx` (create)

**Action:**
1. Follow ConditionNode pattern: `"use client"` + `"use no memo"`, `React.memo`
2. Visual design: rounded shape (rounded-xl) with emerald/teal coloring (distinct from green startNode)
3. Use `Target` icon from lucide-react
4. Input handle at top (`t-top`)
5. No output handles (ideal state is a terminal/goal node)
6. Display `idealStateDescription` truncated if present, otherwise "Ideal State"
7. Show small indicator if schema is generated (checkmark badge)

### Task 3: Register in Canvas.tsx

**Files:**
- `frontend/src/components/Canvas.tsx`

**Action:**
1. Import IdealStateNode
2. Add `idealStateNode: IdealStateNode` to nodeTypes map
3. Add MiniMap color: `"idealStateNode": "#14b8a6"` (teal-500)
4. Add default data initialization on drop: `idealStateDescription: ""`, `idealStateSchema: null`
5. Add to onNodeClick: open config modal for idealStateNode
6. **One-per-canvas enforcement**: In `onDrop`, check if canvas already has an idealStateNode. If yes, skip adding and show no-op.

### Task 4: Add to Sidebar Palette

**Files:**
- `frontend/src/components/Sidebar.tsx`

**Action:**
1. Add idealStateNode to PALETTE array with Target icon and teal coloring
2. Use pill/rounded shape indicator
3. Disable drag if canvas already has an idealStateNode (grey out + tooltip)

### Task 5: Update graphAnalysis.ts

**Files:**
- `frontend/src/lib/graphAnalysis.ts`

**Action:**
1. Update `checkIdealStateReachability` to find by `n.type === "idealStateNode"` instead of `n.id === "idealState"` (more robust)
2. Keep backward compatibility with id-based check as fallback

## Verification

- `npx tsc --noEmit` clean
- IdealStateNode renders correctly in nodeTypes
- One-per-canvas constraint prevents adding second idealStateNode
- Reachability check works with new type-based detection
