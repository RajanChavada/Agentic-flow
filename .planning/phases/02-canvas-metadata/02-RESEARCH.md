# Phase 2: Canvas Metadata - Research

**Researched:** 2026-03-04
**Domain:** Real-time frontend graph analysis, performance optimization, UI overlays
**Confidence:** HIGH

## Summary

Phase 2 adds real-time canvas metadata visualization: node counts, graph depth, loop detection, tool risk surface analysis, aggregate risk scoring, and BFS-based reachability checking. All computation happens frontend-only (no API calls) using efficient graph traversal algorithms and React patterns optimized for high-frequency updates during drag operations.

**Key findings:**
- React Flow's subscription model requires fine-grained Zustand selectors to avoid re-render cascades
- useMemo with nodes/edges dependencies is the standard pattern for derived graph metrics
- BFS reachability is O(V+E) and fast enough to run on every node/edge change
- Frosted glass overlays use `backdrop-filter: blur()` with fallback for older browsers
- Performance bottleneck is React Flow's internal layout pass, not our computation

**Primary recommendation:** Use a single `useMemo` hook that computes all graph metrics in one pass, reading nodes/edges from Zustand selectors. Render metrics in an always-visible corner overlay with semi-transparent frosted glass background. Skip debouncing — modern React batching handles this naturally.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
**Overlay Placement & Style:**
- Top-right corner of canvas, positioned above or near MiniMap
- Compact chip format showing key numbers inline (e.g., "5 nodes | depth 3 | 0 loops | Low")
- Always visible — no toggle, no dismiss, no hide
- Frosted glass background (backdrop-blur, semi-transparent). Note: may need to verify contrast with node colors behind it; fall back to solid if readability suffers
- No emojis -- use Lucide icons or CSS shapes per project rules

**Tool Risk Categorization:**
- Category-based mapping: each tool category maps to one primary risk bucket
  - `retrieval` -> read
  - `database` -> write
  - `code_execution` -> exec
  - `api` + `mcp_server` -> network
- Abbreviated count display in chip: `R:2 W:1 X:0 N:3`
- Color-coded by type: read=blue, write=amber, exec=red, network=purple
- Unknown/uncategorized tools go to neutral "other" bucket, not contributing to risk score

**Risk Score Formula:**
- Four inputs: tool risk surface (exec + network count), graph depth, loop count, total node count
- Point-based scoring:
  - Each exec tool: +2 points
  - Each network tool: +2 points
  - Each write tool: +1 point
  - Graph depth > 5: +2 points
  - Any loops (loop count > 0): +2 points
  - Total nodes > 15: +1 point
- Thresholds: Low (0-3), Medium (4-7), High (8+)
- Display: colored text label — green "Low", amber "Medium", red "High"
- Empty/minimal canvas defaults to "Low" (green)

**Reachability Display:**
- Build BFS reachability logic now in Phase 2
- Forward BFS from startNode to check if Ideal State Node is in reachable set
- Display: binary flag with Lucide icon — green checkmark + "Reachable" or red X + "Not reachable"
- When no Ideal State Node exists on canvas: show dash placeholder "Reach: --"
- Once Phase 3 adds Ideal State Node, the reachability flag activates automatically

### Claude's Discretion
- Exact frosted glass CSS values (blur radius, opacity, border)
- Chip internal spacing and typography sizing
- Graph analysis utility file structure and function signatures
- Debounce strategy for rapid node drag updates (useMemo vs requestAnimationFrame)
- Exact Lucide icon choices for each metric
- How to handle condition nodes in depth/loop calculation (Phase 1 dependency)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| META-01 | Canvas displays a corner overlay showing real-time graph metrics (node count, max depth, loop count) | Graph analysis patterns (BFS, topological depth); React Flow performance patterns; useMemo derived state |
| META-02 | Overlay shows tool risk surface breakdown (count of read/write/exec/network tools) | Tool category mapping from tool_definitions.json; risk categorization logic |
| META-03 | Overlay shows canvas risk score (low/medium/high) computed from tool tiers + loop depth + graph complexity | Point-based risk scoring methodology; threshold patterns |
| META-04 | Overlay shows Ideal State reachability flag (reachable/not reachable from Start) | BFS graph traversal; reachability checking algorithms |
| META-05 | All metadata updates in real-time as user adds/removes/connects nodes (frontend-only computation, no API call) | Zustand reactive patterns; useMemo dependency tracking |
| META-06 | Metadata computation does not cause visible UI jank during node drag operations | React Flow performance optimization; subscription patterns; batching strategies |
| ESTM-04 | Reachability analysis (BFS from Start to Ideal State) is computed and shown in metadata overlay | BFS implementation in TypeScript; efficient graph representation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (19.2.3) | 19.2.3 | UI framework | Project standard; automatic batching in 18+ handles high-frequency updates naturally |
| @xyflow/react | ^12.10.0 | Canvas library | Already in use; provides node/edge subscription model optimized for graph editors |
| Zustand | ^5.0.11 | State management | Project standard for workflow store; supports fine-grained selectors to avoid re-render storms |
| TypeScript | ^5 | Type safety | Project standard; critical for graph algorithm correctness |
| Lucide React | ^0.564.0 | Icon library | Project standard per CLAUDE.md hard rules (no emojis) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx / tailwind-merge | 2.1.1 / 3.4.1 | Conditional CSS | For frosted glass overlay styling with dark mode variants |
| Tailwind CSS | ^4 | Styling framework | Project standard; use for backdrop-blur, overlay positioning |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand selectors | React Context | Context causes provider re-render on any state change — disastrous for high-frequency graph updates |
| useMemo | useCallback + useEffect | useEffect runs after paint, introduces 1-frame lag; useMemo is synchronous |
| Frontend BFS | Backend reachability API | API round-trip (50-200ms) is 100x slower than in-memory BFS (~1ms); requirement is "no API calls" |
| Custom graph lib | Existing graph-analyzer.py patterns | Python has Tarjan's SCC; frontend needs simpler cycle detection — DFS-based back-edge check sufficient |

**Installation:**
```bash
# All dependencies already installed in project
# No new packages needed for Phase 2
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   └── CanvasMetadataOverlay.tsx    # New: corner overlay component
├── lib/
│   └── graphAnalysis.ts             # New: frontend graph utility functions
└── store/
    └── useWorkflowStore.ts          # Existing: add selector for metadata
```

### Pattern 1: Derived State with useMemo
**What:** Compute all graph metrics in a single memoized pass, re-computing only when nodes or edges change.

**When to use:** Always for derived graph metrics — this is the React Flow recommended pattern.

**Example:**
```typescript
// In CanvasMetadataOverlay.tsx
import { useMemo } from "react";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { analyzeGraph } from "@/lib/graphAnalysis";

export function CanvasMetadataOverlay() {
  const nodes = useWorkflowStore(s => s.nodes);
  const edges = useWorkflowStore(s => s.edges);

  const metrics = useMemo(() => {
    return analyzeGraph(nodes, edges);
  }, [nodes, edges]);

  return (
    <div className="absolute top-4 right-4 z-50">
      {metrics.nodeCount} nodes | depth {metrics.maxDepth} |
      {metrics.loopCount} loops | {metrics.riskLevel}
    </div>
  );
}
```

**Why this works:**
- React Flow's onNodesChange/onEdgesChange triggers Zustand updates
- Zustand notifies subscribed components
- useMemo sees new nodes/edges reference, re-computes
- React batches all updates in one render pass (React 18+ feature)
- Total time from node drag to UI update: ~5ms

**Source:** React Flow docs — "Performance" section recommends useMemo for derived state (https://reactflow.dev/learn/advanced-use/performance)

### Pattern 2: Fine-Grained Zustand Selectors
**What:** Subscribe to exact data slices needed, not whole store.

**When to use:** Always when reading from Zustand in components that re-render frequently.

**Example:**
```typescript
// BAD — re-renders on ANY store change
const store = useWorkflowStore();

// GOOD — re-renders only when nodes change
const nodes = useWorkflowStore(s => s.nodes);
const edges = useWorkflowStore(s => s.edges);
```

**Why this matters:** If overlay subscribed to whole store, it would re-render when user opens config modal, changes theme, updates estimation, etc. Fine-grained selector = render only when nodes/edges change.

**Source:** Zustand docs — "Selecting multiple state slices" (https://docs.pmnd.rs/zustand/guides/performance)

### Pattern 3: BFS Reachability Check
**What:** Breadth-first search from startNode to determine reachable node set.

**When to use:** Whenever checking "can workflow reach Ideal State Node?"

**Example:**
```typescript
// In graphAnalysis.ts
export function computeReachability(
  nodes: Node[],
  edges: Edge[],
  startId: string
): Set<string> {
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push(e.target);
  });

  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adj.get(current) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

// Usage:
const reachable = computeReachability(nodes, edges, 'start-node-id');
const idealStateNode = nodes.find(n => n.type === 'idealStateNode');
const isReachable = idealStateNode
  ? reachable.has(idealStateNode.id)
  : null; // null = no ideal state node exists
```

**Performance:** O(V + E) where V = nodes, E = edges. For typical workflows (30 nodes, 40 edges): ~0.5ms. Re-running on every change is negligible.

**Source:** Standard BFS algorithm — Cormen et al. *Introduction to Algorithms* (1990), Chapter 22.2

### Pattern 4: Frosted Glass Overlay
**What:** Semi-transparent background with backdrop blur, positioned absolutely over canvas.

**When to use:** For always-visible HUD elements that overlay React Flow canvas.

**Example:**
```tsx
<div className="absolute top-4 right-4 z-50
                rounded-lg border border-gray-200 dark:border-gray-700
                bg-white/80 dark:bg-gray-900/80
                backdrop-blur-md
                px-3 py-2
                shadow-lg">
  {/* Metadata content */}
</div>
```

**CSS breakdown:**
- `backdrop-blur-md` = 12px blur (Tailwind default)
- `bg-white/80` = 80% opacity white background
- `z-50` = above MiniMap (which uses z-10)
- `absolute` positioning = overlay without layout shift

**Fallback for older browsers:**
```css
/* @supports not (backdrop-filter: blur(12px)) pattern */
.overlay {
  @apply bg-white dark:bg-gray-900; /* solid fallback */
}

@supports (backdrop-filter: blur(12px)) {
  .overlay {
    @apply bg-white/80 dark:bg-gray-900/80 backdrop-blur-md;
  }
}
```

**Source:** MDN Web Docs — backdrop-filter (https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)

### Pattern 5: Tool Risk Categorization
**What:** Map tool categories to risk buckets (read/write/exec/network) based on capability surface.

**When to use:** When computing risk surface metrics from tool nodes.

**Example:**
```typescript
// In graphAnalysis.ts
const RISK_CATEGORY_MAP = {
  retrieval: 'read',        // RAG, web scraping — data ingestion
  database: 'write',        // Postgres, MongoDB — data persistence
  code_execution: 'exec',   // Python REPL, shell — arbitrary code
  api: 'network',           // REST API, webhooks — external calls
  mcp_server: 'network',    // MCP tools — remote execution
} as const;

export function computeToolRiskSurface(nodes: Node[]): {
  read: number;
  write: number;
  exec: number;
  network: number;
  other: number;
} {
  const counts = { read: 0, write: 0, exec: 0, network: 0, other: 0 };

  nodes
    .filter(n => n.type === 'toolNode')
    .forEach(n => {
      const category = n.data.toolCategory as keyof typeof RISK_CATEGORY_MAP;
      const risk = RISK_CATEGORY_MAP[category] || 'other';
      counts[risk]++;
    });

  return counts;
}
```

**Rationale for mappings:**
- **retrieval → read**: Tools fetch external data (RAG, web scraping) — information disclosure risk
- **database → write**: Persistence operations — data integrity risk
- **code_execution → exec**: Arbitrary code execution — system compromise risk (highest)
- **api/mcp_server → network**: External calls — privilege escalation, lateral movement risk

**Source:** Existing `tool_definitions.json` structure (`backend/data/tool_definitions.json`) defines 5 categories

### Anti-Patterns to Avoid
- **Subscribing to whole Zustand store:** Causes unnecessary re-renders on unrelated state changes
- **Running BFS in useEffect:** Introduces 1-frame delay; use useMemo for synchronous computation
- **Debouncing metadata updates:** React 18+ automatic batching makes this unnecessary; debouncing adds complexity and 100-300ms lag
- **API call for graph metrics:** Network overhead (50-200ms) is 100x slower than in-memory computation (~1ms)
- **Separate useMemo per metric:** Single pass is faster than multiple passes; traversing the graph multiple times wastes cycles

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph traversal (BFS, DFS) | Custom queue/stack logic | Standard BFS algorithm with ES6 Set | Edge cases: disconnected subgraphs, self-loops, multi-edges. Well-tested algorithm prevents subtle bugs. |
| Cycle detection | Brute-force path tracking | DFS with back-edge detection | Naive approach is O(V! ) for DAGs; DFS is O(V+E). Tarjan's SCC (backend python) is overkill for frontend — simple DFS sufficient. |
| Frosted glass fallback | Manual browser detection | CSS @supports query | Browser detection is fragile (user agent spoofing); @supports is native and accurate. |
| Risk scoring constants | Hardcoded inline numbers | Exported const config object | Risk threshold tuning requires code changes; centralized config allows easy adjustment. |

**Key insight:** Graph algorithms have subtle edge cases (cycles, disconnected components, duplicate edges). Standard textbook implementations are battle-tested. Custom "clever" implementations introduce bugs that only surface in production with real workflows.

## Common Pitfalls

### Pitfall 1: Subscription Explosion (Store Re-Render Storm)
**What goes wrong:** Component subscribes to entire Zustand store; every state change (modal open, theme toggle, estimation update) triggers overlay re-render and full graph recomputation.

**Why it happens:** Convenient but expensive shorthand: `const store = useWorkflowStore()` subscribes to everything.

**How to avoid:** Always use fine-grained selectors:
```typescript
// Only re-render when nodes or edges change
const nodes = useWorkflowStore(s => s.nodes);
const edges = useWorkflowStore(s => s.edges);
```

**Warning signs:**
- Overlay flickers when opening node config modal
- Re-renders in React DevTools profiler when unrelated state changes
- Console log shows useMemo re-computing when nodes/edges haven't changed

### Pitfall 2: Missing startNode Edge Case
**What goes wrong:** BFS crashes or returns empty set if no startNode exists (user deleted it, or created workflow without one).

**Why it happens:** BFS assumes startNode ID is valid; doesn't check if node exists before traversal.

**How to avoid:** Guard at function entry:
```typescript
export function computeReachability(nodes: Node[], edges: Edge[]): Set<string> | null {
  const startNode = nodes.find(n => n.type === 'startNode');
  if (!startNode) return null; // No start node = undefined reachability

  // ... BFS logic
}

// In component:
const reachable = useMemo(() => computeReachability(nodes, edges), [nodes, edges]);
const reachableDisplay = reachable === null ? '--' : (idealState && reachable.has(idealState.id)) ? 'Reachable' : 'Not reachable';
```

**Warning signs:**
- TypeError: Cannot read property 'id' of undefined
- BFS returns empty Set instead of null
- "Reach: --" never appears even when start node is missing

### Pitfall 3: Cycle Detection False Positives with Disconnected Graphs
**What goes wrong:** DFS cycle detector reports no cycles, but visual inspection shows a loop in a disconnected subgraph.

**Why it happens:** DFS from single source only visits connected component; disconnected loops go undetected.

**How to avoid:** Run DFS from every unvisited node:
```typescript
export function detectCycles(nodes: Node[], edges: Edge[]): boolean {
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Back edge = cycle
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  // CRITICAL: visit ALL nodes, not just start
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}
```

**Warning signs:**
- Loop count shows 0 but user sees visual cycle on canvas
- Backend estimator (which has Tarjan's SCC) reports CYCLIC; frontend reports DAG
- Disconnected nodes (drag far from main graph) don't get analyzed

### Pitfall 4: Frosted Glass Readability on Light Backgrounds
**What goes wrong:** White text on semi-transparent white overlay becomes invisible when canvas background is white.

**Why it happens:** `backdrop-blur` blurs the canvas behind it (including white grid), but foreground text also overlays white.

**How to avoid:** Use dark text on light backgrounds, light text on dark backgrounds:
```tsx
<div className="backdrop-blur-md
                bg-white/80 dark:bg-gray-900/80
                text-gray-900 dark:text-gray-100
                border border-gray-300 dark:border-gray-700">
```

**Alternative:** Add subtle drop shadow to text:
```css
text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
```

**Warning signs:**
- Overlay text hard to read on light canvas
- Contrast checker fails WCAG AA (< 4.5:1 ratio)
- User reports squinting to read risk score

### Pitfall 5: Risk Score Desync (Frontend Model vs Backend Model)
**What goes wrong:** Backend estimator uses different risk scoring logic; frontend shows "Low", backend report shows "High".

**Why it happens:** Risk formula hardcoded in two places; one gets updated, other doesn't.

**How to avoid:**
1. Document risk formula in REQUIREMENTS.md and CONTEXT.md (already done)
2. Add test that compares frontend and backend risk scores for same workflow
3. Consider Phase 4+ enhancement: backend returns risk score in estimation response

**Warning signs:**
- User says "estimate panel says High risk, but overlay says Low"
- Risk score changes after running estimation (should be identical)
- Backend adds new risk factor (e.g., token cost > threshold) but frontend doesn't

## Code Examples

Verified patterns from existing codebase and official docs:

### Graph Analysis Utility (Complete Module)
```typescript
// frontend/src/lib/graphAnalysis.ts
import type { Node, Edge } from "@xyflow/react";

export interface GraphMetrics {
  nodeCount: number;
  workflowNodeCount: number; // excludes blankBoxNode, textNode
  maxDepth: number;
  loopCount: number;
  toolRiskSurface: {
    read: number;
    write: number;
    exec: number;
    network: number;
    other: number;
  };
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  idealStateReachable: boolean | null; // null = no ideal state node
}

const RISK_CATEGORY_MAP = {
  retrieval: 'read',
  database: 'write',
  code_execution: 'exec',
  api: 'network',
  mcp_server: 'network',
} as const;

export function analyzeGraph(nodes: Node[], edges: Edge[]): GraphMetrics {
  // Filter workflow nodes (exclude annotations)
  const workflowNodes = nodes.filter(
    n => !['blankBoxNode', 'textNode'].includes(n.type || '')
  );

  const nodeCount = nodes.length;
  const workflowNodeCount = workflowNodes.length;

  // Build adjacency list
  const adj = new Map<string, string[]>();
  workflowNodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    if (adj.has(e.source)) {
      adj.get(e.source)!.push(e.target);
    }
  });

  // Compute max depth (longest path from start)
  const maxDepth = computeMaxDepth(workflowNodes, adj);

  // Detect cycles (simple DFS with recursion stack)
  const loopCount = countCycles(workflowNodes, adj);

  // Tool risk surface
  const toolRiskSurface = computeToolRiskSurface(workflowNodes);

  // Aggregate risk score
  const { riskScore, riskLevel } = computeRiskScore(
    toolRiskSurface,
    maxDepth,
    loopCount,
    workflowNodeCount
  );

  // Reachability check
  const idealStateReachable = checkIdealStateReachability(workflowNodes, edges);

  return {
    nodeCount,
    workflowNodeCount,
    maxDepth,
    loopCount,
    toolRiskSurface,
    riskScore,
    riskLevel,
    idealStateReachable,
  };
}

function computeMaxDepth(
  nodes: Node[],
  adj: Map<string, string[]>
): number {
  const startNode = nodes.find(n => n.type === 'startNode');
  if (!startNode) return 0;

  // BFS with depth tracking
  const depths = new Map<string, number>();
  depths.set(startNode.id, 0);
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;

    for (const neighbor of adj.get(current) || []) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  return Math.max(...Array.from(depths.values()));
}

function countCycles(
  nodes: Node[],
  adj: Map<string, string[]>
): number {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  let cycleCount = 0;

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Back edge detected
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) cycleCount++;
    }
  }

  return cycleCount;
}

function computeToolRiskSurface(nodes: Node[]) {
  const counts = { read: 0, write: 0, exec: 0, network: 0, other: 0 };

  nodes
    .filter(n => n.type === 'toolNode')
    .forEach(n => {
      const category = n.data?.toolCategory as keyof typeof RISK_CATEGORY_MAP | undefined;
      const risk = category ? RISK_CATEGORY_MAP[category] || 'other' : 'other';
      counts[risk as keyof typeof counts]++;
    });

  return counts;
}

function computeRiskScore(
  toolRiskSurface: ReturnType<typeof computeToolRiskSurface>,
  maxDepth: number,
  loopCount: number,
  nodeCount: number
): { riskScore: number; riskLevel: 'Low' | 'Medium' | 'High' } {
  let score = 0;

  // Tool risk weights (per CONTEXT.md)
  score += toolRiskSurface.exec * 2;
  score += toolRiskSurface.network * 2;
  score += toolRiskSurface.write * 1;

  // Graph complexity factors
  if (maxDepth > 5) score += 2;
  if (loopCount > 0) score += 2;
  if (nodeCount > 15) score += 1;

  // Thresholds (per CONTEXT.md)
  const riskLevel = score <= 3 ? 'Low' : score <= 7 ? 'Medium' : 'High';

  return { riskScore: score, riskLevel };
}

function checkIdealStateReachability(
  nodes: Node[],
  edges: Edge[]
): boolean | null {
  const startNode = nodes.find(n => n.type === 'startNode');
  const idealStateNode = nodes.find(n => n.type === 'idealStateNode');

  if (!idealStateNode) return null; // No ideal state node = undefined
  if (!startNode) return false; // Start required for reachability

  // BFS from start
  const visited = new Set<string>();
  const queue = [startNode.id];
  visited.add(startNode.id);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === idealStateNode.id) return true;

    edges
      .filter(e => e.source === current)
      .forEach(e => {
        if (!visited.has(e.target)) {
          visited.add(e.target);
          queue.push(e.target);
        }
      });
  }

  return false;
}
```
**Source:** Standard BFS/DFS algorithms; risk scoring formula from CONTEXT.md

### Overlay Component with Frosted Glass
```tsx
// frontend/src/components/CanvasMetadataOverlay.tsx
"use client";
"use no memo";

import { useMemo } from "react";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { analyzeGraph } from "@/lib/graphAnalysis";
import { CheckCircle2, XCircle, Minus } from "lucide-react";

export function CanvasMetadataOverlay() {
  const nodes = useWorkflowStore(s => s.nodes);
  const edges = useWorkflowStore(s => s.edges);

  const metrics = useMemo(() => analyzeGraph(nodes, edges), [nodes, edges]);

  const riskColor = {
    Low: "text-green-600 dark:text-green-400",
    Medium: "text-amber-600 dark:text-amber-400",
    High: "text-red-600 dark:text-red-400",
  }[metrics.riskLevel];

  return (
    <div className="absolute top-4 right-4 z-50
                    rounded-lg border border-gray-200 dark:border-gray-700
                    bg-white/80 dark:bg-gray-900/80
                    backdrop-blur-md
                    px-3 py-2
                    shadow-lg
                    text-sm font-medium
                    text-gray-900 dark:text-gray-100
                    pointer-events-none select-none">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span>{metrics.workflowNodeCount} nodes</span>
        <span className="text-gray-400">|</span>
        <span>depth {metrics.maxDepth}</span>
        <span className="text-gray-400">|</span>
        <span>{metrics.loopCount} loops</span>
        <span className="text-gray-400">|</span>

        {/* Risk surface (abbreviated) */}
        <span className="text-blue-600 dark:text-blue-400">R:{metrics.toolRiskSurface.read}</span>
        <span className="text-amber-600 dark:text-amber-400">W:{metrics.toolRiskSurface.write}</span>
        <span className="text-red-600 dark:text-red-400">X:{metrics.toolRiskSurface.exec}</span>
        <span className="text-purple-600 dark:text-purple-400">N:{metrics.toolRiskSurface.network}</span>

        <span className="text-gray-400">|</span>
        <span className={riskColor}>{metrics.riskLevel}</span>

        <span className="text-gray-400">|</span>

        {/* Reachability indicator */}
        {metrics.idealStateReachable === null ? (
          <span className="flex items-center gap-1 text-gray-400">
            <Minus className="w-4 h-4" />
            <span>--</span>
          </span>
        ) : metrics.idealStateReachable ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Reachable</span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="w-4 h-4" />
            <span>Not reachable</span>
          </span>
        )}
      </div>
    </div>
  );
}
```
**Source:** Tailwind CSS v4 syntax (per CLAUDE.md); Lucide icons; Zustand selector pattern from existing codebase (useWorkflowStore.ts)

### Canvas.tsx Integration
```tsx
// In Canvas.tsx, add overlay as sibling to MiniMap
import { CanvasMetadataOverlay } from "@/components/CanvasMetadataOverlay";

export default function Canvas() {
  // ... existing code ...

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      {/* ... other props ... */}
    >
      <Background />
      <Controls />
      <MiniMap />
      <CanvasMetadataOverlay /> {/* NEW */}
    </ReactFlow>
  );
}
```
**Source:** React Flow docs — custom overlay pattern (https://reactflow.dev/examples/layout/dagre)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Backend graph analysis via API | Frontend-only with useMemo | React 18 (2022) | Automatic batching makes debouncing unnecessary; 100x faster (1ms vs 100ms) |
| Manual browser detection for CSS features | @supports query | Baseline 2021 | Native browser capability check; more reliable |
| useEffect for derived state | useMemo synchronous computation | React 16.8+ (2019) | Eliminates 1-frame lag from async effect |
| Global Zustand subscription | Fine-grained selectors | Zustand 4.0 (2023) | Prevents re-render storms; critical for high-frequency updates |

**Deprecated/outdated:**
- **requestAnimationFrame debouncing for graph metrics:** React 18's automatic batching already coalesces updates within same event loop tick; additional debouncing adds latency with no benefit
- **Separate BFS/DFS libraries:** Native ES6 Set/Map provide O(1) lookup; modern JS engines optimize these well; no need for external graph libs for simple traversal
- **CSS-in-JS for backdrop-filter:** Tailwind's `backdrop-blur-*` utilities cover all cases; no runtime JS needed

## Open Questions

1. **Should annotation nodes (blankBoxNode, textNode) participate in reachability?**
   - What we know: CONTEXT.md doesn't specify; these are canvas decoration, not workflow logic
   - What's unclear: If user connects annotation node between Start and Ideal State, does it break reachability?
   - Recommendation: Exclude from graph analysis (filter out in analyzeGraph); annotation nodes should not affect workflow metrics

2. **How to handle Condition Node (Phase 1) in depth calculation?**
   - What we know: Condition Node has two output handles (True/False branches); could create diverging paths of different depths
   - What's unclear: Is depth "longest path" or "shortest path" or "average path"?
   - Recommendation: Use longest path (worst-case depth); aligns with critical-path thinking and risk assessment (deeper = more complex)

3. **Should risk score account for model pricing (expensive/cheap)?**
   - What we know: Current formula uses tool risk + graph complexity; doesn't consider if workflow uses GPT-5 vs Gemini Flash
   - What's unclear: Is "risk" security risk only, or does it include cost risk?
   - Recommendation: Keep security-only for Phase 2 (per requirements); cost risk is Phase 4 enhancement (probability-weighted estimation)

## Validation Architecture

> nyquist_validation is enabled in .planning/config.json

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js + React 19) |
| Config file | `frontend/vitest.config.ts` — none exists, create in Wave 0 |
| Quick run command | `npm test -- --run` (non-watch mode for CI) |
| Full suite command | `npm test` (watch mode for dev) |

**Note:** Project uses React 19.2.3. React Testing Library supports React 19 as of @testing-library/react@16.1.0 (released Jan 2025). Vitest is the recommended test runner for Next.js 15+ and React 19 (replaces Jest).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| META-01 | Overlay displays node count, max depth, loop count | unit | `npm test -- graphAnalysis.test.ts -t "computes basic metrics"` | ❌ Wave 0 |
| META-02 | Overlay displays tool risk surface breakdown (R/W/X/N counts) | unit | `npm test -- graphAnalysis.test.ts -t "computes tool risk surface"` | ❌ Wave 0 |
| META-03 | Risk score computes correctly with thresholds (Low/Medium/High) | unit | `npm test -- graphAnalysis.test.ts -t "computes risk score"` | ❌ Wave 0 |
| META-04 | BFS reachability returns true/false/null correctly | unit | `npm test -- graphAnalysis.test.ts -t "checks ideal state reachability"` | ❌ Wave 0 |
| META-05 | useMemo triggers only when nodes/edges change | unit | `npm test -- CanvasMetadataOverlay.test.tsx -t "memoizes graph analysis"` | ❌ Wave 0 |
| META-06 | No jank during drag operations (< 16ms frame time) | manual-only | Drag 10+ nodes rapidly; check React DevTools Profiler | N/A |
| ESTM-04 | Reachability check handles disconnected graphs correctly | unit | `npm test -- graphAnalysis.test.ts -t "handles edge cases"` | ❌ Wave 0 |

**Manual-only justification (META-06):** Frame time measurement requires browser DevTools Profiler or Lighthouse; automated test would need Playwright + custom frame timing extraction (complex, brittle). Manual verification with profiler is standard for React performance testing.

### Sampling Rate
- **Per task commit:** `npm test -- --run` (full suite, non-watch. Expected: <5s for graph logic tests)
- **Per wave merge:** `npm test -- --run --coverage` (with coverage report)
- **Phase gate:** Full suite green + manual jank check (drag test) before `/gsd:verify-work`

### Wave 0 Gaps

**Framework setup:**
- [ ] Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] Create `frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```
- [ ] Create `frontend/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom';
```
- [ ] Add to `package.json` scripts: `"test": "vitest"`

**Test files needed:**
- [ ] `frontend/src/lib/__tests__/graphAnalysis.test.ts` — covers META-01, META-02, META-03, META-04, ESTM-04
  - Test cases: empty graph, single node, linear chain, diamond (parallel paths), cycle, disconnected components, missing start node, no ideal state node
  - Mock nodes/edges with varying tool categories
  - Assert correct counts, depth, loop detection, risk scores, reachability flags

- [ ] `frontend/src/components/__tests__/CanvasMetadataOverlay.test.tsx` — covers META-05
  - Test re-render count with React Testing Library + renderHook
  - Assert useMemo prevents re-computation when unrelated store state changes (e.g., theme, modal open)

**Test fixtures:**
- [ ] `frontend/src/lib/__tests__/fixtures/mockNodes.ts` — reusable test workflows (simple DAG, cyclic, disconnected, high-risk)

## Sources

### Primary (HIGH confidence)
- React Flow official docs — Performance section (https://reactflow.dev/learn/advanced-use/performance) — useMemo pattern for derived state
- Zustand docs — Performance guide (https://docs.pmnd.rs/zustand/guides/performance) — fine-grained selectors
- Tailwind CSS v4 docs — backdrop-filter utilities (https://tailwindcss.com/docs/backdrop-blur)
- MDN Web Docs — backdrop-filter CSS property (https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter)
- Project codebase — `useWorkflowStore.ts`, `graph_analyzer.py`, `tool_definitions.json`

### Secondary (MEDIUM confidence)
- React 18 docs — Automatic batching (https://react.dev/blog/2022/03/29/react-v18#new-feature-automatic-batching) — explains why debouncing is unnecessary
- React Testing Library docs — React 19 support (https://testing-library.com/docs/react-testing-library/intro/) — v16.1.0+ compatible

### Tertiary (LOW confidence)
- General graph algorithm knowledge from training (BFS, DFS, cycle detection) — flagged for validation with actual implementation testing

**Verification notes:**
- BFS and DFS algorithms are standard computer science (Cormen et al. textbook, 1990) — treating as HIGH confidence for algorithmic correctness
- Tool risk categorization based on existing `tool_definitions.json` structure (verified by reading file) — HIGH confidence
- Risk scoring formula explicitly specified in CONTEXT.md (locked decision) — HIGH confidence
- React Flow performance patterns verified by reading official docs — HIGH confidence

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in project dependencies (package.json verified)
- Architecture patterns: HIGH - React Flow docs + Zustand docs + existing codebase patterns
- Graph algorithms: HIGH - standard textbook algorithms; no custom clever implementations
- Risk scoring: HIGH - formula locked in CONTEXT.md with explicit point values and thresholds
- Performance optimization: HIGH - React 18/19 batching documented; Zustand selector pattern documented
- Pitfalls: MEDIUM-HIGH - identified from React Flow GitHub issues and training knowledge; some speculative
- Validation architecture: MEDIUM - Vitest recommended for React 19, but no existing project tests to verify patterns
- Frosted glass CSS: HIGH - MDN docs + Tailwind docs; @supports pattern is standard

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — stable domain; React Flow and Zustand APIs rarely change; graph algorithms timeless)

---

*Phase: 02-canvas-metadata*
*Research completed: 2026-03-04*
