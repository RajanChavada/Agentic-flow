# Plan 04-2: Frontend Range Display & Sensitivity Integration

## Goal
Ensure the frontend correctly displays probability-weighted ranges in EstimatePanel and adds branch probability indicators to the breakdown table.

## Files to Modify

### 1. `frontend/src/types/workflow.ts` — Add branch_probability field

Add to `NodeEstimation` interface:
```typescript
branch_probability?: number | null;
```

### 2. `frontend/src/components/estimate/BreakdownSection.tsx` — Add probability badge

In the node breakdown table, for nodes with `branch_probability < 1.0`:
- Show a small badge like "~80%" next to the node name
- Use muted styling to indicate the node isn't always executed
- Tooltip: "This node runs in ~80% of workflow executions"

### 3. `frontend/src/components/estimate/OverviewSection.tsx` — No changes needed

Already handles `token_range`, `cost_range`, `latency_range` when present. Will automatically display ranges once backend populates them for condition-based DAGs.

### 4. `frontend/src/components/estimate/ScalingSection.tsx` — No changes needed

Already displays sensitivity readout with min/avg/max. Will work with branch-based ranges.

### 5. Frontend tests — Add range display test

Add test in `src/components/__tests__/` or extend existing tests to verify:
- OverviewSection renders ranges when `cost_range` is present
- BreakdownSection renders probability badge when `branch_probability` is set

## Verification
- `npx tsc --noEmit` passes
- `npx vitest run` passes
- Visual: EstimatePanel shows min/avg/max when workflow has condition nodes
