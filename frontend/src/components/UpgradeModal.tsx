"use client";

import React, { useState, useCallback, useMemo } from "react";
import { X, Crown, Check, Sparkles, Zap } from "lucide-react";
import { useUIState } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";
import { GATE_CONFIGS, type GateTrigger } from "@/hooks/useGate";
import { supabase } from "@/lib/supabase";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trigger: GateTrigger;
}

export default function UpgradeModal({ isOpen, onClose, trigger }: Props) {
  const { theme } = useUIState();
  const isDark = theme === "dark";

  const [isLoading, setIsLoading] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = GATE_CONFIGS[trigger];

  // Map trigger to recommended tier (some features only need Starter)
  const recommendedTier = useMemo(() => {
    const starterTriggers: GateTrigger[] = ["canvas_limit", "export_advanced", "full_dashboard"];
    return starterTriggers.includes(trigger) ? "starter" : "pro";
  }, [trigger]);

  const handleUpgrade = useCallback(async (tier: "starter" | "pro") => {
    setIsLoading(true);
    setLoadingTier(tier);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please log in to upgrade");
      }

      const priceId = tier === "starter" 
        ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID 
        : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;

      if (!priceId) {
        throw new Error(`${tier.toUpperCase()} price ID not configured`);
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/stripe/create-checkout-session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          priceId,
          userId: user.id,
          frontendUrl: typeof window !== "undefined" ? window.location.origin : undefined
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Failed to create checkout session" }));
        throw new Error(errData.detail || "Failed to create checkout session");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsLoading(false);
      setLoadingTier(null);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-2xl rounded-3xl border p-0 shadow-2xl overflow-hidden transition-all",
          isDark ? "border-slate-800 bg-slate-900" : "border-border/60 bg-white"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-8 pb-4 text-center">
          <button
            onClick={onClose}
            className={cn(
              "absolute right-6 top-6 rounded-xl p-2 transition-colors",
              isDark ? "hover:bg-slate-800" : "hover:bg-secondary"
            )}
            disabled={isLoading}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{config.title}</h2>
              <p className="text-sm text-balance text-muted-foreground">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Body – Tier selection */}
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Starter tier */}
            <div
              className={cn(
                "relative rounded-2xl border p-6 flex flex-col",
                recommendedTier === "starter" ? "border-primary/40 bg-primary/5 shadow-inner" : "border-border/60 bg-card/40"
              )}
            >
              {recommendedTier === "starter" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</span>
                </div>
              )}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-foreground">Starter</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-3 text-sm mb-8 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">10 saved canvases</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Full dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Shareable links</span>
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade("starter")}
                disabled={isLoading}
                className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                  recommendedTier === "starter" ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {loadingTier === "starter" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Choose Starter"
                )}
              </button>
            </div>

            {/* Pro tier */}
            <div
              className={cn(
                "relative rounded-2xl border p-6 flex flex-col",
                recommendedTier === "pro" ? "border-primary/40 bg-primary/5 shadow-inner" : "border-border/60 bg-card/40"
              )}
            >
              {recommendedTier === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</span>
                </div>
              )}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-foreground">Pro</h3>
                </div>
                <p className="text-2xl font-bold text-foreground">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-3 text-sm mb-8 flex-1">
                <li className="flex items-start gap-2 text-primary font-medium">
                  <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">50 saved canvases</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">Code export</span>
                </li>
              </ul>
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={isLoading}
                className={cn(
                  "w-full py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2",
                  recommendedTier === "pro" ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {loadingTier === "pro" ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  "Choose Pro"
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-center text-sm font-bold text-red-500">{error}</p>
          )}

          <p className="mt-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
