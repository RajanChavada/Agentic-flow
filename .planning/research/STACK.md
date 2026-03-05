# Stack Research

**Domain:** Workflow control systems (conditional branching, schema validation, graph analysis)
**Researched:** 2025-03-04
**Confidence:** HIGH for validation/graph libraries, MEDIUM for LLM provider choice

## Context

This research covers **incremental additions** to an existing Next.js + React Flow + FastAPI + Pydantic v2 stack. We're NOT re-researching the base stack — only the specific technologies needed for:

1. Conditional branching nodes with probability sliders
2. LLM-powered natural language to JSON Schema generation
3. Real-time frontend graph analysis (depth, loops, reachability)
4. Probability-weighted cost estimation

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **OpenAI Python SDK** | `1.59.x` (latest stable) | LLM API for NL-to-JSON Schema generation | Industry standard for structured outputs with native JSON Schema mode (GPT-4o+). Better structured output reliability than function calling. Official Python SDK with async support. |
| **Ajv** | `8.17.x` (latest v8) | Frontend JSON Schema validation | Most widely adopted JSON Schema validator for JS/TS (50M+ weekly downloads). Supports JSON Schema Draft 2020-12. Fast, extensible, TypeScript-friendly. |
| **Pydantic v2** | `2.10.x` (already installed) | Backend JSON Schema generation and validation | Already in stack. Native JSON Schema export via `.model_json_schema()`. Validates LLM outputs before returning to frontend. No additional dependency needed. |
| **@radix-ui/react-slider** | `1.2.x` | Probability slider for condition nodes | Consistent with existing Radix UI components. Accessible, headless, styleable with Tailwind. Already using other Radix primitives. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **graphlib** | `2.1.x` | Frontend graph algorithms (BFS, topological sort, cycle detection) | For real-time canvas metadata overlay. Pure JS implementation of graph algorithms. Lightweight (12KB). Successor to dagre-js (already using @dagrejs/dagre on backend). |
| **ajv-formats** | `3.0.x` | Extended JSON Schema format validation | When validating user-generated schemas that use `format` keyword (e.g., `email`, `date-time`, `uri`). Plugin for Ajv. |
| **ajv-keywords** | `5.1.x` | Custom JSON Schema keywords | If need extended validation keywords beyond JSON Schema spec (e.g., `range`, `exclusiveRange`). Optional enhancement. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **JSON Schema Store** (vscode extension) | JSON Schema IntelliSense in VS Code | Provides autocomplete for JSON Schema authoring. Helpful for debugging LLM-generated schemas. |
| **OpenAI Playground** | Test NL-to-schema prompts before implementing | Use Structured Outputs beta feature to validate prompt design. Faster iteration than code-test loop. |

## Installation

```bash
# Frontend
npm install ajv ajv-formats graphlib @radix-ui/react-slider

# Backend
pip install openai

# Dev/Testing
npm install -D @types/jsonschema  # TypeScript types for JSON Schema
```

**Note:** Pydantic v2 already installed. `tiktoken` already installed (useful for estimating LLM API costs).

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative | Confidence |
|-------------|-------------|-------------------------|------------|
| **OpenAI SDK** | Anthropic Claude SDK (`anthropic` package) | If want to avoid OpenAI dependency or need higher rate limits. Claude 3.7 Sonnet supports structured outputs via tool use. Slightly more complex implementation. | HIGH |
| **OpenAI SDK** | LangChain | If building complex multi-step LLM workflows. Overkill for single NL-to-schema endpoint. Adds 50+ dependencies. | HIGH |
| **Ajv** | Zod | If prefer TypeScript-first schema definition over JSON Schema standard. Requires conversion layer (`zod-to-json-schema`) to interop with LLM outputs. Less standard. | HIGH |
| **graphlib** | Custom BFS/DFS implementation | If want zero dependencies for graph analysis. ~100 LOC for BFS reachability + cycle detection. Trade: reinvent wheel vs 12KB library. | MEDIUM |
| **Pydantic v2** | `jsonschema` Python package | If not using Pydantic. But Pydantic v2 is already in stack and superior (better validation, TypeScript-generation, JSON Schema export). | HIGH |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **JSON Schema Draft 4** | Deprecated (2013). Missing modern features: `const`, `if/then/else`, `propertyNames`. LLMs trained on newer drafts. | JSON Schema Draft 2020-12 (or Draft 7 minimum) |
| **OpenAI Legacy Completions API** (`/v1/completions`)| Deprecated. No structured output support. Requires manual JSON parsing and retry logic. | OpenAI Chat Completions with `response_format: { type: "json_schema" }` |
| **client-side LLM API calls** (API key in frontend) | Security risk. API keys exposed in client bundle. CORS issues. | Backend API endpoint that proxies to LLM provider |
| **`eval()` for condition expressions** | Arbitrary code execution risk. User input should never be `eval`-ed. | Safe expression evaluator (e.g., `expr-eval` npm package) OR store expressions as strings, evaluate on backend in sandboxed environment |
| **Dagre on frontend** | Layout algorithm, not graph analysis. Already have it on backend. Frontend needs pathfinding/cycle detection, not layout. | `graphlib` for algorithms, keep @dagrejs/dagre on backend for layout |

## Stack Patterns by Variant

### Pattern 1: LLM Provider Choice

**If OpenAI alignment acceptable:**
- Use `openai` Python SDK with GPT-4o or GPT-4o-mini
- Structured Outputs mode: `response_format = { "type": "json_schema", "json_schema": {...} }`
- Cost: ~$0.30 per 1K schema generations (assuming 1K input + 500 output tokens with GPT-4o-mini)

**If need OpenAI alternative:**
- Use `anthropic` Python SDK with Claude 3.7 Sonnet
- Tool use with `tools = [{"name": "generate_schema", "input_schema": {...}}]`
- Cost: ~$0.15 per 1K schema generations (cheaper input tokens)
- Trade: Slightly more complex response parsing (extract from tool_use block)

**Implementation pattern (OpenAI):**
```python
from openai import AsyncOpenAI
from pydantic import BaseModel

class GeneratedSchema(BaseModel):
    json_schema: dict

async def generate_schema(user_description: str) -> dict:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Generate JSON Schema from description..."},
            {"role": "user", "content": user_description}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "workflow_success_schema",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "json_schema": {"type": "object"}
                    },
                    "required": ["json_schema"],
                    "additionalProperties": False
                }
            }
        }
    )

    result = GeneratedSchema.model_validate_json(response.choices[0].message.content)
    return result.json_schema
```

### Pattern 2: Frontend Graph Analysis

**For real-time metadata overlay:**
- Use `graphlib` for standard graph algorithms
- Compute on `useEffect` triggered by `nodes` + `edges` change
- Memoize with `useMemo` to avoid recomputation on unrelated re-renders
- Store results in Zustand (e.g., `canvasMetadata` slice)

**Implementation pattern:**
```typescript
import { Graph } from 'graphlib';

function computeCanvasMetadata(nodes: Node[], edges: Edge[]): CanvasMetadata {
  const graph = new Graph({ directed: true });

  nodes.forEach(node => graph.setNode(node.id, node));
  edges.forEach(edge => graph.setEdge(edge.source, edge.target));

  return {
    nodeCount: nodes.length,
    depth: computeMaxDepth(graph, startNodeId),
    loops: graph.findCycles().length,
    isStartToFinishReachable: hasPath(graph, startNodeId, idealStateNodeId),
    riskScore: computeRiskScore(nodes, edges, graph)
  };
}
```

### Pattern 3: JSON Schema Validation

**On frontend (validate before sending to backend):**
```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(generatedSchema);
const isValid = validate(userData);
if (!isValid) console.error(validate.errors);
```

**On backend (validate LLM output AND user schemas):**
```python
from pydantic import BaseModel, ValidationError

class SuccessCriteria(BaseModel):
    json_schema: dict
    # Pydantic will validate structure

try:
    criteria = SuccessCriteria.model_validate(llm_output)
    # Then use criteria.json_schema for further validation
except ValidationError as e:
    # LLM produced invalid output, retry or return error
```

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `ajv` | `8.17.x` | JSON Schema Draft 2020-12, Draft 2019-09, Draft 7 | **Not compatible with Draft 4.** Use `ajv@6.x` only if must support legacy Draft 4. |
| `openai` | `1.59.x` | Python 3.8+ | Async support requires Python 3.8+. Already exceeding (using Python 3.11). |
| `graphlib` | `2.1.x` | Node.js 12+, all modern browsers | ESM and CommonJS builds. Works with Next.js 16. |
| `@radix-ui/react-slider` | `1.2.x` | React 18+ | Compatible with React 19 (already using). |
| Pydantic v2 | `2.10.x` | Python 3.8+ | **Breaking changes from Pydantic v1.** Already on v2.10.4. `.model_json_schema()` is v2 method. |

## Configuration Requirements

### Environment Variables (Backend)

Add to `backend/.env` and `backend/config.py`:

```bash
# LLM Provider API Key
OPENAI_API_KEY=sk-...  # Required for NL-to-schema generation

# Optional: specify model
OPENAI_SCHEMA_MODEL=gpt-4o-mini  # Default model for schema generation
```

### Frontend Type Safety

Create `src/types/schema.ts`:
```typescript
import type { JSONSchemaType } from 'ajv';

export type WorkflowSchema = JSONSchemaType<any>;  // Base type
export interface IdealStateNode {
  id: string;
  type: 'idealStateNode';
  data: {
    label: string;
    description: string;
    schema: WorkflowSchema;
  };
}
```

## Implementation Checklist

- [ ] **Backend:** Install `openai` SDK, add API key to config
- [ ] **Backend:** Create `/api/generate-schema` POST endpoint (NL → JSON Schema)
- [ ] **Backend:** Update estimator to handle probability-weighted branching
- [ ] **Frontend:** Install `ajv`, `ajv-formats`, `graphlib`, `@radix-ui/react-slider`
- [ ] **Frontend:** Create `ConditionNode` component with True/False handles + probability slider
- [ ] **Frontend:** Create `IdealStateNode` component with NL input + schema display
- [ ] **Frontend:** Implement canvas metadata computation with `graphlib`
- [ ] **Frontend:** Add metadata overlay component (corner of canvas)
- [ ] **Frontend:** Update Zustand store with new node types + canvas metadata slice
- [ ] **Testing:** Validate generated schemas with Ajv on frontend before using
- [ ] **Testing:** Add pytest tests for probability-weighted estimation logic
- [ ] **Docs:** Update BACKEND_PLAN.md with new API endpoint spec
- [ ] **Docs:** Update FRONTEND_PLAN.md with new node types + metadata overlay

## Risk Factors

| Risk | Mitigation | Severity |
|------|------------|----------|
| **LLM API costs** | Use GPT-4o-mini (90% cheaper than GPT-4o). Cache schemas in Supabase to avoid regeneration. Set rate limits. | MEDIUM |
| **LLM hallucination (invalid schemas)** | Always validate LLM output with Pydantic before returning. Provide few-shot examples in system prompt. | HIGH |
| **Frontend graph computation jank** | Memoize with `useMemo`, debounce computation if >100 nodes. Consider Web Worker for graphs >500 nodes. | MEDIUM |
| **Probability slider UX confusion** | Add tooltip explaining "simulation probability for cost estimation, not runtime logic". Show example. | LOW |
| **JSON Schema complexity** (nested objects, references) | Start with flat schemas (v1), add `$ref` support in future milestone. LLM prompt should discourage deep nesting. | MEDIUM |

## Sources

**Official Documentation (HIGH confidence):**
- OpenAI Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs (verified for `response_format` syntax)
- Ajv JSON Schema validator: https://ajv.js.org/ (most popular JS validator, 8.x supports Draft 2020-12)
- Pydantic v2 JSON Schema: https://docs.pydantic.dev/latest/concepts/json_schema/ (verified `.model_json_schema()` method)
- Radix UI Slider: https://www.radix-ui.com/primitives/docs/components/slider (already using Radix in stack)
- graphlib: https://github.com/dagrejs/graphlib (official successor to dagre graph analysis functions)

**Ecosystem Knowledge (MEDIUM confidence):**
- OpenAI SDK version `1.59.x` as latest stable (training data from Jan 2025, may be newer versions)
- Ajv `8.17.x` as current (verify on npm for latest)
- React Flow integration patterns with custom nodes (established patterns, not version-specific)

**Implementation Patterns (HIGH confidence):**
- Structured outputs pattern with OpenAI (official from OpenAI docs)
- Pydantic v2 validation patterns (official from Pydantic docs)
- React Flow + Zustand integration (established in existing codebase)

---
*Stack research for: Workflow control systems (conditional branching, schema validation, graph analysis)*
*Researched: 2025-03-04*
*Confidence: HIGH for library choices, MEDIUM for specific version numbers (verify latest on npm/PyPI)*
