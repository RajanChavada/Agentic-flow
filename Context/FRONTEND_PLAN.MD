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
Ensure @/lib/utils exports cn (shadcn init does this by default).[web:208][web:211]

4. Button Primitive (Design-System)
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