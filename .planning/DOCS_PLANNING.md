# Neurovn Documentation Experience – Feature Roadmap

## Feature Theme

Build a Figma/Lucidchart‑style documentation experience inside (or alongside) Neurovn that teaches users how to design agentic workflows and estimate latency/pricing via visual, interactive guides rather than static text. [web:11][web:13][web:18]

---

## Goals & Success Criteria

### Product goals

- Help new users reach “first useful estimate” (end‑to‑end workflow + cost/latency estimate) in under 15 minutes via docs. [web:11][web:14]
- Reduce support questions about “how are cost and latency calculated?” by centralizing clear, math‑backed explanations.
- Enable PMs/finance to consume workflow cost estimates without needing to understand Neurovn’s internals.

### Success metrics

- Time‑to‑first‑estimate (TTFE) from signup → first full workflow with estimates.
- % of users who complete Quickstart guide.
- Decrease in pricing/latency‑related tickets per active account.

---

## High‑Level Structure

Ship a docs system that mirrors how Figma/Lucidchart structure learning: concepts → how‑tos → patterns/recipes. [web:11][web:13][web:16][web:19]

Top‑level sections:

1. Overview
2. Quickstart: From idea to estimate
3. Core concepts
4. Building workflows in the canvas
5. Pricing & latency estimation
6. Team workflows & collaboration
7. Reference (models, nodes, glossary)
8. Recipes & patterns

---

## Epics & Features

### Epic 1 – Docs Infrastructure

**Goal:** Have a place where all of this can live and evolve.

**Features:**

- `DOCS-1` Docs container
  - Decide where docs live: in‑app sidebar, modal, or separate `/docs` site.
  - Support deep linking to specific sections/pages.

- `DOCS-2` Navigation & search
  - Left‑hand navigation with nested sections (Overview, Quickstart, etc.).
  - Full‑text search across docs content.

- `DOCS-3` Versioning
  - Simple version badge (e.g., “Neurovn v0.4”).
  - Ability to flag pages as “Draft” vs “Stable”.

---

### Epic 2 – Overview & Core Concepts

**Goal:** Explain Neurovn’s mental model in 1–2 pages.

**Features:**

- `DOCS-10` Overview page
  - “What is Neurovn?”
  - Target users: AI infra, ML eng, PMs, finance.
  - Core value: visualize agentic workflows and estimate cost/latency across models/tools.

- `DOCS-11` Core concepts page
  - Define: Agent Graph, Node, Edge, Model/Tool, Run, Scenario.
  - Simple diagram that labels these parts (Figma/Lucidchart style “anatomy” view). [web:16][web:19]

---

### Epic 3 – Quickstart: From Idea to Estimate

**Goal:** Copy the “15‑minute onboarding” vibe of good product roadmaps and tutorials. [web:11][web:13][web:18]

**Features:**

- `DOCS-20` Quickstart guide
  - Step‑by‑step: create a new workflow, add nodes, assign models/tools, set traffic assumptions, see estimates.
  - 5–7 screenshots or GIFs tied to specific steps.

- `DOCS-21` Example template workflow
  - Bundle a sample “User asks a question → LLM → Tool → LLM answer” workflow.
  - One‑click “Open in Neurovn” from docs.

- `DOCS-22` “What to do next” section
  - Show how to compare same workflow with different models (e.g., small vs large LLM) and explain trade‑offs.

---

### Epic 4 – Node & Workflow Documentation

**Goal:** Document nodes like Lucidchart documents flowchart symbols: meaning, usage, and behavior. [web:16][web:19]

**Features:**

- `DOCS-30` Node palette page
  - Table listing node types (LLM Call, Tool Call, Decision/Branch, Parallel Block, Loop/Retry, Aggregator/Join).
  - For each: visual icon, semantic meaning, impact on cost/latency.

- `DOCS-31` Node detail pages (template)
  - Per node type:
    - Purpose
    - Anatomy (screenshot with numbered callouts)
    - Behavior & interactions
    - Configuration options
    - Estimation model (how this node affects cost/latency)
    - Example micro‑workflow

- `DOCS-32` Workflow patterns page
  - Explain sequential vs parallel vs branched vs looping workflows.
  - Visual examples with miniature diagrams.

---

### Epic 5 – Pricing & Latency Estimation

**Goal:** Make the estimation math explicit and trustworthy, while deferring to vendor pricing docs for concrete numbers. [web:17][web:20]

**Features:**

- `DOCS-40` “How pricing works” page
  - Explain that model pricing data comes from providers like OpenAI/Azure.
  - Link to official pricing pages instead of duplicating full tables. [web:17][web:20]
  - Note that providers can change prices; users should verify sensitive calculations.

- `DOCS-41` Cost formulas page
  - Per‑node formulas:
    - LLM node cost ≈ input tokens × input rate + output tokens × output rate (per 1K tokens).
    - Tool node cost = per‑call fee or fixed overhead (if supported).
  - Workflow cost:
    - Sum of node costs; branch probabilities and loops factored into expected cost.

- `DOCS-42` Latency model page
  - Per‑node latency components: model latency, tool latency, network overhead.
  - Graph latency:
    - Sequential = sum.
    - Parallel = max of branches.
    - Retries/loops = expected latency based on retry probability.

- `DOCS-43` Scenarios & sensitivity analysis
  - Show how to toggle optimistic/typical/worst‑case assumptions.
  - Show how changing traffic, token counts, or model selection affects estimates.

---

### Epic 6 – Team Workflows & Collaboration

**Goal:** Mirror Figma’s “team file organization” best practices so teams can keep workflow docs sane. [web:11][web:13][web:18]

**Features:**

- `DOCS-50` Organizing workflows
  - Recommended project structure (by product area, environment, or customer).
  - Naming conventions and tagging.

- `DOCS-51` Versioning & comparison
  - How to duplicate workflows for A/B tests.
  - Show before/after estimate comparisons for decision‑making.

- `DOCS-52` Reading estimates for PMs/finance
  - Non‑technical explanation of:
    - Per‑run estimate.
    - Monthly cost at given volume.
    - Latency estimates (P50/P95).

---

### Epic 7 – Reference: Models, Nodes, Glossary

**Goal:** Provide a compact, always‑on reference layer.

**Features:**

- `DOCS-60` Supported models & providers
  - High‑level description of each provider (pricing model, key constraints).
  - Links to official pricing pages for latest info. [web:17][web:20]

- `DOCS-61` Node reference index
  - List of all node types linking to their detail pages.

- `DOCS-62` Glossary
  - Definitions: tokens, per‑1K pricing, P50/P95 latency, scenario, run, etc.

---

## Implementation Phases

### Phase 1 – Skeleton & Quickstart

- Ship docs skeleton, navigation, and:
  - Overview
  - Quickstart
  - Node palette
  - Basic “How pricing works” stub

### Phase 2 – Deep Concept & Math Docs

- Fill in:
  - Detailed node pages
  - Cost & latency model docs
  - Scenarios & sensitivity

### Phase 3 – Team & Reference Layer

- Add:
  - Team workflows & collaboration
  - Full model/provider reference
  - Glossary

---

## Dependencies & Risks

- **Dependencies**
  - Accurate mapping of model pricing from providers (e.g., OpenAI, Azure). [web:17][web:20]
  - Stable UX for workflow canvas and node types.

- **Risks**
  - Docs falling out of sync with pricing changes.
  - Significant UI changes invalidating screenshots/visuals.
  - Overly complex math explanations intimidating non‑technical readers.

---

## Open Questions

- Should docs be fully public (marketing + self‑serve) or gated behind login?
- Do we want interactive docs (embedded live canvases) or static screenshots first?
- How strict should we be about binding estimates to specific provider versions/pricing dates?
