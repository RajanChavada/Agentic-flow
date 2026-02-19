"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Github,
} from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import InfiniteGrid from "@/components/ui/infinite-grid";
import HowItWorks from "@/components/landing/HowItWorks";
import {
  ProblemStatement,
  FeatureJourney,
  ProvidersStrip,
} from "@/components/landing/ScrollJourney";
import { useAuthStore } from "@/store/useAuthStore";
import AuthModal from "@/components/AuthModal";
import { FooterSection } from "@/components/ui/footer-section";

/* Lazy-load the heavy playground (React Flow) so it doesn't block FCP */
const PlaygroundPreview = lazy(
  () => import("@/components/landing/PlaygroundPreview"),
);

/* ── Animated counter ─────────────────────────────────────── */
function Counter({
  value,
  suffix = "",
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const dur = 1000;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const p = Math.min((now - start) / dur, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <span className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
        {count}
        {suffix}
      </span>
      <p className="mt-2 text-sm font-medium uppercase tracking-widest text-muted-foreground sm:text-base">
        {label}
      </p>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  useEffect(() => {
    const unsub = useAuthStore.getState().init();
    return unsub;
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-[10px] font-bold text-background">
              AF
            </div>
            <span className="hidden sm:inline">Agentic Flow</span>
          </a>

          <div className="flex items-center gap-5 text-sm">
            <a href="#features" className="hidden text-muted-foreground transition hover:text-foreground sm:inline">
              Features
            </a>
            <a href="#how-it-works" className="hidden text-muted-foreground transition hover:text-foreground sm:inline">
              How It Works
            </a>
            <a
              href="https://github.com/RajanChavada/Agentic-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
            <a
              href="/editor"
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition hover:opacity-90"
            >
              Launch Canvas
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero (infinite grid bg) + playground ───────── */}
      <InfiniteGrid className="flex flex-col items-center justify-center px-4 pb-16 pt-20 sm:pb-20 sm:pt-28">
        {/* Soft gradient orbs */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute right-[-12%] top-[-16%] h-[45%] w-[45%] rounded-full bg-orange-400/15 blur-[120px]" />
          <div className="absolute left-[-8%] bottom-[-18%] h-[40%] w-[40%] rounded-full bg-amber-400/15 blur-[120px]" />
        </div>

        <motion.div
          className="relative z-10 mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div
            className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Open-source workflow designer
          </motion.div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Design agentic workflows.
            <br />
            <span className="text-muted-foreground">See the cost before you ship.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg md:text-xl">
            A visual canvas for composing multi-agent AI systems. Estimate token
            usage, latency, and cost across providers — in real time.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/editor"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-7 py-2.5 text-sm font-medium text-background shadow-sm transition hover:opacity-90"
            >
              Get Started — It&apos;s Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-7 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-secondary"
            >
              See How It Works
            </a>
          </div>
        </motion.div>

        {/* Playground embedded directly in hero */}
        <motion.div
          className="relative z-10 mt-14 w-full max-w-4xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <ReactFlowProvider>
            <Suspense
              fallback={
                <div className="flex h-96 items-center justify-center rounded-2xl border border-border bg-card">
                  <span className="text-sm text-muted-foreground">Loading playground…</span>
                </div>
              }
            >
              <PlaygroundPreview />
            </Suspense>
          </ReactFlowProvider>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Drag nodes around and hit <strong>Run Estimate</strong> — this is a live demo.{" "}
            <a href="/editor" className="underline underline-offset-2 transition hover:text-foreground">
              Open the full editor →
            </a>
          </p>
        </motion.div>
      </InfiniteGrid>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="border-y border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12 px-4 py-14 sm:gap-20 sm:py-16">
          <Counter value={38} suffix="+" label="Models" />
          <Counter value={7} label="Providers" />
          <Counter value={4} label="Node Types" />
          <Counter value={10} suffix="ms" label="Avg Estimate" />
        </div>
      </section>

      {/* ── Problem Statement ──────────────────────────── */}
      <ProblemStatement />

      {/* ── How It Works (Lindy-inspired animated) ─────── */}
      <HowItWorks />

      {/* ── Feature Journey — full-width scroll blocks ──── */}
      <FeatureJourney />

      {/* ── Providers / Integrations strip ────────────── */}
      <ProvidersStrip />

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:py-32">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            Ready to build smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground sm:text-lg">
            Start designing agentic workflows in seconds — no sign-up required.
          </p>
          <a
            href="/editor"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-8 py-3 text-base font-medium text-background shadow-sm transition hover:opacity-90 sm:text-lg"
          >
            Launch Canvas
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <FooterSection />

      <AuthModal />
    </main>
  );
}
