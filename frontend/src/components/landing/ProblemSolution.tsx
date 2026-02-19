"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
  Lock,
  Play,
  Wrench,
  Zap,
  Eye,
  Shuffle,
  Route,
  Server,
  CloudUpload,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Pain points & their solutions
   ═══════════════════════════════════════════════════════════ */

interface TabItem {
  id: string;
  pain: string;
  painDesc: string;
  solution: string;
  solutionDesc: string;
  icon: React.FC<{ className?: string }>;
  accentColor: string;
  Visual: React.FC;
}

/* ── Tab visuals (reusing the proven snippet approach) ────── */

function VisualOrchestration() {
  const nodes = [
    { icon: Play, label: "Start", c: "border-green-300 bg-green-50 text-green-600" },
    { icon: Brain, label: "Research", c: "border-blue-300 bg-blue-50 text-blue-600" },
    { icon: Wrench, label: "Search", c: "border-amber-300 bg-orange-50 text-amber-600" },
    { icon: Brain, label: "Writer", c: "border-blue-300 bg-blue-50 text-blue-600" },
    { icon: Flag, label: "Finish", c: "border-red-300 bg-red-50 text-red-500" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 py-4">
      {nodes.map((n, i) => (
        <div key={n.label + i} className="flex items-center">
          <motion.div
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${n.c}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: i * 0.07 }}
          >
            <n.icon className="h-3.5 w-3.5" />
            {n.label}
          </motion.div>
          {i < nodes.length - 1 && (
            <motion.div
              className="flex shrink-0 items-center px-0.5"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.15, delay: 0.05 + i * 0.07 }}
            >
              <div className="h-px w-4 bg-border sm:w-6" />
              <ChevronRight className="-ml-1 h-3 w-3 text-muted-foreground/60" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

function VisualCostBreakdown() {
  const bars = [
    { label: "Research Agent", pct: 82, color: "bg-blue-500" },
    { label: "Search Tool", pct: 28, color: "bg-amber-500" },
    { label: "Writer Agent", pct: 68, color: "bg-blue-400" },
    { label: "Summary", pct: 45, color: "bg-violet-500" },
  ];
  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-3">
        {[
          { icon: Zap, val: "14,830", label: "tokens", c: "text-blue-600" },
          { icon: DollarSign, val: "$0.024", label: "cost", c: "text-green-600" },
          { icon: Clock, val: "3.4s", label: "latency", c: "text-amber-600" },
        ].map((k) => (
          <motion.div
            key={k.val}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <k.icon className={`h-3.5 w-3.5 ${k.c}`} />
            <div>
              <p className="text-xs font-bold leading-tight">{k.val}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="space-y-2">
        {bars.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="w-24 text-right text-[11px] font-medium text-muted-foreground">{b.label}</span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${b.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualComparison() {
  const scenarios = [
    { name: "GPT-4o Pipeline", cost: "$0.024", latency: "3.4s", badge: "Cheaper", badgeC: "bg-green-100 text-green-700 border-green-200" },
    { name: "Claude 3.5 Pipeline", cost: "$0.051", latency: "1.8s", badge: "Faster", badgeC: "bg-blue-100 text-blue-700 border-blue-200" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 py-2">
      {scenarios.map((s, i) => (
        <motion.div
          key={s.name}
          className="rounded-xl border border-border/50 bg-card p-3.5"
          initial={{ opacity: 0, x: i === 0 ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.1 }}
        >
          <p className="text-xs font-semibold">{s.name}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <p>Cost: <span className="font-semibold text-foreground">{s.cost}</span></p>
            <p>Latency: <span className="font-semibold text-foreground">{s.latency}</span></p>
          </div>
          <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${s.badgeC}`}>
            {s.badge}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function VisualCriticalPath() {
  const nodes = ["Start", "Research", "Search", "Writer", "Finish"];
  const critical = [1, 3]; // Research, Writer are bottlenecks
  return (
    <div className="space-y-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {nodes.map((n, i) => (
          <div key={i} className="flex items-center gap-1">
            <motion.div
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                critical.includes(i)
                  ? "border border-red-300 bg-red-50 text-red-700"
                  : "border border-border/60 bg-secondary text-muted-foreground"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              {n}
            </motion.div>
            {i < nodes.length - 1 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />}
          </div>
        ))}
      </div>
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <GitFork className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">DAG validated · No cycles detected</span>
      </motion.div>
    </div>
  );
}

function VisualMultiProvider() {
  const models = [
    { name: "GPT-4o", provider: "OpenAI" },
    { name: "Claude 3.5", provider: "Anthropic" },
    { name: "Gemini Pro", provider: "Google" },
    { name: "Llama 3.1", provider: "Meta" },
    { name: "Mistral L", provider: "Mistral" },
    { name: "DeepSeek", provider: "DeepSeek" },
  ];
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {models.map((m, i) => (
        <motion.div
          key={m.name}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.05 + i * 0.05 }}
        >
          <Cpu className="h-3 w-3 text-muted-foreground" />
          <div>
            <p className="text-[11px] font-semibold leading-tight">{m.name}</p>
            <p className="text-[9px] text-muted-foreground leading-tight">{m.provider}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function VisualCloudSync() {
  const items = [
    { name: "Research Pipeline", time: "2 min ago" },
    { name: "Content Generator", time: "12 min ago" },
    { name: "Data Processor", time: "1 hr ago" },
  ];
  return (
    <div className="space-y-2 py-2">
      {items.map((w, i) => (
        <motion.div
          key={w.name}
          className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3.5 py-2"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.1 + i * 0.06 }}
        >
          <div className="flex items-center gap-2.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">{w.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{w.time}</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Tab data: pain → solution pairs ──────────────────────── */
const TABS: TabItem[] = [
  {
    id: "visibility",
    pain: "No visibility into workflow costs",
    painDesc: "You deploy an agent pipeline and the bill arrives weeks later. There's no way to see per-node token usage before going live.",
    solution: "Visual Orchestration + Live Estimation",
    solutionDesc: "Drag-and-drop your entire workflow, assign models, and see real-time cost breakdowns per node — before a single API call is made.",
    icon: Eye,
    accentColor: "bg-blue-500",
    Visual: VisualOrchestration,
  },
  {
    id: "cost",
    pain: "Token costs are a black box",
    painDesc: "With 38+ models across 7 providers, each with different pricing tiers, estimating total cost is practically guesswork.",
    solution: "Token & Cost Estimation Engine",
    solutionDesc: "Our estimator uses tiktoken and real provider pricing to calculate exact token counts, costs, and latency for every node in your graph.",
    icon: DollarSign,
    accentColor: "bg-green-500",
    Visual: VisualCostBreakdown,
  },
  {
    id: "comparison",
    pain: "Can't compare model alternatives",
    painDesc: "Switching from GPT-4o to Claude 3.5 might save money but add latency. There's no easy way to compare before committing.",
    solution: "Scenario Comparison",
    solutionDesc: "Clone your workflow, swap models, and compare side-by-side. See exactly which configuration gives you the best cost-to-performance ratio.",
    icon: Shuffle,
    accentColor: "bg-violet-500",
    Visual: VisualComparison,
  },
  {
    id: "bottlenecks",
    pain: "Hidden bottlenecks tank performance",
    painDesc: "A single slow agent in a chain-of-thought workflow can double your total latency. Finding it requires manual tracing.",
    solution: "Critical Path Analysis",
    solutionDesc: "DAG-aware graph analysis detects bottleneck nodes, highlights the critical path, and identifies cycle risks — automatically.",
    icon: Route,
    accentColor: "bg-red-500",
    Visual: VisualCriticalPath,
  },
  {
    id: "providers",
    pain: "Vendor lock-in and fragmented pricing",
    painDesc: "Every provider has different pricing formats, rate limits, and token counting methods. Comparing across them is a spreadsheet nightmare.",
    solution: "Multi-Provider Support",
    solutionDesc: "OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and Cohere — all pricing data is built in and updated. One tool, every model.",
    icon: Server,
    accentColor: "bg-amber-500",
    Visual: VisualMultiProvider,
  },
  {
    id: "persistence",
    pain: "Workflows lost between sessions",
    painDesc: "You spend an hour building the perfect pipeline, close the tab, and it's gone. Local storage isn't reliable enough for real work.",
    solution: "Cloud Persistence",
    solutionDesc: "Sign in with Google or GitHub. Every workflow is auto-saved to the cloud with row-level security. Pick up exactly where you left off.",
    icon: CloudUpload,
    accentColor: "bg-teal-500",
    Visual: VisualCloudSync,
  },
];

/* ═══════════════════════════════════════════════════════════
   Problem Statement Banner
   ═══════════════════════════════════════════════════════════ */

export function ProblemBanner() {
  return (
    <section className="border-y border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Agentic AI is booming.
            <br />
            <span className="text-muted-foreground">But nobody knows what it costs.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Millions of multi-agent workflows are being deployed every day across
            GPT-4o, Claude, Gemini, and dozens more models. But understanding the
            real cost, latency, and bottleneck constraints of these pipelines?
            That&apos;s still guesswork. Teams ship workflows blind and deal with
            surprise bills after.
          </p>
          <motion.div
            className="mx-auto mt-8 flex max-w-lg flex-wrap items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {[
              "Unpredictable costs",
              "Hidden bottlenecks",
              "No model comparison",
              "Vendor lock-in",
              "Lost workflows",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-red-200/80 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
              >
                {tag}
              </span>
            ))}
          </motion.div>

          <motion.p
            className="mt-8 text-sm font-semibold text-foreground sm:text-base"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
          >
            Agentic Flow fixes this. Here&apos;s how ↓
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   Tabbed Cause & Effect Section
   ═══════════════════════════════════════════════════════════ */

export function CauseAndEffect() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const tab = TABS[active];

  return (
    <section
      id="features"
      ref={ref}
      className="mx-auto max-w-5xl px-4 py-20 sm:px-6"
    >
      {/* Header */}
      <motion.div
        className="mb-12 text-center"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pain point → Solution
        </p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Every problem has an answer
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
          Click a challenge to see how Agentic Flow solves it — with real output previews.
        </p>
      </motion.div>

      {/* Tab buttons */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {TABS.map((t, i) => {
          const isActive = i === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "border-foreground/20 bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.id === "visibility" ? "Visibility" : t.id === "cost" ? "Costs" : t.id === "comparison" ? "Comparison" : t.id === "bottlenecks" ? "Bottlenecks" : t.id === "providers" ? "Providers" : "Persistence"}</span>
            </button>
          );
        })}
      </div>

      {/* Cause → Effect card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
        >
          <div className="grid md:grid-cols-2">
            {/* Left: the pain */}
            <div className="border-b border-border/60 p-6 sm:p-8 md:border-b-0 md:border-r">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-red-600">
                  The Problem
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-snug">{tab.pain}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tab.painDesc}
              </p>
            </div>

            {/* Right: the solution */}
            <div className="p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${tab.accentColor}/10`}>
                  <CheckCircle2 className={`h-3 w-3 ${tab.accentColor.replace("bg-", "text-")}`} />
                </span>
                <span className={`text-xs font-semibold uppercase tracking-widest ${tab.accentColor.replace("bg-", "text-")}`}>
                  Our Solution
                </span>
              </div>
              <h3 className="text-lg font-semibold leading-snug">{tab.solution}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tab.solutionDesc}
              </p>
            </div>
          </div>

          {/* Visual preview strip */}
          <div className="border-t border-border/60 bg-secondary/20 px-6 py-4 sm:px-8">
            <tab.Visual />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* CTA below the card */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <a
          href="/editor"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:opacity-70"
        >
          Try it yourself on the canvas
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </motion.div>
    </section>
  );
}
