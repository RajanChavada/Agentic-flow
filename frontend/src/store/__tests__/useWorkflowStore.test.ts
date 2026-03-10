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
        isSidebarOpen: true,
        hasSeenBlankOverlay: false,
        isRefineBarOpen: false,
      },
    });

    const state = useWorkflowStore.getState();
    expect(state.ui.isEstimatePanelOpen).toBe(true);
    expect(state.ui.theme).toBe('dark');
  });

  test('contract results can be set and cleared', () => {
    const store = useWorkflowStore.getState();

    // Initially empty
    expect(store.contractResults).toEqual([]);
    expect(store.contractSummary).toBeNull();
    expect(store.isValidatingContracts).toBe(false);

    // Set results
    const results = [
      { edge_id: 'e1', source_id: 'a', target_id: 'b', status: 'compatible' as const, errors: [] },
      { edge_id: 'e2', source_id: 'b', target_id: 'c', status: 'incompatible' as const, errors: ['Missing field'] },
    ];
    const summary = { total_edges: 2, compatible: 1, incompatible: 1, unvalidated: 0 };

    store.setContractResults(results, summary);

    const updated = useWorkflowStore.getState();
    expect(updated.contractResults).toHaveLength(2);
    expect(updated.contractResults[0].status).toBe('compatible');
    expect(updated.contractSummary?.incompatible).toBe(1);

    // Clear
    updated.clearContractResults();
    const cleared = useWorkflowStore.getState();
    expect(cleared.contractResults).toEqual([]);
    expect(cleared.contractSummary).toBeNull();
  });
});
