"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Brain,
    CircleDot,
    Wrench,
    GitFork,
    CheckCircle2,
    ChevronRight,
    Database,
    Cpu,
    Monitor,
    ArrowRight,
    ArrowRightLeft,
    Settings,
    Repeat,
    Split,
    Workflow,
    Box,
    Server,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Shared Animation Helpers
   ═══════════════════════════════════════════════════════════ */

function FadeIn({
    children,
    className = "",
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
}

const staggeredContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const fadeUpItem = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ═══════════════════════════════════════════════════════════
   1. Architecture Diagram (for Overview page)
   ═══════════════════════════════════════════════════════════ */

export function AnimatedArchitectureDiagram() {
    return (
        <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-12">
                    {/* Frontend Box */}
                    <motion.div
                        className="flex w-full flex-col items-center rounded-xl border border-blue-200/50 bg-blue-50/50 p-5 dark:border-blue-900/30 dark:bg-blue-900/10 sm:w-64"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <Monitor className="mb-3 h-8 w-8 text-blue-500" />
                        <h3 className="mb-1 text-sm font-bold text-foreground">Frontend</h3>
                        <p className="text-center text-xs text-muted-foreground">
                            Next.js 15 · React 19
                            <br />
                            React Flow · Zustand
                        </p>
                        <div className="mt-4 flex w-full flex-col gap-2">
                            <div className="rounded-md border border-border/50 bg-background/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-sm">
                                Sidebar
                            </div>
                            <div className="rounded-md border border-border/50 bg-background/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-sm">
                                Canvas
                            </div>
                            <div className="rounded-md border border-border/50 bg-background/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-sm">
                                Estimate Panel
                            </div>
                        </div>
                    </motion.div>

                    {/* Connection API */}
                    <motion.div
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <span className="rounded-full border border-border/80 bg-secondary px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground shadow-sm">
                            POST /api/estimate
                        </span>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm sm:rotate-0 rotate-90">
                            <ArrowRightLeft className="h-5 w-5 text-muted-foreground/70" />
                        </div>
                    </motion.div>

                    {/* Backend Box */}
                    <motion.div
                        className="flex w-full flex-col items-center rounded-xl border border-green-200/50 bg-green-50/50 p-5 dark:border-green-900/30 dark:bg-green-900/10 sm:w-64"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                    >
                        <Server className="mb-3 h-8 w-8 text-green-500" />
                        <h3 className="mb-1 text-sm font-bold text-foreground">Backend</h3>
                        <p className="text-center text-xs text-muted-foreground">
                            FastAPI · Python 3.11+
                            <br />
                            Under 10ms execution
                        </p>
                        <div className="mt-4 flex w-full flex-col gap-2">
                            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                                <GitFork className="h-3.5 w-3.5 text-green-600/70" />
                                <span className="flex-1 text-center">Graph Analyzer</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                                <Settings className="h-3.5 w-3.5 text-blue-600/70" />
                                <span className="flex-1 text-center">Estimator (tiktoken)</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                                <Database className="h-3.5 w-3.5 text-amber-600/70" />
                                <span className="flex-1 text-center">Pricing Registry</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </FadeIn>
    );
}

/* ═══════════════════════════════════════════════════════════
   2. Workflow Anatomy (for Core Concepts page)
   ═══════════════════════════════════════════════════════════ */

export function AnimatedWorkflowAnatomy() {
    const nodes = [
        { icon: CircleDot, label: "Start", desc: "Entry", c: "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400" },
        { icon: Brain, label: "Agent", desc: "LLM Call", c: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
        { icon: Wrench, label: "Tool", desc: "External", c: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
        { icon: GitFork, label: "Condition", desc: "Branch", c: "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
        { icon: CircleDot, label: "Finish", desc: "Exit", c: "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400" },
    ];

    return (
        <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-4 py-4 sm:gap-x-3">
                    {nodes.map((n, i) => (
                        <React.Fragment key={n.label + i}>
                            <motion.div
                                className="flex flex-col items-center gap-1.5"
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: i * 0.15 }}
                            >
                                <div
                                    className={`flex h-10 min-w-[4.5rem] items-center justify-center gap-1 rounded-lg border-2 px-2 text-[10px] font-bold shadow-sm sm:h-12 sm:min-w-[6rem] sm:px-3 sm:text-sm ${n.c}`}
                                >
                                    <n.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    {n.label}
                                </div>
                                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase sm:text-xs">
                                    {n.desc}
                                </span>
                            </motion.div>

                             {i < nodes.length - 1 && (
                                <motion.div
                                    className="flex shrink-0 -translate-y-[10px] items-center text-muted-foreground/30 sm:-translate-y-[12px]"
                                    initial={{ opacity: 0, scaleX: 0 }}
                                    whileInView={{ opacity: 1, scaleX: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.2, delay: 0.1 + i * 0.15 }}
                                >
                                    <div className="h-px w-2 bg-border sm:w-4" />
                                    <ChevronRight className="-ml-1 h-3 w-3 sm:h-4 sm:w-4" />
                                </motion.div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <motion.p
                    className="mt-6 text-center text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                >
                    Arrows between nodes are <strong className="font-semibold text-foreground">edges</strong> — they define execution order.
                </motion.p>
            </div>
        </FadeIn>
    );
}

/* ═══════════════════════════════════════════════════════════
   3. Sample Workflow (for Quickstart page)
   ═══════════════════════════════════════════════════════════ */

export function AnimatedSampleWorkflow() {
    const nodes = [
        { icon: CircleDot, label: "Start", info: "User asks a question", c: "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400" },
        { icon: Brain, label: "Research Agent", info: "GPT-4o · 'Gather relevant data'", c: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
        { icon: Wrench, label: "Web Search", info: "Tool node", c: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-400" },
        { icon: Brain, label: "Summarizer", info: "Claude 3.5 · 'Summarize findings'", c: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400" },
        { icon: CircleDot, label: "Finish", info: "Return final answer", c: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" },
    ];

    return (
        <FadeIn delay={0.1}>
            <div className="overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    Not sure where to start? Try this classic pattern:
                </p>

                <div className="flex flex-col items-center">
                    <div className="relative flex flex-col items-center">
                        {/* The vertical connection line behind everything */}
                        <motion.div
                            className="absolute bottom-6 top-6 w-px bg-border sm:left-24"
                            initial={{ height: 0 }}
                            whileInView={{ height: "calc(100% - 3rem)" }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                        />

                        {nodes.map((n, i) => (
                            <motion.div
                                key={n.label + i}
                                className="relative z-10 flex w-full max-w-sm flex-col items-center gap-3 py-4 sm:flex-row sm:justify-start"
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.3, delay: 0.1 + i * 0.15 }}
                            >
                                {/* Node Box */}
                                <div
                                    className={`flex h-12 w-48 shrink-0 items-center gap-2 rounded-xl border-2 px-4 text-sm font-bold shadow-sm ${n.c}`}
                                >
                                    <n.icon className="h-4 w-4" />
                                    {n.label}
                                </div>

                                {/* Arrow if horizontal layout */}
                                <div className="hidden shrink-0 text-muted-foreground/30 sm:block">
                                    <ArrowRight className="h-4 w-4" />
                                </div>

                                {/* Info text */}
                                <div className="flex-1 text-center text-[11px] font-medium text-muted-foreground sm:text-left sm:text-xs">
                                    {n.info}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                        This pipeline uses two different LLMs and a tool call. Running the
                        estimate will show you exactly how cost and latency distribute
                        across each step.
                    </p>
                    <Link
                        href="/editor/guest?template=sample-rag-pipeline"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90 active:scale-95"
                    >
                        Try this workflow
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </FadeIn>
    );
}

/* ═══════════════════════════════════════════════════════════
   4. Pattern Diagrams (for Node Palette Workflow Patterns)
   ═══════════════════════════════════════════════════════════ */

export function AnimatedPatternDiagram({ pattern }: { pattern: string }) {
    if (pattern === "Sequential") {
        return (
            <motion.div
                className="flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3"
                variants={staggeredContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
            >
                {["Start", "Agent A", "Agent B", "Finish"].map((n, i) => (
                    <React.Fragment key={n + i}>
                        <motion.div variants={fadeUpItem} className="rounded border border-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                            {n}
                        </motion.div>
                        {i < 3 && <motion.div variants={fadeUpItem}><ChevronRight className="h-3 w-3 text-muted-foreground/40" /></motion.div>}
                    </React.Fragment>
                ))}
            </motion.div>
        );
    }

    if (pattern === "Parallel (Fan-out / Fan-in)") {
        return (
            <motion.div
                className="flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3"
                variants={staggeredContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
            >
                <motion.div variants={fadeUpItem} className="rounded border border-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                    Start
                </motion.div>
                <motion.div variants={fadeUpItem}><Split className="h-3 w-3 rotate-90 text-muted-foreground/40" /></motion.div>
                <div className="flex flex-col gap-1">
                    {["Agent A", "Agent B", "Agent C"].map((n, i) => (
                        <motion.div key={n + i} variants={fadeUpItem} className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            {n}
                        </motion.div>
                    ))}
                </div>
                <motion.div variants={fadeUpItem}><Split className="h-3 w-3 -rotate-90 text-muted-foreground/40" /></motion.div>
                <motion.div variants={fadeUpItem} className="rounded border border-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                    Finish
                </motion.div>
            </motion.div>
        );
    }

    if (pattern === "Branched (Conditional)") {
        return (
            <motion.div
                className="flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3"
                variants={staggeredContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
            >
                <motion.div variants={fadeUpItem} className="rounded border border-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                    Start
                </motion.div>
                <motion.div variants={fadeUpItem}><ChevronRight className="h-3 w-3 text-muted-foreground/40" /></motion.div>
                <motion.div variants={fadeUpItem} className="flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 text-[10px] font-semibold text-yellow-700 dark:text-yellow-400 sm:text-xs">
                    <GitFork className="h-3 w-3" /> Cond
                </motion.div>
                <div className="flex flex-col gap-2 pl-2 border-l-2 border-border/40 ml-1">
                    <motion.div variants={fadeUpItem} className="flex items-center gap-2 text-[10px]">
                        <span className="text-green-600 font-mono">True</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        <div className="rounded border border-border/60 bg-card px-2 py-1 font-semibold text-muted-foreground">Agent A</div>
                    </motion.div>
                    <motion.div variants={fadeUpItem} className="flex items-center gap-2 text-[10px]">
                        <span className="text-red-600 font-mono">False</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        <div className="rounded border border-border/60 bg-card px-2 py-1 font-semibold text-muted-foreground">Agent B</div>
                    </motion.div>
                </div>
            </motion.div>
        );
    }

    if (pattern === "Loop / Retry") {
        return (
            <motion.div
                className="flex flex-col items-start gap-2 rounded-lg bg-secondary/40 px-4 py-3"
                variants={staggeredContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
            >
                <div className="flex items-center gap-2">
                    {["Start", "Agent A", "Tool"].map((n, i) => (
                        <React.Fragment key={n + i}>
                            <motion.div variants={fadeUpItem} className="rounded border border-border/60 bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground sm:text-xs">
                                {n}
                            </motion.div>
                            {i < 2 && <motion.div variants={fadeUpItem}><ChevronRight className="h-3 w-3 text-muted-foreground/40" /></motion.div>}
                        </React.Fragment>
                    ))}
                </div>
                <motion.div variants={fadeUpItem} className="flex items-center gap-2 text-[10px] text-muted-foreground pl-[4.5rem]">
                    <Repeat className="h-3 w-3 -scale-x-100" />
                    <span className="font-mono text-orange-500">retry?</span> returns to <span className="font-semibold text-foreground">Agent A</span>
                </motion.div>
            </motion.div>
        );
    }

    return null;
}
