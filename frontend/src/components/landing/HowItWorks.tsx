"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  MousePointerClick,
  Cpu,
  BarChart3,
  Play,
  Brain,
  Wrench,
  Flag,
  ArrowRight,
  Zap,
  DollarSign,
  Clock,
  GitFork,
  CheckCircle2,
} from "lucide-react";

/* ─── Step data ───────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    title: "Design Your Workflow",
    desc: "Drag Start, Agent, Tool, and Finish nodes onto an infinite canvas. Connect them visually to define data flow — no code required.",
    accent: "bg-green-500",
    accentText: "text-green-600",
  },
  {
    n: "02",
    title: "Connect With AI Models",
    desc: "Assign models to each agent — GPT-4o, Claude 3.5, Gemini, and more. Mix providers in a single workflow to optimise cost.",
    accent: "bg-blue-500",
    accentText: "text-blue-600",
  },
  {
    n: "03",
    title: "Estimate & Ship",
    desc: "Hit estimate and get a full cost report: token breakdown, latency analysis, critical path, and per-node cost — in milliseconds.",
    accent: "bg-amber-500",
    accentText: "text-amber-600",
  },
] as const;

/* ─── Step 1 illustration: drag-and-drop nodes ────────────── */
function Step1Illustration() {
  const nodeTypes = [
    { icon: Play, label: "Start", color: "bg-green-500", bg: "bg-green-50" },
    { icon: Brain, label: "Agent", color: "bg-blue-500", bg: "bg-blue-50" },
    { icon: Wrench, label: "Tool", color: "bg-orange-500", bg: "bg-orange-50" },
    { icon: Flag, label: "Finish", color: "bg-red-500", bg: "bg-red-50" },
  ];

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 p-6">
      {/* Sidebar mock */}
      <div className="flex items-center gap-3">
        {nodeTypes.map((n, i) => (
          <motion.div
            key={n.label}
            className={`flex flex-col items-center gap-1.5 rounded-xl border border-border/60 ${n.bg} px-4 py-3 shadow-sm`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.15 + i * 0.1 }}
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${n.color} text-white`}>
              <n.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">{n.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Animated "drag" cursor */}
      <motion.div
        className="flex items-center gap-1.5 text-muted-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7 }}
      >
        <MousePointerClick className="h-4 w-4" />
        <span className="text-xs font-medium">Drag nodes onto canvas</span>
      </motion.div>

      {/* Mini flow preview */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        {[
          { icon: Play, c: "text-green-600 border-green-300" },
          { icon: Brain, c: "text-blue-600 border-blue-300" },
          { icon: Wrench, c: "text-amber-600 border-amber-300" },
          { icon: Flag, c: "text-red-500 border-red-300" },
        ].map((n, i) => (
          <React.Fragment key={i}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-card shadow-sm ${n.c}`}>
              <n.icon className="h-4 w-4" />
            </div>
            {i < 3 && (
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.0 + i * 0.15 }}
              >
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Step 2 illustration: model picker ───────────────────── */
function Step2Illustration() {
  const models = [
    { name: "GPT-4o", provider: "OpenAI", active: true },
    { name: "Claude 3.5", provider: "Anthropic", active: false },
    { name: "Gemini Pro", provider: "Google", active: false },
    { name: "Llama 3.1", provider: "Meta", active: false },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      {/* Agent node card */}
      <motion.div
        className="w-56 rounded-xl border-2 border-blue-300 bg-blue-50 p-3 shadow-sm"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold text-gray-800">Research Agent</span>
        </div>
      </motion.div>

      {/* Model options */}
      <div className="grid grid-cols-2 gap-2">
        {models.map((m, i) => (
          <motion.div
            key={m.name}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              m.active
                ? "border-blue-400 bg-blue-50 text-blue-700 shadow-sm"
                : "border-border/60 bg-card text-muted-foreground"
            }`}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.4 + i * 0.08 }}
          >
            <Cpu className="h-3 w-3 shrink-0" />
            <div>
              <p className="font-semibold leading-tight">{m.name}</p>
              <p className="text-[10px] opacity-70">{m.provider}</p>
            </div>
            {m.active && <CheckCircle2 className="h-3 w-3 ml-auto text-blue-500" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Step 3 illustration: report preview ─────────────────── */
function Step3Illustration() {
  const bars = [
    { label: "Research", pct: 85, color: "bg-blue-500" },
    { label: "Writer", pct: 100, color: "bg-blue-400" },
    { label: "Search", pct: 25, color: "bg-amber-500" },
    { label: "Summary", pct: 60, color: "bg-blue-300" },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      {/* KPI chips */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        {[
          { icon: Zap, val: "14,830", label: "tokens", c: "text-blue-600" },
          { icon: DollarSign, val: "$0.025", label: "cost", c: "text-green-600" },
          { icon: Clock, val: "3.4s", label: "latency", c: "text-amber-600" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 shadow-sm"
          >
            <kpi.icon className={`h-3.5 w-3.5 ${kpi.c}`} />
            <div>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="text-xs font-bold">{kpi.val}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Bar chart */}
      <div className="w-full max-w-xs space-y-2">
        {bars.map((b, i) => (
          <motion.div
            key={b.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <span className="w-16 text-right text-[10px] font-medium text-muted-foreground">
              {b.label}
            </span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${b.color}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${b.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* DAG badge */}
      <motion.div
        className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9 }}
      >
        <GitFork className="h-3 w-3 text-green-600" />
        <span className="text-[10px] font-semibold text-green-700">DAG validated · No cycles</span>
      </motion.div>
    </div>
  );
}

const ILLUSTRATIONS = [Step1Illustration, Step2Illustration, Step3Illustration];

/* ═══════════════════════════════════════════════════════════
   HowItWorks — Gumloop-inspired tabbed layout
   ═══════════════════════════════════════════════════════════ */

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  /* Start / restart the auto-cycle timer */
  const restartTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setActive((p) => (p + 1) % 3), 4500);
  };

  /* Auto-cycle through steps every 4.5s once in view */
  useEffect(() => {
    if (!inView) return;
    restartTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [inView]);

  /* Reset timer whenever active step changes (e.g. on hover) */
  const handleHover = (i: number) => {
    setActive(i);
    if (inView) restartTimer();
  };

  const Illustration = ILLUSTRATIONS[active];

  return (
    <section id="how-it-works" ref={ref} className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      {/* Header */}
      <motion.div
        className="mb-16 text-center sm:mb-20"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-sm">
          How It Works
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          Three steps to smarter workflows
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
          Design, connect, and estimate — all from a visual canvas.
        </p>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        {/* Left: illustration card */}
        <motion.div
          className="relative flex h-96 items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-secondary/30 sm:h-112"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Step number badge */}
          <div className="absolute left-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
            {active + 1}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="w-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <Illustration />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right: step list — fixed min-h to prevent layout shift */}
        <div className="flex min-h-96 flex-col justify-center gap-4 sm:min-h-112">
          {STEPS.map((step, i) => {
            const isActive = i === active;
            return (
              <motion.button
                key={step.n}
                onMouseEnter={() => handleHover(i)}
                className={`group relative w-full rounded-xl border p-5 text-left transition-all ${
                  isActive
                    ? "border-border bg-card shadow-sm"
                    : "border-transparent hover:border-border/40 hover:bg-card/50"
                }`}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.08 }}
              >
                {/* Progress bar on active */}
                {isActive && (
                  <motion.div
                    className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${step.accent}`}
                    layoutId="stepIndicator"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                      isActive
                        ? `${step.accent} text-white`
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {step.n}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold leading-snug sm:text-lg">{step.title}</h3>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p
                          className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          {step.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
