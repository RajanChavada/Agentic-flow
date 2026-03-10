# Phase 5: Action Constraints - Research

**Researched:** 2026-03-09
**Domain:** React tag input components, Pydantic list validation, token estimation for constrained outputs
**Confidence:** HIGH

## Summary

Phase 5 adds discrete allowed actions to agent nodes via an inline tag input component. Users can specify output labels (e.g., "approve", "reject", "escalate") that constrain classification and routing agents, improving estimation accuracy and scaffold generation quality. This research confirms the chosen patterns are production-ready and identifies implementation details for the TagInput component, Pydantic validation, estimation refinement, and test infrastructure.

**Primary recommendation:** Use controlled React state with `useState<string[]>` for tag management, validate with Pydantic `List[str]` field constraints (max 20 items, 1-50 chars each), and refine output token estimation using `0.15 * len(actions)` multiplier for classification/routing task types.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New reusable `TagInput` component at `frontend/src/components/ui/TagInput.tsx`
- Inline tag builder pattern: chips with X buttons inside unified form field
- Enter to add, Backspace-on-empty to edit-last, X to remove
- 8-color palette cycling for chip colors: `sky-500`, `emerald-500`, `amber-500`, `rose-500`, `violet-500`, `cyan-500`, `orange-500`, `lime-500`
- Chip scale-in animation on add (100ms ease-out)
- Duplicate rejection with pulse animation on existing chip
- Allowed Actions section in agent node config modal below context textarea, above Task Type
- Local `useState<string[]>` for `allowedActions`, synced from `node.data.allowedActions` on mount
- Saved via `updateNodeData()` on Save
- Agent node face shows "N actions" badge when `allowedActions.length > 0`
- `WorkflowNodeData`: add `allowedActions?: string[]`
- `NodeConfigPayload`: add `allowed_actions?: string[] | null`
- `nodesToPayload()`: add mapping `allowed_actions: n.data.allowedActions ?? null`
- Backend `NodeConfig`: add `allowed_actions: Optional[List[str]]` with max 20 items, each 1-50 chars
- Estimation impact: for agents with `task_type` in ("classification", "routing") and `allowed_actions` present:
  - Output multiplier adjusted to `0.15 * len(actions)`
  - Action labels added to input token count: `count_tokens(", ".join(actions))`
- Scaffold integration: update system prompt to extract action labels from NL descriptions

### Claude's Discretion
- Exact Tailwind classes for chip styling within the design system
- Animation keyframe implementation details
- Test file organization within established patterns

### Deferred Ideas (OUT OF SCOPE)
- Separate output ports per action (v2)
- Per-action descriptions for LLM context guidance (v2)
- Drag-to-reorder actions for priority ordering (v2)
- Color picker for individual action chips (v2)
- Fallback action toggle for unmatched LLM outputs (v2)
- Color-coded edges per action on the canvas (v2)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACTN-01 | User can define allowed actions (string labels) on agent nodes via tag input in config modal | TagInput component patterns, controlled React state in modals |
| ACTN-02 | Action chips display with color coding, support add (Enter), remove (X), and edit-last (Backspace) | Keyboard event handling, React synthetic events, chip color cycling algorithm |
| ACTN-03 | Duplicate actions are rejected with visual feedback (pulse on existing chip) | Set-based duplicate detection, CSS animation patterns |
| ACTN-04 | Backend `NodeConfig` accepts `allowed_actions` as optional `List[str]` with validation | Pydantic `Field` constraints (max_length, min_length), list item validation |
| ACTN-05 | Estimator uses action count to refine output tokens for classification/routing agents | Task-type-specific multiplier adjustment in `estimator.py` |
| ACTN-06 | Scaffold generator auto-populates `allowed_actions` from NL descriptions containing action keywords | LLM prompt engineering, keyword extraction patterns |
| ACTN-07 | Agent node face shows "N actions" badge when actions are configured | Conditional rendering based on array length, badge styling patterns |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | Tag input state management | Controlled component with `useState` is the canonical pattern for form inputs |
| Zustand | 5.0.11 | Node data persistence | Already used for all workflow state; `updateNodeData` follows established patterns |
| Pydantic | 2.10.4 | Backend validation | `Field` with `max_length` and custom validators handle list constraints cleanly |
| tiktoken | 0.8.0 | Token counting | OpenAI's official tokenizer; already used for all token estimation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS v4 | 4.x | Chip styling, animations | All UI styling; v4 syntax (`bg-white!` not `!bg-white`) |
| Lucide React | 0.564.0 | X icon for chips | Project standard icon library |
| Vitest | 4.0.18 | Frontend testing | Tag input component unit tests |
| pytest | 8.0.0+ | Backend validation tests | Pydantic model validation tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Controlled `useState` | Uncontrolled input with refs | Uncontrolled harder to validate duplicates in real-time |
| Pydantic `Field(max_length)` | Custom validator function | `Field` constraints are declarative and auto-documented in OpenAPI |
| Manual token counting | Estimate based on avg word length | tiktoken is accurate and consistent with existing estimation logic |

**Installation:**
```bash
# All dependencies already installed in project
# No new packages required
```

## Architecture Patterns

### Recommended Component Structure
```
frontend/src/components/ui/
├── TagInput.tsx          # Reusable tag input component
└── input.tsx             # Existing shadcn input (base for TagInput)

frontend/src/components/
└── ContextToolbar.tsx    # AgentToolbarSection consumes TagInput

backend/
├── models.py             # NodeConfig extended with allowed_actions field
└── estimator.py          # estimate_node() adjusted for classification/routing
```

### Pattern 1: Controlled Tag Input Component
**What:** React component with internal `useState<string>` for current input and `value: string[]` prop for tag array
**When to use:** Any tag/pill input where user builds a list by typing and pressing Enter

**Example:**
```typescript
// Source: Standard React controlled component pattern
interface TagInputProps {
  value: string[];              // controlled from parent
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  colorPalette?: string[];
}

export function TagInput({ value, onChange, placeholder, maxTags = 20, colorPalette }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const normalized = inputValue.trim();
      if (value.includes(normalized)) {
        // Pulse animation on existing chip
        return;
      }
      if (value.length >= maxTags) return;
      onChange([...value, normalized]);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      // Edit last tag
      const lastTag = value[value.length - 1];
      setInputValue(lastTag);
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  // Render chips + input
}
```

### Pattern 2: Color Cycling Algorithm
**What:** Deterministic color assignment based on tag index modulo palette length
**When to use:** Any multi-item UI where visual distinction matters but exact colors don't

**Example:**
```typescript
// Source: Standard modulo pattern for cyclic assignments
const COLOR_PALETTE = [
  "sky", "emerald", "amber", "rose", "violet", "cyan", "orange", "lime"
] as const;

function getColorForIndex(index: number): string {
  const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
  return color; // Use in Tailwind classes: `bg-${color}-500/15 text-${color}-700`
}
```

### Pattern 3: Pydantic List Field Validation
**What:** Constrain list length and item properties using Pydantic `Field` and custom validators
**When to use:** Any backend model accepting user-provided arrays with business rules

**Example:**
```python
# Source: Pydantic v2 documentation - Field constraints
from pydantic import BaseModel, Field, field_validator

class NodeConfig(BaseModel):
    allowed_actions: Optional[List[str]] = Field(
        default=None,
        max_length=20,
        description="Discrete action labels (e.g., 'approve', 'reject')"
    )

    @field_validator("allowed_actions")
    @classmethod
    def validate_action_labels(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        for action in v:
            if not (1 <= len(action) <= 50):
                raise ValueError(f"Action label '{action}' must be 1-50 characters")
            if not action.strip():
                raise ValueError("Action labels cannot be empty or whitespace-only")
        return v
```

### Pattern 4: Estimation Multiplier Adjustment
**What:** Conditional output multiplier based on task type and presence of allowed actions
**When to use:** Refining token estimation when LLM outputs are constrained to discrete choices

**Example:**
```python
# Source: estimator.py task-aware output multiplier logic (extended)
def estimate_agent_node(node: NodeConfig, pricing: ModelPricing) -> NodeEstimation:
    # ... existing input token calculation ...

    # Determine output multiplier
    if node.allowed_actions and node.task_type in ("classification", "routing"):
        # Constrained output = fewer tokens
        output_multiplier = 0.15 * len(node.allowed_actions)
        # Add action labels to input (system prompt includes them)
        action_prompt_tokens = count_tokens(", ".join(node.allowed_actions))
        input_tokens += action_prompt_tokens
    else:
        # Use standard task-type multiplier
        output_multiplier = _TASK_OUTPUT_MULTIPLIERS.get(
            (node.task_type, node.expected_output_size),
            _OUTPUT_RATIO  # fallback = 1.5
        )

    output_tokens = int(base_context_tokens * output_multiplier)
    # ... cost and latency calculation ...
```

### Anti-Patterns to Avoid
- **Using `onKeyPress` instead of `onKeyDown`:** `onKeyPress` is deprecated in React 19; use `onKeyDown` or `onKeyUp`
- **Mutating the tag array in place:** Always create new array with spread (`[...value, newTag]`) for React state updates
- **Hardcoding Tailwind template literals:** Dynamic Tailwind classes like `bg-${color}-500` don't work; use pre-generated classes or inline styles for dynamic colors
- **Validating list length only on frontend:** Backend must enforce same constraints to prevent API abuse

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting for action labels | Custom word count * 1.3 heuristic | tiktoken `count_tokens()` | tiktoken is exact and consistent with OpenAI's billing; custom heuristics diverge from reality |
| Duplicate detection in tag arrays | Linear `Array.find()` each keystroke | `Set` or pre-check with `includes()` | Set-based detection is O(1); repeated array scans are O(n) per character |
| Keyboard event cross-browser handling | Manual `event.which` or `event.keyCode` checks | `event.key === "Enter"` | React's synthetic events normalize `key` property across browsers; legacy keyCode is deprecated |
| Animation CSS generation | Custom @keyframes for every animation | Tailwind arbitrary properties or Framer Motion | Tailwind v4 has animation utilities; Framer Motion handles complex gestures; both tested across browsers |

**Key insight:** React's synthetic event system already normalizes keyboard events. No need for polyfills or custom event parsing.

## Common Pitfalls

### Pitfall 1: Dynamic Tailwind Class Generation
**What goes wrong:** Using template literals like `className={\`bg-\${color}-500\`}` doesn't work in Tailwind v4; classes must exist in the source code for the JIT compiler to generate them.

**Why it happens:** Tailwind's JIT compiler scans source files for class names at build time; dynamic strings constructed at runtime are invisible.

**How to avoid:**
- Option A: Use a fixed set of pre-generated classes via `clsx` or `cn` utility with conditional mapping
- Option B: Use inline styles for dynamic colors: `style={{ backgroundColor: colorMap[color] }}`
- Option C: Generate all possible color variants in a safelist (less optimal for bundle size)

**Warning signs:** Chips render with no background color in production build but work in dev mode.

**Example:**
```typescript
// BAD - won't work
const chipClass = `bg-${color}-500/15 text-${color}-700`;

// GOOD - use inline styles for dynamic values
const colorMap = {
  sky: { bg: "rgba(14, 165, 233, 0.15)", text: "rgb(3, 105, 161)" },
  emerald: { bg: "rgba(16, 185, 129, 0.15)", text: "rgb(4, 120, 87)" },
  // ... rest of palette
};
const colors = colorMap[color];
<span style={{ backgroundColor: colors.bg, color: colors.text }}>
```

### Pitfall 2: Backspace on Empty Input Without Guard
**What goes wrong:** User holds Backspace with empty input; rapid repeated deletion removes all tags instantly.

**Why it happens:** `onKeyDown` fires continuously while key is held; without rate-limiting, edit-last triggers on every frame.

**How to avoid:** Check both `!inputValue` condition AND use `onKeyUp` instead of `onKeyDown` for Backspace handling, or add a "recently deleted" debounce flag.

**Warning signs:** Testing reveals holding Backspace deletes entire tag list in under 1 second.

**Example:**
```typescript
// BETTER - use onKeyUp to prevent cascade deletion
const handleKeyUp = (e: React.KeyboardEvent) => {
  if (e.key === "Backspace" && !inputValue && value.length > 0) {
    const lastTag = value[value.length - 1];
    setInputValue(lastTag);
    onChange(value.slice(0, -1));
  }
};
```

### Pitfall 3: Pydantic Validator Without None Check
**What goes wrong:** Custom validator assumes `v` is always a list, crashes when field is `None`.

**Why it happens:** Pydantic calls validators even when field is optional and passed as `None`.

**How to avoid:** Always check `if v is None: return None` at the top of validator.

**Warning signs:** Backend returns 500 Internal Server Error when frontend sends `allowed_actions: null`.

**Example:**
```python
# CORRECT
@field_validator("allowed_actions")
@classmethod
def validate_action_labels(cls, v: Optional[List[str]]) -> Optional[List[str]]:
    if v is None:
        return None  # ← Critical guard
    # ... rest of validation
```

### Pitfall 4: Forgetting to Count Action Labels in Input Tokens
**What goes wrong:** Estimation underestimates cost because action labels injected into system prompt aren't counted.

**Why it happens:** Intuition is that actions only affect output; in reality, the LLM sees them in the input (e.g., "Choose one of: approve, reject, escalate").

**How to avoid:** When `allowed_actions` is present, always add `count_tokens(", ".join(actions))` to `input_tokens`.

**Warning signs:** Comparison of estimated vs. actual run shows 10-20% higher token usage than predicted.

**Example:**
```python
# CORRECT - count actions in input
if node.allowed_actions:
    action_prompt_tokens = count_tokens(", ".join(node.allowed_actions))
    input_tokens += action_prompt_tokens
```

## Code Examples

Verified patterns from project conventions:

### TagInput Component Structure
```typescript
// Source: Controlled React pattern + Tailwind v4 syntax
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function TagInput({ value, onChange, placeholder, maxTags = 20 }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const normalized = inputValue.trim();

      // Duplicate check
      const existingIndex = value.indexOf(normalized);
      if (existingIndex !== -1) {
        setPulsingIndex(existingIndex);
        setTimeout(() => setPulsingIndex(null), 400);
        return;
      }

      // Max tags check
      if (value.length >= maxTags) return;

      // Add tag
      onChange([...value, normalized]);
      setInputValue("");
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      const lastTag = value[value.length - 1];
      setInputValue(lastTag);
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md">
      {value.map((tag, i) => (
        <Chip
          key={i}
          label={tag}
          onRemove={() => removeTag(i)}
          colorIndex={i}
          isPulsing={i === pulsingIndex}
        />
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 outline-none text-sm"
      />
    </div>
  );
}
```

### Chip Component with Animation
```typescript
// Source: Tailwind v4 animation utilities + Lucide icon
import { X } from "lucide-react";

const COLOR_MAP = {
  sky: { bg: "rgba(14, 165, 233, 0.15)", text: "rgb(3, 105, 161)", border: "rgba(14, 165, 233, 0.3)" },
  emerald: { bg: "rgba(16, 185, 129, 0.15)", text: "rgb(4, 120, 87)", border: "rgba(16, 185, 129, 0.3)" },
  amber: { bg: "rgba(245, 158, 11, 0.15)", text: "rgb(146, 64, 14)", border: "rgba(245, 158, 11, 0.3)" },
  rose: { bg: "rgba(244, 63, 94, 0.15)", text: "rgb(159, 18, 57)", border: "rgba(244, 63, 94, 0.3)" },
  violet: { bg: "rgba(139, 92, 246, 0.15)", text: "rgb(91, 33, 182)", border: "rgba(139, 92, 246, 0.3)" },
  cyan: { bg: "rgba(6, 182, 212, 0.15)", text: "rgb(14, 116, 144)", border: "rgba(6, 182, 212, 0.3)" },
  orange: { bg: "rgba(249, 115, 22, 0.15)", text: "rgb(154, 52, 18)", border: "rgba(249, 115, 22, 0.3)" },
  lime: { bg: "rgba(132, 204, 22, 0.15)", text: "rgb(63, 98, 18)", border: "rgba(132, 204, 22, 0.3)" },
};

const COLOR_KEYS = Object.keys(COLOR_MAP) as Array<keyof typeof COLOR_MAP>;

interface ChipProps {
  label: string;
  onRemove: () => void;
  colorIndex: number;
  isPulsing?: boolean;
}

function Chip({ label, onRemove, colorIndex, isPulsing }: ChipProps) {
  const colorKey = COLOR_KEYS[colorIndex % COLOR_KEYS.length];
  const colors = COLOR_MAP[colorKey];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
        isPulsing ? "animate-pulse" : "animate-in scale-in-90 duration-100"
      }`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}
```

### Backend Pydantic Validation
```python
# Source: Pydantic v2 Field constraints + custom validator
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

class NodeConfig(BaseModel):
    # ... existing fields ...

    allowed_actions: Optional[List[str]] = Field(
        default=None,
        max_length=20,
        description="Discrete action labels for classification/routing agents"
    )

    @field_validator("allowed_actions")
    @classmethod
    def validate_action_labels(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None

        if len(v) > 20:
            raise ValueError("Maximum 20 allowed actions")

        for action in v:
            if not action.strip():
                raise ValueError("Action labels cannot be empty")
            if not (1 <= len(action) <= 50):
                raise ValueError(f"Action '{action}' must be 1-50 characters")

        return v
```

### Estimation Logic Adjustment
```python
# Source: estimator.py task-aware multiplier pattern (extended)
def estimate_agent_node(node: NodeConfig, pricing: ModelPricing) -> NodeEstimation:
    base_context_tokens = count_tokens(node.context or "")
    input_tokens = _BASE_SYSTEM_TOKENS + base_context_tokens

    # Adjust output multiplier for constrained actions
    if node.allowed_actions and node.task_type in ("classification", "routing"):
        output_multiplier = 0.15 * len(node.allowed_actions)
        # Count action labels in input (they're shown to LLM in prompt)
        action_prompt_tokens = count_tokens(", ".join(node.allowed_actions))
        input_tokens += action_prompt_tokens
    else:
        output_multiplier = _TASK_OUTPUT_MULTIPLIERS.get(
            (node.task_type or "", node.expected_output_size or ""),
            _OUTPUT_RATIO
        )

    output_tokens = int(base_context_tokens * output_multiplier)

    # ... rest of cost/latency calculation
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `!bg-white` Tailwind syntax | `bg-white!` | Tailwind v4 (2024) | Exclamation mark moves to end for important utilities |
| `onKeyPress` for keyboard events | `onKeyDown` / `onKeyUp` | React 19 (2025) | `onKeyPress` fully deprecated; synthetic events provide `event.key` |
| Pydantic v1 `validator` decorator | `@field_validator` with `@classmethod` | Pydantic v2 (2023) | Type safety improved; validators are class methods, not instance methods |
| Manual color cycling | CSS custom properties + modulo | N/A | Dynamic Tailwind classes don't work; inline styles or CSS vars required for runtime colors |

**Deprecated/outdated:**
- `event.keyCode`: Use `event.key` string comparison instead
- `Array.prototype.includes()` without normalization: Use `trim()` and lowercase comparison for case-insensitive duplicate detection

## Open Questions

1. **Case sensitivity for duplicate detection**
   - What we know: User can type "Approve" and "approve" as separate tags
   - What's unclear: Should these be treated as duplicates?
   - Recommendation: Case-insensitive comparison (`toLowerCase()`) for duplicate detection but preserve user's original casing in display

2. **Auto-truncation vs. rejection for long labels**
   - What we know: Backend validates 1-50 chars per action
   - What's unclear: Should frontend truncate at 50 chars or prevent typing beyond 50?
   - Recommendation: Show character counter when input exceeds 40 chars; prevent submission beyond 50 with visual feedback

3. **Ordering stability for color assignments**
   - What we know: Color assigned by index modulo 8
   - What's unclear: If user removes action at index 2, do colors for indices 3+ shift?
   - Recommendation: Colors shift (simpler logic); users care about visual distinction, not color stability per label

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + React Testing Library 16.3.2 (frontend), pytest 8.0.0+ (backend) |
| Config file | `frontend/vitest.config.mts` (frontend), `backend/tests/conftest.py` (backend) |
| Quick run command | `cd frontend && npx vitest run TagInput.test.tsx` (frontend), `cd backend && python -m pytest tests/test_models.py::test_allowed_actions_validation -v` (backend) |
| Full suite command | `cd frontend && npx vitest run` (frontend), `cd backend && python -m pytest tests/ -v` (backend) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ACTN-01 | User can add tags via Enter key | unit | `cd frontend && npx vitest run TagInput.test.tsx::test_add_tag_on_enter -x` | ❌ Wave 0 |
| ACTN-02 | User can remove tags via X button | unit | `cd frontend && npx vitest run TagInput.test.tsx::test_remove_tag_via_button -x` | ❌ Wave 0 |
| ACTN-02 | Backspace on empty input edits last tag | unit | `cd frontend && npx vitest run TagInput.test.tsx::test_backspace_edit_last -x` | ❌ Wave 0 |
| ACTN-03 | Duplicate tags show pulse animation | unit | `cd frontend && npx vitest run TagInput.test.tsx::test_duplicate_rejection -x` | ❌ Wave 0 |
| ACTN-04 | Backend validates max 20 actions, 1-50 chars each | unit | `cd backend && python -m pytest tests/test_models.py::test_allowed_actions_validation -x` | ❌ Wave 0 |
| ACTN-05 | Estimator adjusts output tokens for classification/routing + actions | unit | `cd backend && python -m pytest tests/test_estimator.py::test_action_constrained_estimation -x` | ❌ Wave 0 |
| ACTN-06 | Scaffold extracts actions from NL descriptions | integration | Manual QA — requires LLM endpoint (mock in tests) | ❌ Wave 0 |
| ACTN-07 | Agent node shows "N actions" badge | unit | `cd frontend && npx vitest run WorkflowNode.test.tsx::test_action_badge_display -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd frontend && npx vitest run TagInput.test.tsx` (< 5 sec)
- **Per wave merge:** `cd frontend && npx vitest run` + `cd backend && python -m pytest tests/ -v` (full suite ~30 sec)
- **Phase gate:** Full suite green + manual QA of tag input interactions before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `frontend/src/components/ui/__tests__/TagInput.test.tsx` — covers ACTN-01, ACTN-02, ACTN-03
- [ ] `backend/tests/test_models.py::test_allowed_actions_validation` — covers ACTN-04
- [ ] `backend/tests/test_estimator.py::test_action_constrained_estimation` — covers ACTN-05
- [ ] `frontend/src/components/nodes/__tests__/WorkflowNode.test.tsx::test_action_badge` — covers ACTN-07
- [ ] Framework install: All frameworks already installed (Vitest 4.0.18, pytest 8.0.0+)

## Sources

### Primary (HIGH confidence)
- Pydantic v2 documentation — Field constraints and validators (https://docs.pydantic.dev/2.0/api/fields/)
- React 19 documentation — Controlled components and keyboard events (https://react.dev/reference/react-dom/components/input)
- Tailwind CSS v4 documentation — Animation utilities and syntax changes (https://tailwindcss.com/docs/animation)
- tiktoken GitHub — Token counting API (https://github.com/openai/tiktoken)
- Project files: `frontend/vitest.config.mts`, `backend/models.py`, `backend/estimator.py`, `Context/testing/conventions.md`

### Secondary (MEDIUM confidence)
- NNGroup tag input patterns — Keyboard interaction heuristics (https://www.nngroup.com/articles/tagging/)
- Verified against existing project patterns in `frontend/src/store/useWorkflowStore.ts` and `backend/tests/test_smoke.py`

### Tertiary (LOW confidence)
- None — all research verified against official docs or existing project code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use; no new dependencies
- Architecture: HIGH - Patterns verified against existing project conventions (Zustand updates, Pydantic validators, React controlled components)
- Pitfalls: HIGH - Derived from documented Tailwind v4 JIT behavior, Pydantic v2 validator semantics, and React 19 event handling changes

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days — stable libraries, no fast-moving dependencies)
