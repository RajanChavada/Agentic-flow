import { describe, test, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../useWorkflowStore';

describe('useWorkflowStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useWorkflowStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      historyStack: [],
      redoStack: [],
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
      },
    });

    const state = useWorkflowStore.getState();
    expect(state.ui.isEstimatePanelOpen).toBe(true);
    expect(state.ui.theme).toBe('dark');
  });

  test('undo removes a newly added node', () => {
    const store = useWorkflowStore.getState();
    store.addNode({
      id: 'undo-node-1',
      type: 'agentNode',
      position: { x: 120, y: 80 },
      data: { type: 'agentNode', label: 'Undo Node' },
    });

    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
    store.undo();
    expect(useWorkflowStore.getState().nodes).toHaveLength(0);
  });

  test('undo restores a removed edge', () => {
    const store = useWorkflowStore.getState();

    store.addNode({
      id: 'edge-node-a',
      type: 'startNode',
      position: { x: 0, y: 0 },
      data: { type: 'startNode', label: 'Start' },
    });
    store.addNode({
      id: 'edge-node-b',
      type: 'agentNode',
      position: { x: 200, y: 0 },
      data: { type: 'agentNode', label: 'Agent' },
    });
    store.addEdge({
      id: 'edge-undo-1',
      source: 'edge-node-a',
      target: 'edge-node-b',
    });

    store.onEdgesChange([{ id: 'edge-undo-1', type: 'remove' } as any]);
    expect(useWorkflowStore.getState().edges).toHaveLength(0);

    store.undo();
    expect(useWorkflowStore.getState().edges).toHaveLength(1);
    expect(useWorkflowStore.getState().edges[0].id).toBe('edge-undo-1');
  });

  test('undo restores prior node config data', () => {
    const store = useWorkflowStore.getState();

    store.addNode({
      id: 'cfg-node-1',
      type: 'agentNode',
      position: { x: 10, y: 20 },
      data: { type: 'agentNode', label: 'Agent', context: 'old context' },
    });
    store.updateNodeData('cfg-node-1', { context: 'new context', modelProvider: 'OpenAI' });
    expect(useWorkflowStore.getState().nodes[0].data.context).toBe('new context');

    store.undo();
    const node = useWorkflowStore.getState().nodes.find((n) => n.id === 'cfg-node-1');
    expect(node?.data.context).toBe('old context');
    expect(node?.data.modelProvider).toBeUndefined();
  });

  test('undo after deleteNode restores node and its connected edges', () => {
    const store = useWorkflowStore.getState();
    store.addNode({
      id: 'del-start',
      type: 'startNode',
      position: { x: 0, y: 0 },
      data: { type: 'startNode', label: 'Start' },
    });
    store.addNode({
      id: 'del-agent',
      type: 'agentNode',
      position: { x: 200, y: 0 },
      data: { type: 'agentNode', label: 'Agent' },
    });
    store.addEdge({
      id: 'del-edge-1',
      source: 'del-start',
      target: 'del-agent',
    });

    store.deleteNode('del-agent');
    expect(useWorkflowStore.getState().nodes.some((n) => n.id === 'del-agent')).toBe(false);
    expect(useWorkflowStore.getState().edges).toHaveLength(0);

    store.undo();
    const state = useWorkflowStore.getState();
    expect(state.nodes.some((n) => n.id === 'del-agent')).toBe(true);
    expect(state.edges.some((e) => e.id === 'del-edge-1')).toBe(true);
  });

  test('rename label is undoable', () => {
    const store = useWorkflowStore.getState();
    store.addNode({
      id: 'label-node-1',
      type: 'agentNode',
      position: { x: 0, y: 0 },
      data: { type: 'agentNode', label: 'Original' },
    });

    store.updateNodeData('label-node-1', { label: 'Renamed' });
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe('Renamed');

    store.undo();
    expect(useWorkflowStore.getState().nodes[0].data.label).toBe('Original');
  });

  test('undo move and redo reapplies move', () => {
    const store = useWorkflowStore.getState();
    store.addNode({
      id: 'move-node-1',
      type: 'agentNode',
      position: { x: 0, y: 0 },
      data: { type: 'agentNode', label: 'Mover' },
    });

    store.onNodesChange([
      { id: 'move-node-1', type: 'position', position: { x: 300, y: 180 }, dragging: false } as any,
    ]);
    expect(useWorkflowStore.getState().nodes[0].position).toEqual({ x: 300, y: 180 });

    store.undo();
    expect(useWorkflowStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });

    store.redo();
    expect(useWorkflowStore.getState().nodes[0].position).toEqual({ x: 300, y: 180 });
  });

  test('history stack is capped at 50 operations', () => {
    const store = useWorkflowStore.getState();

    for (let i = 0; i < 51; i++) {
      store.addNode({
        id: `cap-node-${i}`,
        type: 'agentNode',
        position: { x: i * 10, y: 0 },
        data: { type: 'agentNode', label: `N${i}` },
      });
    }

    expect(useWorkflowStore.getState().historyStack).toHaveLength(50);
    for (let i = 0; i < 50; i++) {
      store.undo();
    }
    // First add op was dropped; one node remains after 50 undos.
    expect(useWorkflowStore.getState().nodes).toHaveLength(1);
  });

});
