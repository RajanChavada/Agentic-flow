### Purpose 
The purpose of this document is to provide a comprehensive overview of the context in which our project operates. It outlines the background, environment, and relevant factors that influence our work. By understanding the context, we can better align our goals and strategies to achieve success.


### Project Description/background
This project will create a canvas where users can create agentic workflows, they are then able to view the token/latency cost of the workflow, the tool calls and connected MCP servers to the agentic worfklow are abstracted away beacuse this applications sole purpose is to be able to create unique workflows and experiment. The canvas is similar to figma or lucid chart where the user can drag and drop different nodes to create a workflow. The nodes represent different tools or actions that can be performed or it can be the agent node, and the connections between them represent the flow of data or tasks. The application will also provide analytics on the token and latency costs of the workflows, allowing users to optimize their designs for efficiency and cost-effectiveness. The agent nodes can be tailored to specific models and model providers, and also can be fed context so that token generation costs for that specific node can be estimated more accurately, after creating the workflow the user should be able to run it and view an estimated cost and latency report for the entire workflow, each specific node, and the connections between the nodes.



-- 

### Feature roadmap executive summary 

#### Executive summary
### Context‑aware agents: 
- Extend each agent node with structured context metadata (task type, input size, expected output length, loop behavior) and use heuristics + optional historical traces to estimate per‑agent token usage more accurately than just “prompt length × generic multiplier.”

### Production JSON comparison: 
- Define a minimal internal JSON schema for workflows (nodes, edges, models, tools, loop limits) and add import adapters from popular frameworks (e.g., LangGraph / graph‑based agent tools) so developers can paste/export a JSON workflow and compare its cost/latency profile against the one designed in your UI.

### Auto‑layout and export: 
- Integrate a DAG layout engine (e.g., dagre or ELK) with React Flow to “auto‑tidy” the canvas, then add export options for PNG/SVG of the graph plus downloadable run reports and comparison reports in JSON/Markdown/PDF.

# Agentic Workflow Designer – Feature Roadmap (Next Milestones)

## Overview

The current product allows users to:
- Design agentic workflows as graphs of Start/Agent/Tool/Finish nodes.
- Configure models and basic context per agent.
- Estimate total token usage and latency based on provider pricing.
- Handle maximum loop steps for cyclic graphs.
- Save workflows and compare multiple scenarios.

The next milestones deepen three areas:
1. **Context-aware estimation** (better modeling of what each agent actually does).
2. **JSON import & production comparison** (bridge between real systems and the design tool).
3. **Polished layout & export** (make graphs and reports shareable and presentation-ready).[web:100][web:124][web:69]

## Milestone 1 – Context-Aware Agents

- Add task type and expected output size to agent configuration.
- Update backend estimator to use:
  - Tokenized context length.
  - Task-specific multipliers.
  - (Later) historical stats from real runs.
- UX goal: Agents feel more like roles with semantics (“Researcher”, “Summarizer”) than plain LLM calls, while still remaining easy to configure.[web:54][web:57][web:124]

## Milestone 2 – JSON Import & Real-World Comparisons

- Define an internal workflow JSON schema that mirrors the React Flow graph.
- Implement adapters for:
  - Generic node/edge JSON.
  - LangGraph-style graphs (and later others).
- Allow users to paste or upload JSON describing an existing production workflow and:
  - Visualize it on the canvas.
  - Run the same estimation logic.
  - Compare it against locally designed workflows via the existing comparison view.[web:100][web:105][web:124]

## Milestone 3 – Auto-Layout and Export

- Add an auto-layout button powered by a DAG layout engine for cleaner, more legible graphs.[web:47][web:50][web:69]
- Enable:
  - Exporting the graph as PNG/SVG.
  - Exporting run reports and comparison reports as JSON/Markdown (and optionally PDF).
- Purpose: make it trivial to drop these workflows and reports into design docs, PRDs, and stakeholder decks.

## Longer-Term Direction

- Use imported production stats (from observability tools) to:
  - Compare **actual vs estimated** tokens and latency.
  - Continuously refine estimation heuristics per model and task.[web:124][web:126][web:132]
- Add more advanced analytics (bottleneck detection, loop risk scoring, concurrency heatmaps) building on the per-node data the system already tracks.

-- 

## LANDING PAGE FEATURE IMPLEMENTATION

1. Project + shadcn/Tailwind/TS assumptions
If the project is already a Next.js App Router app with shadcn:

You should already have:

components.json

tailwind.config.(js|ts) configured

src/components/ui as the default shadcn components folder.

If not, set up:

```bash
# In an existing Next.js app
npx shadcn-ui@latest init
# Answer prompts (TS, Tailwind, app router).
# Then add a base button component if you don’t want to use the custom one:
npx shadcn-ui@latest add button
```

This creates /src/components/ui and the utilities under /src/lib/utils that your new components expect.

If your codebase currently uses a different components path (e.g., src/components only), still create src/components/ui for all design‑system primitives so agents and humans know where reusable UI lives.

Tailwind/TS for a fresh app:

```bash
npx create-next-app@latest my-app --ts --tailwind
# Tailwind is wired via the Next.js Tailwind guide; keep @tailwind base/components/utilities in globals.css.[web:213][web:216][web:219]
npx shadcn-ui@latest init
```

# Hero & Landing Implementation Notes

- All hero-related components live under:
  - `src/components/ui` (design-system pieces: Button, FloatingIconsHero, Boxes).
  - `src/components/demo` (demo wrappers, easily replaced later).
- Use `FloatingIconsHero` for the main hero on `/`:
  - Pass copy tuned to agentic workflows (e.g., "Design. Optimize. Agentic Workflows.").
  - Use lucide-react icons (Bot, Workflow, CircuitBoard, etc.) instead of emojis.
- Use `BackgroundBoxes` as:
  - A secondary hero or background effect for a “How it works”/“Technical” section.
- External deps:
  - `framer-motion`
  - `@radix-ui/react-slot`
  - `class-variance-authority`
  - `lucide-react` (for icons)
- Agents must not change file paths:
  - `@/components/ui/button`
  - `@/components/ui/floating-icons-hero-section`
  - `@/components/ui/background-boxes`
- When modifying the hero:
  - Keep layout minimal, avoid heavy copy.
  - Preserve type signatures so components remain reusable across pages.
