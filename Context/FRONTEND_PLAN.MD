### Purpose of this document 
This document outlines the entire frontend development plan with specific images for the UI mock-up the resources needed to run the frontend and scaffold, as well as future iterations and phases that are tackled, this document will serve both as a guide for th frontend development as well as a reference for the agent to document their update/progress and next steps 

# Frontend Plan – Agentic Workflow Designer

## 1. Goals

- Implement a Lucidchart‑style, **minimal** canvas focused on:
  - Start / Agent / Tool / Finish nodes
  - Connecting edges (sequential + parallel; loops later)
  - Node configuration (model provider, model, context)
  - “Get Estimate” action that calls backend for token + latency estimates
- Maintain **low latency and high responsiveness** for drag‑and‑drop and graph editing.
- Provide a clean, opinionated UX that maps directly to LangGraph / multi‑agent workflows.

---

## 2. Tech Stack Overview

- **Framework:** Next.js (App Router, TypeScript, React 18/19)
- **Canvas / Diagramming:** React Flow (now `@xyflow/react`)  
  - Node‑based editors, drag‑and‑drop, edges, zoom/pan, controls, minimap [web:48][web:69].
- **State Management:** Zustand
  - Fine‑grained subscriptions, low overhead, excellent for frequent updates [web:51][web:59].
- **Styling / Layout:**
  - Tailwind CSS + simple design system (shadcn/ui optional)
  - Layout mimics Lucidchart: left sidebar (shapes), center canvas, bottom estimate panel.
- **Charts:** Recharts (for token/latency breakdown in estimate panel).
- **HTTP Client:** Native `fetch` for calling FastAPI backend from Next.js route handlers or client components.

---

## 3. Why Zustand Fits This Project

Zustand is the **primary global store** for all workflow‑level state (nodes, edges, selection, estimation data).

### 3.1 Key Benefits

1. **React Flow compatibility**  
   - React Flow itself is built around a Zustand store internally and encourages external state management with similar patterns [web:48][web:69].  
   - Using Zustand for our own graph + UI state aligns with React Flow’s mental model and avoids redundant Context trees.

2. **Fine‑grained reactivity**  
   - Selectors allow components to subscribe to **exact slices** of state.  
   - A node’s component can subscribe only to its own data; moving one node re‑renders only that node, not the entire canvas – crucial when there are hundreds of nodes [web:47][web:50].

3. **High‑frequency updates (drag‑and‑drop)**  
   - Dragging a node can fire updates at 60fps. Zustand’s minimal overhead and synchronous, direct store access handle this better than Redux with reducers and actions [web:59].  
   - Avoids Context‑driven tree re‑renders on every drag event.

4. **Low boilerplate, single‑file store**  
   - Nodes, edges, UI flags (modals, sidebars), and estimation results can live in a single, typed store with inline actions.  
   - Easier for LLM agents to read/modify one centralized store than chase Redux slices and action creators.

### 3.2 Store Design (High‑Level)

- `nodes: Node[]` – React Flow node definitions (id, position, type, data).
- `edges: Edge[]` – React Flow edges (id, source, target, type).
- `selectedNodeId: string | null`.
- `estimation: EstimationResult | null` – returned by backend.
- `ui: { isConfigModalOpen: boolean; isEstimatePanelOpen: boolean; errorBanner?: string }`.

Actions:
- `addNode`, `updateNode`, `deleteNode`
- `setNodes`, `setEdges`, `onNodesChange`, `onEdgesChange`
- `setSelectedNode`, `openConfigModal`, `closeConfigModal`
- `setEstimation`, `clearEstimation`, `setErrorBanner`

Use **selector hooks** for each area:

- `useWorkflowNodes()`
- `useWorkflowEdges()`
- `useSelectedNode()`
- `useEstimation()`
- `useUIState()`

---

## 4. React Flow Usage Plan

### 4.1 Core Setup

Follow React Flow quick‑start and examples [web:46][web:69]:

- Use `ReactFlowProvider` around the main canvas page.
- Use `useNodesState` / `useEdgesState` for local React Flow state but **mirror** changes into the Zustand store.
- Enable:
  - `Background`
  - `Controls`
  - `MiniMap`
  - `fitView` on initial render.

Minimal setup:

- Layout:
  - `Sidebar` (left) – draggable palette of node types.
  - `Canvas` (center) – `ReactFlow` instance.
  - `EstimatePanel` (bottom) – collapsible panel showing metrics.
  - `HeaderBar` (top) – Save, Get Estimate, maybe graph name.

### 4.2 Node Types

Custom node components using `nodeTypes`:

- `startNode` – green rounded rectangle with play icon.
- `agentNode` – blue rounded rectangle, brain icon, label, small summary of model provider/model.
- `toolNode` – orange diamond, wrench icon.
- `finishNode` – red circle or pill with stop icon.

Design goals:
- **Lucidchart‑like but simpler:** focus on clarity, not multi‑style themes.
- Use Tailwind classes for borders, shadows, hover effects.
- Node props read from `node.data` (label, modelProvider, modelName, contextPreview).

### 4.3 Edges & Interactions

- Basic straight edges for MVP.
- Enable:
  - Drag from source handle to target handle.
  - Deleting edges via keyboard or context menu (later).
- Future:
  - Custom edge types for conditional / loop edges.

### 4.4 Drag‑and‑Drop from Sidebar

- Implement HTML5 drag‑and‑drop:
  - `Sidebar` shapes set `dataTransfer` type: `startNode`, `agentNode`, `toolNode`, `finishNode`.
  - `Canvas` handles `onDrop` + `onDragOver`:
    - Translate client coordinates into React Flow coordinates.
    - Create a new node with generated id, default label, and add via store action.

### 4.5 Performance Practices

Use React Flow performance recommendations [web:47][web:50][web:69]:

- Memoize custom node components with `React.memo`.
- Use Zustand selectors to avoid re‑rendering all nodes when a single node changes.
- Use `onlyRenderVisibleElements` for very large graphs.
- Keep heavy logic (estimation calls, token calculations) **outside** render path, triggered by buttons.

---

## 5. Canvas Styling & UX

### 5.1 Visual Language

- Background:
  - Light grid similar to Lucidchart (React Flow `Background` component).
- Nodes:
  - Slight drop shadow, rounded corners.
  - Consistent color coding by type:
    - Start = green
    - Agent = blue
    - Tool = orange
    - Finish = red
- Edge arrows:
  - Simple arrowhead pointing to target.
- Zoom:
  - Mouse wheel + ctrl/cmd for zoom.
  - Middle‑mouse or space‑bar + drag for pan (React Flow default behavior).

### 5.2 Node Config Modal

- Trigger:
  - Double‑click node OR “Edit” icon in node.
- Fields:
  - Model Provider (select)
  - Model Name (select, filtered by provider)
  - Context (textarea, 500 char limit)
- Show character count for context.
- On Save:
  - Update Zustand store for that node’s data.
  - Close modal.
- Optional future: live preview of estimated tokens for that node only.

---

## 6. Frontend–Backend Contract

- `POST /api/estimate` – body:
  - `{ nodes: NodeConfig[], edges: EdgeConfig[] }`
  - NodeConfig includes: `id`, `type`, `modelProvider`, `modelName`, `context`.
- Response:
  - `totalTokens`, `totalCost`, `totalLatency`, `graphType`, `breakdown[]`, `criticalPath[]`.

Frontend responsibilities:
- Validate graph locally before calling:
  - Ensure at least one Start and one Finish node.
  - Ensure Start → Finish connectivity (no isolated subgraphs).
  - Show UI error if incomplete circuit (like your mockups).

---

## 7. Resources for the Agent

When extending this plan, reference:

- React Flow docs and examples (drag‑and‑drop, custom nodes, performance) [web:46][web:48][web:69].
- Articles on building usable diagrams with React Flow [web:49][web:50].
- Zustand best practices and usage patterns (selectors, middleware) [web:56][web:59].
- Any added components should keep the **core workflow** simple: node editing, connecting, estimating.

The agent should:
- Keep this file as the **source of truth** for frontend architecture.
- Update sections if libraries or patterns change (e.g., new React Flow APIs, Next.js version changes, new node types).


-- 
## Important notes 
- The agent should read and update these documents because it allows the agent to keep track of its progress and also allows it to reflect on its work and make informed decisions in future tasks. By maintaining a record of their experiences, agents can continuously improve their performance and adapt to new challenges effectively. The agent should follow the outline when documenting their updates and ensure they define them selves as which specific agent they are for example "Frontend agent working on sidebar" or "Backend agent working on FAST API routes"



## Feature roadamp for backend features and backlog

Here’s a concrete, next‑phase feature backlog tailored to your app’s current state.

## 1. Bottleneck highlighting on the graph
Goal: Help users see where cost and latency concentrate inside a workflow.

Features

Per‑node badges on the canvas:

Show tokens avg and latency avg (or a single “cost share %”).

Color‑coded node heatmap:

Low impact: gray/green.

Medium: yellow.

High: red (top X% of total cost/latency).

“Top bottlenecks” panel:

- List top 3–5 nodes ranked by:

- cost contribution,

- critical‑path latency contribution.

API additions:

- Estimator returns per‑node cost_share and latency_share alongside totals.

Why: Directly addresses hidden high‑cost / high‑latency nodes.

## 2. Loop risk and contribution visualization
Goal: Make cyclic behavior and its impact on cost/latency obvious.

Features

Loop annotation on graph:

Detect cycles and visually tag them (loop icon / colored ring).

For each loop:

Show max_iterations, expected_iterations, and per‑lap tokens/latency.

Compute and display:

% of total cost from this loop,

% of total latency from this loop.

“Loop risk” badge:

e.g., “High risk: expensive model + high max iterations”.

API additions:

Estimator returns, per loop:

tokens_per_lap, latency_per_lap,

tokens_avg, tokens_max,

latency_avg, latency_max.

Why: Targets unbounded/poorly‑bounded loops that cause cost/latency spirals.

## 3. Model and tool mix analysis
Goal: Show how different models and tools contribute to overall cost and latency.

Features

“Model mix” panel per workflow:

Bar / pie chart for cost by model (e.g., GPT‑5 vs Claude vs Gemini).

Same for latency share.

“Tool impact” list:

For tool nodes, show top tools by:

cost share,

latency share.

Comparison view extension:

When comparing workflows:

Show side‑by‑side model mix charts.

Highlight what changed (e.g., “Gemini Flash replaced GPT‑5 on two nodes → −40% cost, +0.6s latency”).

Why: Encourages rational model/tool selection instead of defaulting to the most expensive.

## 4. Concurrency and critical‑path visualization
Goal: Help users reason about throughput vs latency and see where parallelism helps or hurts.

Features

Critical path highlight:

Visually emphasize nodes/edges on the longest‑latency path.

“Parallelism overview”:

Show number of nodes that can run in parallel at each “step”.

Basic timeline/step chart: step index vs parallel node count.

Configurable “max parallel branches” (advanced):

Let users set a concurrency cap and see how that changes predicted latency.

Why: Addresses throughput vs latency trade‑offs and fan‑out bottlenecks.

## 5. Scenario scaling / what‑if analysis
Goal: Let users see how cost/latency behave under different usage and loop assumptions.

Features

Global controls:

runs_per_day / runs_per_month.

“Loop intensity” slider that scales expected_iterations for all loops.

Dynamic outputs:

Projected monthly cost,

Projected aggregate compute time,

Simple “cost per 1K users” metric.

Per‑workflow:

Show a small “sensitivity” readout: cost range and latency range across min/avg/max loop assumptions.

Why: This turns your tool into a planning instrument, not just a static estimator.

## 6. Workflow “health” scoring
Goal: Provide a quick, opinionated summary of each workflow’s robustness.

Features

Simple health score or badges computed from:

% cost in top 1–2 nodes,

number and severity of loops,

use of premium models on many nodes,

average steps vs recursion limit.

Example badges:

“Cost‑efficient”, “Loop‑heavy”, “Latency‑sensitive”, “High premium‑model usage”.

Show these badges in:

Workflow sidebar list,

Comparison table.

Why: Gives teams a quick at‑a‑glance signal beyond raw numbers.

## 7. Minimal observability integration (future‑facing)
Goal: Start bridging from estimated behavior to real behavior without building a full observability stack.

Features

Allow users to paste or upload basic per‑node stats exported from their runtime (e.g., a CSV/JSON with node → actual tokens/latency averages).

Overlay those “actual” numbers on the graph alongside your estimates:

Show variance (e.g., estimate vs real).

Use this data to automatically refine:

expected_iterations for loops,

per‑node average tokens/latency.

Why: Moves you toward a feedback loop where the design tool learns from production usage.

## 8. Suggested implementation order
Given your current state (graph building, per‑workflow estimation, multi‑workflow comparison already working), a sensible order is:

Bottleneck highlighting on graph
(small API change + canvas UI → massive value).

Loop risk and contribution visualization
(builds on your existing max‑iteration support).

Model/tool mix analysis
(mostly aggregations + new panels).

Critical‑path + concurrency visualization
(extend your graph analysis layer).

Scenario scaling / what‑if sliders
(reuse existing estimator with parameterized inputs).

Workflow health scoring
(derived from metrics you already compute).

Minimal observability integration
(optional, when you or early users have real trace data).


-- 

## 8. Context-Aware Agent Configuration (Planned)

### 8.1 Goals

- Capture higher-level semantics about what each agent does (task type, expected output size, loop behavior).
- Feed this metadata into the backend estimator for more realistic token and latency predictions than “context length × constant multiplier.”[web:54][web:57]
- Keep the UI simple enough that non-experts can still configure agents quickly.

### 8.2 UI Additions

- Extend the **Configure Agent** modal with:
  - **Task Type** (select):
    - Classification, Summarization, Code Generation, RAG Answering, Tool Orchestration, Routing.
  - **Expected Output Size**:
    - Options: Short (≤200 tokens), Medium (200–600), Long (600–1500), Very Long (>1500).
  - **Expected Calls per Run** (for orchestrator/tool-heavy agents, optional).
- Show a compact "context summary" on each agent node:
  - Example: `Summarization · Medium output · 10 max loop steps`.

### 8.3 State and API Shape

- Extend `NodeData` in the Zustand store with:
  - `taskType`, `expectedOutputSize`, `expectedCallsPerRun`.
- Ensure these fields are included when:
  - Serializing the graph to send to `/api/estimate`.
  - Saving workflows and sending them to the comparison endpoint.

---

## 9. JSON Import & External Workflow Comparison (Planned)

### 9.1 Goals

- Allow developers to paste or upload a JSON representation of an existing agentic workflow (e.g., from LangGraph or custom infra) and:
  - Visualize it on the canvas (optional).
  - Run the same estimation logic as for locally designed graphs.
  - Compare its metrics against the current workflow.

### 9.2 UX

- Add a “**Import Workflow JSON**” button:
  - Located in the header near “Run Workflow & Gen Estimate”.
  - Opens a modal with:
    - Textarea for JSON.
    - Dropdown `Source` (Generic, LangGraph, Custom).
    - Toggle:
      - “Replace current workflow on canvas.”
      - “Load as read-only comparison scenario.”
- On successful import:
  - Either render the imported workflow on the canvas, or
  - Add it to the “Saved Workflows” section flagged as “Imported”.

### 9.3 Frontend–Backend Contract

- `POST /api/import-workflow`:
  - Request: `{ source: "generic" | "langgraph" | "custom", payload: <raw JSON> }`
  - Response: normalized internal workflow (`nodes`, `edges`, metadata).
- Frontend will:
  - Validate JSON before sending (basic syntax check).
  - Display error messages returned by backend if mapping fails.

---

## 10. Auto-Layout, Graph Export, and Report Export (Planned)

### 10.1 Auto-Layout

- Integrate a graph layout engine (dagre or elkjs) alongside React Flow.[web:47][web:50][web:69]
- Add a “**Auto-tidy layout**” button in the header:
  - Reads current `nodes` and `edges` from the store.
  - Computes new positions.
  - Updates the canvas and calls `fitView()`.

### 10.2 Graph Export

- Add an “**Export Graph**” dropdown:
  - PNG (default) and SVG.
- Implementation strategy:
  - Use a utility (e.g., `html2canvas`) to capture the React Flow wrapper DOM and download as image.
  - Later: consider a dedicated export utility or server-side rendering for higher-resolution exports.

### 10.3 Report Export

- From the Workflow Dashboard / Comparison view:
  - Provide:
    - “Export JSON Report” (raw metrics and breakdowns).
    - “Export Markdown Report” (human-readable run summary).
- Optional:
  - “Export PDF Report”:
    - Either rely on browser’s “Print to PDF”.
    - Or call a backend endpoint that renders PDF from structured report data.


-- 

## FEATURE ROADMAP -> LANDING PAGE

# Landing Page & Hero Implementation Plan

## 1. Goals & Style

- Very minimal, agentic‑AI focused landing.
- Hero uses:
  - Option A: `FloatingIconsHero` (floating brand/tool icons around central CTA).
  - Option B: `BackgroundBoxes` grid animation (technical, minimal).
- Hooks into app:
  - Primary CTA: “Launch Canvas” → `/app` or `/editor`.
  - Secondary CTAs: “Try the demo”, “Sign up”, “Learn more” anchored to sections below.

## 2. Component Locations

- `src/components/ui/floating-icons-hero-section.tsx`
- `src/components/ui/background-boxes.tsx`
- Demo wrappers used during development:
  - `src/components/demo/floating-icons-hero-demo.tsx`
  - `src/components/demo/background-boxes-demo.tsx`
- Landing page route:
  - Next.js App Router: `src/app/page.tsx` (or `src/app/(marketing)/page.tsx` if using route groups).

## 3. Shared Dependencies

- `framer-motion` (already required by both hero components).[web:214][web:217][web:220]
- `@radix-ui/react-slot` and `class-variance-authority` for the button.
- shadcn utilities:
  - `cn` from `@/lib/utils`.
- TypeScript enabled (all files are `.tsx`).

Install:

```bash
npm install framer-motion @radix-ui/react-slot class-variance-authority
```
Ensure @/lib/utils exports cn (shadcn init does this by default).[web:208][web:211]

## 4. Button Primitive (Design-System)
Path: src/components/ui/button.tsx

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-black/5 hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-black/5 hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm shadow-black/5 hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm shadow-black/5 hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
```
This replaces or sits alongside the default shadcn Button and is used by the hero.

## 5. Floating Icons Hero Component
Path: src/components/ui/floating-icons-hero-section.tsx

Paste the full FloatingIconsHero implementation you provided. It depends on:

cn from @/lib/utils.

Button from @/components/ui/button.

framer-motion hooks for animation.

It expects props:

ts
export interface FloatingIconsHeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  icons: {
    id: number;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    className: string;
  }[];
}
```
## 6. Floating Icons Demo Component
Path: src/components/demo/floating-icons-hero-demo.tsx (or in app/page.tsx directly during early dev).

Paste the full FloatingIconsHeroDemo including the SVG icon components and demoIcons array.

When moving toward production:

Replace some of the big-brand SVGs with either:

Lucide icons (e.g., Workflow, GitBranch, Bot, Network) to keep things neutral and on-theme.

Custom agent/tool icons that match your product branding.

Example: use lucide-react, installed via shadcn or separately:

```bash
npm install lucide-react
```
Then for an agentic theme:

```tsx
import { Bot, Network, CircuitBoard, Workflow } from "lucide-react";

const demoIcons: FloatingIconsHeroProps["icons"] = [
  { id: 1, icon: Bot, className: "top-[10%] left-[10%]" },
  { id: 2, icon: Workflow, className: "top-[20%] right-[8%]" },
  { id: 3, icon: CircuitBoard, className: "bottom-[10%] left-[20%]" },
  { id: 4, icon: Network, className: "top-[60%] left-[35%]" },
  // …add more for a full constellation
];
```
## 7. Background Boxes Grid Component
Path: src/components/ui/background-boxes.tsx

Paste the BoxesCore / Boxes implementation you gave. It:

Renders a large skewed grid.

Uses framer-motion so it shares the same dependency.

Uses cn again for class merging.

Demo component: src/components/demo/background-boxes-demo.tsx.

This can be combined with the hero:

Use Boxes behind a centered text block and CTA.

Or use FloatingIconsHero for the hero and BackgroundBoxesDemo lower on the landing as a “techy” section.

8. Landing Page Composition
In src/app/page.tsx:

```tsx
import FloatingIconsHeroDemo from "@/components/demo/floating-icons-hero-demo";
import { BackgroundBoxesDemo } from "@/components/demo/background-boxes-demo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <FloatingIconsHeroDemo />
      <section className="max-w-5xl mx-auto px-4 py-16 space-y-12">
        {/* How it works / features */}
        {/* Use minimal cards + icons: Visual Orchestration, Cost Estimation, Workflow Comparison */}
      </section>
      <section className="max-w-5xl mx-auto px-4 py-16">
        <BackgroundBoxesDemo />
      </section>
    </main>
  );
}
```
CTAs should link to:

/app → main canvas/playground.

/signup or auth modal trigger.

--- 

## Feature integration -> Creating the ability to add text and boxes to the frontend UI

This UI Feature does the following for a user when they are on the screen 
- after they are in the canvas they can add things like boxes and text to annotate the canvas similar to figma 

> Feature: Blank Box Nodes + Text Nodes + Supabase Workflow Persistence
> Milestone: Canvas Authoring Enhancements

---

## Overview

Add two new freeform canvas elements — blank box nodes and text/label nodes — that let
users annotate and group their workflow diagrams. Wire all canvas state (nodes, edges,
scenarios) to Supabase so workflows persist per authenticated user across sessions.

---

## Section 1 — New Node Types

### 1.1 BlankBoxNode (`blankBoxNode`)

A resizable, borderless container node. Used for grouping/highlighting regions of the canvas.

**Visual spec:**
- Dashed or solid border (user-configurable)
- Transparent or lightly tinted background fill (colour picker: 8 presets + custom)
- No handles by default (non-connectable unless user opts in)
- Resizable via React Flow's `NodeResizer` component
- Label: optional short title at the top-left corner

**State shape extension (`WorkflowNodeData`):**
```ts
// Add to existing WorkflowNodeData union/type
blankBoxStyle?: {
  borderStyle: 'dashed' | 'solid' | 'none'
  borderColor: string      // hex
  backgroundColor: string  // hex with opacity
  label?: string
  connectable: boolean
}
```

**Files to touch:**
- `src/types/workflow.ts` — add `blankBoxStyle` to `WorkflowNodeData`
- `src/components/nodes/BlankBoxNode.tsx` — NEW file (register in nodeTypes map)
- `src/components/Canvas.tsx` — add `blankBoxNode` to `nodeTypes`
- `src/components/Sidebar.tsx` — add BlankBox to node palette
- `src/store/useWorkflowStore.ts` — no changes needed (generic node add logic handles it)

**React Flow specifics:**
- Use `<NodeResizer>` from `@xyflow/react` for resize handles
- Set `style={{ width, height }}` on the node element driven by `node.width`/`node.height`
- Set `zIndex: -1` so it renders behind other nodes (use as background layer)
- Use `parentId` if you want it to group child nodes (React Flow subflow pattern)

---

### 1.2 TextNode (`textNode`)

An inline text label/annotation. No connection handles. Pure canvas decoration.

**Visual spec:**
- Double-click to edit (contentEditable or controlled textarea)
- Font size select: Small / Medium / Large / Heading
- Text colour picker (8 presets)
- Optional background pill/badge behind text
- Auto-sizes to content width

**State shape extension:**
```ts
textNodeStyle?: {
  content: string
  fontSize: 'sm' | 'md' | 'lg' | 'heading'
  color: string
  background: 'none' | 'pill' | 'badge'
  backgroundColor?: string
}
```

**Files to touch:**
- `src/types/workflow.ts` — add `textNodeStyle`
- `src/components/nodes/TextNode.tsx` — NEW file
- `src/components/Canvas.tsx` — add `textNode` to `nodeTypes`
- `src/components/Sidebar.tsx` — add Text to node palette

---

### 1.3 Node Config Modal — Extend for New Types

`NodeConfigModal.tsx` needs a third branch for `blankBoxNode` and `textNode`:

```
if agentNode → show model/task/context config (existing)
if toolNode  → show tool category/type config (existing)
if blankBoxNode → show border style, fill colour, label, connectable toggle
if textNode  → show content textarea, font size, text colour, background style
```

No new modal files — extend the existing switch/if block in `NodeConfigModal.tsx`.

---

### 1.4 Sidebar Palette Updates

Add two new draggable items to `Sidebar.tsx` below the existing four nodes:

```
── Workflow Nodes ──
  [Start]  [Agent]  [Tool]  [Finish]

── Canvas Authoring ──
  [Blank Box]   [Text Label]
```

Use a section divider with a small heading. Blank Box uses a dashed square icon
(Lucide `Square` with dashed style), Text uses Lucide `Type`.

---

### 1.5 Zustand Store Updates

`useWorkflowStore.ts` already has generic `addNode` / `updateNode` / `deleteNode` actions.
No structural changes needed — the new node types slot into the existing `nodes: Node[]` array.

**Do add:**
- `updateNodeStyle(id: string, styleUpdate: Partial<WorkflowNodeData>)` action if not already present
  — needed for the inline colour/font pickers to update node data without re-opening the modal

---

## Section 2 — Supabase Workflow Persistence

### 2.1 What Gets Persisted

| Data | Supabase Table | Trigger |
|------|---------------|---------|
| Full workflow (nodes + edges) | `workflows` | Save button, auto-save (debounced 3s) |
| Named scenarios | `scenarios` | Save Scenario button |
| User preferences (theme, drawer width) | `user_preferences` | On change, debounced |

### 2.2 Frontend Persistence Layer

Create `src/lib/workflowPersistence.ts`:

```ts
// Wraps all Supabase workflow CRUD — never call supabase directly from components
export async function saveWorkflow(userId: string, workflowId: string, payload: WorkflowSavePayload): Promise<void>
export async function loadWorkflow(userId: string, workflowId: string): Promise<WorkflowSavePayload | null>
export async function listWorkflows(userId: string): Promise<WorkflowMeta[]>
export async function deleteWorkflow(userId: string, workflowId: string): Promise<void>
export async function saveScenario(userId: string, scenario: WorkflowScenario): Promise<void>
export async function listScenarios(userId: string): Promise<WorkflowScenario[]>
```

All functions use `src/lib/supabase.ts` (existing browser client).

### 2.3 Auto-Save Hook

Create `src/hooks/useAutoSave.ts`:
- Watches `nodes`, `edges` in Zustand via `useWorkflowStore`
- Debounces 3000ms on any change
- Calls `saveWorkflow()` if user is authenticated (`useAuthStore`)
- Shows a subtle "Saving…" / "Saved ✓" status in HeaderBar

### 2.4 Load on Mount

In `src/app/editor/page.tsx`:
- On mount, if user is authenticated, call `loadWorkflow(userId, activeWorkflowId)`
- Hydrate Zustand store with loaded nodes/edges
- If no saved workflow exists, start with the current blank canvas default

### 2.5 Zustand Auth Integration

`useWorkflowStore.ts` already has `useAuthStore` wired.
Add to `useWorkflowStore`:
```ts
activeWorkflowId: string | null
setActiveWorkflowId: (id: string) => void
isSaving: boolean
lastSavedAt: Date | null
```

### 2.6 Workflow List in Sidebar

Extend `Sidebar.tsx` "Saved Workflows" section:
- On mount (when authenticated), fetch `listWorkflows(userId)` and show cloud-saved workflows
- Each item: workflow name, last saved timestamp, load button, delete button
- Show a cloud icon badge to distinguish Supabase-saved from localStorage-only scenarios

---

## Acceptance Criteria — Frontend

- [ ] BlankBoxNode renders on canvas, is resizable, and stays behind other nodes
- [ ] TextNode renders on canvas, is editable on double-click, auto-sizes
- [ ] Both new node types appear in Sidebar palette under "Canvas Authoring" section
- [ ] NodeConfigModal shows correct config panel for each node type
- [ ] `WorkflowNodeData` in `workflow.ts` updated with both new style shapes
- [ ] `Canvas.tsx` `nodeTypes` map includes `blankBoxNode` and `textNode`
- [ ] Authenticated users' workflows auto-save to Supabase on change (debounced 3s)
- [ ] Editor page loads the user's last workflow on mount
- [ ] Sidebar shows cloud-saved workflows fetched from Supabase
- [ ] `npx tsc --noEmit` passes with zero errors

---

## Do Not Touch (Frontend)

- `EstimatePanel.tsx` — no changes needed for these features
- `graph_analyzer.py` — backend-only, not a frontend concern
- `ExportDropdown.tsx` — existing export logic handles new node types automatically (they're just nodes)
- `SOUL.md` hard rules still apply: no emojis, Tailwind v4 syntax, Lucide icons only




-- 

## Feature update -> Canvas text and blank box changes 

The current implementation allows the user to insert a blank box with no colors, assume the user is creating workflows where they need to label the boxes as well
- Allow the users to add labels to the boxes themselves
- Allow the text to be centered, left centered, right centered, top-left-right placed, bottom-left-right placed

> Extends: BlankBoxNode from canvas-annotations-supabase-persistence.md
> Date: 2026-02-28
> Status: PLANNED — Frontend only, no backend changes needed

---

## Summary

Upgrade `BlankBoxNode` into a fully labeled, color-customizable container node.
Users can label a box (e.g. "Backend", "Frontend", "LLM Layer") with configurable
label text, label position (9 anchor points), label color, box border color,
and box background fill color — exactly how Lucidchart and FigJam handle group containers.

---

## Agent Assignment
Frontend agent only. No backend changes required.
Reads: `MEMORY.md`, `SOUL.md`, `FRONTEND_PLAN.md`, this file.

---

## Visual Spec

### Label Position Grid (9 anchor points)

```
┌─────────────────────────────────────┐
│ [TL]      [TC]              [TR]    │
│                                     │
│                                     │
│ [ML]      [MC]              [MR]    │
│                                     │
│                                     │
│ [BL]      [BC]              [BR]    │
└─────────────────────────────────────┘
```

`TL` = top-left (default for container labels like Lucidchart)
`TC` = top-center
`TR` = top-right
`ML` = middle-left
`MC` = middle-center
`MR` = middle-right
`BL` = bottom-left
`BC` = bottom-center
`BR` = bottom-right

### Color System
- **Box border color** — stroke color of the container outline
- **Box background color** — fill with opacity control (0–100%)
- **Label text color** — independent from border color
- **Label background** — optional pill/badge behind the label text only

### Preset Color Palette (8 swatches + custom hex input)
| Name       | Border hex  | Fill hex (20% opacity default) |
|------------|-------------|-------------------------------|
| Slate      | `#64748b`   | `#f1f5f9`                     |
| Blue       | `#3b82f6`   | `#eff6ff`                     |
| Violet     | `#8b5cf6`   | `#f5f3ff`                     |
| Green      | `#22c55e`   | `#f0fdf4`                     |
| Amber      | `#f59e0b`   | `#fffbeb`                     |
| Rose       | `#f43f5e`   | `#fff1f2`                     |
| Orange     | `#f97316`   | `#fff7ed`                     |
| Neutral    | `#e5e7eb`   | `#f9fafb`                     |

---

## State Shape

Extend `WorkflowNodeData` in `src/types/workflow.ts`:

```ts
export type LabelPosition =
  | 'top-left'    | 'top-center'    | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'

export type BlankBoxStyle = {
  label: string                      // e.g. "Backend"
  labelPosition: LabelPosition       // default: 'top-left'
  labelColor: string                 // hex, default: border color
  labelBackground: 'none' | 'pill'   // default: 'none'
  borderStyle: 'solid' | 'dashed' | 'none'
  borderColor: string                // hex
  borderWidth: 1 | 2 | 3            // px
  backgroundColor: string            // hex
  backgroundOpacity: number          // 0–100
  connectable: boolean               // default: false
}
```

---

## Component: `BlankBoxNode.tsx`

Full implementation spec for `src/components/nodes/BlankBoxNode.tsx`:

### Structure
```tsx
<div className="relative w-full h-full" style={{ border, background }}>
  {/* Label rendered at one of 9 absolute positions */}
  <LabelTag
    text={data.blankBoxStyle.label}
    position={data.blankBoxStyle.labelPosition}
    color={data.blankBoxStyle.labelColor}
    background={data.blankBoxStyle.labelBackground}
  />
  {/* Resize handle — only visible on selection */}
  <NodeResizer
    minWidth={120}
    minHeight={80}
    isVisible={selected}
    lineClassName="border-blue-400"
    handleClassName="bg-white border border-blue-400 rounded-sm"
  />
</div>
```

### `LabelTag` sub-component (inline, not a separate file)

Maps `LabelPosition` → Tailwind absolute positioning classes:

```ts
const POSITION_CLASSES: Record<LabelPosition, string> = {
  'top-left':      'top-2 left-2',
  'top-center':    'top-2 left-1/2 -translate-x-1/2',
  'top-right':     'top-2 right-2',
  'middle-left':   'top-1/2 left-2 -translate-y-1/2',
  'middle-center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'middle-right':  'top-1/2 right-2 -translate-y-1/2',
  'bottom-left':   'bottom-2 left-2',
  'bottom-center': 'bottom-2 left-1/2 -translate-x-1/2',
  'bottom-right':  'bottom-2 right-2',
}
```

Label renders as:
```tsx
<span
  className={cn(
    'absolute text-xs font-semibold tracking-wide pointer-events-none select-none',
    labelBackground === 'pill' && 'px-2 py-0.5 rounded-full',
    POSITION_CLASSES[position]
  )}
  style={{
    color: labelColor,
    backgroundColor: labelBackground === 'pill' ? labelColor + '20' : 'transparent'
  }}
>
  {text}
</span>
```

### Node container styling
```tsx
<div
  className="relative w-full h-full rounded-md"
  style={{
    border: `${borderWidth}px ${borderStyle} ${borderColor}`,
    backgroundColor: hexToRgba(backgroundColor, backgroundOpacity / 100),
  }}
>
```

Helper function (inline in the file):
```ts
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
```

---

## NodeConfigModal Extension

Add a `BlankBoxConfig` panel inside `NodeConfigModal.tsx`.
This renders when `node.type === 'blankBoxNode'`.

### Fields layout:

```
Label text          [________________] (text input)

Label Position      [3x3 grid picker]

─── Box Style ──────────────────────────

Color Preset        [● ● ● ● ● ● ● ●] + [# hex input]
Border Style        [Solid] [Dashed] [None]
Border Width        [1px] [2px] [3px]
Background Opacity  [────●────] 0–100%

─── Label Style ────────────────────────

Label Color         [● ● ● ● ● ● ● ●] + [# hex input]
Label Background    [None] [Pill]

─── Advanced ───────────────────────────

Connectable         [toggle] Allow edges to connect to this box
```

### 3x3 Position Picker Component

Build inline in `NodeConfigModal.tsx` as `PositionPicker`:

```tsx
const POSITIONS: LabelPosition[][] = [
  ['top-left',    'top-center',    'top-right'],
  ['middle-left', 'middle-center', 'middle-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
]

function PositionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1 w-24">
      {POSITIONS.flat().map((pos) => (
        <button
          key={pos}
          onClick={() => onChange(pos)}
          className={cn(
            'w-7 h-7 rounded border',
            value === pos
              ? 'bg-blue-500 border-blue-600'
              : 'bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600'
          )}
        />
      ))}
    </div>
  )
}
```

### Color Swatch Picker Component

Build inline as `ColorSwatchPicker`:

```tsx
const PRESETS = [
  { border: '#64748b', bg: '#f1f5f9' },
  { border: '#3b82f6', bg: '#eff6ff' },
  { border: '#8b5cf6', bg: '#f5f3ff' },
  { border: '#22c55e', bg: '#f0fdf4' },
  { border: '#f59e0b', bg: '#fffbeb' },
  { border: '#f43f5e', bg: '#fff1f2' },
  { border: '#f97316', bg: '#fff7ed' },
  { border: '#e5e7eb', bg: '#f9fafb' },
]

// On preset click → set both borderColor and backgroundColor simultaneously
```

---

## Sidebar Palette Entry

In `Sidebar.tsx`, the BlankBox drag item should show a small preview of a dashed box
with a label at top-left, using Lucide `SquareDashedBottom` or `Square` icon:

```tsx
// Drag data
dataTransfer.setData('application/reactflow-type', 'blankBoxNode')
dataTransfer.setData('application/reactflow-label', 'Group')

// Default blankBoxStyle on drop (set in Canvas.tsx onDrop handler)
blankBoxStyle: {
  label: 'Group',
  labelPosition: 'top-left',
  labelColor: '#3b82f6',
  labelBackground: 'none',
  borderStyle: 'dashed',
  borderColor: '#3b82f6',
  borderWidth: 2,
  backgroundColor: '#eff6ff',
  backgroundOpacity: 40,
  connectable: false,
}
```

---

## Canvas.tsx — Default Size on Drop

When a `blankBoxNode` is dropped, set initial dimensions larger than a regular node:

```ts
const newNode = {
  id: getId(),
  type: 'blankBoxNode',
  position,
  style: { width: 320, height: 220 },   // ← larger default
  data: { label: 'Group', blankBoxStyle: DEFAULT_BLANK_BOX_STYLE },
  zIndex: -1,
}
```

---

## Files to Touch

| File | Change |
|------|--------|
| `src/types/workflow.ts` | Add `LabelPosition` type, `BlankBoxStyle` type, extend `WorkflowNodeData` |
| `src/components/nodes/BlankBoxNode.tsx` | NEW — full component with LabelTag, NodeResizer, hexToRgba |
| `src/components/NodeConfigModal.tsx` | Add BlankBoxConfig panel, PositionPicker, ColorSwatchPicker |
| `src/components/Canvas.tsx` | Set default size on blankBoxNode drop, ensure zIndex: -1 |
| `src/components/Sidebar.tsx` | Drag item with correct default style payload |

---

## Do Not Touch

- `EstimatePanel.tsx` — annotation nodes already excluded via `is_annotation` flag
- `backend/` — no backend changes needed for styling
- `SOUL.md` hard rules apply: no emojis, Tailwind v4 syntax (`bg-white!` not `!bg-white`), Lucide icons only
- `NodeResizer` must come from `@xyflow/react` — do not install a separate library

---

## Acceptance Criteria

- [ ] BlankBoxNode renders with correct border style, border color, background fill + opacity
- [ ] Label renders at all 9 positions correctly with no overflow
- [ ] Label pill background renders when `labelBackground === 'pill'`
- [ ] NodeConfigModal shows 3x3 position picker, color swatches, border style buttons, opacity slider
- [ ] Selecting a color preset sets both `borderColor` and `backgroundColor` simultaneously
- [ ] Label color and box border color are independently configurable
- [ ] Dragging a BlankBoxNode from sidebar drops with 320×220 default size
- [ ] Node renders behind all other nodes (`zIndex: -1`)
- [ ] `NodeResizer` handles appear only when node is selected
- [ ] `hexToRgba` correctly converts hex + opacity to rgba
- [ ] `npx tsc --noEmit` passes with zero errors


-- 
# Bugfix: Edge Connections + 4-Way Handles
> Date: 2026-02-28
> Type: Bug fix + feature enhancement

## Root Causes (3 issues)

### 1. BlankBoxNode content div swallowing drag events
The `<div>` that renders the box border and fill had no `pointer-events: none`.
When users dragged a connection from a WorkflowNode handle across the BlankBoxNode
surface, the box div intercepted the drag, breaking the connection attempt.
**Fix**: Add `pointer-events-none` to the BlankBoxNode content div.

### 2. BlankBoxNode had no handles (default connectable: false)
The handles were gated behind `s.connectable` which defaulted to `false`.
Users couldn't connect TO or FROM a box.
**Fix**: Changed default to `connectable: true`. Handles always render when connectable.

### 3. Missing handle IDs + only top/bottom handles on WorkflowNode
React Flow requires unique `id` props when a node has multiple handles of the same
`type`. Without IDs, React Flow cannot track which handle was the source/target of an
edge, causing silent connection failures. WorkflowNode also only had top (target)
and bottom (source), blocking left/right connections.
**Fix**: Added `id` to all handles + added Left/Right handles on all nodes.

---

## Pattern: Source + Target handles overlapping at same position

Each side now has BOTH a source and target handle with the same position.
They render as ONE visible dot per side. React Flow distinguishes them:
- Dragging FROM the dot → uses the source handle
- Dropping ONTO the dot → uses the target handle

This is the standard React Flow pattern for bidirectional connections per side.

IDs follow the pattern: `"t-{side}"` for target, `"s-{side}"` for source.
Example: `id="t-top"`, `id="s-top"`, `id="t-right"`, `id="s-right"`, etc.

---

## Files Changed

| File | Change |
|------|--------|
| `BlankBoxNode.tsx` | `pointer-events-none` on content div; all 8 handles (4 sides × 2 types); default connectable: true |
| `WorkflowNode.tsx` | Added IDs to all handles; added Left + Right handles (4-way connections) |
| `Canvas.tsx` | Removed `zIndex: -1` from blankBoxNode onDrop (pointer-events-none makes it non-blocking) |

---

## startNode / finishNode handle rules (unchanged)
- `startNode`: NO target handles (nothing connects TO start)
- `finishNode`: NO source handles (nothing connects FROM finish)
- All other nodes: target on all 4 sides, source on all 4 sides


-- 

# Feature: Editable Edge Labels on BlankBox Connections
> Date: 2026-02-28
> Frontend only. No backend changes needed.

## Summary
Double-clicking a connection that originates from a `blankBoxNode` opens an inline
text input affixed to the midpoint of the edge. Users can type a label, press Enter
to save it, or Esc to cancel. The label persists on the edge as a styled pill.
Non-blankBox edges (agent, tool, start, finish) are not editable.

## New File
`src/components/edges/AnnotationEdge.tsx`

## Modified Files
| File | Change |
|------|--------|
| `Canvas.tsx` | Import + register `edgeTypes`, add `type: "annotationEdge"` to `defaultEdgeOptions`, pass `edgeTypes` prop to `<ReactFlow>` |
| `useWorkflowStore.ts` | Add `updateEdgeLabel(id, label)` action that patches `edge.data.label` |

## Key Design Decisions

### Why EdgeLabelRenderer (not foreignObject or SVG text)?
`EdgeLabelRenderer` renders the label in a div overlay OUTSIDE the SVG, positioned
with CSS transform. This is the official React Flow way to put HTML on edges.
`foreignObject` has inconsistent cross-browser behavior. Plain SVG `<text>` can't
render styled inputs.

### Why a transparent wide stroke hit area?
The visible edge line is 2px wide — nearly impossible to double-click precisely.
A transparent `strokeWidth={20}` path over the same bezier curve gives a comfortable
20px hit zone without changing the visual appearance.

### Why pointer-events-none on the label pill?
The static pill sits at the same position as the transparent hit area. If the pill
captured pointer events, it would block double-clicks on the hit area, making it
impossible to re-edit after saving. With pointer-events-none, clicks pass through
the pill to the transparent path beneath it.

### Why nodrag + nopan on the input container?
Without these React Flow classes, clicking into the input would trigger canvas
panning (React Flow intercepts mousedown on the canvas). `nodrag nopan` tells
React Flow to leave pointer events in this region alone.

### Source-type check
`isBlankBoxSource` uses a Zustand selector that only subscribes to the single
source node's type — avoids re-rendering the edge on unrelated node changes.

## Acceptance Criteria
- [ ] `AnnotationEdge.tsx` created at `src/components/edges/AnnotationEdge.tsx`
- [ ] `updateEdgeLabel` action added to `useWorkflowStore.ts`
- [ ] `edgeTypes` registered in `Canvas.tsx`
- [ ] `defaultEdgeOptions.type = "annotationEdge"` set in `Canvas.tsx`
- [ ] `edgeTypes` prop passed to `<ReactFlow>`
- [ ] Double-clicking a blankBoxNode edge opens inline input at edge midpoint
- [ ] Enter saves label, Esc cancels without saving
- [ ] Saved label renders as a pill on the edge
- [ ] Double-clicking the pill area re-opens the input for editing
- [ ] Double-clicking non-blankBox edges does nothing
- [ ] Canvas panning does NOT trigger while typing in the input
- [ ] `npx tsc --noEmit` passes


-- 

# Feature: Lucidchart-Style Contextual Toolbar (Replace NodeConfigModal)
> Date: 2026-02-28
> Type: Frontend refactor + new component
> Replaces: `NodeConfigModal.tsx` (floating draggable modal)
> Reference: Lucidchart top formatting bar pattern (see attached screenshot)

---

## Summary

Replace the floating `NodeConfigModal` with a **contextual top toolbar** that slides
in just below the `HeaderBar` whenever a configurable node is selected on the canvas.
The toolbar is context-sensitive — its contents change entirely based on the selected
node type. Deselecting a node (clicking the canvas background) hides it.

This matches the Lucidchart/FigJam pattern: no floating popups, just a persistent
formatting bar at the top that reacts to selection.

---

## Layout Change

**Before:**
```
┌─────────────────────────────────────────┐
│  HeaderBar                              │
├─────────────────────────────────────────┤
│  Canvas  (NodeConfigModal floats here)  │
└─────────────────────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────┐
│  HeaderBar                              │
├─────────────────────────────────────────┤  ← slides in when node selected
│  ContextToolbar  (0px → 48px tall)      │  ← collapses to 0px when nothing selected
├─────────────────────────────────────────┤
│  Canvas  (no floating modal)            │
└─────────────────────────────────────────┘
```

The toolbar uses CSS `max-height` transition (`0px ↔ 64px`) for smooth slide-in/out.
The Canvas gets the remaining height automatically via `flex-1`.

---

## Toolbar Anatomy (All Node Types)

### agentNode toolbar
```
[● Agent Name (editable)] │ [Provider ▼] [Model ▼] │ [Task Type ▼] [Output ▼] │ [Loop: __] │ [Context: ________________] │ [🗑]
```
- Node name: inline editable `<input>` (updates `data.label`)
- Provider: select → filters model dropdown (fetched from `/api/providers/detailed`)
- Model: select → shows pricing pill on change (e.g. "$3.00 / $15.00 per 1M")
- Task Type: select (6 options: Classification, Summarization, Code Gen, RAG, Tool Orchestration, Routing)
- Output Size: select (Short / Medium / Long / Very Long)
- Loop steps: compact number input (1–100, placeholder "10")
- Context: text input (max 500 chars) — shows char count badge
- Delete: Lucide `Trash2` icon button, red on hover

### toolNode toolbar
```
[◆ Tool Name (editable)] │ [Category ▼] [Tool ▼] │ [🗑]
```
- Category: select (fetched from `/api/tools/categories/detailed`)
- Tool: select filtered by category

### blankBoxNode toolbar
```
[□ Label ______] │ [3×3 pos] │ [● ● ● ● ● ● ● ●] [#______] │ [Solid][Dashed][None] │ [1][2][3]px │ Fill:[□][#___] [──●── 40%] │ [None][Pill] │ [🗑]
```
- Label: text input
- Position: compact 3×3 grid picker (9 buttons, 7×7px each, active = blue filled)
- Color preset swatches: 8 circles (clicking sets both border + fill simultaneously)
- Border hex input: updates border color independently
- Border style: 3-button toggle group (Solid / Dashed / None)
- Border width: 3-button toggle group (1px / 2px / 3px)
- Fill hex input + opacity slider (0–100%)
- Label background: 2-button toggle (None / Pill)
- Delete

### textNode toolbar
```
[T Content: ____________] │ [sm][md][lg][H] │ [● color] [#___] │ [None][Pill][Badge] │ [🗑]
```
- Content: text input (updates `textNodeStyle.content`)
- Font size: 4-button toggle (sm / md / lg / Heading)
- Color swatch + hex input
- Background: 3-button toggle (None / Pill / Badge)
- Delete

### startNode / finishNode
- Toolbar does NOT appear for these — they have no configurable properties.
- Keep existing behavior (click selects, no toolbar shown).

---

## New File: `src/components/ContextToolbar.tsx`

### Structure
```tsx
export default function ContextToolbar() {
  const selectedNodeId = useWorkflowStore(s => s.selectedNodeId)
  const nodes = useWorkflowNodes()
  const node = nodes.find(n => n.id === selectedNodeId)

  const visible = !!node && !["startNode", "finishNode"].includes(node.type ?? "")

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200 border-b",
        "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700",
        visible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="flex items-center gap-1 px-3 h-12 overflow-x-auto overflow-y-hidden">
        {node?.type === "agentNode"    && <AgentToolbarSection    node={node} />}
        {node?.type === "toolNode"     && <ToolToolbarSection     node={node} />}
        {node?.type === "blankBoxNode" && <BlankBoxToolbarSection node={node} />}
        {node?.type === "textNode"     && <TextToolbarSection     node={node} />}
      </div>
    </div>
  )
}
```

### Section sub-components (all inline in the same file)
- `AgentToolbarSection`
- `ToolToolbarSection`
- `BlankBoxToolbarSection`
- `TextToolbarSection`
- `ToolbarDivider` (a `<div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1 shrink-0" />`)
- `ToolbarLabel` (small gray label above a control group, optional)

### Shared primitive components (inline, not separate files)
- `ToolbarInput` — compact `<input>` styled for the bar height
- `ToolbarSelect` — compact `<select>` or custom dropdown
- `ToolbarButtonGroup` — horizontal group of toggle buttons
- `ToolbarColorSwatch` — 16px circle button for color presets
- `PositionPickerMini` — 3×3 grid of 7×7px buttons

---

## API Data: Move to Zustand

Currently `NodeConfigModal.tsx` fetches providers and tools on open.
With the toolbar, fetching on every selection is wasteful.

### Add to `useWorkflowStore.ts`:
```ts
// API cache slices
providerData: ProviderDetailed[] | null
toolCategoryData: ToolCategoryDetailed[] | null
isLoadingProviders: boolean
isLoadingTools: boolean

// Actions
fetchProviders: () => Promise<void>   // fetches /api/providers/detailed, sets providerData
fetchTools: () => Promise<void>       // fetches /api/tools/categories/detailed, sets toolCategoryData
```

Fetch strategy: call `fetchProviders()` and `fetchTools()` once on editor mount
(`src/app/editor/page.tsx` useEffect), not on every toolbar render.
Cache persists for the session — no re-fetching on node selection changes.

---

## Deprecate NodeConfigModal

`NodeConfigModal.tsx` is replaced but should NOT be deleted immediately.
Migration plan:
1. Remove `openConfigModal` / `closeConfigModal` / `isConfigModalOpen` calls from Canvas.tsx
2. Remove `onNodeDoubleClick` opening the modal for agentNode/toolNode/blankBoxNode/textNode
   (keep the double-click for TextNode inline editing only — that's handled inside `TextNode.tsx`)
3. Keep `NodeConfigModal.tsx` file but mark it `// DEPRECATED — replaced by ContextToolbar`
4. Remove it in a follow-up cleanup commit after toolbar is verified working

---

## Files to Touch

| File | Change |
|------|--------|
| `src/components/ContextToolbar.tsx` | NEW — full toolbar component |
| `src/app/editor/page.tsx` | Add `<ContextToolbar />` between HeaderBar and Canvas; add `fetchProviders`/`fetchTools` on mount |
| `src/components/Canvas.tsx` | Remove `openConfigModal` from `onNodeDoubleClick`; keep double-click for TextNode only |
| `src/store/useWorkflowStore.ts` | Add `providerData`, `toolCategoryData`, `isLoadingProviders`, `isLoadingTools`, `fetchProviders`, `fetchTools`; remove or keep `isConfigModalOpen` actions (can keep for now) |
| `src/components/NodeConfigModal.tsx` | Add deprecation comment; no functional changes needed |

---

## Do NOT Touch
- `backend/` — no backend changes needed
- `BlankBoxNode.tsx` — node component unchanged
- `WorkflowNode.tsx` — node component unchanged
- `EstimatePanel.tsx` — unaffected
- `HeaderBar.tsx` — unaffected

---

## Behaviour Details

### Selection → toolbar lifecycle
1. User clicks any node → `setSelectedNodeId(id)` fires → `selectedNodeId` updates in store
2. `ContextToolbar` reads `selectedNodeId`, finds node, determines visibility
3. `max-height: 0 → 64px` CSS transition plays (200ms ease-out)
4. Toolbar renders correct section

### Deselection
- User clicks canvas background → React Flow fires `onPaneClick`
- Add `onPaneClick` handler to Canvas.tsx that calls `setSelectedNodeId(null)`
- Toolbar slides back to `max-height: 0`

### Immediate updates (no Save button)
- Every toolbar control calls `updateNodeData(id, { field: value })` on change (not on blur)
- No "Apply" or "Save" button — changes are live like Lucidchart
- This is already how the store works — `updateNodeData` patches the node directly

### Horizontal overflow
- Toolbar uses `overflow-x: auto` with `overflow-y: hidden`
- On small screens / many controls: toolbar scrolls horizontally
- Controls use `shrink-0` to prevent squishing
- Scrollbar is hidden via `scrollbar-hide` utility (add to globals.css if not present):
  ```css
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  ```

### Delete node
- Trash icon at the right end of every toolbar section
- Calls `deleteNode(selectedNodeId)` from store
- After delete, `selectedNodeId` becomes null → toolbar collapses

---

## Acceptance Criteria

- [ ] `ContextToolbar.tsx` created and renders correct section for each node type
- [ ] Toolbar slides in (0 → 48px) when a configurable node is selected
- [ ] Toolbar collapses when canvas background is clicked or node is deleted
- [ ] `agentNode`: provider dropdown filters model dropdown; model change shows pricing
- [ ] `agentNode`: context input, task type, output size, loop steps all update live
- [ ] `toolNode`: category dropdown filters tool dropdown
- [ ] `blankBoxNode`: all 8 controls update the node style live (label, position, colors, border, fill, opacity)
- [ ] `textNode`: content, font size, color, background all update live
- [ ] `startNode`/`finishNode`: toolbar does NOT appear
- [ ] `onPaneClick` in Canvas.tsx deselects and collapses toolbar
- [ ] API data (providers, tools) fetched once on editor mount, not on each selection
- [ ] Toolbar scrolls horizontally on small screens without breaking layout
- [ ] Delete button removes the node and collapses toolbar
- [ ] Full dark mode support on all toolbar controls
- [ ] `NodeConfigModal.tsx` marked deprecated (no functional removal yet)
- [ ] `npx tsc --noEmit` passes with zero errors


-- 

## Feature update and bug fixes

## Bug 1 — task_type enum mismatch (frontend → backend)
Root cause: ContextToolbar.tsx sends "rag" but the backend Pydantic Literal expects "rag_answer".

Fix — ContextToolbar.tsx, one line:

```tsx
// Before
{ value: "rag", label: "RAG" },

// After
{ value: "rag_answer", label: "RAG" },
```
That's it. The label stays "RAG" so the UI is unchanged; only the value sent to the API changes.

## Bug 2 — ImportError: cannot import name 'FRONTEND_ORIGIN' from 'config'
Root cause: main.py was updated to import FRONTEND_ORIGIN but config.py still has the old variable name (probably FRONTEND_URL or similar — it's missing entirely).

Fix — config.py, add the variable:

```python
import os

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
```
Or if it already exists under a different name, alias it:

```python
FRONTEND_URL = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
FRONTEND_ORIGIN = FRONTEND_URL  # alias for main.py import
```
## Bug 3 — "Failed to fetch" on prod + API hammer in logs
These are the same root cause: fetchProviders and fetchTools have no fetch-once guard, so they re-run on every re-render. The logs show 15+ duplicate calls.

Fix — useWorkflowStore.ts, add a hasFetched guard:

```ts
// `In store state
providerData: ProviderDetailed[] | null = null
toolCategoryData: ToolCategoryDetailed[] | null = null
isLoadingProviders: boolean = false
isLoadingTools: boolean = false

// In actions — guard with isLoading AND existing data check
fetchProviders: async () => {
  const { providerData, isLoadingProviders } = get();
  if (providerData !== null || isLoadingProviders) return;  // ← guard

  set({ isLoadingProviders: true });
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/providers/detailed`);
    const data = await res.json();
    set({ providerData: data, isLoadingProviders: false });
  } catch {
    set({ isLoadingProviders: false });
  }
},

fetchTools: async () => {
  const { toolCategoryData, isLoadingTools } = get();
  if (toolCategoryData !== null || isLoadingTools) return;  // ← guard

  set({ isLoadingTools: true });
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tools/categories/detailed`);
    const data = await res.json();
    set({ toolCategoryData: data, isLoadingTools: false });
  } catch {
    set({ isLoadingTools: false });
  }
},
```
Bug 4 — "Failed to fetch" on prod (env var missing)
The prod deployment doesn't know the backend URL because NEXT_PUBLIC_API_URL is not set in the hosting environment.

Fix — set in your hosting platform (Vercel/Railway/etc.):

```text
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```
And ensure config.py on the backend side also has:

```text
FRONTEND_ORIGIN=https://your-frontend-domain.com
Summary of all changes
File	Change
ContextToolbar.tsx	"rag" → "rag_answer" in TASK_TYPES array
backend/config.py	Add FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
useWorkflowStore.ts	Add if (data !== null || isLoading) return; guard at top of both fetch actions
Hosting env vars	Set NEXT_PUBLIC_API_URL on frontend, FRONTEND_ORIGIN on backend
```

-- 

# Feature: Save / Update Existing Workflow (Save vs Save As)
> Date: 2026-02-28
> Status: Roadmapped — ready to implement

---

## Summary

Every Save currently calls `POST /api/workflows` and creates a new entry.
This feature introduces a **dirty state tracker** and a **current workflow ID**
so that saving an already-saved workflow PATCHes it in place instead of
duplicating it. Adds a **Save As** path for intentional forks.

---

## New Store State (`useWorkflowStore.ts`)

```ts
// State
currentWorkflowId:   string | null  // null = new unsaved workflow
currentWorkflowName: string         // default "Untitled Workflow"
isDirty:             boolean        // true = unsaved changes exist

// Actions
setCurrentWorkflow(id: string, name: string): void
  → sets currentWorkflowId, currentWorkflowName, isDirty: false

clearCurrentWorkflow(): void
  → sets currentWorkflowId: null, isDirty: false
  → called by: "New Workflow" button, delete-loaded-workflow

markDirty(): void
  → sets isDirty: true
  → wired into: onNodesChange, onEdgesChange, updateNodeData, updateEdgeLabel
```

### Persistence
Add `currentWorkflowId` and `currentWorkflowName` to the `localStorage`
snapshot so session survives a browser refresh.

---

## Frontend Tasks

### 1. `useWorkflowStore.ts`
- [ ] Add `currentWorkflowId`, `currentWorkflowName`, `isDirty` to state slice
- [ ] Implement `setCurrentWorkflow`, `clearCurrentWorkflow`, `markDirty` actions
- [ ] Call `markDirty()` at the end of: `onNodesChange`, `onEdgesChange`,
      `updateNodeData`, `updateEdgeLabel`, `deleteNode`, `addNode`
- [ ] Persist `currentWorkflowId` + `currentWorkflowName` to localStorage snapshot
- [ ] Re-hydrate them in `restoreFromLocalStorage`

### 2. `HeaderBar.tsx`
- [ ] Replace static "Save" button with three elements:
  - **Workflow name input** — inline editable `<input>`, updates
    `currentWorkflowName`, calls `markDirty()`
  - **Dirty indicator** — small amber `●` dot, visible only when `isDirty === true`
  - **Save button** — branches on `currentWorkflowId`:
    - If set → `PATCH /api/workflows/:id`
    - If null → `POST /api/workflows` then `setCurrentWorkflow(newId, name)`
  - **Save As... button** — always `POST /api/workflows`, then
    `setCurrentWorkflow(newId, name)`
- [ ] Show a brief "Saved ✓" inline confirmation (fade out after 1.5s) on success
- [ ] Show inline error text on failure (not a toast, not a modal)
- [ ] Disable Save button while save is in-flight (`isSaving` local state)

```tsx
// Button label logic
const saveLabel = isSaving ? "Saving…" : currentWorkflowId ? "Save" : "Save";

// Save handler
const handleSave = async () => {
  setIsSaving(true);
  if (currentWorkflowId) {
    await api.patch(`/api/workflows/${currentWorkflowId}`, { name, nodes, edges });
  } else {
    const { id } = await api.post("/api/workflows", { name, nodes, edges });
    setCurrentWorkflow(id, name);
  }
  setIsDirty(false);
  setIsSaving(false);
};
```

### 3. `SavedWorkflows.tsx` (sidebar panel)
- [ ] On workflow load: call `setCurrentWorkflow(workflow.id, workflow.name)`
  so subsequent Saves PATCH instead of POST
- [ ] On workflow delete: if deleted ID === `currentWorkflowId`,
  call `clearCurrentWorkflow()`
- [ ] Highlight the currently loaded workflow in the list
  (e.g. blue left border or bold name) using `currentWorkflowId` from store

### 4. Canvas / New Workflow button (wherever "New" is triggered)
- [ ] Call `clearCurrentWorkflow()` on new workflow creation so next Save
  creates fresh rather than overwriting the previous workflow

---

## Backend Tasks

### 1. New endpoint — `PATCH /api/workflows/{workflow_id}`

**File:** `backend/routes/workflows.py` (or wherever `POST /api/workflows` lives)

```python
@router.patch("/api/workflows/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    body: WorkflowSaveRequest,
    user=Depends(get_current_user),   # keep same auth as POST
):
    # 1. Verify workflow belongs to this user (authorization check)
    # 2. Update name, nodes_json, edges_json, updated_at in DB
    # 3. Return updated workflow record
    ...
    return UpdatedWorkflowResponse(id=workflow_id, name=body.name, updated_at=now)
```

**Request body** — reuse existing `WorkflowSaveRequest` (same shape as POST):
```python
class WorkflowSaveRequest(BaseModel):
    name: str
    nodes: list[dict]
    edges: list[dict]
```

**Response:**
```python
class UpdatedWorkflowResponse(BaseModel):
    id: str
    name: str
    updated_at: datetime
```

**Error cases to handle:**
- `404` if `workflow_id` not found
- `403` if workflow belongs to a different user
- `422` on invalid body (Pydantic handles automatically)

### 2. No changes to `POST /api/workflows`
The existing create endpoint stays identical. PATCH is additive.

---

## Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Save a brand-new workflow | `POST` → receive ID → `setCurrentWorkflow(id, name)` |
| Edit and re-save | `PATCH /:id` → no new entry created |
| "Save As" on existing | `POST` → new ID → `setCurrentWorkflow(newId, name)` |
| Delete the currently loaded workflow | `clearCurrentWorkflow()` → next Save creates new |
| "New Workflow" while one is loaded | `clearCurrentWorkflow()` → prevents overwriting old |
| Browser refresh | `currentWorkflowId` restored from localStorage → Save still PATCHes |
| PATCH returns 404 (deleted externally) | Show error, call `clearCurrentWorkflow()`, allow retry as POST |

---

## Acceptance Criteria

### Frontend
- [ ] `isDirty` flips to `true` on any node/edge change after last save
- [ ] Amber dirty dot appears in header when `isDirty === true`
- [ ] "Save" on an unsaved workflow creates a new entry and tracks its ID
- [ ] "Save" on an already-saved workflow updates it in place (no new list entry)
- [ ] "Save As" always creates a new entry and switches tracking to new ID
- [ ] Workflow name is editable inline in the header
- [ ] Currently loaded workflow is highlighted in the sidebar list
- [ ] Loading a workflow sets `currentWorkflowId` correctly
- [ ] Deleting the loaded workflow calls `clearCurrentWorkflow()`
- [ ] "New Workflow" calls `clearCurrentWorkflow()`
- [ ] `currentWorkflowId` survives a browser refresh

### Backend
- [ ] `PATCH /api/workflows/{id}` updates name + graph data
- [ ] Returns `403` if workflow belongs to different user
- [ ] Returns `404` if workflow not found
- [ ] `POST /api/workflows` unchanged
- [ ] `npx tsc --noEmit` zero errors (frontend)
- [ ] No duplicate workflows created on re-save


-- 

# Feature: Auto-Layout on Workflow Load
> Date: 2026-03-01
> Status: Roadmapped — ready to implement
> Type: Frontend only — no backend changes needed

---

## Summary

When a user loads a saved workflow from the sidebar, the nodes are restored
at the exact pixel positions they were saved at. If the user had scattered
nodes around the canvas (as seen in the screenshot), they load scattered.

This feature **automatically runs the dagre layout algorithm** immediately
after a workflow is loaded, before the canvas becomes interactive, so every
loaded workflow always opens clean and readable.

The existing **Layout** button in the header already does this on-demand.
This feature just calls that same function automatically on load.

---

## How the Layout Button Currently Works

The `Layout` button in `HeaderBar.tsx` calls a function (likely `applyLayout`
or `runLayout`) that:
1. Reads current `nodes` and `edges` from the store
2. Passes them through dagre to compute new `{x, y}` positions
3. Calls `setNodes(laidOutNodes)` to update positions
4. Calls `reactFlowInstance.fitView()` to re-center the camera

This is the exact same function that needs to run on workflow load.
No new layout logic needs to be written — just reused.

---

## What Needs to Change

### The only real change: call `applyLayout` inside `loadWorkflow`

Right now `loadWorkflow` (or wherever the sidebar sets nodes/edges) does:
```ts
// Current behaviour
setNodes(workflow.nodes);
setEdges(workflow.edges);
setCurrentWorkflow(workflow.id, workflow.name);
```

It needs to do:
```ts
// New behaviour
setNodes(workflow.nodes);
setEdges(workflow.edges);
setCurrentWorkflow(workflow.id, workflow.name);
applyAutoLayout();   // ← one new line
```

The challenge: `applyAutoLayout` needs `fitView()` from the React Flow
instance, which is only available inside a component (via `useReactFlow()`),
not inside the Zustand store directly. The solution is a **layout ref pattern**
described below.

---

## Implementation: Layout Ref Pattern

### Step 1 — Extract layout logic into a shared hook

Create `src/hooks/useAutoLayout.ts`:

```ts
import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useWorkflowStore } from "@/store/useWorkflowStore";

const NODE_WIDTH  = 220;
const NODE_HEIGHT = 100;   // approximate — matches WorkflowNode max height

export function useAutoLayout() {
  const { fitView } = useReactFlow();
  const { nodes, edges, setNodes } = useWorkflowStore();

  return useCallback((nodesToLayout = nodes, edgesToLayout = edges) => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

    nodesToLayout.forEach((node) => {
      // Skip layout for blankBoxNode and textNode — they are annotations,
      // not part of the flow logic, and should stay where the user placed them
      if (node.type === "blankBoxNode" || node.type === "textNode") return;
      graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edgesToLayout.forEach((edge) => {
      // Only add edges where both endpoints were registered as nodes
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.setEdge(edge.source, edge.target);
      }
    });

    dagre.layout(graph);

    const laidOut = nodesToLayout.map((node) => {
      if (node.type === "blankBoxNode" || node.type === "textNode") {
        return node;   // preserve annotation positions
      }
      const { x, y } = graph.node(node.id);
      return {
        ...node,
        position: {
          x: x - NODE_WIDTH  / 2,
          y: y - NODE_HEIGHT / 2,
        },
      };
    });

    setNodes(laidOut);

    // fitView after a tick so React Flow has painted the new positions
    requestAnimationFrame(() => {
      fitView({ padding: 0.15, duration: 300 });
    });
  }, [nodes, edges, setNodes, fitView]);
}
```

---

### Step 2 — Wire into the Layout button (`HeaderBar.tsx`)

Replace the current inline layout logic with the hook:

```tsx
// HeaderBar.tsx
import { useAutoLayout } from "@/hooks/useAutoLayout";

const applyLayout = useAutoLayout();

// Layout button onClick stays the same
<button onClick={() => applyLayout()}>Layout</button>
```

---

### Step 3 — Wire into workflow load (`SavedWorkflows.tsx`)

```tsx
// SavedWorkflows.tsx
import { useAutoLayout } from "@/hooks/useAutoLayout";

const applyLayout = useAutoLayout();

const handleLoad = (workflow: SavedWorkflow) => {
  setNodes(workflow.nodes);
  setEdges(workflow.edges);
  setCurrentWorkflow(workflow.id, workflow.name);

  // Layout runs after nodes/edges are in the store.
  // One rAF tick ensures the store has committed before dagre reads it.
  requestAnimationFrame(() => applyLayout(workflow.nodes, workflow.edges));
};
```

Passing `workflow.nodes` and `workflow.edges` directly to `applyLayout`
avoids a stale-closure issue where the hook might read the old nodes from
the store before the `setNodes` call has propagated.

---

### Step 4 — Pass nodes/edges explicitly to `applyLayout`

Update `useAutoLayout` signature to accept optional overrides:

```ts
return useCallback((
  nodesToLayout = nodes,   // defaults to current store nodes
  edgesToLayout = edges    // defaults to current store edges
) => { ... })
```

This makes the hook usable both ways:
- `applyLayout()` — uses current store state (Layout button)
- `applyLayout(workflow.nodes, workflow.edges)` — uses fresh loaded data

---

## Node Type Handling

| Node type | Layout behaviour |
|-----------|-----------------|
| `startNode` | Positioned by dagre — always at top of graph |
| `agentNode` | Positioned by dagre |
| `toolNode` | Positioned by dagre |
| `finishNode` | Positioned by dagre — always at bottom of graph |
| `blankBoxNode` | **Skipped** — preserved at saved position (annotation) |
| `textNode` | **Skipped** — preserved at saved position (annotation) |

---

## Animation Behaviour

- Node positions update instantly (Zustand `setNodes`)
- `fitView({ duration: 300 })` — smooth 300ms camera pan/zoom to fit all nodes
- No flash or jarring jump — layout and camera move together
- If the user immediately starts dragging a node after load, the `requestAnimationFrame`
  delay (one frame ≈ 16ms) is imperceptible

---

## Files to Touch

| File | Change |
|------|--------|
| `src/hooks/useAutoLayout.ts` | **NEW** — shared dagre layout hook |
| `src/components/HeaderBar.tsx` | Replace inline layout logic with `useAutoLayout()` hook call |
| `src/components/SavedWorkflows.tsx` | Call `applyLayout(workflow.nodes, workflow.edges)` inside `handleLoad` after `setNodes` / `setEdges` |

### No changes needed
- `Canvas.tsx` — untouched
- `useWorkflowStore.ts` — untouched
- Any backend file — no backend changes

---

## Dependencies

`@dagrejs/dagre` — already used by the Layout button.
If not yet installed: `npm install @dagrejs/dagre`
TypeScript types: `npm install -D @types/dagre`

---

## Acceptance Criteria

- [ ] `useAutoLayout.ts` hook created and exported
- [ ] `HeaderBar.tsx` Layout button uses the hook (same visual behaviour as before)
- [ ] Loading a workflow from the sidebar immediately lays it out
- [ ] `blankBoxNode` and `textNode` positions are preserved on load
- [ ] Camera fits all nodes after layout with smooth animation (`duration: 300`)
- [ ] Loading the same workflow twice produces the same layout each time
- [ ] Layout button still works manually after load (re-runs layout on demand)
- [ ] `npx tsc --noEmit` zero errors
