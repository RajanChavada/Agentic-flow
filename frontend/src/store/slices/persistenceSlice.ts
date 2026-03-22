/**
 * Persistence slice - workflow tracking, Supabase CRUD, guest storage,
 * API cache (providers/tools), template loading.
 * Extracted from useWorkflowStore.ts.
 */
import { StateCreator } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Node, Edge } from '@xyflow/react';
import type {
  WorkflowNodeData,
  WorkflowNodeType,
  WorkflowEstimation,
  WorkflowScenario,
  NodeConfigPayload,
  EdgeConfigPayload,
  ProviderDetailed,
  ToolCategoryDetailed,
} from '@/types/workflow';
import { supabase } from '@/lib/supabase';
import { saveGuestWorkflow, loadGuestWorkflow, clearGuestWorkflow } from '@/lib/guestWorkflow';
import { getTemplate } from '@/lib/marketplacePersistence';
import { nodesToPayload, edgesToPayload, workflowNodeDataFromPayload } from '../utils';

// Import other slice types for combined state
import type { WorkflowSlice } from './workflowSlice';
import type { EstimationSlice } from './estimationSlice';
import type { UISlice } from './uiSlice';

export interface PersistenceSlice {
  // State - workflow tracking
  currentWorkflowId: string | null;
  currentWorkflowName: string;
  isDirty: boolean;
  activeCanvasId: string | null;

  // State - Supabase persistence
  supabaseLoading: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // State - thumbnail capture
  thumbnailCaptureRequested: string | null;

  // State - API cache
  providerData: ProviderDetailed[] | null;
  toolCategoryData: ToolCategoryDetailed[] | null;
  isLoadingProviders: boolean;
  isLoadingTools: boolean;

  // State - post-auth save flow
  showNameWorkflowModal: boolean;

  // Actions - workflow tracking
  setActiveCanvasId: (id: string | null) => void;
  setCurrentWorkflow: (id: string, name: string) => void;
  clearCurrentWorkflow: () => void;
  markDirty: () => void;
  setCurrentWorkflowName: (name: string) => void;

  // Actions - Supabase persistence
  saveWorkflowToSupabase: (name: string, description?: string, overrideCanvasId?: string) => Promise<string | null>;
  loadWorkflowsFromSupabase: (canvasId?: string | null) => Promise<void>;
  deleteWorkflowFromSupabase: (id: string) => Promise<void>;
  pullWorkflowsFromCanvas: (canvasId: string, workflowIds: string[]) => Promise<void>;
  updateWorkflowNameInStore: (id: string, name: string) => void;

  // Actions - thumbnail
  requestThumbnailCapture: (canvasId: string) => void;
  clearThumbnailCaptureRequest: () => void;

  // Actions - API cache
  fetchProviders: () => Promise<void>;
  fetchTools: () => Promise<void>;

  // Actions - guest persistence
  snapshotToLocalStorage: () => void;
  restoreFromLocalStorage: () => boolean;

  // Actions - post-auth save flow
  setShowNameWorkflowModal: (v: boolean) => void;
  createCanvasAndSaveWorkflow: (workflowName: string) => Promise<string | null>;

  // Actions - marketplace
  loadTemplateOntoCanvas: (templateId: string) => Promise<void>;
}

type CombinedState = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

export const createPersistenceSlice: StateCreator<CombinedState, [], [], PersistenceSlice> = (set, get) => ({
  // ── Initial state ──────────────────────────────────────────
  currentWorkflowId: null,
  currentWorkflowName: 'Untitled Workflow',
  isDirty: false,
  activeCanvasId: null,
  supabaseLoading: false,
  isSaving: false,
  lastSavedAt: null,
  thumbnailCaptureRequested: null,
  providerData: null,
  toolCategoryData: null,
  isLoadingProviders: false,
  isLoadingTools: false,
  showNameWorkflowModal: false,

  // ── Workflow tracking actions ──────────────────────────────
  setActiveCanvasId: (id) => set({ activeCanvasId: id }),

  setCurrentWorkflow: (id, name) =>
    set({ currentWorkflowId: id, currentWorkflowName: name, isDirty: false }),

  clearCurrentWorkflow: () =>
    set({
      currentWorkflowId: null,
      currentWorkflowName: 'Untitled Workflow',
      isDirty: false,
      nodes: [],
      edges: [],
      historyStack: [],
      redoStack: [],
      estimation: null,
    }),

  markDirty: () => {
    if (!get().isDirty) set({ isDirty: true });
  },

  setCurrentWorkflowName: (name) =>
    set({ currentWorkflowName: name, isDirty: true }),

  // ── Thumbnail capture ──────────────────────────────────────
  requestThumbnailCapture: (canvasId) => set({ thumbnailCaptureRequested: canvasId }),
  clearThumbnailCaptureRequest: () => set({ thumbnailCaptureRequested: null }),

  // ── API Cache ──────────────────────────────────────────────
  fetchProviders: async () => {
    const { providerData, isLoadingProviders } = get();
    if (providerData !== null || isLoadingProviders) return;
    set({ isLoadingProviders: true });
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      const res = await fetch(`${base}/api/providers/detailed`);
      if (res.ok) {
        set({ providerData: await res.json(), isLoadingProviders: false });
      } else {
        set({ providerData: [], isLoadingProviders: false });
      }
    } catch {
      set({ providerData: [], isLoadingProviders: false });
    }
  },

  fetchTools: async () => {
    const { toolCategoryData, isLoadingTools } = get();
    if (toolCategoryData !== null || isLoadingTools) return;
    set({ isLoadingTools: true });
    try {
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
      const res = await fetch(`${base}/api/tools/categories/detailed`);
      if (res.ok) {
        set({ toolCategoryData: await res.json(), isLoadingTools: false });
      } else {
        set({ toolCategoryData: [], isLoadingTools: false });
      }
    } catch {
      set({ toolCategoryData: [], isLoadingTools: false });
    }
  },

  // ── Guest persistence ──────────────────────────────────────
  snapshotToLocalStorage: () => {
    const { nodes, edges, currentWorkflowId, currentWorkflowName } = get();
    saveGuestWorkflow(nodes, edges, currentWorkflowId, currentWorkflowName);
  },
  restoreFromLocalStorage: (): boolean => {
    const snapshot = loadGuestWorkflow();
    if (!snapshot) return false;
    set({
      nodes: snapshot.nodes as Node<WorkflowNodeData>[],
      edges: snapshot.edges,
      historyStack: [],
      redoStack: [],
      ...(snapshot.currentWorkflowId ? {
        currentWorkflowId: snapshot.currentWorkflowId,
        currentWorkflowName: snapshot.currentWorkflowName ?? 'Untitled Workflow',
      } : {}),
    });
    clearGuestWorkflow();
    return true;
  },

  // ── Post-auth save flow ────────────────────────────────────
  setShowNameWorkflowModal: (v) => set({ showNameWorkflowModal: v }),

  createCanvasAndSaveWorkflow: async (workflowName) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: newCanvas, error: createErr } = await supabase
      .from('canvases')
      .insert({ user_id: user.id, name: workflowName })
      .select('id')
      .single();

    if (createErr || !newCanvas) {
      console.error('Failed to create canvas:', createErr);
      return null;
    }

    const workflowId = await get().saveWorkflowToSupabase(workflowName, undefined, newCanvas.id);
    if (!workflowId) return null;

    set({ activeCanvasId: newCanvas.id });
    return newCanvas.id;
  },

  // ── Supabase persistence ───────────────────────────────────
  updateWorkflowNameInStore: (id, name) => {
    set((prev) => {
      const existing = prev.scenarios[id];
      if (!existing) return prev;
      return {
        scenarios: {
          ...prev.scenarios,
          [id]: { ...existing, name },
        },
        ...(prev.currentWorkflowId === id ? { currentWorkflowName: name } : {}),
      };
    });
  },

  saveWorkflowToSupabase: async (name, description, overrideCanvasId) => {
    const s = get();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    set({ isSaving: true });

    // Resolve canvas_id so workflow always appears in My Canvases
    let canvasId: string | null = overrideCanvasId ?? s.activeCanvasId;
    if (!canvasId) {
      const { data: canvases } = await supabase
        .from('canvases')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (canvases?.length) {
        canvasId = canvases[0].id;
      } else {
        const { data: newCanvas, error: createErr } = await supabase
          .from('canvases')
          .insert({ user_id: user.id, name: 'My Workflows' })
          .select('id')
          .single();
        if (createErr || !newCanvas) {
          console.error('Failed to create default canvas:', createErr);
        } else {
          canvasId = newCanvas.id;
        }
      }
    }

    const graph = {
      nodes: nodesToPayload(s.nodes),
      edges: edgesToPayload(s.edges),
      recursionLimit: 25,
    };

    if (s.currentWorkflowId) {
      const { error } = await supabase
        .from('workflows')
        .update({
          name,
          description: description ?? null,
          graph,
          last_estimate: s.estimation,
          canvas_id: canvasId,
        })
        .eq('id', s.currentWorkflowId)
        .eq('user_id', user.id);
      if (error) {
        console.error('Supabase update error:', error);
        set({ isSaving: false });
        return null;
      }
      if (canvasId && s.estimation) {
        const { error: canvasError } = await supabase
          .from('canvases')
          .update({ last_estimation_report: s.estimation })
          .eq('id', canvasId)
          .eq('user_id', user.id);
        if (canvasError) {
          console.error('Failed to save canvas estimation report:', canvasError);
        }
      }
      const now = new Date().toISOString();
      const existing = s.scenarios[s.currentWorkflowId];
      set((prev) => ({
        scenarios: {
          ...prev.scenarios,
          [s.currentWorkflowId!]: {
            ...(existing ?? { id: s.currentWorkflowId!, createdAt: now, graph }),
            name,
            canvasId: canvasId ?? undefined,
            updatedAt: now,
            graph,
            estimate: s.estimation ?? undefined,
          },
        },
        currentWorkflowName: name,
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date(),
      }));
      if (canvasId) get().requestThumbnailCapture(canvasId);
      return s.currentWorkflowId;
    } else {
      const id = uuid();
      const now = new Date().toISOString();
      const { error } = await supabase.from('workflows').insert({
        id,
        user_id: user.id,
        canvas_id: canvasId,
        name,
        description: description ?? null,
        graph,
        last_estimate: s.estimation,
      });
      if (error) {
        console.error('Supabase insert error:', error);
        set({ isSaving: false });
        return null;
      }
      if (canvasId && s.estimation) {
        const { error: canvasError } = await supabase
          .from('canvases')
          .update({ last_estimation_report: s.estimation })
          .eq('id', canvasId)
          .eq('user_id', user.id);
        if (canvasError) {
          console.error('Failed to save canvas estimation report:', canvasError);
        }
      }
      const scenario: WorkflowScenario = {
        id,
        name,
        canvasId: canvasId ?? undefined,
        createdAt: now,
        updatedAt: now,
        graph,
        estimate: s.estimation ?? undefined,
      };
      set((prev) => ({
        scenarios: { ...prev.scenarios, [id]: scenario },
        currentScenarioId: id,
        currentWorkflowId: id,
        currentWorkflowName: name,
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date(),
      }));
      if (canvasId) get().requestThumbnailCapture(canvasId);
      return id;
    }
  },

  loadWorkflowsFromSupabase: async (canvasId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ supabaseLoading: true });
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (canvasId) {
      query = query.eq('canvas_id', canvasId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase load error:', error);
      set({ supabaseLoading: false });
      return;
    }

    const loaded: Record<string, WorkflowScenario> = {};
    for (const row of data ?? []) {
      loaded[row.id] = {
        id: row.id,
        name: row.name,
        canvasId: row.canvas_id ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        graph: row.graph as WorkflowScenario['graph'],
        estimate: (row.last_estimate as WorkflowEstimation) ?? undefined,
      };
    }

    set((prev) => ({
      scenarios: { ...prev.scenarios, ...loaded },
      supabaseLoading: false,
    }));
  },

  pullWorkflowsFromCanvas: async (canvasId, workflowIds) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || workflowIds.length === 0) return;

    const { data: rows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('canvas_id', canvasId)
      .eq('user_id', user.id)
      .in('id', workflowIds);

    if (error || !rows?.length) return;

    const s = get();
    let offsetX = 0;
    let offsetY = 0;
    for (const n of s.nodes) {
      const x = (n.position?.x ?? 0) + (typeof n.width === 'number' ? n.width : 220);
      const y = (n.position?.y ?? 0) + (typeof n.height === 'number' ? n.height : 100);
      if (x > offsetX) offsetX = x;
      if (y > offsetY) offsetY = y;
    }
    offsetX += 200;
    if (offsetX < 200) offsetX = 200;

    const idMap: Record<string, string> = {};
    const newNodes: Node<WorkflowNodeData>[] = [];
    const newEdges: Edge[] = [];

    for (let wi = 0; wi < rows.length; wi++) {
      const row = rows[wi];
      const graph = row.graph as { nodes: NodeConfigPayload[]; edges: EdgeConfigPayload[] };
      const wOffsetX = offsetX + wi * 300;
      const wOffsetY = offsetY;

      for (let i = 0; i < (graph.nodes ?? []).length; i++) {
        const n = graph.nodes[i];
        const newId = `${n.id}-${uuid().slice(0, 8)}`;
        idMap[n.id] = newId;
        newNodes.push({
          id: newId,
          type: n.type as WorkflowNodeType,
          position: { x: wOffsetX + (i % 3) * 280, y: wOffsetY + Math.floor(i / 3) * 180 },
          data: workflowNodeDataFromPayload(n),
        });
      }

      for (const e of graph.edges ?? []) {
        const src = idMap[e.source];
        const tgt = idMap[e.target];
        if (src && tgt) {
          newEdges.push({
            id: `e-${uuid()}`,
            source: src,
            target: tgt,
          });
        }
      }
      offsetY += 400;
    }

    set((prev) => ({
      nodes: [...prev.nodes, ...newNodes],
      edges: [...prev.edges, ...newEdges],
      isDirty: true,
      ui: { ...prev.ui, needsLayout: true },
    }));
  },

  deleteWorkflowFromSupabase: async (id) => {
    const { error } = await supabase.from('workflows').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error:', error);
    }
    set((s) => {
      const { [id]: _, ...rest } = s.scenarios;
      const isCurrent = s.currentWorkflowId === id;
      return {
        scenarios: rest,
        selectedForComparison: s.selectedForComparison.filter((sid) => sid !== id),
        currentScenarioId: s.currentScenarioId === id ? null : s.currentScenarioId,
        ...(isCurrent ? { currentWorkflowId: null, currentWorkflowName: 'Untitled Workflow', isDirty: false } : {}),
      };
    });
  },

  // ── Marketplace ────────────────────────────────────────────
  loadTemplateOntoCanvas: async (templateId: string) => {
    clearGuestWorkflow();
    const template = await getTemplate(templateId);
    if (!template?.graph) return;

    const nodes = template.graph.nodes;
    const edges = template.graph.edges;

    const rfNodes: Node<WorkflowNodeData>[] = nodes.map((n, i) => ({
      id: n.id,
      type: n.type,
      position: { x: 200 + (i % 3) * 280, y: 100 + Math.floor(i / 3) * 180 },
      data: workflowNodeDataFromPayload(n),
    }));

    const rfEdges: Edge[] = edges.map((e) => ({
      id: e.id ?? `e-${uuid()}`,
      source: e.source,
      target: e.target,
    }));

    set({
      nodes: rfNodes,
      edges: rfEdges,
      historyStack: [],
      redoStack: [],
      estimation: null,
      currentScenarioId: null,
      currentWorkflowId: null,
      currentWorkflowName: `${template.name} (copy)`,
      isDirty: true,
      ui: { ...get().ui, successMessage: 'Template copied! Start customizing.', needsLayout: true },
    });

    setTimeout(() => {
      set((s) => ({ ui: { ...s.ui, successMessage: undefined } }));
    }, 3000);
  },
});
