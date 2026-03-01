### Purpose of this document 
this is the backend plan document for the backend agent which will go over the goals and the tech stack for the backend development of the project, this document will also outline the specific routes that need to be implemented in the FastAPI backend and the purpose of each route, this document will also serve as a reference for the agent to document their update/progress and next steps


# Backend Plan – Agentic Workflow Analyzer

## 1. Goals

- Provide a **fast, minimal API** that:
  - Accepts a workflow graph (nodes + edges).
  - Returns **estimated token usage** and **estimated latency** per node and for the whole workflow.
  - Classifies graph as **DAG or CYCLIC**.
- Optimize for:
  - Low response latency (lightweight computation, async where needed).
  - Clear contracts via Pydantic models.
  - Easy extension later (LangSmith traces, more providers, cost optimization).

---

## 2. Tech Stack Overview

- **Framework:** FastAPI
  - Async‑first, high‑performance, excellent for ML/LLM workloads [web:61][web:68].
- **Server:** Uvicorn (ASGI).
- **Data Models:** Pydantic (FastAPI’s native choice) – strong typing + auto‑docs [web:71].
- **Token Estimation:**
  - `tiktoken` for OpenAI‑style token counting.
  - Simple heuristic models for non‑OpenAI providers (or provider‑specific tokenizers later).
- **Token Usage Tracking (Future):**
  - LangChain utilities like `get_openai_callback()` and Async callbacks for real runs [web:54][web:57][web:40].
- **Pricing Data:**
  - Static in `pricing_data.py` for MVP, with structure designed for later dynamic updates.

---

## 3. API Design

### 3.1 Endpoints

1. `POST /api/estimate`
   - Input: workflow nodes + edges.
   - Output: estimated tokens, cost, latency, graph type, and per‑node breakdown.

2. `GET /api/pricing`
   - Returns current pricing table for supported providers/models (for frontend display or comparison).

### 3.2 Pydantic Models

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class NodeConfig(BaseModel):
    id: str
    type: Literal["startNode", "agentNode", "toolNode", "finishNode"]
    label: Optional[str] = None
    model_provider: Optional[str] = Field(default=None, description="OpenAI, Anthropic, Google, etc.")
    model_name: Optional[str] = None
    context: Optional[str] = Field(default="", max_length=500)

class EdgeConfig(BaseModel):
    id: Optional[str] = None
    source: str
    target: str

class WorkflowRequest(BaseModel):
    nodes: List[NodeConfig]
    edges: List[EdgeConfig]

class NodeEstimation(BaseModel):
    node_id: str
    node_name: str
    tokens: int
    cost: float
    latency: float

class WorkflowEstimation(BaseModel):
    total_tokens: int
    total_cost: float
    total_latency: float
    graph_type: Literal["DAG", "CYCLIC"]
    breakdown: List[NodeEstimation]
    critical_path: List[str]
```

### 4. Estimation Logic
## 4.1 Token & Cost Calculation
- Use tiktoken for robust token counting for models that share OpenAI encodings [web:54][web:57]:

- count_tokens(text: str) -> int helper.

For each agent node:

input_tokens = tokens in context + base system prompt estimate.

output_tokens = heuristic (e.g., 1.5 * input_tokens, configurable per node type).

Pricing lookup from MODEL_PRICING dict:

Keys like "OpenAI_GPT_4", "Google_Gemini_1_5_Pro".

Values: {"input": price_per_million, "output": price_per_million, "tokens_per_sec": N}.

Cost formula:

input_cost = (input_tokens / 1_000_000) * pricing["input"]

output_cost = (output_tokens / 1_000_000) * pricing["output"]

total_cost = input_cost + output_cost

Latency estimate:

latency_seconds = output_tokens / pricing["tokens_per_sec"]

## 4.2 Graph Analysis: DAG vs Cyclic
Implement GraphAnalyzer:

Build adjacency list from edges.

DFS‑based cycle detection:

If a back edge is found, classify as CYCLIC.

Topological sort (Kahn’s algorithm) for DAGs:

Use result as an approximate critical path order (later extended with per‑node latency weights).

For MVP, critical path can simply be:

Topological order of nodes with in_degree == 0 as starting points.

Later, compute true longest‑latency path when we add per‑node latency weighting.

### 5. FastAPI Application Structure
Suggested layout:

text
backend/
├── main.py              # FastAPI app, routes
├── models.py            # Pydantic schemas
├── estimator.py         # token & latency estimation logic
├── graph_analyzer.py    # DAG/cycle detection and critical path
├── pricing_data.py      # static pricing table
└── config.py            # env config (API keys if needed later)
## 5.1 main.py
Create FastAPI app with CORS enabled for http://localhost:3000.

Implement:

POST /api/estimate:

Parse WorkflowRequest.

Run GraphAnalyzer.

Run WorkflowEstimator.

Return WorkflowEstimation as JSON.

GET /api/pricing:

Return MODEL_PRICING.

## 5.2 Performance Considerations
FastAPI + Uvicorn gives high throughput and low latency for our lightweight CPU‑bound workload [web:61][web:68][web:74].

Estimation is deterministic and simple (no external API calls), so each request should be < 10 ms on typical hardware.

If/when remote calls (e.g., fetching live pricing or LangSmith traces) are added:

Use async HTTP clients (httpx) and caching (Redis) to avoid latency spikes.

### 6. Future Integration with LangChain / LangGraph
While MVP only estimates, design code so it can later:

Wrap real LangChain runs with get_openai_callback() to record:

Actual prompt_tokens, completion_tokens, and total_cost per node [web:54][web:57].

Use FastAPI streaming endpoints with AsyncIteratorCallbackHandler to:

Maintain real‑time token counters during generation [web:40].

Persist historical statistics per node type/model combination for data‑driven estimators.

### 7. Model Pricing Source Plan
Short term (MVP):

Hard‑code representative pricing from public docs for:

GPT‑4 / 4‑Turbo, Claude 3 Sonnet/Opus, Gemini 1.5 Pro, Gemini 2.x Flash, etc.

Keep all pricing in one MODEL_PRICING dict for easy editing.

Long term:

Add a small pricing sync script that:

Hits provider pricing pages/APIs (where available).

Updates MODEL_PRICING and stores a last_updated timestamp.

### 8. Agent Guidance for This File
When an agent maintains this backend plan:

Treat this file as the authoritative specification for backend behavior.

Update:

Endpoint definitions when new endpoints are added.

Pydantic models when request/response shapes change.

Pricing strategy when dynamic pricing or new providers are introduced.

Estimation heuristics when historical data suggests better formulas.

Keep the focus on:

estimated token usage

estimated latency

Graph classification (DAG vs cyclic)
as the primary responsibilities of the backend for the foreseeable MVP and v1.


## Data that we need 
1. Data you need per model
For each model you want to support, store:

Provider id (openai, anthropic, google-gemini, etc.).

Model id (e.g. gpt-5.1, o3-mini, claude-4.5-sonnet, gemini-2.5-flash-lite).

Input price per 1M tokens.

Output price per 1M tokens.

Typical tokens/sec (throughput) – approximate, derived by you.

Context window (for validation).

Optional: quality tier, family, cache read/write prices (future).

This becomes your canonical pricing table that both frontend and backend read.


## Possible data sources
2. Where to get provider + model lists
2.1 Primary sources
OpenAI

Pricing pages and calculators list all chat models with input/output prices.

Anthropic

Anthropic and third‑party pricing guides enumerate all Claude 4.5 / 4.6 variants with per‑1M token prices.

Google Gemini

Gemini pricing breakdowns list all current models (Flash‑Lite, Flash, Pro, 3 Pro, etc.) with input/output costs.

These sites are already doing the hard work of aggregating models and prices into machine‑readable tables you can scrape or ingest.

## Important Notes
- The agent should read and update these documents because it allows the agent to keep track of its progress and also allows it to reflect on its work and make informed decisions in future tasks. By maintaining a record of their experiences, agents can continuously improve their performance and adapt to new challenges effectively. The agent should follow the outline when documenting their updates and ensure they define them selves as which specific agent they are for example "Frontend agent working on sidebar" or "Backend agent working on FAST API routes"
- Also make sure the markdown is correct so reformat if needed and make sure to update the table of contents if new sections are added.



## Next stage: Agentic workflow comparison tool 
The next stage after the estimation API is to build a workflow comparison tool that allows users to compare two different workflows side by side, showing the estimated token usage, latency, and cost for each workflow, as well as highlighting the differences in their structure (e.g., which nodes are different, which edges are different). This will help users understand the tradeoffs between different workflow designs and optimize for their specific use case.
You’re at a perfect point to add scenario comparison as the next feature: saving multiple workflows, running estimates for each, and comparing cost/latency side‑by‑side instead of forcing users to eyeball separate reports. This matches how scenario‑planning and A/B tools work in other domains.

Below is a focused roadmap tailored to your current app.

1. Concept: “Workflow Scenarios” instead of single graphs
Introduce the idea that each graph on the canvas is a Workflow Scenario:

workflow_id

name (e.g., “Research‑v1‑DAG”, “Research‑v2‑looping‑review”)

graph (nodes + edges + loop config)

estimate (tokens, cost, latency, min/avg/max)

This lets you:

Save multiple scenarios in a sidebar.

Open one at a time on the main canvas.

Select 2–N scenarios and generate a comparison report.

This is how scenario/planning tools structure side‑by‑side analysis: named scenarios with shared metrics.

2. Product UX: how comparison should feel
2.1 Left sidebar: “Saved Workflows”
Add a new section below your component palette:

“Saved Workflows”

Each item: name, last updated, key metrics pill (e.g., “$0.14 / 7.8s”).

Checkbox to select for comparison.

Buttons:

“Save Current as New Scenario”

“Duplicate for Variant” (clone current workflow to tweak model choices).

2.2 Comparison workspace / tab
Pattern from scenario tools and dashboards: side‑by‑side comparison view.

Two options:

Inline panel:

Clicking “Compare” slides up a full‑width panel from the bottom with a table and charts.

Separate tab or route:

/compare shows a multi‑column layout: each column is one workflow.

For MVP I’d do:

A modal or bottom sheet with:

Table summarizing each workflow.

Simple bar charts for cost and latency.

3. Data model and backend changes
3.1 Workflow entity
Persist workflows either in local storage (MVP) or DB/API (multi‑user later).

Minimal shape:

ts
// frontend
type WorkflowScenario = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  graph: {
    nodes: Node[];
    edges: Edge[];
    recursionLimit?: number;
  };
  estimate?: WorkflowEstimate; // from backend
};
Backend mirror (Pydantic) if you add persistence there.

3.2 New backend endpoint
Add an endpoint to estimate multiple workflows in one request so the user can see comparison with one click:

POST /api/estimate/batch

Request:

json
{
  "workflows": [
    {
      "id": "scenario-a",
      "graph": { "nodes": [...], "edges": [...], "recursion_limit": 20 }
    },
    {
      "id": "scenario-b",
      "graph": { "nodes": [...], "edges": [...], "recursion_limit": 10 }
    }
  ]
}
Response:

json
{
  "results": [
    {
      "id": "scenario-a",
      "total_tokens_avg": 15840,
      "total_cost_avg": 0.42,
      "total_latency_avg": 7.9,
      "total_tokens_max": 22000,
      "total_cost_max": 0.63,
      "total_latency_max": 11.5
    },
    {
      "id": "scenario-b",
      "total_tokens_avg": 12400,
      "total_cost_avg": 0.31,
      "total_latency_avg": 5.8,
      "total_tokens_max": 16000,
      "total_cost_max": 0.40,
      "total_latency_max": 7.2
    }
  ]
}
Internally this just loops over your existing estimator, so implementation is trivial.

4. Comparison metrics and ranking logic
Scenario‑comparison tools in other domains focus on few key KPIs to avoid noise. For your use case:

Per workflow:

total_tokens_avg, total_tokens_max

total_cost_avg, total_cost_max

total_latency_avg, total_latency_p95 (if you expose p95 from loops)

graph_type (DAG or CYCLIC)

steps_avg, steps_max (if you already compute steps)

Derived metrics you can show:

Cost per 1K tokens – sanity check.

Cost per second – rough cost efficiency.

Rank: “Cheapest”, “Fastest”, “Balanced”.

You can also adopt A/B‑testing style thinking: choose a primary objective, usually “minimize cost and latency while maintaining quality”.

For now:

Let user pick a primary optimization target:

“Optimize for cost”

“Optimize for latency”

“Optimize for cost‑latency trade‑off (weighted score)”

Then compute a simple score:

score = w_c \cdot \text{normalized_cost} + w_l \cdot \text{normalized_latency}
and highlight the best workflow.

5. Frontend implementation steps
5.1 Extend Zustand store
Add:

ts
type WorkflowStore = {
  // existing graph + estimation state
  currentWorkflowId: string | null;
  workflows: Record<string, WorkflowScenario>;
  selectedForComparison: string[];

  saveCurrentWorkflow(name?: string): void;
  duplicateWorkflow(id: string): void;
  selectForComparison(id: string, selected: boolean): void;
  setEstimateForWorkflow(id: string, estimate: WorkflowEstimate): void;
};
Logic:

saveCurrentWorkflow takes current nodes, edges, recursionLimit from the existing graph state and stores them under a new ID.

selectForComparison toggles checkboxes in sidebar.

5.2 “Compare Workflows” UI
Button becomes active when selectedForComparison.length >= 2.

On click:

Call POST /api/estimate/batch with all selected scenarios.

Store returned estimates in store.

Open a comparison drawer.

Comparison drawer elements:

Top summary chips:

“2 workflows selected”

Show each workflow name with its cost/latency.

Side‑by‑side card layout:

One card per workflow:

Name

Cost avg/max

Latency avg/max

Tokens avg/max

Graph type

Comparison table (for clarity):

Metric	Workflow A	Workflow B	Workflow C
Total cost (avg)	…	…	…
Total latency (avg)	…	…	…
Tokens (avg)	…	…	…
Steps (avg)	…	…	…
Graph type	DAG/Cycle	DAG/Cycle	DAG/Cycle
Highlight winner per metric (simple color).

This follows comparison‑chart best practices used in planning/simulation tools.

6. Roadmap ordering (what to do next)
Given where you are (single‑workflow estimator already working), I’d sequence as:

Workflow saving

Zustand store + sidebar list.

“Save current” and “Load workflow”.

Batch estimate endpoint

Lightweight FastAPI route that wraps your existing estimator for N workflows.

Comparison drawer

Multi‑workflow table + simple highlight of cheaper/faster.

Scoring + rank

Optional “Best by cost / Best by latency / Overall best (weighted)” label.

Persistent storage (later)

Persist workflows to a DB or user account; allow exporting/importing scenarios.

That gives you a very compelling v2: users design multiple candidate graphs, run them all in one click, and immediately see which is cheaper/faster—no manual comparison needed.

## Resources for the Agent
When extending this plan, reference:
- FastAPI docs and examples for building REST APIs [web:61][web:68].
- Pydantic documentation for defining request/response models [web:71].
- Articles on building estimation APIs for LLM workloads [web:54][web:57][
web:40].
- Best practices for API design and performance optimization in Python [web:74].


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
## 9. Context-Aware Token Estimation (Planned)

### 9.1 Goals

- Move from context-length-only heuristics to **task-aware** token and latency estimates.
- Leverage:
  - Actual tokenization of the context string.
  - Task type and expected output size metadata.
  - Optional historical averages from real runs (when available).[web:54][web:57][web:124]

### 9.2 Model Changes

- Extend `NodeConfig`:

```python
class NodeConfig(BaseModel):
    id: str
    type: Literal["startNode", "agentNode", "toolNode", "finishNode"]
    label: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    context: Optional[str] = Field(default="", max_length=500)
    max_loop_steps: Optional[int] = None

    task_type: Optional[Literal[
        "classification",
        "summarization",
        "code_generation",
        "rag_answer",
        "tool_orchestration",
        "routing"
    ]] = None

    expected_output_size: Optional[Literal[
        "short", "medium", "long", "very_long"
    ]] = None

    expected_calls_per_run: Optional[int] = None
```
## 9.3 Estimation Logic
Implement a TaskAwareEstimator that:

Uses a tokenizer (e.g., tiktoken) to compute input_tokens from context.[web:54][web:57]

Chooses an output_multiplier based on (task_type, expected_output_size).

Applies model pricing from the registry to compute costs.

Optionally checks a ModelStats table for historical averages and blends them with the heuristic estimate.

## 10. JSON Import and External Workflow Comparison (Planned)
### 10.1 Import API
Endpoint: POST /api/import-workflow

Request model:

``` python 
class ExternalWorkflowImportRequest(BaseModel):
    source: Literal["generic", "langgraph", "custom"]
    payload: dict
Response model: internal WorkflowRequest (nodes, edges, metadata).
```
## 10.2 Adapter Layer
Implement adapters:

``` python
def import_generic(payload: dict) -> WorkflowRequest: ...
def import_langgraph(payload: dict) -> WorkflowRequest: ...
future: additional adapters
```
```text

- Responsibilities:
  - Map foreign node types to `"startNode" | "agentNode" | "toolNode" | "finishNode"`.
  - Extract model info, prompts, and loop settings where possible.
  - Fill defaults for missing fields (with clear documentation).
```
### 10.3 Imported Workflow Estimation

- Option A:
  - Client first calls `/api/import-workflow`, then `/api/estimate` with normalized result.
- Option B:
  - Provide a convenience endpoint `POST /api/estimate/imported`:
    - Accepts `ExternalWorkflowImportRequest`.
    - Internally imports → estimates → returns report in one shot.

---

## 11. Exported Reports (Planned)

### 11.1 JSON / Markdown Exports

- JSON export:
  - No backend changes required; frontend can serialize current `WorkflowEstimation` and comparison results directly.
- Markdown export:
  - Optional endpoint `POST /api/export/report`:
    - Accepts a structured report payload:
      - Workflow metadata, key metrics, bottlenecks, model mix, loop info, scaling assumptions.
    - Returns Markdown or HTML text.

### 11.2 PDF Export (Optional)

- If PDF generation is server-side:
  - Integrate a rendering library (WeasyPrint, wkhtmltopdf, or similar).
  - Endpoint: `POST /api/export/report/pdf`.
  - Returns a downloadable PDF or a temporary URL.

- If PDF is handled client-side:
  - No backend changes; rely on browser print or a front-end PDF library.


--

# User Accounts & Workflow Persistence (Supabase)

## 1. Goals

- Allow users to:
  - Sign up / log in via Supabase Auth.
  - Create agentic workflows on the canvas while unauthenticated.
  - Be prompted to sign in only when they click **Save**.
  - Persist, list, load, and delete **their own** workflows from a Postgres table.
- Enforce **row-level security** so each user can only access their workflows.[web:169][web:172][web:173][web:179]
- Keep the API surface small and compatible with the existing estimation/comparison features.

---

## 2. Tech Stack & Integration Points

- **Auth & DB**: Supabase (Postgres + Supabase Auth).
- **Frontend**: Next.js + Supabase JS client + your existing Zustand store.
- **Security**:
  - Supabase **Row Level Security (RLS)** on the `workflows` table.[web:169][web:172][web:173]
  - All CRUD operations done via Supabase client using the user’s auth session (public `anon` key).

---

## 3. Database Design (Supabase)

### 3.1 `workflows` table

Schema (SQL):

```sql
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  graph jsonb not null,          -- stores nodes, edges, config
  last_estimate jsonb,           -- optional: cached estimate report
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index workflows_user_id_idx on public.workflows (user_id);
graph = your existing internal workflow JSON (nodes, edges, recursion_limit etc.).
```

last_estimate can be filled when the user runs an estimate, so listing workflows can show a quick “$0.XX / Y seconds” preview.

## 3.2 Row-Level Security (RLS)
Enable RLS and policies so users only see their own workflows.[web:169][web:172][web:173][web:179]

```sql
alter table public.workflows enable row level security;

create policy "Users can view their workflows"
on public.workflows
for select
to authenticated
using ( auth.uid() = user_id );

create policy "Users can insert their workflows"
on public.workflows
for insert
to authenticated
with check ( auth.uid() = user_id );

create policy "Users can update their workflows"
on public.workflows
for update
to authenticated
using ( auth.uid() = user_id );

create policy "Users can delete their workflows"
on public.workflows
for delete
to authenticated
using ( auth.uid() = user_id );
Optionally allow read-only access to public templates (another table) later.
```
## 4. Auth Flow & UX
### 4.1 Entry behavior
Unauthenticated users:

Can open the app, design workflows on the canvas, and run local estimates (no persistence).

When user clicks Save:

If not authenticated:

Show a login / sign-up modal (Supabase Auth UI or your own forms).

After successful login, re-trigger the save.

### 4.2 Session management
Use Supabase’s Next.js quickstart pattern:

Create a single Supabase client in lib/supabaseClient.ts.

Use the auth helpers / @supabase/ssr if you later need SSR.[web:170][web:176][web:182]

Store current user in a small auth store or React context so:

Header can show “Sign in / Sign out” state.

Workflow sidebar can show only the logged-in user’s workflows.

## 5. Frontend Responsibilities
### 5.1 Auth UI
Header:

Right side: Sign in / Sign up buttons when logged out.

When logged in: show user avatar/email + Sign out.

Auth modal:

Simple email/password for v1 (OAuth later).

Use Supabase JS client’s signInWithPassword / signUp functions.

### 5.2 Workflow save / load / delete
Extend your Zustand store with async actions:

```ts
type WorkflowScenario = {
  id: string;
  name: string;
  description?: string;
  graph: InternalGraph;   // nodes, edges, config
  lastEstimate?: WorkflowEstimate;
};

type WorkflowStore = {
  currentWorkflowId: string | null;
  workflows: WorkflowScenario[];
  // ...
  saveCurrentWorkflowToSupabase(name: string, description?: string): Promise<void>;
  loadWorkflowsFromSupabase(): Promise<void>;
  deleteWorkflowFromSupabase(id: string): Promise<void>;
  loadWorkflowOntoCanvas(id: string): void;
};
Behaviors:

Save:
```
Gather current graph + latest estimate.

If user is logged out → open auth.

If logged in:

If currentWorkflowId exists → update row.

Else → insert new row and set currentWorkflowId.

Load list:

On login, fetch all workflows for that user ordered by updated_at desc.

Populate a “Saved Workflows” section in the left sidebar.

Load one onto canvas:

Replace local nodes, edges, recursionLimit etc. with data from the selected scenario.

Delete:

Confirm.

Call Supabase delete on that id.

Remove from store; if currently loaded, clear currentWorkflowId.

### 5.3 Gating “Save” behind auth
Pseudocode for the Save button:

```ts
const handleSave = async () => {
  if (!user) {
    openAuthModal({ reason: "You need an account to save workflows." });
    return;
  }
  await workflowStore.saveCurrentWorkflowToSupabase();
};
6. Backend/API Surface
Because Supabase exposes PostgREST directly, no extra backend service is strictly required for basic CRUD:

The frontend can call:

supabase.from('workflows').insert(...)

supabase.from('workflows').select('*')

supabase.from('workflows').update(...)

supabase.from('workflows').delete(...)
```
RLS policies enforce user isolation.[web:169][web:172][web:173][web:179]

If you later introduce a custom API (for multi-tenant orgs, billing, etc.), you can:

Keep workflows in Supabase.

Use a server-side key in Next.js route handlers for admin operations.

Still rely on RLS for client-side calls from authenticated users.

## 7. Security & Best Practices
Always enable RLS on the workflows table; public anon key should never see all rows.[web:169][web:172][web:179]

Use the authenticated role for insert/update/select/delete via Supabase client.[web:169][web:173]

Keep access tokens short-lived and use refresh tokens via Supabase’s built-in flows.[web:181][web:178]

Log high-risk actions (deletes, sharing, future team features) server side if you later add a custom API.[web:175][web:178]

## 8. Implementation Milestones
Supabase setup

Create project, configure Auth (email/password), create workflows table, enable RLS + policies.

Next.js Supabase integration

Add Supabase client, basic auth context/store, header UI for login/logout.

Save/load/delete flows

Implement CRUD methods in the workflow store and “Saved Workflows” sidebar.

Auth-gated Save

Wire Save button to auth guard and Supabase persistence.

Polish

Autosave or “dirty state” indicator.

Surface last estimate summary in the workflow list (e.g., $0.12 / 6.5s).



-- 

## Feature update fix: store the state of the users canvas as they are signing in or signing up so that when they come back its all there 

The root cause is the full-page redirect that OAuth requires — localStorage survives it, React state does not. The fix is a pre-flight save to localStorage before triggering OAuth and a post-auth restore in the callback. Here is everything you need, file by file.

## Root Cause
When signInWithOAuth fires, the browser leaves your app entirely, goes to Google/GitHub, then comes back to /auth/callback. React's in-memory state (useState, Zustand store) is gone. localStorage survives because it is browser-side storage that outlasts page navigations.

## Architecture of the Fix
```text
User clicks Save (unauthenticated)
        │
        ▼
1. Serialize current nodes + edges + metadata → write to localStorage key "guest_workflow"
        │
        ▼
2. signInWithOAuth({ redirectTo: "/auth/callback" })
        │
        ▼
        (Google/GitHub redirect round-trip)
        │
        ▼
3. /auth/callback route: auth confirmed
        │
        ▼
4. Read "guest_workflow" from localStorage
        │
        ▼
5. Rehydrate Zustand store (setNodes + setEdges)
6. Remove "guest_workflow" from localStorage
7. router.push("/app") — user is back on their canvas
        │
        ▼
8. Optional: auto-trigger save to Supabase now that user is authenticated
```
Files to change
## 1. New utility: src/lib/guestWorkflow.ts
This is the single source of truth for the serialization key and helpers.

```ts
import type { Node, Edge } from "@xyflow/react";

const KEY = "guest_workflow";

export interface GuestWorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  savedAt: number; // unix ms — lets you warn if snapshot is >24h old
}

export function saveGuestWorkflow(nodes: Node[], edges: Edge[]) {
  if (typeof window === "undefined") return;
  const snapshot: GuestWorkflowSnapshot = { nodes, edges, savedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(snapshot));
}

export function loadGuestWorkflow(): GuestWorkflowSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestWorkflowSnapshot;
  } catch {
    return null;
  }
}

export function clearGuestWorkflow() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
```
## 2. Update your Zustand store: src/store/useWorkflowStore.ts
Add two new actions — snapshotToLocalStorage and restoreFromLocalStorage:

```ts
// Inside your useWorkflowStore slice, add:
import { saveGuestWorkflow, loadGuestWorkflow, clearGuestWorkflow } from "@/lib/guestWorkflow";

snapshotToLocalStorage: () => {
  const { nodes, edges } = get();
  saveGuestWorkflow(nodes, edges);
},

restoreFromLocalStorage: (): boolean => {
  const snapshot = loadGuestWorkflow();
  if (!snapshot) return false;
  set({ nodes: snapshot.nodes, edges: snapshot.edges });
  clearGuestWorkflow();
  return true;
},
```
## 3. Update your Save button handler (wherever you call signInWithOAuth)
Before triggering OAuth, snapshot the canvas. This is the critical step — it must happen before the browser navigates away.
​

```ts
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { createClient } from "@/lib/supabaseClient";

const { snapshotToLocalStorage } = useWorkflowStore();
const supabase = createClient();

async function handleSave() {
  const user = supabase.auth.getUser(); // or from your auth context

  if (!user) {
    // 1. Persist canvas to localStorage BEFORE leaving the page
    snapshotToLocalStorage();

    // 2. Trigger OAuth — browser will navigate away
    await supabase.auth.signInWithOAuth({
      provider: "google", // or "github"
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // Everything below this line will NOT run (browser has navigated away)
    return;
  }

  // User is already logged in — save normally to Supabase
  await saveWorkflowToSupabase();
}
```
## 4. Auth callback route: src/app/auth/callback/page.tsx
This is where the user lands after SSO completes. Restore the canvas here.

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { loadGuestWorkflow } from "@/lib/guestWorkflow";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { restoreFromLocalStorage, saveCurrentWorkflowToSupabase } = useWorkflowStore();

  useEffect(() => {
    const supabase = createClient();

    const handleCallback = async () => {
      // 1. Confirm the session is valid
      const { error } = await supabase.auth.getSession();
      if (error) {
        router.push("/");
        return;
      }

      // 2. Check if there is a guest workflow to restore
      const snapshot = loadGuestWorkflow();
      if (snapshot) {
        // 3. Rehydrate Zustand store + clear localStorage
        restoreFromLocalStorage();

        // 4. Optional: auto-save the restored workflow to Supabase
        // Small delay so Zustand store settles before we read from it
        setTimeout(async () => {
          await saveCurrentWorkflowToSupabase("Recovered workflow");
        }, 300);

        // 5. Redirect back to the canvas with state intact
        router.push("/app");
      } else {
        // No guest workflow — just go to the app normally
        router.push("/app");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  );
}
```
## 5. Canvas hydration guard: Canvas.tsx (your file)
Add a one-time effect at the top of Canvas that restores from localStorage in case the user lands directly on /app after callback (belt-and-suspenders):

```tsx
// Add near the top of the Canvas component body
const { restoreFromLocalStorage } = useWorkflowStore();

useEffect(() => {
  // Only restore once on mount if there's a pending guest snapshot
  restoreFromLocalStorage();
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```
This is a no-op if restoreFromLocalStorage finds nothing in localStorage, so it is safe to always run.

## 6. Stale snapshot warning (optional but good UX)
In Canvas.tsx or your sidebar, warn the user if a snapshot is over 24 hours old:

```tsx
import { loadGuestWorkflow, clearGuestWorkflow } from "@/lib/guestWorkflow";

useEffect(() => {
  const snapshot = loadGuestWorkflow();
  if (!snapshot) return;

  const ageMs = Date.now() - snapshot.savedAt;
  const ONE_DAY = 86_400_000;

  if (ageMs > ONE_DAY) {
    // Toast or inline warning
    toast.warning("A saved canvas snapshot is more than 24 hours old. Restore it?", {
      action: {
        label: "Restore",
        onClick: () => restoreFromLocalStorage(),
      },
      cancel: {
        label: "Discard",
        onClick: () => clearGuestWorkflow(),
      },
    });
  }
}, []);
```


# Import/Export Feature Roadmap

## Decision: No Universal Importer

There is no standard schema for agentic workflows across frameworks.
Building a generic importer creates unbounded maintenance scope.
Instead, the feature is split into three clearly-scoped pieces.

---

## Phase 1: Internal Export / Import (v1 — ship now)

### Export
- Triggered from header or workflow sidebar: "Export Workflow"
- Serializes current Zustand store to JSON:

```json
{
  "schema_version": "1.0",
  "name": "string",
  "exported_at": "ISO timestamp",
  "nodes": [...],   // full NodeConfig array
  "edges": [...],   // full EdgeConfig array
  "config": {
    "recursion_limit": 50
  }
}
```

File download: {workflow-name}.agenticflow.json

Import
Only accepts .agenticflow.json files (validated by schema_version field).

On upload:

Validate structure (required fields: schema_version, nodes, edges).

Normalize node positions if missing.

Load into Zustand store via setNodes + setEdges.

Update workflow name and metadata.

Error handling: show inline validation errors if schema is wrong.

Frontend changes
Add Export button to header toolbar.

Import modal: default tab is "My Workflow" (file upload, not JSON textarea).

Backend changes
Optional: POST /api/import/internal — validates schema server-side.

Minimum: validation can be pure frontend.

-- 

## BACKEND FEATURE UPDATE 
> Feature: Blank Box Nodes + Text Nodes + Supabase Workflow Persistence
> Milestone: Canvas Authoring Enhancements

---

## Overview

Backend responsibilities for this milestone are split into two areas:
1. Estimation system awareness of new node types (`blankBoxNode`, `textNode`)
2. Supabase schema + RLS setup for persisting workflow data per authenticated user

The FastAPI application itself does NOT own user auth — Supabase handles that entirely.
The backend's job is to define the database schema, RLS policies, and update the
estimation logic to gracefully handle the two new non-LLM node types.

---

## Section 1 — Estimator Updates for New Node Types

### 1.1 Current Node Type Handling

`estimator.py` currently handles:
- `startNode` → 0 tokens, 0 cost, 0 latency
- `finishNode` → 0 tokens, 0 cost, 0 latency
- `agentNode` → full LLM estimation with task-type multipliers
- `toolNode` → tool registry lookup (schema tokens + response tokens + latency_ms)

### 1.2 Add Pass-Through Cases

Add to `estimate_node()` in `estimator.py`:

```python
elif node.type in ("blankBoxNode", "textNode"):
    return NodeEstimation(
        node_id=node.id,
        node_type=node.type,
        node_label=node.label or node.type,
        input_tokens=0,
        output_tokens=0,
        input_cost=0.0,
        output_cost=0.0,
        latency_ms=0.0,
        in_cycle=False,
        is_annotation=True,   # new flag
    )
```

### 1.3 Update `NodeEstimation` Model

In `models.py`, add one optional field:

```python
class NodeEstimation(BaseModel):
    ...existing fields...
    is_annotation: bool = False  # True for blankBoxNode, textNode — excluded from bottleneck scoring
```

`is_annotation=True` nodes should be excluded from:
- Bottleneck detection
- Workflow health scoring
- Critical path calculation
- Cycle detection (graph_analyzer.py — already handles this since annotation nodes have no edges)

### 1.4 `NodeConfig` Model Update

Add new node types to the `type` literal in `models.py`:

```python
class NodeConfig(BaseModel):
    type: Literal[
        "startNode", "agentNode", "toolNode", "finishNode",
        "blankBoxNode", "textNode"   # ← add these
    ]
    ...
```

No other NodeConfig fields needed — blank box and text nodes carry no LLM config.

---

## Section 2 — Supabase Schema

### 2.1 Tables to Create

Run these migrations in the Supabase SQL editor or via a migration file.

#### `workflows` table
```sql
CREATE TABLE workflows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Untitled Workflow',
  description  TEXT,
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  recursion_limit INT DEFAULT 25,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### `scenarios` table
```sql
CREATE TABLE scenarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id  UUID REFERENCES workflows(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  nodes        JSONB NOT NULL DEFAULT '[]',
  edges        JSONB NOT NULL DEFAULT '[]',
  recursion_limit INT DEFAULT 25,
  estimate     JSONB,   -- cached WorkflowEstimation result
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

#### `user_preferences` table
```sql
CREATE TABLE user_preferences (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme        TEXT DEFAULT 'light',
  drawer_width INT DEFAULT 420,
  active_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.2 RLS Policies

**CRITICAL: Enable RLS on every table before writing policies.**

```sql
ALTER TABLE workflows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;
```

#### Workflows RLS
```sql
-- Users can only see their own workflows
CREATE POLICY "workflows_select_own"
  ON workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "workflows_insert_own"
  ON workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflows_update_own"
  ON workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "workflows_delete_own"
  ON workflows FOR DELETE
  USING (auth.uid() = user_id);
```

#### Scenarios RLS
```sql
CREATE POLICY "scenarios_select_own"  ON scenarios FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "scenarios_insert_own"  ON scenarios FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scenarios_update_own"  ON scenarios FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "scenarios_delete_own"  ON scenarios FOR DELETE  USING (auth.uid() = user_id);
```

#### User Preferences RLS
```sql
CREATE POLICY "prefs_select_own"  ON user_preferences FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own"  ON user_preferences FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own"  ON user_preferences FOR UPDATE  USING (auth.uid() = user_id);
```

---

### 2.3 Indexes

```sql
CREATE INDEX workflows_user_id_idx  ON workflows(user_id);
CREATE INDEX workflows_updated_idx  ON workflows(updated_at DESC);
CREATE INDEX scenarios_user_id_idx  ON scenarios(user_id);
CREATE INDEX scenarios_workflow_idx ON scenarios(workflow_id);
```

---

## Section 3 — FastAPI (Optional Endpoints)

The frontend uses Supabase JS client directly for all CRUD — no FastAPI involvement needed
for basic workflow persistence. FastAPI is only needed if you want:

1. **Server-side validation before save** — optional, adds latency
2. **Background estimation on save** — auto-run estimate and cache result in `scenarios.estimate`

If you implement option 2, add to `main.py`:

```python
@app.post("/api/workflows/{workflow_id}/estimate-and-cache")
async def estimate_and_cache(workflow_id: str, request: WorkflowRequest):
    # Run estimation
    result = estimate_workflow(request.nodes, request.edges, request.recursion_limit)
    # Return result — frontend saves to Supabase scenarios.estimate column
    return result
```

This keeps FastAPI as the estimation engine and Supabase as the persistence layer —
clean separation of concerns.

---

## Acceptance Criteria — Backend

- [ ] `blankBoxNode` and `textNode` added to `NodeConfig.type` literal in `models.py`
- [ ] `is_annotation: bool = False` added to `NodeEstimation` in `models.py`
- [ ] `estimate_node()` in `estimator.py` returns zero-cost `NodeEstimation(is_annotation=True)` for new types
- [ ] Annotation nodes excluded from bottleneck scoring and health calculation
- [ ] `workflows` table created with correct schema + RLS + updated_at trigger
- [ ] `scenarios` table created with correct schema + RLS + updated_at trigger
- [ ] `user_preferences` table created with correct schema + RLS
- [ ] All three tables have RLS enabled BEFORE policies are written
- [ ] Indexes created on user_id and updated_at columns
- [ ] `GET /api/estimate` still returns correct results for existing DAG workflows (regression test)

---

## Do Not Touch (Backend)

- `pricing_registry.py` — no changes needed
- `tool_registry.py` — no changes needed
- `graph_analyzer.py` — annotation nodes have no edges, cycle detection unaffected
- `import_adapters.py` — annotation nodes not part of runnable workflow logic

