# Plan: Schema UI & Integration

**Phase:** 3 - Ideal State Node
**Requirement(s):** IDST-02, IDST-04, IDST-07
**Depends on:** 03-1-PLAN.md, 03-2-PLAN.md

## Goal

Wire the IdealStateNode config modal UI with NL input, schema generation button, schema display/editor, and connect it to the backend endpoints.

## Tasks

### Task 1: Add IdealStateNode Section to NodeConfigModal

**Files:**
- `frontend/src/components/NodeConfigModal.tsx`

**Action:**
1. Add `isIdealStateNode = node?.type === "idealStateNode"` check
2. Add state: `idealStateDescription`, `idealStateSchema`, `isGenerating`
3. Add Ideal State section (shown when `isIdealStateNode`):
   - Text area for NL success description (placeholder: "e.g., The workflow produces a summary with sentiment score > 0.7 and key topics extracted")
   - "Generate Schema" button (calls backend `/api/generate-schema`)
   - Loading spinner during generation
4. Save idealStateDescription and idealStateSchema to node data on save

### Task 2: Create Schema Display/Editor

**Files:**
- `frontend/src/components/NodeConfigModal.tsx`

**Action:**
1. Below the generate button, show schema when available:
   - JSON display with syntax highlighting (preformatted, monospace)
   - "Edit Schema" toggle to switch to editable mode
   - In edit mode: textarea with JSON content, "Validate" button
   - Validation calls `/api/validate-schema` and shows errors inline
2. Schema fields to display clearly:
   - `required_fields` with types
   - `type_constraints`
   - `performance_bounds` (if present)

### Task 3: Wire Frontend to Backend

**Files:**
- `frontend/src/store/slices/estimationSlice.ts` (or new utility)

**Action:**
1. Add `generateSchema(description: string): Promise<object>` function
   - POST to `http://localhost:8000/api/generate-schema`
   - Handle errors gracefully (503 = no API key, show message)
2. Add `validateSchema(schema: object): Promise<{valid: boolean, errors: string[]}>` function
   - POST to `http://localhost:8000/api/validate-schema`
3. Can be simple fetch calls in the modal component (no need for store action)

### Task 4: Add ContextToolbar Section for IdealStateNode

**Files:**
- `frontend/src/components/ContextToolbar.tsx`

**Action:**
1. Add `IdealStateToolbarSection` component
2. Show: Target icon, truncated description, schema status (generated/not generated)
3. Add delete button
4. Add to toolbar visibility: include `"idealStateNode"`

## Verification

- `npx tsc --noEmit` clean
- User can type NL description and click Generate Schema
- Schema displays in the modal after generation
- User can edit schema and validate it
- Save persists description + schema to node data
- ContextToolbar shows ideal state info when selected
