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
import { useUIState } from "@/store/useWorkflowStore";
import AuthModal from "@/components/AuthModal";
import WorkflowNode from "@/components/nodes/WorkflowNode";
import BlankBoxNode from "@/components/nodes/BlankBoxNode";
import TextNode from "@/components/nodes/TextNode";
import ConditionNode from "@/components/nodes/ConditionNode";
import AnnotationEdge from "@/components/edges/AnnotationEdge";
import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData, WorkflowEstimation } from "@/types/workflow";
import { cn } from "@/lib/utils";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;

const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  conditionNode: ConditionNode,
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};

const edgeTypes = { annotationEdge: AnnotationEdge };

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
      setEstimation((canvas?.lastEstimationReport as WorkflowEstimation | null) ?? null);
      setWorkflows((canvas?.workflows ?? []) as any);
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
      <div className={cn("relative min-h-[70vh] overflow-hidden rounded-xl border", isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-gray-50/50") }>
        <ReactFlowProvider>
          <ReactFlow nodes={preview.nodes as Node[]} edges={preview.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} panOnDrag zoomOnScroll fitView fitViewOptions={{ padding: 0.2 }} proOptions={{ hideAttribution: true }}>
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls className={isDark ? "bg-slate-800 border-slate-700 fill-slate-300" : ""} />
            <FitViewEffect />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {(estimation || workflows.some((w) => w.last_estimate)) && (
        <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4" /> Estimation report</div>
          {estimation && (
            <div className="mb-3 rounded-lg border p-3">
              <div className="text-sm font-medium">Latest canvas estimate</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                <div>Cost: ${(estimation.total_cost ?? 0).toFixed(3)}</div>
                <div>Latency: {(estimation.total_latency ?? 0).toFixed(2)}s</div>
                <div>Tokens: {estimation.total_tokens ?? 0}</div>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {workflows.filter((w) => w.last_estimate).map((w) => (
              <div key={w.id} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{w.name}</div>
                <div className="mt-2 text-xs text-muted-foreground">Cost: ${(w.last_estimate?.total_cost ?? 0).toFixed(3)}</div>
                <div className="text-xs text-muted-foreground">Latency: {(w.last_estimate?.total_latency ?? 0).toFixed(2)}s</div>
                <div className="text-xs text-muted-foreground">Tokens: {w.last_estimate?.total_tokens ?? 0}</div>
              </div>
            ))}
          </div>
        </section>
      )}
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
