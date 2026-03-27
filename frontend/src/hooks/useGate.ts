"use client";

import { useCallback } from "react";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import type { TierFeatures } from "@/store/types";

export type GateTrigger =
  | "canvas_limit"
  | "share_links"
  | "full_dashboard"
  | "scaling_analysis"
  | "export_advanced"
  | "scenario_comparison"
  | "export_code"
  | "marketplace_publish";

interface GateConfig {
  title: string;
  description: string;
  feature?: keyof TierFeatures; // for boolean features
  checkCanvasLimit?: boolean; // only for canvas_limit
}

export const GATE_CONFIGS: Record<GateTrigger, GateConfig> = {
  canvas_limit: {
    title: "Canvas limit reached",
    description: "You've reached your maximum number of saved canvases. Upgrade to create more workflows.",
    checkCanvasLimit: true,
  },
  share_links: {
    title: "Share links require Pro",
    description: "Generate shareable links to your workflows with Pro or Team plans.",
    feature: "share_links",
  },
  full_dashboard: {
    title: "Full Dashboard requires Pro",
    description: "Unlock detailed cost breakdowns, bottleneck analysis, and advanced charts.",
    // No boolean feature; this is a string comparison on dashboard_level
  },
  scaling_analysis: {
    title: "Scaling Analysis requires Pro",
    description: "See cost and latency projections at scale with what-if analysis.",
    feature: "scaling_analysis",
  },
  export_advanced: {
    title: "Advanced Export requires Pro",
    description: "Export your workflows as PNG, SVG, PDF, or Markdown for sharing and presentations.",
    feature: "export_pdf", // gate on any advanced export; all are booleans
  },
  scenario_comparison: {
    title: "Scenario Comparison requires Pro",
    description: "Compare multiple workflow variants side-by-side to optimize your design.",
    feature: "scenario_comparison",
  },
  export_code: {
    title: "Code Export requires Pro",
    description: "Export your workflow as production-ready LangGraph Python code.",
    feature: "export_code",
  },
  marketplace_publish: {
    title: "Marketplace Publish requires Pro",
    description: "Publish your workflows to the marketplace to reach other users.",
    feature: "marketplace_publish",
  },
};

export interface GateResult {
  isGated: boolean;
  trigger: GateTrigger | null;
  onUpgrade: () => void;
  config: GateConfig | null;
}

/**
 * Determines if a feature is enabled based on paywall and features object.
 */
function isFeatureAllowed(features: TierFeatures, featureKey: keyof TierFeatures): boolean {
  if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") {
    return true;
  }
  const val = features[featureKey];
  if (typeof val === "boolean") return val;
  // For non-boolean features (e.g., dashboard_level), deny by default unless explicitly handled elsewhere
  return false;
}

/**
 * Determines if canvas limit is reached.
 */
function isCanvasLimitReached(features: TierFeatures, canvasCount: number): boolean {
  if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") {
    return false;
  }
  const limit = features.canvas_limit;
  if (limit === -1) return false;
  return canvasCount >= limit;
}

/**
 * Main hook to check if a feature is gated.
 */
export function useGate(
  trigger: GateTrigger,
  options?: { canvasCount?: number }
): GateResult {
  const { features } = useSubscriptionStore();
  const config = GATE_CONFIGS[trigger];

  let isGated = false;

  if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") {
    isGated = false;
  } else {
    switch (trigger) {
      case "canvas_limit":
        isGated = options?.canvasCount !== undefined
          ? isCanvasLimitReached(features, options.canvasCount)
          : false; // Without canvasCount, cannot determine; default false
        break;
      case "full_dashboard":
        // Full dashboard requires dashboard_level === "full"
        isGated = features.dashboard_level !== "full";
        break;
      default:
        if (config.feature) {
          isGated = !isFeatureAllowed(features, config.feature);
        } else {
          isGated = false;
        }
        break;
    }
  }

  const onUpgrade = useCallback(() => {
    // Component provides its own handler (e.g., setShowUpgradeModal(true))
  }, []);

  return {
    isGated,
    trigger: isGated ? trigger : null,
    onUpgrade,
    config: isGated ? config : null,
  };
}

/**
 * Convenience: check canvas limit directly.
 */
export function useCanvasLimitGate(canvasCount: number): boolean {
  const { features } = useSubscriptionStore();
  return isCanvasLimitReached(features, canvasCount);
}

/**
 * Alias for useCanvasLimitGate.
 */
export const useIsAtCanvasLimit = useCanvasLimitGate;

/**
 * Convenience: check a single feature.
 */
export function useFeatureGate(feature: keyof TierFeatures): boolean {
  const { features } = useSubscriptionStore();
  return !isFeatureAllowed(features, feature);
}

/**
 * Get remaining canvas slots.
 */
export function useRemainingSlots(canvasCount: number): number {
  const { features } = useSubscriptionStore();
  const limit = features.canvas_limit;
  if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") return Infinity;
  if (limit === -1) return Infinity;
  return Math.max(0, limit - canvasCount);
}
