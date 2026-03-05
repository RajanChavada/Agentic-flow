# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- TypeScript/React: `camelCase.ts` or `PascalCase.tsx` for components
- Python: `snake_case.py` (e.g., `models.py`, `estimator.py`, `graph_analyzer.py`)
- Pages (Next.js): `[paramName]` for dynamic routes (e.g., `[canvasId]/page.tsx`)

**Functions:**
- TypeScript: `camelCase` for all functions, including handlers (`onMouseDown`, `handleSubmit`)
- React hooks: `use` prefix for custom hooks (e.g., `useWorkflowStore`, `useEstimation`)
- Python: `snake_case` for all functions

**Variables:**
- TypeScript: `camelCase` for primitives and objects
- Python: `snake_case` for all variables
- Constants: `UPPER_SNAKE_CASE` (e.g., `PANEL_MIN_WIDTH`, `API_BASE`, `_DEFAULT_ENCODING`)
- React component props: `camelCase` (e.g., `isFullscreen`, `isDark`, `onToggle`)

**Types and Interfaces:**
- TypeScript: `PascalCase` for all types, interfaces, and custom types
  - Example: `WorkflowNodeData`, `EstimationRange`, `DashboardSectionProps`
  - Discriminated unions use `Literal` types (e.g., `"workflow" | "canvas"`)
- Python Pydantic models: `PascalCase` (e.g., `NodeConfig`, `WorkflowRequest`)

**Use type imports in TypeScript to avoid runtime bloat:**
```typescript
import type { NodeEstimation } from "@/types/workflow";
```

## Code Style

**Formatting:**
- Tool used: ESLint with Next.js configuration (`eslint.config.mjs`)
- Line length: Implicit, no hard limit observed
- Indentation: 2 spaces (TypeScript)
- Indentation: 4 spaces (Python, per PEP 8)

**Linting:**
- Frontend: ESLint 9 with `eslint-config-next` and core web vitals rules
- Backend: No explicit linter configured; follows PyLint/Black conventions implicitly
- TypeScript strict mode enabled in `tsconfig.json`

**Quote style:**
- TypeScript: Double quotes `"` for strings and JSX attributes
- Python: Double quotes `"""` for docstrings, single or double for strings

## Import Organization

**Order (TypeScript/TSX):**
1. External libraries (React, third-party packages)
2. Zustand/custom hooks and state
3. Components and utilities from `@/` paths
4. Types imported with `import type`

**Example from `EstimatePanel.tsx`:**
```typescript
import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  BarChart3,
  Wrench,
  AlertTriangle,
  // ... other lucide icons
} from "lucide-react";
import {
  useEstimation,
  useUIState,
  useWorkflowStore,
  useScalingParams,
  useActualStats,
} from "@/store/useWorkflowStore";
import type { NodeEstimation } from "@/types/workflow";
import {
  BarChart,
  Bar,
  // ... from recharts
} from "recharts";
```

**Path Aliases:**
- Use `@/*` to reference `src/` (configured in `tsconfig.json`)
- Always use aliases; avoid relative imports like `../../../`

**Order (Python):**
1. Standard library imports (`from __future__ import annotations`, `import math`, etc.)
2. Third-party imports (`from pydantic import`, `from fastapi import`, `import tiktoken`)
3. Local application imports (`from models import`, `from estimator import`)

## Error Handling

**Patterns (TypeScript):**
- Use `console.error()` for logging caught errors with context
- Always include try-catch around async operations:
```typescript
try {
  const res = await fetch(`${API_BASE}/api/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    const data = await res.json();
    setEstimation(data);
  }
} catch {
  // silently ignore — user still sees last good estimate
}
```
- Set error state and display to user: `setError("Message")`
- Suppress errors with comments when intentional: `catch { // ignore }`

**Patterns (Python):**
- Use FastAPI `HTTPException` for API error responses with status codes:
```python
raise HTTPException(
    status_code=404,
    detail=f"Model '{model}' not found for provider '{provider}'",
)
```
- Catch and transform specific exceptions (e.g., `ValueError` → 422)
- Return `None` or empty results on lookup failures rather than throwing

## Logging

**Framework (TypeScript):** `console.error` / `console.log`
- Pattern: Log errors with operation context only
- Do NOT log sensitive data (tokens, keys)
- Example: `console.error("Failed to fetch canvases:", error);`

**Framework (Python):** No explicit logging library imported; uses print statements if needed
- Recommended pattern: Would use `import logging` if added
- FastAPI will log HTTP requests automatically

## Comments

**When to Comment:**
- Non-obvious logic (e.g., mathematical formulas, algorithm choices)
- Workarounds and hacks (mark with `/* TODO: */` or `# TODO:` for refactoring)
- Block separators: Use `/* ── Name ────────────────────────────────── */` (TypeScript)
- Block separators: Use `# ── Name ────────────────────────────────────` (Python)

**JSDoc/TSDoc (TypeScript):**
- Used sparingly; typically only on exported functions or complex types
- Example from `estimator.py` docstring (Python equivalent):
```python
"""Token, cost, and latency estimation for a workflow graph.

Uses the PricingRegistry (backed by data/model_pricing.json) for all
model lookups and the ToolRegistry (backed by data/tool_definitions.json)
for tool impact estimation.
"""
```

**Inline comments:**
- Use for non-obvious variable meanings or state transitions
- Example: `// 600ms debounce` explains debounce timing
- Avoid restating what the code already says

## Function Design

**Size:** Functions typically 30–100+ lines for complex UI components
- Break into smaller functions via separate handlers or renderer functions
- Util functions: Keep under 50 lines

**Parameters:**
- Use object destructuring for multiple parameters:
```typescript
function DashboardSection({ id, title, icon, collapsed, onToggle, children, isDark }: DashboardSectionProps)
```
- TypeScript: Destructure and type in the signature
- Python: Use type hints in function definition

**Return Values:**
- Functions returning UI: Return `React.ReactNode` or component JSX
- Functions returning data: Use explicit types (`WorkflowEstimation | null`)
- Python: Use optional types (`Optional[str]`, `Optional[WorkflowEstimation]`)

**Async patterns:**
- Use `async/await` instead of `.then()` in TypeScript
- Always wrap in try-catch
- Example:
```typescript
const onMouseMove = (ev: MouseEvent) => {
  if (!isResizing.current) return;
  const delta = startX - ev.clientX;
  setWidth(Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, startWidth + delta)));
};
```

## Module Design

**Exports:**
- TypeScript: Export default for single component pages; named exports for utilities
- Python: Module-level functions exposed as endpoints in `main.py`
- Example: `export default function EstimatePanel()` for components
- Example: `export async function createShare(...)` for utilities

**Barrel Files:**
- Not used; import directly from module paths
- Avoid `index.ts` exports aggregating multiple exports

**State management (TypeScript):**
- Use Zustand store with selector pattern:
```typescript
const estimationexport const useEstimation = () => useWorkflowStore((s) => s.estimation);
```
- Avoid selecting entire state; use fine-grained selectors to prevent unnecessary re-renders

**Organized structure:**
- `src/types/` — All TypeScript types and interfaces
- `src/components/` — React components (UI, modals, etc.)
- `src/app/` — Next.js pages and route handlers
- `src/store/` — Zustand state management
- `src/lib/` — Utility functions and helpers

## TypeScript Strict Mode

**Always enabled.** Code patterns:
- All variables must be typed or inferred
- `any` only used when absolutely necessary (commented with reason)
- Use `unknown` for untyped external data, then narrow with type guards:
```typescript
try {
  const parsed = JSON.parse(pasteValue);
  if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
  // Now safe to use parsed as array
} catch (err: unknown) {
  setPasteError(err instanceof Error ? err.message : "Invalid JSON");
}
```

## Constants and Magic Numbers

**Define constants at module level:**
```typescript
const PANEL_MIN_WIDTH = 380;
const PANEL_MAX_WIDTH = 700;
const STORAGE_KEY = "estimate-panel-sections";
const NODE_COLOURS: Record<string, string> = {
  agentNode: "#3b82f6",
  toolNode: "#f59e0b",
  startNode: "#22c55e",
  finishNode: "#ef4444",
};
```

**Python constants:**
```python
_DEFAULT_ENCODING = tiktoken.get_encoding("cl100k_base")
_BASE_SYSTEM_TOKENS = 200
_OUTPUT_RATIO = 1.5
```

---

*Convention analysis: 2026-03-04*
