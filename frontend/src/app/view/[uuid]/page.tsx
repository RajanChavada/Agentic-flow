"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Loader2, Copy, LogIn, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import AuthModal from "@/components/AuthModal";
import { nodeTypes } from "@/components/nodes";
import { edgeTypes } from "@/components/edges";
import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData, WorkflowEstimation } from "@/types/workflow";
import { cn } from "@/lib/utils";
import EstimatePanel from "@/components/estimate/EstimatePanel";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;


const defaultEdgeOptions = {
  type: "annotationEdge" as const,
  animated: true,
  style: { strokeWidth: 2, stroke: "#6b7280" },
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#6b7280" },
};

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (!nodes.length) return nodes;
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });
  for (const n of nodes) g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const e of edges) if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return pos ? { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } } : node;
  });
}

function FitViewEffect() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [fitView]);
  return null;
}

import { Suspense } from "react";

function ViewCanvasContent() {
  const params = useParams();
  const canvasId = params?.uuid as string | undefined;
  const searchParams = useSearchParams();
  const user = useUser();
  const { openAuthModal } = useAuthStore();
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasName, setCanvasName] = useState<string>("Shared Canvas");
  const [estimation, setEstimation] = useState<WorkflowEstimation | null>(null);
  const [workflows, setWorkflows] = useState<Array<{ id: string; name: string; graph: any; last_estimate?: WorkflowEstimation | null }>>([]);
  const [forking, setForking] = useState(false);
  const shouldAutoFork = searchParams?.get("fork") === "1";

  useEffect(() => { useAuthStore.getState().init(); }, []);

  useEffect(() => {
    if (!canvasId) {
      setError("Invalid canvas link.");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const canvasRes = await fetch(`/api/canvas/public/${canvasId}`);
      if (!canvasRes.ok) {
        setError("Failed to load canvas.");
        setLoading(false);
        return;
      }
      const canvas = await canvasRes.json();
      setCanvasName(canvas?.name ?? "Shared Canvas");
      const est = (canvas?.lastEstimationReport as WorkflowEstimation | null) ?? null;
      setEstimation(est);
      setWorkflows((canvas?.workflows ?? []) as any);

      // Fix: Populate the store's estimation so WorkflowNode can show metrics/badges
      if (est) {
        useWorkflowStore.setState({ estimation: est });
      }
      
      setLoading(false);
    })();
  }, [canvasId]);

  const firstWorkflow = workflows[0];
  const displayName = firstWorkflow?.name ?? canvasName;
  const preview = useMemo(() => {
    const g = firstWorkflow?.graph as { nodes?: Node<WorkflowNodeData>[]; edges?: Edge[] } | undefined;
    const rawNodes = (g?.nodes ?? []) as Node<WorkflowNodeData>[];
    const nodes = layoutNodes(
      rawNodes.map((node) => ({
        ...node,
        data: { ...node.data, readOnly: true },
      })) as Node[],
      (g?.edges ?? []) as Edge[],
    );
    return { nodes, edges: (g?.edges ?? []) as Edge[] };
  }, [firstWorkflow]);

  const handleFork = async () => {
    if (!firstWorkflow) return;
    const currentUser = useAuthStore.getState().user ?? user;
    if (!currentUser) {
      openAuthModal({ reason: "Sign up to fork this workflow.", mode: "signup" });
      return;
    }
    setForking(true);
    try {
      const { data: newCanvas, error: canvasErr } = await supabase
        .from("canvases")
        .insert({ user_id: currentUser.id, name: `${canvasName} copy` })
        .select("id")
        .single();

      if (canvasErr || !newCanvas) {
        setError("Failed to fork canvas.");
        return;
      }

      for (const wf of workflows) {
        const graph = {
          nodes: ((wf.graph as any)?.nodes ?? []) as Node<WorkflowNodeData>[],
          edges: ((wf.graph as any)?.edges ?? []) as Edge[],
          recursionLimit: (wf.graph as any)?.recursionLimit ?? 25,
        };
        const { error: wfErr } = await supabase.from("workflows").insert({
          user_id: currentUser.id,
          canvas_id: newCanvas.id,
          name: wf.name,
          graph,
          last_estimate: wf.last_estimate ?? null,
        });
        if (wfErr) {
          console.error("Failed to fork workflow:", wfErr);
        }
      }

      window.location.href = `/editor/${newCanvas.id}`;
    } finally {
      setForking(false);
    }
  };

  useEffect(() => {
    if (shouldAutoFork && user && workflows.length > 0 && !forking) {
      void handleFork();
    }
  }, [shouldAutoFork, user, workflows.length, forking]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-background text-foreground"><Loader2 className="h-8 w-8 animate-spin" /></main>;
  if (error || !canvasId) return <main className="flex min-h-screen items-center justify-center bg-background text-foreground p-4"><div className="text-center"><p className="text-muted-foreground">{error ?? "Invalid canvas link."}</p><Link href="/" className="mt-4 inline-block text-sm underline">Go to Neurovn</Link></div></main>;

  return <main className="min-h-screen bg-background text-foreground">
    <nav className={cn("sticky top-0 z-50 flex h-14 items-center justify-between border-b px-4 sm:px-6 backdrop-blur-lg", isDark ? "border-slate-700 bg-slate-900/80" : "border-gray-200 bg-white/80") }>
      <Link href="/" className="font-semibold tracking-tight">Neurovn / {displayName} [Read-only]</Link>
      <div className="flex items-center gap-2">
        <button onClick={handleFork} disabled={forking} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {forking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          Fork workflow
        </button>
        <Link href={`/signup?next=${encodeURIComponent(`/view/${canvasId}?fork=1`)}`} className="inline-flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm font-medium">
          <LogIn className="h-4 w-4" /> Open in Neurovn
        </Link>
      </div>
    </nav>

    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className={cn("relative h-[70vh] overflow-hidden rounded-xl border border-dashed", isDark ? "border-slate-800 bg-slate-900/50" : "border-gray-200 bg-gray-50/50") }>
        <ReactFlowProvider>
          <ReactFlow 
            nodes={preview.nodes as Node[]} 
            edges={preview.edges} 
            nodeTypes={nodeTypes} 
            edgeTypes={edgeTypes} 
            defaultEdgeOptions={defaultEdgeOptions} 
            nodesDraggable={false} 
            nodesConnectable={false} 
            elementsSelectable={false} 
            panOnDrag 
            zoomOnScroll 
            fitView 
            fitViewOptions={{ padding: 0.2 }} 
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className={isDark ? "bg-slate-800 border-slate-700 fill-slate-300" : ""} />
            <FitViewEffect />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <EstimatePanel readOnly estimation={estimation} />
        </div>
        
        <div className="space-y-6">
          <div className={cn("p-6 rounded-2xl border bg-gradient-to-br transition-all", isDark ? "from-blue-900/20 to-indigo-900/20 border-blue-800/50" : "from-blue-50 to-indigo-50 border-blue-100")}>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Build like this
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Neurovn lets you architect, estimate, and export agentic workflows in minutes.
            </p>
            <Link 
              href={`/signup?next=${encodeURIComponent(`/view/${canvasId}?fork=1`)}`}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            >
              Open in Neurovn to edit →
            </Link>
          </div>
          
          {workflows.length > 1 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Other workflows in this canvas</h4>
              <div className="grid gap-2">
                {workflows.slice(1).map((w) => (
                  <div key={w.id} className={cn("p-3 rounded-xl border text-sm transition-colors", isDark ? "bg-slate-900 border-slate-800 hover:border-slate-700" : "bg-white border-gray-100 hover:border-gray-200")}>
                    <div className="font-medium truncate">{w.name}</div>
                    {w.last_estimate && (
                      <div className="mt-1 text-[10px] text-muted-foreground flex gap-3">
                        <span>${w.last_estimate.total_cost.toFixed(3)}</span>
                        <span>{(w.last_estimate.total_latency).toFixed(1)}s</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <AuthModal />
  </main>;
}

export default function ViewCanvasPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    }>
      <ViewCanvasContent />
    </Suspense>
  );
}
