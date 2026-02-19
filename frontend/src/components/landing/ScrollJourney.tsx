"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  ChevronRight,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  Flag,
  GitFork,
  Play,
  Wrench,
  Zap,
  Lock,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Helpers
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
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   1. Problem Statement — large, bold, scroll-stopping
   ═══════════════════════════════════════════════════════════ */

export function ProblemStatement() {
  return (
    <section className="border-b border-border/60">
      <div className="mx-auto max-w-5xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <FadeIn>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-center text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            Agentic AI is booming.
            <br />
            <span className="text-muted-foreground">
              But nobody knows what it costs.
            </span>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            Millions of multi-agent workflows ship every day across GPT-4o,
            Claude, Gemini, and dozens more models. Understanding the real
            cost, latency, and bottlenecks? Still guesswork. Teams deploy
            blind — and deal with surprise bills after.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2.5">
            {[
              "Unpredictable costs",
              "Hidden bottlenecks",
              "No model comparison",
              "Vendor lock-in",
              "Lost workflows",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-red-200/80 bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700"
              >
                {tag}
              </span>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="mt-10 text-center text-lg font-semibold text-foreground sm:text-xl">
            Agentic Flow fixes all of this. Here&apos;s how&nbsp;↓
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. Feature Sections — full-width alternating scroll blocks
   ═══════════════════════════════════════════════════════════ */

interface FeatureBlockProps {
  eyebrow: string;
  title: string;
  description: string;
  flip?: boolean;
  children: React.ReactNode; // the visual
}

function FeatureBlock({
  eyebrow,
  title,
  description,
  flip = false,
  children,
}: FeatureBlockProps) {
  return (
    <section className="border-b border-border/60">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16 ${
          flip ? "lg:[direction:rtl]" : ""
        }`}
      >
        {/* Text */}
        <div className={flip ? "lg:[direction:ltr]" : ""}>
          <FadeIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
              {eyebrow}
            </p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h3 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl md:text-4xl">
              {title}
            </h3>
          </FadeIn>
          <FadeIn delay={0.16}>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {description}
            </p>
          </FadeIn>
          <FadeIn delay={0.24}>
            <a
              href="/editor"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:opacity-70 sm:text-base"
            >
              Try it free
              <ArrowRight className="h-4 w-4" />
            </a>
          </FadeIn>
        </div>

        {/* Visual */}
        <FadeIn
          delay={0.1}
          className={`flex items-center justify-center ${
            flip ? "lg:[direction:ltr]" : ""
          }`}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ─── Visual: Orchestration ──────────────────────────────── */

function VisualOrchestration() {
  const nodes = [
    { icon: Play, label: "Start", c: "border-green-300 bg-green-50 text-green-600" },
    { icon: Brain, label: "Research", c: "border-blue-300 bg-blue-50 text-blue-600" },
    { icon: Wrench, label: "Search", c: "border-amber-300 bg-orange-50 text-amber-600" },
    { icon: Brain, label: "Writer", c: "border-blue-300 bg-blue-50 text-blue-600" },
    { icon: Flag, label: "Finish", c: "border-red-300 bg-red-50 text-red-500" },
  ];
  return (
    <div className="space-y-6">
      {/* Node chain */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {nodes.map((n, i) => (
          <React.Fragment key={n.label + i}>
            <motion.div
              className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm font-bold shadow-sm ${n.c}`}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: i * 0.08 }}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </motion.div>
            {i < nodes.length - 1 && (
              <motion.div
                className="flex shrink-0 items-center"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <div className="h-px w-5 bg-border sm:w-8" />
                <ChevronRight className="-ml-1.5 h-4 w-4 text-muted-foreground/50" />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mini canvas mockup bar */}
      <motion.div
        className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/40 px-4 py-3"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-xs font-semibold text-muted-foreground">
          5 nodes · 4 edges · DAG
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Valid graph
        </span>
      </motion.div>
    </div>
  );
}

/* ─── Visual: Cost Breakdown ─────────────────────────────── */

function VisualCostBreakdown() {
  const bars = [
    { label: "Research Agent", pct: 82, color: "bg-blue-500" },
    { label: "Search Tool", pct: 28, color: "bg-amber-500" },
    { label: "Writer Agent", pct: 68, color: "bg-blue-400" },
    { label: "Summary", pct: 45, color: "bg-violet-500" },
  ];
  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { icon: Zap, val: "14,830", label: "tokens", c: "text-blue-600" },
          { icon: DollarSign, val: "$0.024", label: "total cost", c: "text-green-600" },
          { icon: Clock, val: "3.4s", label: "latency", c: "text-amber-600" },
        ].map((k) => (
          <motion.div
            key={k.val}
            className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/30 px-3.5 py-2.5"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <k.icon className={`h-4 w-4 ${k.c}`} />
            <div>
              <p className="text-sm font-bold leading-tight">{k.val}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        {bars.map((b, i) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="w-28 text-right text-sm font-medium text-muted-foreground">
              {b.label}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${b.color}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${b.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Visual: Comparison ─────────────────────────────────── */

function VisualComparison() {
  const scenarios = [
    {
      name: "GPT-4o Pipeline",
      cost: "$0.024",
      latency: "3.4s",
      badge: "Cheaper",
      badgeC: "bg-green-100 text-green-700 border-green-200",
    },
    {
      name: "Claude 3.5 Pipeline",
      cost: "$0.051",
      latency: "1.8s",
      badge: "Faster",
      badgeC: "bg-blue-100 text-blue-700 border-blue-200",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {scenarios.map((s, i) => (
        <motion.div
          key={s.name}
          className="rounded-xl border border-border/50 bg-secondary/30 p-5"
          initial={{ opacity: 0, x: i === 0 ? -12 : 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.1 + i * 0.12 }}
        >
          <p className="text-base font-bold">{s.name}</p>
          <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <p>
              Cost:{" "}
              <span className="font-bold text-foreground">{s.cost}</span>
            </p>
            <p>
              Latency:{" "}
              <span className="font-bold text-foreground">{s.latency}</span>
            </p>
          </div>
          <span
            className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold ${s.badgeC}`}
          >
            {s.badge}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Visual: Critical Path ──────────────────────────────── */

function VisualCriticalPath() {
  const nodes = ["Start", "Research", "Search", "Writer", "Finish"];
  const critical = [1, 3];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((n, i) => (
          <React.Fragment key={i}>
            <motion.div
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold ${
                critical.includes(i)
                  ? "border-2 border-red-300 bg-red-50 text-red-700"
                  : "border border-border/60 bg-secondary text-muted-foreground"
              }`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              {n}
            </motion.div>
            {i < nodes.length - 1 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
          </React.Fragment>
        ))}
      </div>
      <motion.div
        className="flex items-center gap-2.5"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <GitFork className="h-4 w-4 text-green-600" />
        <span className="text-sm font-bold text-green-700">
          DAG validated · No cycles detected
        </span>
      </motion.div>
    </div>
  );
}

/* ─── Visual: Multi Provider ─────────────────────────────── */

function VisualMultiProvider() {
  const models = [
    { name: "GPT-4o", provider: "OpenAI" },
    { name: "GPT-4o Mini", provider: "OpenAI" },
    { name: "Claude 3.5 Sonnet", provider: "Anthropic" },
    { name: "Claude 3 Opus", provider: "Anthropic" },
    { name: "Gemini Pro", provider: "Google" },
    { name: "Llama 3.1 70B", provider: "Meta" },
    { name: "Mistral Large", provider: "Mistral" },
    { name: "DeepSeek V2", provider: "DeepSeek" },
    { name: "Command R+", provider: "Cohere" },
  ];
  return (
    <div className="flex flex-wrap gap-2.5">
      {models.map((m, i) => (
        <motion.div
          key={m.name}
          className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/30 px-3.5 py-2.5"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: 0.05 + i * 0.04 }}
        >
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold leading-tight">{m.name}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">
              {m.provider}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Visual: Cloud Persistence ──────────────────────────── */

function VisualCloudSync() {
  const items = [
    { name: "Research Pipeline", time: "2 min ago", status: "Synced" },
    { name: "Content Generator", time: "12 min ago", status: "Synced" },
    { name: "Data Processor", time: "1 hr ago", status: "Synced" },
  ];
  return (
    <div className="space-y-3">
      {items.map((w, i) => (
        <motion.div
          key={w.name}
          className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/30 px-4 py-3"
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, delay: 0.1 + i * 0.08 }}
        >
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">{w.name}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground">{w.time}</span>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. Exported Feature Sections — scroll-based journey
   ═══════════════════════════════════════════════════════════ */

export function FeatureJourney() {
  return (
    <div id="features">
      {/* Feature 1: Visual Orchestration */}
      <FeatureBlock
        eyebrow="Visual Orchestration"
        title="Design your entire workflow. Visually."
        description="Drag Start, Agent, Tool, and Finish nodes onto an infinite canvas. Connect them to define data flow, assign models, and see the full graph — no code required."
      >
        <VisualOrchestration />
      </FeatureBlock>

      {/* Feature 2: Cost Estimation */}
      <FeatureBlock
        eyebrow="Token & Cost Estimation"
        title="See exactly what it costs. Before you ship."
        description="Our engine uses tiktoken and real provider pricing to calculate exact token counts, costs, and latency for every node in your graph — in under 10ms."
        flip
      >
        <VisualCostBreakdown />
      </FeatureBlock>

      {/* Feature 3: Scenario Comparison */}
      <FeatureBlock
        eyebrow="Scenario Comparison"
        title="Compare models side by side. Pick the winner."
        description="Clone your workflow, swap providers, and compare cost-to-performance ratios instantly. GPT-4o vs Claude 3.5 — see the numbers before committing."
      >
        <VisualComparison />
      </FeatureBlock>

      {/* Feature 4: Critical Path */}
      <FeatureBlock
        eyebrow="Critical Path Analysis"
        title="Find bottlenecks before they tank performance."
        description="DAG-aware graph analysis detects slow nodes, highlights the critical path, and identifies cycle risks — automatically. No manual tracing required."
        flip
      >
        <VisualCriticalPath />
      </FeatureBlock>

      {/* Feature 5: Multi-Provider */}
      <FeatureBlock
        eyebrow="Multi-Provider Support"
        title="38+ models. 7 providers. One tool."
        description="OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and Cohere — all pricing data is built in and kept up to date. Mix and match across a single workflow."
      >
        <VisualMultiProvider />
      </FeatureBlock>

      {/* Feature 6: Cloud Persistence */}
      <FeatureBlock
        eyebrow="Cloud Persistence"
        title="Your workflows, saved and secure."
        description="Sign in with Google or GitHub. Every workflow is auto-saved to the cloud with row-level security. Close the tab and pick up exactly where you left off."
        flip
      >
        <VisualCloudSync />
      </FeatureBlock>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. Provider Logos / Integrations strip
   ═══════════════════════════════════════════════════════════ */

export function ProvidersStrip() {
  const providers = [
    "OpenAI",
    "Anthropic",
    "Google",
    "Meta",
    "Mistral",
    "DeepSeek",
    "Cohere",
  ];

  return (
    <section className="border-b border-border/60 bg-secondary/20">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
        <FadeIn>
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
            Model Providers
          </p>
        </FadeIn>
        <FadeIn delay={0.08}>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Connects with every major AI provider
          </h2>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="mx-auto mt-4 max-w-lg text-center text-base text-muted-foreground sm:text-lg">
            38+ models across 7 providers — all pricing data built in. Compare
            across OpenAI, Anthropic, Google, and more in a single workflow.
          </p>
        </FadeIn>

        {/* Provider chips in a centered grid */}
        <FadeIn delay={0.25}>
          <div className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3">
            {providers.map((p, i) => (
              <motion.div
                key={p}
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-5 py-3 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.06 }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                  {p[0]}
                </div>
                <span className="text-sm font-semibold">{p}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.5}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Adding a new model takes{" "}
            <span className="font-semibold text-foreground">one line</span> in
            our pricing config. No code changes required.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
