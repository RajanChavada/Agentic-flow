"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import HeaderBar from "@/components/HeaderBar";
import ContextToolbar from "@/components/ContextToolbar";
import EstimatePanel from "@/components/EstimatePanel";
import NodeConfigModal from "@/components/NodeConfigModal";
import ErrorBanner from "@/components/ErrorBanner";
import ComparisonDrawer from "@/components/ComparisonDrawer";
import AuthModal from "@/components/AuthModal";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useAutoSave } from "@/hooks/useAutoSave";

export default function Home() {
  const user = useUser();

  // Hydrate Supabase session on mount and listen for auth changes
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    return unsubscribe;
  }, []);

  // Load the user's most recent workflow on mount when authenticated
  useEffect(() => {
    if (!user) return;
    const store = useWorkflowStore.getState();
    store.loadWorkflowsFromSupabase().then(() => {
      const s = useWorkflowStore.getState();
      const workflows = Object.values(s.scenarios).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      // Only auto-load if the canvas is empty (no user-created nodes yet)
      if (workflows.length > 0 && s.nodes.length === 0) {
        s.loadScenario(workflows[0].id);
        s.setCurrentWorkflow(workflows[0].id, workflows[0].name);
      }
    });
  }, [user]);

  // Fetch API registries once on editor mount (cached in Zustand)
  useEffect(() => {
    useWorkflowStore.getState().fetchProviders();
    useWorkflowStore.getState().fetchTools();
  }, []);

  // Auto-save on node/edge changes (debounced 3s, auth-gated)
  useAutoSave();

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <HeaderBar />
        <ErrorBanner />
        <ContextToolbar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas />
        </div>

        {/* Right-side sliding drawer (fixed overlay) */}
        <EstimatePanel />
        <NodeConfigModal />
        <ComparisonDrawer />
        <AuthModal />
      </div>
    </ReactFlowProvider>
  );
}
