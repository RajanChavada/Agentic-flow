# Plan: Test Framework Setup

**Phase:** 0 - Foundation
**Requirement(s):** FNDX-03
**Depends on:** None

## Goal

Configure Vitest (frontend) and pytest (backend) test frameworks with smoke tests proving both layers work, so subsequent plans can verify their refactors.

## Tasks

### Task 1: Install and Configure Vitest for Frontend

**Files:**
- `frontend/package.json` (modify)
- `frontend/vitest.config.mts` (create)

**Action:**

1. Install Vitest and supporting packages:

```bash
cd frontend && npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

2. Create `frontend/vitest.config.mts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(),  // Resolves @/ imports from tsconfig.json
    react(),          // Enables JSX/TSX transformation
  ],
  test: {
    environment: 'jsdom',  // Browser-like environment for React
    globals: true,         // No need to import describe/test/expect
  },
});
```

3. Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Verification:**
- [ ] `cd frontend && npm run test:run` executes without configuration errors (may show "no tests found" - that's OK)

---

### Task 2: Install and Configure pytest for Backend

**Files:**
- `backend/requirements.txt` (modify - add pytest if missing)
- `backend/tests/__init__.py` (create)
- `backend/pytest.ini` (create - optional but recommended)

**Action:**

1. Check if pytest is in requirements.txt; if not, add it:

```bash
cd backend && grep -q "pytest" requirements.txt || echo "pytest>=8.0.0" >> requirements.txt
```

2. Install pytest:

```bash
cd backend && pip install pytest
```

3. Create test directory structure:

```bash
mkdir -p backend/tests
touch backend/tests/__init__.py
```

4. Create `backend/pytest.ini` with sensible defaults:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short
```

**Verification:**
- [ ] `cd backend && pytest --collect-only` runs without errors (may show "no tests collected" - that's OK)

---

### Task 3: Write Smoke Tests for Both Layers

**Files:**
- `frontend/src/store/__tests__/useWorkflowStore.test.ts` (create)
- `backend/tests/test_smoke.py` (create)

**Action:**

**Frontend smoke test** - Create `frontend/src/store/__tests__/useWorkflowStore.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../useWorkflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      estimation: null,
    });
  });

  test('initializes with empty nodes and edges', () => {
    const state = useWorkflowStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
  });

  test('addNode adds a node to the store', () => {
    const store = useWorkflowStore.getState();

    const testNode = {
      id: 'test-node-1',
      type: 'agentNode',
      position: { x: 100, y: 100 },
      data: {
        type: 'agentNode' as const,
        label: 'Test Agent',
      },
    };

    store.addNode(testNode);

    const updatedState = useWorkflowStore.getState();
    expect(updatedState.nodes).toHaveLength(1);
    expect(updatedState.nodes[0].id).toBe('test-node-1');
  });

  test('deleteNode removes node and connected edges', () => {
    const store = useWorkflowStore.getState();

    // Add two nodes
    store.addNode({
      id: 'node-a',
      type: 'startNode',
      position: { x: 0, y: 0 },
      data: { type: 'startNode' as const, label: 'Start' },
    });
    store.addNode({
      id: 'node-b',
      type: 'agentNode',
      position: { x: 200, y: 0 },
      data: { type: 'agentNode' as const, label: 'Agent' },
    });

    // Add edge between them
    useWorkflowStore.setState((s) => ({
      edges: [...s.edges, { id: 'edge-1', source: 'node-a', target: 'node-b' }],
    }));

    // Delete node-a
    store.deleteNode('node-a');

    const state = useWorkflowStore.getState();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].id).toBe('node-b');
    expect(state.edges).toHaveLength(0); // Edge should be removed
  });

  test('selector hooks return correct state slices', () => {
    // Set some UI state
    useWorkflowStore.setState({
      ui: {
        isConfigModalOpen: false,
        isEstimatePanelOpen: true,
        isComparisonOpen: false,
        theme: 'dark',
        needsLayout: false,
      },
    });

    const state = useWorkflowStore.getState();
    expect(state.ui.isEstimatePanelOpen).toBe(true);
    expect(state.ui.theme).toBe('dark');
  });
});
```

**Backend smoke test** - Create `backend/tests/test_smoke.py`:

```python
"""Smoke tests for backend API endpoints."""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root_endpoint_responds():
    """Smoke test: root endpoint returns 200."""
    response = client.get("/")
    assert response.status_code == 200


def test_estimate_endpoint_accepts_minimal_payload():
    """Smoke test: /api/estimate accepts valid minimal payload."""
    payload = {
        "nodes": [
            {
                "id": "start-1",
                "type": "startNode",
                "label": "Start",
                "model_provider": None,
                "model_name": None,
                "context": None,
                "tool_id": None,
                "tool_category": None,
                "max_steps": None,
                "task_type": None,
                "expected_output_size": None,
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Verify response has expected structure
    assert "total_cost" in data
    assert "total_tokens" in data
    assert "total_latency" in data
    assert isinstance(data["total_cost"], (int, float))


def test_estimate_endpoint_returns_breakdown():
    """Smoke test: /api/estimate returns node breakdown for agent node."""
    payload = {
        "nodes": [
            {
                "id": "agent-1",
                "type": "agentNode",
                "label": "Test Agent",
                "model_provider": "OpenAI",
                "model_name": "gpt-4o",
                "context": "short",
                "tool_id": None,
                "tool_category": None,
                "max_steps": 5,
                "task_type": "generation",
                "expected_output_size": "medium",
                "expected_calls_per_run": None,
            }
        ],
        "edges": [],
        "runs_per_day": None,
        "loop_intensity": 1.0,
    }

    response = client.post("/api/estimate", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Should have breakdown array
    assert "breakdown" in data
    assert len(data["breakdown"]) >= 1

    # First breakdown entry should be our agent
    breakdown = data["breakdown"][0]
    assert breakdown["node_id"] == "agent-1"
    assert breakdown["tokens"] > 0
```

**Verification:**
- [ ] `cd frontend && npm run test:run` passes (4 tests)
- [ ] `cd backend && pytest` passes (3 tests)

---

## Verification Checklist

- [ ] Frontend: `cd frontend && npm run test:run` shows 4 passing tests
- [ ] Backend: `cd backend && pytest` shows 3 passing tests
- [ ] Frontend: `npx tsc --noEmit` passes (no type errors from test config)
- [ ] Backend: `python -c "from main import app"` still works (no import breakage)

## Success Criteria

- Developer can run `npm run test:run` from frontend/ directory and see test results
- Developer can run `pytest` from backend/ directory and see test results
- At least one smoke test per layer validates core functionality works
