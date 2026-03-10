# Phase 5: Action Constraints - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** Feature spec (Context/features/action-constraints-agent-nodes.md)

<domain>
## Phase Boundary

This phase adds an optional **Allowed Actions** field to agent nodes. Users define discrete output options (e.g., "approve", "reject", "escalate") via an inline tag input in the config modal. Actions flow through the full stack: Zustand store -> backend NodeConfig -> estimation pipeline -> scaffold generator.

**In scope:** TagInput component, NodeConfigModal integration, WorkflowNode badge, backend model extension, estimation refinement, scaffold prompt update, tests.

**Out of scope:** Separate output ports per action (v2), per-action descriptions (v2), drag-to-reorder (v2), fallback action toggle (v2).

</domain>

<decisions>
## Implementation Decisions

### Frontend Component
- New reusable `TagInput` component at `frontend/src/components/ui/TagInput.tsx`
- Inline tag builder pattern: chips with X buttons inside a unified form field
- Enter to add, Backspace-on-empty to edit-last, X to remove
- 8-color palette cycling for chip colors (`sky-500`, `emerald-500`, `amber-500`, `rose-500`, `violet-500`, `cyan-500`, `orange-500`, `lime-500`)
- Chip scale-in animation on add (100ms ease-out)
- Duplicate rejection with pulse animation on existing chip

### Config Modal Integration
- Allowed Actions section appears in agent node config modal below context textarea, above Task Type
- Local `useState<string[]>` for `allowedActions`, synced from `node.data.allowedActions` on mount
- Saved via `updateNodeData()` on Save (same pattern as all other fields)

### Node Display
- Agent node face shows "N actions" badge when `allowedActions.length > 0`
- Styled consistent with existing subtitle pattern (`text-xs text-zinc-500`)

### Type System
- `WorkflowNodeData`: add `allowedActions?: string[]`
- `NodeConfigPayload`: add `allowed_actions?: string[] | null`
- `nodesToPayload()`: add mapping `allowed_actions: n.data.allowedActions ?? null`

### Backend Model
- `NodeConfig` in `models.py`: add `allowed_actions: Optional[List[str]]` with max 20 items, each 1-50 chars
- No new endpoints needed -- actions flow through existing `/api/estimate` and `/api/scaffold`

### Estimation Impact
- For agents with `task_type` in ("classification", "routing") and `allowed_actions` present:
  - Output multiplier adjusted to `0.15 * len(actions)` (constrained = fewer tokens)
  - Action labels added to input token count: `count_tokens(", ".join(actions))`

### Scaffold Integration
- Update system prompt in `scaffold_generator.py` to extract action labels from NL descriptions
- Example: "classify sentiment as positive, negative, neutral" -> `allowed_actions: ["positive", "negative", "neutral"]`

### Claude's Discretion
- Exact Tailwind classes for chip styling within the design system
- Animation keyframe implementation details
- Test file organization within established patterns

</decisions>

<specifics>
## Specific Ideas

- Empty state helper text: "Define allowed actions (e.g., approve, reject, escalate)"
- Chip visual: `bg-{color}/15 text-{color} border-{color}/30` with `text-xs px-2 py-0.5 rounded-full`
- X button on chips: Lucide `X` icon at `w-3.5 h-3.5`, `opacity-60 hover:opacity-100`
- Anti-cascade protection: use both `onKeyDown` and `onKeyUp` to prevent holding Backspace from rapidly deleting tags
- Persist labels (NNGroup pattern): always show "Allowed Actions" as label above input, never rely on placeholder alone

</specifics>

<deferred>
## Deferred Ideas

- Separate output handles per action on the canvas (like Dify's Question Classifier) -- requires React Flow handle refactoring
- Per-action descriptions for LLM context guidance
- Drag-to-reorder actions for priority ordering
- Color picker for individual action chips (auto-assign is sufficient for v1)
- Fallback action toggle for unmatched LLM outputs
- Color-coded edges per action on the canvas

</deferred>

---

*Phase: 05-action-constraints*
*Context gathered: 2026-03-09 via feature spec Context/features/action-constraints-agent-nodes.md*
