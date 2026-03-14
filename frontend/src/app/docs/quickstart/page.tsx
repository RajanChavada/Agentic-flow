"use client";

import Link from "next/link";
import {
    ArrowRight,
    CirclePlus,
    Settings,
    Cable,
    Play,
    BarChart3,
    RefreshCw,
    Layers,
    Calculator,
} from "lucide-react";
import { AnimatedSampleWorkflow } from "@/components/docs/DocsAnimatedDiagrams";

/* ── Step data ───────────────────────────────────────────── */
const steps = [
    {
        number: 1,
        icon: CirclePlus,
        title: "Create a new workflow",
        description:
            "Navigate to the Canvas view. Click \"New Canvas\" or press Ctrl+N. You'll land on a blank infinite canvas with a dot-grid background.",
        tip: "Give your canvas a descriptive name — it helps when comparing scenarios later.",
    },
    {
        number: 2,
        icon: CirclePlus,
        title: "Add nodes from the sidebar",
        description:
            "Drag nodes from the left-hand palette onto the canvas. Start with a Start node, then add Agent nodes for your LLM calls, Tool nodes for external services, and a Finish node.",
        tip: "You need at least one Start node and one Finish node for estimation to work.",
    },
    {
        number: 3,
        icon: Settings,
        title: "Configure each Agent",
        description:
            "Double-click any Agent node to open its configuration modal. Select a Model Provider (OpenAI, Anthropic, Google, etc.), choose a Model, add context (system prompt or task description), and set the task type.",
        tip: "The more context you provide, the more accurate the token estimate. Paste a real system prompt if you have one.",
    },
    {
        number: 4,
        icon: Cable,
        title: "Connect nodes with edges",
        description:
            "Click a node's output handle and drag to another node's input handle to create an edge. Edges define execution order — data flows from source to target.",
        tip: "For parallel branches, connect a single source to multiple targets. The estimator will detect parallelism automatically.",
    },
    {
        number: 5,
        icon: Play,
        title: "Run the estimate",
        description:
            "Click \"Run Workflow & Gen Estimate\" in the header. The estimate panel slides in with total token usage, cost per run, P95 latency, graph classification, and a per-node breakdown.",
        tip: "Estimation is pure computation — no API calls, no cost, under 10 ms.",
    },
    {
        number: 6,
        icon: BarChart3,
        title: "Review the results",
        description:
            "Check the Model Mix donut chart to see which models are most expensive. Review the Detailed Breakdown table for per-node input/output tokens, cost, and latency. Scroll to Scaling & Planning to project monthly costs.",
        tip: "Nodes consuming more than 50% of cost or latency are flagged in red — these are your bottlenecks.",
    },
    {
        number: 7,
        icon: RefreshCw,
        title: "Iterate and compare",
        description:
            "Save the current scenario. Swap an expensive model for a cheaper alternative (e.g., GPT-4 → GPT-4o-mini). Run the estimate again. Open the Comparison Drawer to see side-by-side cost/latency differences.",
        tip: "Scenarios are free — create as many as you need to find the optimal cost-performance balance.",
    },
];

export default function QuickstartPage() {
    return (
        <article>
            {/* ── Header ───────────────────────────────────────── */}
            <header className="mb-12">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Stable
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Quickstart
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    Go from a blank canvas to your first full cost/latency estimate in
                    under 15 minutes. No sign-up required.
                </p>
            </header>

            {/* ── Steps ────────────────────────────────────────── */}
            <section className="mb-14">
                <div className="space-y-6">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="relative rounded-xl border border-border bg-card/50 p-5 pl-16"
                        >
                            {/* Step number */}
                            <div className="absolute left-5 top-5 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                                {step.number}
                            </div>

                            <div className="mb-1 flex items-center gap-2">
                                <step.icon className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">{step.title}</h3>
                            </div>

                            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                                {step.description}
                            </p>

                            <div className="flex items-start gap-2 rounded-lg bg-secondary/60 px-3 py-2">
                                <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                                    Tip
                                </span>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    {step.tip}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Example template ─────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Try a sample workflow
                </h2>
                <AnimatedSampleWorkflow />
            </section>

            {/* ── What to do next ──────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    What to do next
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Try swapping models on the same workflow and comparing estimates.
                    For example, replace GPT-4o with GPT-4o-mini on the Research Agent
                    to see how it affects cost versus latency.
                </p>
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
                                    What each node type does
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/docs/pricing"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Calculator className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Pricing & Latency</p>
                                <p className="text-xs text-muted-foreground">
                                    How estimation math works
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {/* CTA */}
                <div className="mt-8 text-center">
                    <Link
                        href="/canvases"
                        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-7 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
                    >
                        Launch Canvas
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </article>
    );
}
