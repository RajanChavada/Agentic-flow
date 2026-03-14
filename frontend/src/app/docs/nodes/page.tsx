"use client";

import Link from "next/link";
import {
    ArrowRight,
    Play,
    Brain,
    Wrench,
    GitFork,
    CircleStop,
    Calculator,
    Rocket,
    Workflow,
    Repeat,
    Split,
} from "lucide-react";
import { AnimatedPatternDiagram } from "@/components/docs/DocsAnimatedDiagrams";

/* ── Node type data ──────────────────────────────────────── */
const nodeTypes = [
    {
        name: "Start",
        type: "startNode",
        icon: Play,
        color: "green",
        borderColor: "border-green-500",
        bgColor: "bg-green-500/10",
        textColor: "text-green-700 dark:text-green-400",
        purpose: "Entry point of every workflow. Each graph must have exactly one Start node.",
        costImpact: "None — the Start node is a control-flow marker with no model assignment.",
        latencyImpact: "None — zero processing time.",
    },
    {
        name: "Agent",
        type: "agentNode",
        icon: Brain,
        color: "blue",
        borderColor: "border-blue-500",
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-700 dark:text-blue-400",
        purpose:
            "An LLM call. Configurable with a model provider, model, context (system prompt), task type, and expected output size.",
        costImpact:
            "Primary cost driver. Cost = (input tokens / 1M) × input rate + (output tokens / 1M) × output rate.",
        latencyImpact:
            "Primary latency driver. Latency = output tokens / model's tokens-per-second.",
    },
    {
        name: "Tool",
        type: "toolNode",
        icon: Wrench,
        color: "orange",
        borderColor: "border-orange-500",
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-700 dark:text-orange-400",
        purpose:
            "An external tool invocation — web search, database query, API call, etc. No model assignment.",
        costImpact:
            "Fixed overhead: +200 schema tokens (input) and +1600 response tokens (output) per call.",
        latencyImpact: "Adds ~400 ms per invocation for network round-trip.",
    },
    {
        name: "Condition",
        type: "conditionNode",
        icon: GitFork,
        color: "yellow",
        borderColor: "border-yellow-500",
        bgColor: "bg-yellow-500/10",
        textColor: "text-yellow-700 dark:text-yellow-400",
        purpose:
            "A routing / branching point. Routes execution down different paths based on logic (true/false, categories, etc.).",
        costImpact:
            "Minimal — the condition itself has no model cost. Branch probabilities affect expected cost of downstream paths.",
        latencyImpact:
            "Negligible — routing logic is near-instant. Downstream branch latency depends on which path is taken.",
    },
    {
        name: "Finish",
        type: "finishNode",
        icon: CircleStop,
        color: "red",
        borderColor: "border-red-500",
        bgColor: "bg-red-500/10",
        textColor: "text-red-700 dark:text-red-400",
        purpose: "Terminal node. Marks the end of a workflow path. Each graph must have at least one Finish node.",
        costImpact: "None — control-flow marker only.",
        latencyImpact: "None — zero processing time.",
    },
];

/* ── Workflow patterns ───────────────────────────────────── */
const patterns = [
    {
        name: "Sequential",
        icon: Workflow,
        description:
            "Nodes execute one after another in a single chain. Total cost = sum of all node costs. Total latency = sum of all node latencies.",
        diagram: "Start → Agent A → Agent B → Finish",
    },
    {
        name: "Parallel (Fan-out / Fan-in)",
        icon: Split,
        description:
            "A node fans out to multiple branches that execute concurrently, then merge at a join point. Total latency = max of parallel branch latencies.",
        diagram: "Start → [Agent A | Agent B | Agent C] → Finish",
    },
    {
        name: "Branched (Conditional)",
        icon: GitFork,
        description:
            "A Condition node routes execution down one of multiple paths. Expected cost uses branch probabilities to weight each path's contribution.",
        diagram: "Start → Condition → (true: Agent A) / (false: Agent B) → Finish",
    },
    {
        name: "Loop / Retry",
        icon: Repeat,
        description:
            "An edge loops back to a previous node for iterative refinement or retry logic. Cost scales by expected iterations. Estimation uses max_loop_steps for bounded calculation.",
        diagram: "Start → Agent A → Tool → (retry?) → Agent A → Finish",
    },
];

export default function NodePalettePage() {
    return (
        <article>
            {/* ── Header ───────────────────────────────────────── */}
            <header className="mb-12">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Stable
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Node Palette
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    Neurovn has five core node types. Each has a specific role, color,
                    and impact on your workflow&apos;s cost and latency estimate.
                </p>
            </header>

            {/* ── Node table ───────────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-6 text-xl font-semibold tracking-tight">
                    Node Types
                </h2>

                {/* Desktop table */}
                <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-secondary/40">
                                <th className="px-4 py-3 text-left font-semibold">Node</th>
                                <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                                <th className="px-4 py-3 text-left font-semibold">Cost Impact</th>
                                <th className="px-4 py-3 text-left font-semibold">Latency Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodeTypes.map((node) => (
                                <tr key={node.type} className="border-b border-border/60 last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`flex h-7 w-7 items-center justify-center rounded-md border ${node.borderColor} ${node.bgColor}`}
                                            >
                                                <node.icon className={`h-3.5 w-3.5 ${node.textColor}`} />
                                            </div>
                                            <span className="font-medium">{node.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{node.purpose}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{node.costImpact}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{node.latencyImpact}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-4 sm:hidden">
                    {nodeTypes.map((node) => (
                        <div
                            key={node.type}
                            className="rounded-xl border border-border bg-card/50 p-4"
                        >
                            <div className="mb-3 flex items-center gap-3">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-md border ${node.borderColor} ${node.bgColor}`}
                                >
                                    <node.icon className={`h-4 w-4 ${node.textColor}`} />
                                </div>
                                <span className="text-sm font-semibold">{node.name}</span>
                            </div>
                            <p className="mb-2 text-sm text-muted-foreground">{node.purpose}</p>
                            <div className="space-y-1 text-xs text-muted-foreground">
                                <p>
                                    <span className="font-medium text-foreground">Cost: </span>
                                    {node.costImpact}
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">Latency: </span>
                                    {node.latencyImpact}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Workflow patterns ────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-6 text-xl font-semibold tracking-tight">
                    Workflow Patterns
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    The way you connect nodes determines graph topology and how cost and
                    latency aggregate.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    {patterns.map((p) => (
                        <div
                            key={p.name}
                            className="rounded-xl border border-border bg-card/50 p-5"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <p.icon className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">{p.name}</h3>
                            </div>
                            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                                {p.description}
                            </p>
                            <AnimatedPatternDiagram pattern={p.name} />
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
                        href="/docs/pricing"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Calculator className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Pricing & Latency</p>
                                <p className="text-xs text-muted-foreground">
                                    The math behind estimation
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
                            <Rocket className="h-4 w-4 text-muted-foreground" />
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
