/**
 * UI slice - modals, panels, theme, layout state.
 * Extracted from useWorkflowStore.ts.
 */
import { StateCreator } from 'zustand';
import type { UIState } from '../types';

// Import other slice types for combined state
import type { WorkflowSlice } from './workflowSlice';
import type { EstimationSlice } from './estimationSlice';
import type { PersistenceSlice } from './persistenceSlice';

export interface UISlice {
  // State
  ui: UIState;

  // Actions
  openConfigModal: () => void;
  closeConfigModal: () => void;
  toggleEstimatePanel: () => void;
  toggleComparisonDrawer: () => void;
  setErrorBanner: (msg?: string) => void;
  setSuccessMessage: (msg?: string) => void;
  toggleTheme: () => void;
  setNeedsLayout: (v: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
}

type CombinedState = WorkflowSlice & EstimationSlice & UISlice & PersistenceSlice;

export const createUISlice: StateCreator<CombinedState, [], [], UISlice> = (set) => ({
  ui: {
    isConfigModalOpen: false,
    isEstimatePanelOpen: false,
    isComparisonOpen: false,
    theme: 'light',
    needsLayout: false,
    isSidebarOpen: true,
  },

  openConfigModal: () =>
    set((s) => ({ ui: { ...s.ui, isConfigModalOpen: true } })),
  closeConfigModal: () =>
    set((s) => ({ ui: { ...s.ui, isConfigModalOpen: false } })),
  toggleEstimatePanel: () =>
    set((s) => ({
      ui: { ...s.ui, isEstimatePanelOpen: !s.ui.isEstimatePanelOpen },
    })),
  toggleComparisonDrawer: () =>
    set((s) => ({
      ui: { ...s.ui, isComparisonOpen: !s.ui.isComparisonOpen },
    })),
  setErrorBanner: (msg) =>
    set((s) => ({ ui: { ...s.ui, errorBanner: msg } })),
  setSuccessMessage: (msg) =>
    set((s) => ({ ui: { ...s.ui, successMessage: msg } })),
  toggleTheme: () =>
    set((s) => {
      const next = s.ui.theme === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next === 'dark');
      }
      return { ui: { ...s.ui, theme: next } };
    }),
  setNeedsLayout: (v) =>
    set((s) => ({ ui: { ...s.ui, needsLayout: v } })),
  toggleSidebar: () =>
    set((s) => ({ ui: { ...s.ui, isSidebarOpen: !s.ui.isSidebarOpen } })),
  setSidebarOpen: (v) =>
    set((s) => ({ ui: { ...s.ui, isSidebarOpen: v } })),
});
