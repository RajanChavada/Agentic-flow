"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";
import UpgradeModal from "@/components/UpgradeModal";
import { useGate, type GateTrigger } from "@/hooks/useGate";

const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === "true";

export default function PricingPage() {
  const { theme } = useUIState();
  const isDark = theme === "dark";
  const [upgradeTrigger, setUpgradeTrigger] = useState<GateTrigger | null>(null);

  const openUpgrade = (trigger: GateTrigger) => setUpgradeTrigger(trigger);
  const closeUpgrade = () => setUpgradeTrigger(null);

  const { isGated: isProGated } = useGate("scenario_comparison");

  const tiers = [
    {
      name: "Free",
      id: "free",
      price: "$0",
      period: "forever",
      description: "Perfect for exploring and simple workflows.",
      features: [
        "3 saved canvases",
        "Basic token/latency estimates",
        "JSON export",
        "Community support",
      ],
      cta: "Get Started",
      ctaAction: "/signup",
      highlight: false,
    },
    {
      name: "Starter",
      id: "starter",
      price: "$9",
      period: "/month",
      description: "Essential tools for growing workflow designers.",
      features: [
        "10 saved canvases",
        "Full dashboard with charts",
        "Shareable links",
        "Basic export (PNG, SVG)",
        "Standard support",
      ],
      cta: "Upgrade to Starter",
      ctaAction: "#",
      highlight: false,
      icon: <Zap className="h-5 w-5 text-primary" />,
    },
    {
      name: "Pro",
      id: "pro",
      price: "$29",
      period: "/month",
      description: "For professionals building production AI systems.",
      features: [
        "50 saved canvases",
        "Everything in Starter",
        "Advanced export (PDF, Markdown)",
        "What-if scaling analysis",
        "Scenario comparison",
        "LangGraph code export",
        "Priority support",
      ],
      cta: isProGated && PAYWALL_ENABLED ? "Upgrade to Pro" : "Get Started",
      ctaAction: isProGated && PAYWALL_ENABLED ? "#" : "/signup",
      highlight: true,
      icon: <Crown className="h-5 w-5 text-primary" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                NV
              </div>
              <span className="text-lg">Neurovn</span>
            </a>
            <div className="flex items-center gap-6">
              <a
                href="/"
                className="text-sm font-medium text-muted-foreground transition hover:text-primary"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="mt-6 text-xl text-muted-foreground text-balance">
            Choose the plan that fits your workflow design needs. All plans include our core estimation engine.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col rounded-[2.5rem] border p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1",
                  tier.highlight
                    ? "border-primary/40 bg-card shadow-xl shadow-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 bg-card/40"
                )}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg tracking-wide">
                      <Sparkles className="h-3.5 w-3.5" />
                      MOST POPULAR
                    </span>
                  </div>
                )}
                
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    {tier.icon && <div className="p-2 rounded-xl bg-primary/5">{tier.icon}</div>}
                    <h3 className={cn(
                      "text-xl font-bold uppercase tracking-widest",
                      tier.highlight ? "text-primary" : "text-muted-foreground"
                    )}>
                      {tier.name}
                    </h3>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground font-medium">{tier.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground/80 font-medium h-10 overflow-hidden">
                    {tier.description}
                  </p>
                </div>

                <ul className="flex-1 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        tier.highlight ? "bg-primary/10" : "bg-secondary/50"
                      )}>
                        <Check className={cn(
                          "h-3.5 w-3.5",
                          tier.highlight ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="text-sm font-semibold text-foreground/80">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <button
                    onClick={() => {
                      if (tier.id === "free") {
                        window.location.href = tier.ctaAction;
                      } else {
                        // For starter and pro, open upgrade modal with specific tier intent
                        // We'll need to update UpgradeModal to support this
                        openUpgrade(tier.id === "starter" ? "canvas_limit" : "scenario_comparison");
                      }
                    }}
                    className={cn(
                      "group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-4 font-bold transition-all duration-300 active:scale-95",
                      tier.highlight
                        ? "bg-primary text-primary-foreground hover:shadow-xl hover:shadow-primary/20"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    <span>{tier.cta}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upgrade Modal */}
      {upgradeTrigger && (
        <UpgradeModal
          isOpen={!!upgradeTrigger}
          onClose={closeUpgrade}
          trigger={upgradeTrigger}
        />
      )}
    </div>
  );
}
