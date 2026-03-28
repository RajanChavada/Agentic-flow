"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Copy, Loader2, LogIn, Sun, MoonStar } from "lucide-react";
import { getShareByToken, copyWorkflowToCanvas, type ShareSnapshot, type CanvasShareSnapshot } from "@/lib/shareWorkflows";
import { useAuthStore, useUser } from "@/store/useAuthStore";
import { useWorkflowStore, useUIState } from "@/store/useWorkflowStore";
import WorkflowNode from "@/components/nodes/WorkflowNode";
import BlankBoxNode from "@/components/nodes/BlankBoxNode";
import TextNode from "@/components/nodes/TextNode";
import AnnotationEdge from "@/components/edges/AnnotationEdge";
import type { Node, Edge } from "@xyflow/react";
import type { WorkflowNodeData } from "@/types/workflow";
import { cn } from "@/lib/utils";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;
const SKIP_TYPES = new Set(["blankBoxNode", "textNode"]);

const nodeTypes = {
  startNode: WorkflowNode,
  agentNode: WorkflowNode,
  toolNode: WorkflowNode,
  finishNode: WorkflowNode,
  blankBoxNode: BlankBoxNode,
  textNode: TextNode,
};

const edgeTypes = {
  annotationEdge: AnnotationEdge,
};

const defaultEdgeOptions = {
  type: "annotationEdge" as const,
  animated: true,
  style: { strokeWidth: 2, stroke: "#6b7280" },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: "#6b7280",
  },
};

function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const flowNodes = nodes.filter((n) => !SKIP_TYPES.has(n.type ?? ""));
  if (flowNodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const n of flowNodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }
  dagre.layout(g);

  return nodes.map((node) => {
    if (SKIP_TYPES.has(node.type ?? "")) return node;
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function isCanvasSnapshot(s: ShareSnapshot): s is CanvasShareSnapshot {
  return "workflows" in s && Array.isArray((s as CanvasShareSnapshot).workflows);
}

function FitViewEffect() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [fitView]);
  return null;
}

function SharePageContent() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const user = useUser();
  const { openAuthModal } = useAuthStore();
  const { theme } = useUIState();
  const toggleTheme = useWorkflowStore((s) => s.toggleTheme);
  const isDark = theme === "dark";

  const [share, setShare] = useState<{ snapshot: ShareSnapshot; shareType: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  useEffect(() => {
    if (!token) {
      setError("Invalid share link.");
      setLoading(false);
      return;
    }

    getShareByToken(token)
      .then((row) => {
        if (!row) {
          setError("Link invalid or expired.");
          return;
        }
        setShare({ snapshot: row.snapshot as ShareSnapshot, shareType: row.share_type });
      })
      .catch(() => setError("Failed to load share."))
      .finally(() => setLoading(false));
  }, [token]);

  const { nodes, edges, title } = useMemo(() => {
    if (!share) return { nodes: [], edges: [], title: "" };

    if (isCanvasSnapshot(share.snapshot)) {
      const first = share.snapshot.workflows[0];
      if (!first) return { nodes: [], edges: [], title: (share.snapshot as { canvasName?: string }).canvasName ?? "Shared Canvas" };
      const rawNodes = first.nodes as Node<WorkflowNodeData>[];
      const rawEdges = (first.edges ?? []).map((e) => ({
        id: (e as { id?: string }).id ?? `${(e as { source: string }).source}-${(e as { target: string }).target}`,
        source: (e as { source: string }).source,
        target: (e as { target: string }).target,
        type: "annotationEdge" as const,
      }));
      const laidOut = layoutNodes(rawNodes, rawEdges);
      return {
        nodes: laidOut,
        edges: rawEdges,
        title: (share.snapshot as { canvasName?: string }).canvasName ?? "Shared Canvas",
      };
    } else {
      const s = share.snapshot as { nodes: Node[]; edges: { source: string; target: string }[]; name?: string };
      const rawNodes = s.nodes ?? [];
      const rawEdges = (s.edges ?? []).map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "annotationEdge" as const,
      }));
      const laidOut = layoutNodes(rawNodes, rawEdges);
      return {
        nodes: laidOut,
        edges: rawEdges,
        title: s.name ?? "Shared Workflow",
      };
    }
  }, [share]);

  const handleCopyToCanvas = async () => {
    if (!share?.snapshot) return;
    const currentUser = useAuthStore.getState().user ?? user;
    if (!currentUser) {
      openAuthModal({
        reason: "Sign in to copy this workflow to your canvas.",
        onSuccess: () => handleCopyToCanvas(),
      });
      return;
    }

    setCopying(true);
    try {
      const canvasId = await copyWorkflowToCanvas(currentUser.id, share.snapshot);
      if (canvasId) {
        window.location.href = `/editor/${canvasId}`;
      } else {
        setError("Failed to copy workflow.");
      }
    } catch {
      setError("Failed to copy workflow.");
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (error || !share) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4">
        <p className="text-center text-muted-foreground">{error ?? "Link invalid or expired."}</p>
        <Link
          href="/"
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Go to Neurovn
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-lg flex h-14 items-center justify-between px-4 sm:px-6",
        isDark ? "border-slate-700 bg-slate-900/80" : "border-gray-200 bg-white/80"
      )}>
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight transition hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background">
            NV
          </div>
          <span className="hidden sm:inline text-lg">Neurovn</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggleTheme}
            className={cn(
              "rounded-md border p-2 transition",
              isDark
                ? "border-slate-600 text-slate-300 hover:bg-slate-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            )}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <MoonStar className="w-4 h-4" />}
          </button>

          <button
            onClick={handleCopyToCanvas}
            disabled={copying}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:opacity-50",
              isDark ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            {copying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : user ? (
              <>
                <Copy className="h-4 w-4" />
                Copy to my canvas
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign in to copy
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Read-only {share.shareType} view
          </p>
        </div>

        <div className={cn(
          "flex-1 rounded-xl border shadow-sm min-h-[500px] overflow-hidden relative",
          isDark ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-gray-50/50"
        )}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
        </div>
      </div>

        </main>
  );
}

export default function SharePage() {
  return (
    <ReactFlowProvider>
      <SharePageContent />
    </ReactFlowProvider>
  );
}
