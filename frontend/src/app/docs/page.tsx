"use client";

import Link from "next/link";
import {
    ArrowRight,
    Layers,
    Calculator,
    Rocket,
    Users,
    BarChart3,
    GitBranch,
    Zap,
    Shield,
} from "lucide-react";
import { AnimatedArchitectureDiagram } from "@/components/docs/DocsAnimatedDiagrams";

export default function DocsOverview() {
    return (
        <article>
            {/* ── Hero ─────────────────────────────────────────── */}
            <header className="mb-12">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Stable
                </div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    What is Neurovn?
                </h1>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                    Neurovn is an open-source visual canvas for designing multi-agent AI
                    workflows and estimating their cost, token usage, and latency —
                    before you write a single line of code or make a single API call.
                </p>
            </header>

            {/* ── Value prop cards ─────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-6 text-xl font-semibold tracking-tight">
                    Why Neurovn?
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        {
                            icon: GitBranch,
                            title: "Visual Workflow Design",
                            desc: "Drag-and-drop nodes onto an infinite canvas to compose multi-agent pipelines visually.",
                        },
                        {
                            icon: Calculator,
                            title: "Instant Cost Estimation",
                            desc: "Token, cost, and latency breakdown in under 10 ms — zero external API calls.",
                        },
                        {
                            icon: BarChart3,
                            title: "What-If Scaling",
                            desc: "Project monthly costs at any production volume with sensitivity analysis.",
                        },
                        {
                            icon: Zap,
                            title: "Bottleneck Detection",
                            desc: "Automatically flags nodes consuming disproportionate cost or latency.",
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border border-border bg-card p-5 transition hover:border-border/80 hover:shadow-sm"
                        >
                            <card.icon className="mb-3 h-5 w-5 text-muted-foreground" />
                            <h3 className="mb-1 text-sm font-semibold">{card.title}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Who it's for ─────────────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-6 text-xl font-semibold tracking-tight">
                    Who is this for?
                </h2>
                <div className="space-y-3">
                    {[
                        {
                            icon: Users,
                            role: "AI / ML Engineers",
                            why: "Design and cost-model multi-agent architectures before committing to code.",
                        },
                        {
                            icon: Layers,
                            role: "Product Managers",
                            why: "Understand the cost profile of proposed AI features without needing to read code.",
                        },
                        {
                            icon: Shield,
                            role: "Finance & Ops",
                            why: "Get monthly cost projections and per-run breakdowns for budget planning.",
                        },
                    ].map((row) => (
                        <div
                            key={row.role}
                            className="flex items-start gap-4 rounded-lg border border-border/60 bg-card/50 px-5 py-4"
                        >
                            <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">{row.role}</p>
                                <p className="text-sm text-muted-foreground">{row.why}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Architecture overview ────────────────────────── */}
            <section className="mb-14">
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Architecture at a Glance
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    The frontend (Next.js + React Flow + Zustand) communicates with a
                    lightweight FastAPI backend for estimation. The estimation engine is
                    pure computation — tiktoken for token counting, a JSON pricing
                    registry for 38+ models, and graph analysis (Tarjan SCC, topological
                    sort, critical path).
                </p>
                <div className="mt-8">
                    <AnimatedArchitectureDiagram />
                </div>
            </section>

            {/* ── Next steps ───────────────────────────────────── */}
            <section>
                <h2 className="mb-4 text-xl font-semibold tracking-tight">
                    Where to go next
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                        href="/docs/quickstart"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Rocket className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Quickstart</p>
                                <p className="text-xs text-muted-foreground">
                                    First estimate in 15 minutes
                                </p>
                            </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/docs/core-concepts"
                        className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition hover:border-border/80 hover:shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-semibold">Core Concepts</p>
                                <p className="text-xs text-muted-foreground">
                                    Graphs, nodes, edges & more
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
