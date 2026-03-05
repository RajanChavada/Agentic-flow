"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ReactFlowProvider } from "@xyflow/react";
import { toPng } from "html-to-image";
import Sidebar from "@/components/Sidebar";
import Canvas from "@/components/Canvas";
import HeaderBar from "@/components/HeaderBar";
import ContextToolbar from "@/components/ContextToolbar";
import EstimatePanel from "@/components/estimate/EstimatePanel";
import NodeConfigModal from "@/components/NodeConfigModal";
import ErrorBanner from "@/components/ErrorBanner";
import SuccessBanner from "@/components/SuccessBanner";
import ComparisonDrawer from "@/components/ComparisonDrawer";
import AuthModal from "@/components/AuthModal";
import NameWorkflowModal from "@/components/NameWorkflowModal";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAutoLayout } from "@/hooks/useAutoLayout";
import { supabase } from "@/lib/supabase";

function EditorContent() {
  const params = useParams();
  const canvasId = params?.canvasId as string | undefined;
  const user = useUser();
  const applyLayout = useAutoLayout();
  const needsLayout = useWorkflowStore((s) => s.ui.needsLayout);
  const nodes = useWorkflowStore((s) => s.nodes);
  const setNeedsLayout = useWorkflowStore((s) => s.setNeedsLayout);

  useEffect(() => {
    const unsubscribe = useAuthStore.getState().init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!canvasId) return;
    useWorkflowStore.getState().setActiveCanvasId(canvasId === "guest" ? null : canvasId);
  }, [canvasId]);

  useEffect(() => {
    if (!user || !canvasId || canvasId === "guest") return;
    const store = useWorkflowStore.getState();
    store.loadWorkflowsFromSupabase(canvasId).then(() => {
      const s = useWorkflowStore.getState();
      const workflows = Object.values(s.scenarios)
        .filter((sc) => sc.canvasId === canvasId || !sc.canvasId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (workflows.length > 0 && s.nodes.length === 0) {
        s.loadScenario(workflows[0].id);
        s.setCurrentWorkflow(workflows[0].id, workflows[0].name);
        requestAnimationFrame(() => applyLayout());
      }
    });
  }, [user, canvasId, applyLayout]);

  // Apply dagre layout when nodes come from import, template, or pull-from-canvas
  useEffect(() => {
    if (needsLayout && nodes.length > 0) {
      setNeedsLayout(false);
      requestAnimationFrame(() => applyLayout());
    }
  }, [needsLayout, nodes.length, applyLayout, setNeedsLayout]);

  useEffect(() => {
    useWorkflowStore.getState().fetchProviders();
    useWorkflowStore.getState().fetchTools();
  }, []);

  useAutoSave();

  // ── Thumbnail capture after save ─────────────────────────────
  const thumbnailCaptureRequested = useWorkflowStore((s) => s.thumbnailCaptureRequested);
  const clearThumbnailCaptureRequest = useWorkflowStore((s) => s.clearThumbnailCaptureRequest);

  useEffect(() => {
    if (!thumbnailCaptureRequested || thumbnailCaptureRequested !== canvasId || !user) return;

    const run = async () => {
      const el = document.querySelector<HTMLElement>(".react-flow");
      if (!el) {
        clearThumbnailCaptureRequest();
        return;
      }

      try {
        const dataUrl = await toPng(el, {
          backgroundColor: "#f9fafb",
          pixelRatio: 0.5,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const path = `${user.id}/${canvasId}.png`;

        const { error: uploadError } = await supabase.storage
          .from("canvas-thumbnails")
          .upload(path, blob, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Thumbnail upload failed:", uploadError);
          clearThumbnailCaptureRequest();
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("canvas-thumbnails")
          .getPublicUrl(path);

        await supabase
          .from("canvases")
          .update({ thumbnail_url: publicUrl })
          .eq("id", canvasId)
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Thumbnail capture failed:", err);
      } finally {
        clearThumbnailCaptureRequest();
      }
    };

    run();
  }, [thumbnailCaptureRequested, canvasId, user, clearThumbnailCaptureRequest]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <HeaderBar />
      <ErrorBanner />
      <SuccessBanner />
      <ContextToolbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>

      <EstimatePanel />
      <NodeConfigModal />
      <ComparisonDrawer />
      <AuthModal />
      <NameWorkflowModal />
    </div>
  );
}

export default function EditorCanvasPage() {
  return (
    <ReactFlowProvider>
      <EditorContent />
    </ReactFlowProvider>
  );
}
