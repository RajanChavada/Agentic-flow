import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { TierId, TierFeatures } from "./types";
import { FREE_FEATURES } from "./types";

export const useSubscriptionStore = create<{
  tier: TierId;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  features: TierFeatures;
  isLoading: boolean;
  fetchSubscription: (userId: string) => Promise<void>;
  canUseFeature: (feature: keyof TierFeatures) => boolean;
  isAtCanvasLimit: (currentCount: number) => boolean;
}>((set, get) => ({
  tier: "free",
  status: "active",
  currentPeriodEnd: null,
  stripeCustomerId: null,
  features: FREE_FEATURES,
  isLoading: false,

  fetchSubscription: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select(`
          tier_id,
          status,
          current_period_end,
          stripe_customer_id,
          subscription_tiers (features)
        `)
        .eq("user_id", userId)
        .single();

      if (data) {
        set({
          tier: data.tier_id as TierId,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          stripeCustomerId: data.stripe_customer_id,
          features: (data.subscription_tiers as any)?.features ?? FREE_FEATURES,
        });
      }
    } catch {
      set({ tier: "free", features: FREE_FEATURES });
    } finally {
      set({ isLoading: false });
    }
  },

  canUseFeature: (feature: keyof TierFeatures) => {
    const { features, tier } = get();
    if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") return true;
    const val = features[feature];
    if (typeof val === "boolean") return val;
    return true; // for numeric/string features, allow
  },

  isAtCanvasLimit: (currentCount: number) => {
    const { features } = get();
    if (process.env.NEXT_PUBLIC_PAYWALL_ENABLED !== "true") return false;
    if (features.canvas_limit === -1) return false;
    return currentCount >= features.canvas_limit;
  },
}));
