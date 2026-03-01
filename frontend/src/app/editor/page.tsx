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
import { useAutoLayout } from "@/hooks/useAutoLayout";

function EditorContent() {
  const user = useUser();
  const applyLayout = useAutoLayout();

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const store = useWorkflowStore.getState();
    store.loadWorkflowsFromSupabase().then(() => {
      const s = useWorkflowStore.getState();
      const workflows = Object.values(s.scenarios).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      if (workflows.length > 0 && s.nodes.length === 0) {
        s.loadScenario(workflows[0].id);
        s.setCurrentWorkflow(workflows[0].id, workflows[0].name);
        requestAnimationFrame(() => applyLayout());
      }
    });
  }, [user, applyLayout]);

  useEffect(() => {
    useWorkflowStore.getState().fetchProviders();
    useWorkflowStore.getState().fetchTools();
  }, []);

  useAutoSave();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <HeaderBar />
      <ErrorBanner />
      <ContextToolbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>

      <EstimatePanel />
      <NodeConfigModal />
      <ComparisonDrawer />
      <AuthModal />
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}
