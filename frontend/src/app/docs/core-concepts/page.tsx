"use client";

import Link from "next/link";
import {
    ArrowRight,
    CircleDot,
    Network,
    ArrowRightLeft,
    Cpu,
    Wrench,
    IterationCw,
    Layers,
} from "lucide-react";
import { AnimatedWorkflowAnatomy } from "@/components/docs/DocsAnimatedDiagrams";

/* ── Concept definitions ─────────────────────────────────── */
const concepts = [
    {
        term: "Agent Graph",
        icon: Network,
        definition:
            "The top-level container for a workflow. A directed graph where nodes represent compute steps and edges define execution order.",
        detail:
            "Graphs can be DAGs (directed acyclic graphs) for simple sequential/parallel flows, or cyclic when loops or retries are involved. The graph analyzer classifies the type automatically.",
    },
    {
        term: "Node",
        icon: CircleDot,
        definition:
            "A single unit of work in the workflow — an LLM call, a tool invocation, a routing decision, or a control-flow marker (Start/Finish).",
        detail:
            "Each node has a type, optional model/provider configuration, and contributes independently to the total cost and latency estimate.",
    },
    {
        term: "Edge",
        icon: ArrowRightLeft,
        definition:
            "A directed connection between two nodes. Edges define execution order — data or control flows from the source node to the target node.",
        detail:
            "Regular edges form the happy path. Error edges (prefixed s-error) route to fallback or retry logic and are excluded from critical-path analysis.",
    },
    {
        term: "Model / Provider",
        icon: Cpu,
        definition:
            "The LLM and its vendor assigned to an Agent node. Neurovn ships with pricing data for 38+ models across 7 providers.",
        detail:
            "Pricing comes from provider rate cards (input tokens per million, output tokens per million). Changing the model on a node instantly updates the cost estimate.",
    },
    {
        term: "Tool",
        icon: Wrench,
        definition:
            "An external capability invoked during the workflow — web search, database lookup, API call, etc. Represented by a Tool node.",
        detail:
            "Tool nodes add a fixed per-call overhead: +200 schema tokens, +1600 response tokens, and ~400 ms latency. They don't have model pricing.",
    },
    {
        term: "Run / Scenario",
        icon: IterationCw,
        definition:
            "A single execution of the workflow graph. A Scenario is a saved snapshot of a workflow + its estimate that you can compare against other configurations.",
        detail:
            "Use scenarios to A/B test different model choices. The Comparison Drawer shows side-by-side cost, latency, and token differences.",
    },
];

export default function CoreConceptsPage() {
    return (
        <article className="max-w-3xl mx-auto">
            {/* ── Header ───────────────────────────────────────── */}
            <header className="mb-12">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Stable
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Core Concepts
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    The foundational vocabulary of Neurovn. Understanding these six
                    concepts is all you need to design and estimate any agentic workflow.
                </p>
            </header>

            {/* ── Anatomy diagram ──────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Anatomy of a Workflow
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Every workflow follows the same structure: a Start node, one or more
                    processing nodes (Agents, Tools, Conditions), connected by edges, and
                    ending at a Finish node.
                </p>
                <div className="mt-8">
                    <AnimatedWorkflowAnatomy />
                </div>
            </section>

            {/* ── Concept cards ────────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-6 text-xl font-semibold tracking-tight">
                    Key Definitions
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {concepts.map((c) => (
                        <div
                            key={c.term}
                            className="rounded-xl border border-border bg-card/50 p-5 flex flex-col"
                        >
                            <div className="mb-2 flex items-center gap-3">
                                <c.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">{c.term}</h3>
                            </div>
                            <p className="mb-2 text-xs leading-relaxed text-foreground">
                                {c.definition}
                            </p>
                            <p className="text-xs leading-relaxed text-muted-foreground mt-auto">
                                {c.detail}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Next steps ───────────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Next up
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/docs/nodes"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Node Palette</p>
                                <p className="text-xs text-muted-foreground">
                                    Deep-dive into each node type
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/docs/quickstart"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Quickstart</p>
                                <p className="text-xs text-muted-foreground">
                                    Build your first workflow
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </section>
        </article>
    );
}
