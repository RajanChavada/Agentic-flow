Feature Branch Strategy
Yes, exactly right. Create a branch called feature/stripe-integration and keep it completely separate from main until you're ready to flip the switch. The paywall gating in particular should be behind a feature flag so you can deploy the Stripe plumbing to production without activating the gates:
# Neurovn — Stripe Integration Specification

> Full-stack billing implementation: Next.js + FastAPI + Supabase + Stripe  
> Status: Feature branch `feature/stripe-integration` — deploy without activating paywall  
> Paywall activation: controlled by `NEXT_PUBLIC_PAYWALL_ENABLED` env var (default: false)  
> Version: 1.0 — March 2026

---

## 1. Tier Structure

### 1.1 Tiers

| Tier | Price | Stripe Mode | Canvas Limit | Dashboard | Share Links | Scaling | Export | Comparison | Code Export | Marketplace Publish |
|------|-------|-------------|--------------|-----------|-------------|---------|--------|------------|-------------|---------------------|
| `free` | $0 | — | 3 | Basic | ❌ | ❌ | PNG/JSON only | ❌ | ❌ | ❌ |
| `starter` | $9/mo | subscription | 15 | Full | ✅ | ✅ | PDF/CSV/MD | ❌ | ❌ | ✅ |
| `pro` | $19/mo | subscription | Unlimited | Full | ✅ | ✅ | All | ✅ | ✅ | ✅ |

### 1.2 Dashboard Level Definitions

**Basic (Free):**
- Total tokens, total cost, total latency
- Per-node breakdown table (node name, model, cost, latency)
- Graph type (DAG/Cyclic)

**Full (Starter+):**
- Everything in Basic
- Health score (A–F grade)
- Bottleneck severity flags
- Model mix donut chart
- Critical path visualization
- Loop risk badges
- Parallelism analysis
- Scaling & what-if slider (runs/day projections)
- Sensitivity analysis (min/avg/max ranges)

### 1.3 Feature Flag (Gate Everything Behind This)

```typescript
// frontend/src/lib/flags.ts
export const PAYWALL_ENABLED = 
  process.env.NEXT_PUBLIC_PAYWALL_ENABLED === 'true'

// Usage:
import { PAYWALL_ENABLED } from '@/lib/flags'
{PAYWALL_ENABLED && userTier === 'free' && <UpgradePrompt />}
```

Set `NEXT_PUBLIC_PAYWALL_ENABLED=false` in Vercel env vars until ready to activate.

---

## 2. Architecture

### 2.1 Stack

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Frontend | Next.js + `@stripe/stripe-js` | Checkout redirect, Portal link, pricing page, UI gating |
| Backend | FastAPI | Webhook handler (signature verification, Supabase writes) |
| Database | Supabase (Postgres) | `subscription_tiers`, `subscriptions` tables with RLS |
| Payments | Stripe | Products, Prices, Checkout, Customer Portal, Webhooks |

### 2.2 Data Flow

```
User clicks Upgrade
       ↓
POST /api/stripe/create-checkout-session
       ↓
Stripe Checkout (hosted page)
       ↓
User pays
       ↓
Stripe fires checkout.session.completed webhook
       ↓
POST /api/stripe/webhook (FastAPI)
  - Verify signature
  - Write to Supabase subscriptions table
       ↓
Frontend useSubscriptionStore fetches updated tier
       ↓
UI gates update
```

### 2.3 Webhook Events to Handle

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update `subscriptions` row, link `stripe_customer_id` |
| `customer.subscription.updated` | Update `tier_id`, `status`, `current_period_end` |
| `customer.subscription.deleted` | Set `tier_id = 'free'`, `status = 'cancelled'` |
| `invoice.payment_failed` | Optional: flag status for grace period handling |

---

## 3. Database Schema

### 3.1 Migration — `007_stripe_subscriptions.sql`

```sql
-- Subscription tiers lookup table
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  stripe_price_id TEXT,
  features JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed tiers
INSERT INTO subscription_tiers (id, name, stripe_price_id, features, sort_order) VALUES
(
  'free', 'Free', NULL,
  '{
    "canvas_limit": 3,
    "dashboard_level": "basic",
    "share_links": false,
    "scaling_analysis": false,
    "export_pdf": false,
    "export_csv": false,
    "export_markdown": false,
    "export_code": false,
    "scenario_comparison": false,
    "marketplace_publish": false
  }',
  0
),
(
  'starter', 'Starter', 'price_REPLACE_WITH_STRIPE_PRICE_ID',
  '{
    "canvas_limit": 15,
    "dashboard_level": "full",
    "share_links": true,
    "scaling_analysis": true,
    "export_pdf": true,
    "export_csv": true,
    "export_markdown": true,
    "export_code": false,
    "scenario_comparison": false,
    "marketplace_publish": true
  }',
  1
),
(
  'pro', 'Pro', 'price_REPLACE_WITH_STRIPE_PRICE_ID',
  '{
    "canvas_limit": -1,
    "dashboard_level": "full",
    "share_links": true,
    "scaling_analysis": true,
    "export_pdf": true,
    "export_csv": true,
    "export_markdown": true,
    "export_code": true,
    "scenario_comparison": true,
    "marketplace_publish": true
  }',
  2
);

-- Per-user subscription state (synced from Stripe webhooks)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  tier_id TEXT NOT NULL REFERENCES subscription_tiers(id) DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
CREATE INDEX subscriptions_stripe_sub_idx ON subscriptions(stripe_subscription_id);

-- RLS: users can only see their own subscription
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role bypass for webhook writes (no user session during webhook)
-- Webhooks use SUPABASE_SERVICE_ROLE_KEY, not the anon key
```

---

## 4. Environment Variables

### 4.1 Backend (Render — `render.yaml` or Render Dashboard)

```bash
STRIPE_SECRET_KEY=sk_live_...          # sk_test_... for test mode
STRIPE_WEBHOOK_SECRET=whsec_...        # from Stripe Dashboard > Webhooks
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # service role key — bypasses RLS for webhook writes
```

### 4.2 Frontend (Vercel Dashboard)

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...   # pk_test_... for test mode
NEXT_PUBLIC_PAYWALL_ENABLED=false                 # flip to true when ready to activate
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
```

### 4.3 `.env.example` (commit this, not the actual values)

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
NEXT_PUBLIC_PAYWALL_ENABLED=false
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_starter
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_pro

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 5. Backend Implementation

### 5.1 Install

```bash
pip install stripe
```

Add to `requirements.txt`:
```
stripe>=7.0.0
```

### 5.2 Webhook Handler — `backend/routes/stripe.py`

```python
"""Stripe webhook handler.

CRITICAL: The raw request body must be read BEFORE any middleware
parses it. Stripe signature verification requires the exact bytes.
"""

import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from supabase import create_client

router = APIRouter()

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]

# Use service role key — bypasses RLS for webhook writes
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)

PRICE_TO_TIER = {
    os.environ.get("STRIPE_STARTER_PRICE_ID", ""): "starter",
    os.environ.get("STRIPE_PRO_PRICE_ID", ""): "pro",
}


@router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    # Read raw body — required for signature verification
    body = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(body, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(data)

    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data)

    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data)

    elif event_type == "invoice.payment_failed":
        _handle_payment_failed(data)

    return {"status": "ok"}


def _handle_checkout_completed(session: dict):
    """Create or update subscription row after successful checkout."""
    user_id = session.get("metadata", {}).get("user_id")
    stripe_customer_id = session.get("customer")
    stripe_subscription_id = session.get("subscription")

    if not all([user_id, stripe_customer_id, stripe_subscription_id]):
        return

    # Retrieve the subscription to get the price/tier
    sub = stripe.Subscription.retrieve(stripe_subscription_id)
    price_id = sub["items"]["data"][0]["price"]["id"]
    tier_id = PRICE_TO_TIER.get(price_id, "free")
    current_period_end = sub["current_period_end"]

    # Upsert — idempotent on stripe_subscription_id
    supabase.table("subscriptions").upsert({
        "user_id": user_id,
        "stripe_customer_id": stripe_customer_id,
        "stripe_subscription_id": stripe_subscription_id,
        "tier_id": tier_id,
        "status": "active",
        "current_period_end": current_period_end,
    }, on_conflict="stripe_subscription_id").execute()


def _handle_subscription_updated(sub: dict):
    """Sync tier and period when subscription changes."""
    stripe_subscription_id = sub["id"]
    price_id = sub["items"]["data"][0]["price"]["id"]
    tier_id = PRICE_TO_TIER.get(price_id, "free")

    supabase.table("subscriptions").update({
        "tier_id": tier_id,
        "status": sub["status"],
        "current_period_end": sub["current_period_end"],
    }).eq("stripe_subscription_id", stripe_subscription_id).execute()


def _handle_subscription_deleted(sub: dict):
    """Downgrade to free when subscription is cancelled."""
    stripe_subscription_id = sub["id"]

    supabase.table("subscriptions").update({
        "tier_id": "free",
        "status": "cancelled",
        "stripe_subscription_id": None,
        "current_period_end": None,
    }).eq("stripe_subscription_id", stripe_subscription_id).execute()


def _handle_payment_failed(invoice: dict):
    """Mark subscription as past_due on payment failure."""
    stripe_subscription_id = invoice.get("subscription")
    if not stripe_subscription_id:
        return

    supabase.table("subscriptions").update({
        "status": "past_due",
    }).eq("stripe_subscription_id", stripe_subscription_id).execute()
```

### 5.3 Register Route in `main.py`

```python
from routes.stripe import router as stripe_router
app.include_router(stripe_router)
```

### 5.4 Checkout Session Endpoint

```python
# Add to routes/stripe.py

@router.post("/api/stripe/create-checkout-session")
async def create_checkout_session(request: Request):
    body = await request.json()
    price_id = body.get("priceId")
    user_id = body.get("userId")

    if not price_id or not user_id:
        raise HTTPException(status_code=400, detail="priceId and userId required")

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{os.environ['FRONTEND_URL']}/editor?checkout=success",
        cancel_url=f"{os.environ['FRONTEND_URL']}/pricing?checkout=cancelled",
        metadata={"user_id": user_id},
    )

    return {"url": session.url}


@router.post("/api/stripe/create-portal-session")
async def create_portal_session(request: Request):
    body = await request.json()
    stripe_customer_id = body.get("stripeCustomerId")

    if not stripe_customer_id:
        raise HTTPException(status_code=400, detail="stripeCustomerId required")

    session = stripe.billing_portal.Session.create(
        customer=stripe_customer_id,
        return_url=f"{os.environ['FRONTEND_URL']}/editor",
    )

    return {"url": session.url}
```

---

## 6. Frontend Implementation

### 6.1 Install

```bash
npm install @stripe/stripe-js stripe
```

### 6.2 Subscription Store — `frontend/src/store/useSubscriptionStore.ts`

```typescript
import { create } from "zustand"
import { createClient } from "@/lib/supabase"

export type TierFeatures = {
  canvas_limit: number          // -1 = unlimited
  dashboard_level: "basic" | "full"
  share_links: boolean
  scaling_analysis: boolean
  export_pdf: boolean
  export_csv: boolean
  export_markdown: boolean
  export_code: boolean
  scenario_comparison: boolean
  marketplace_publish: boolean
}

export type TierId = "free" | "starter" | "pro"

type SubscriptionState = {
  tier: TierId
  status: string
  currentPeriodEnd: string | null
  stripeCustomerId: string | null
  features: TierFeatures
  isLoading: boolean
  fetchSubscription: (userId: string) => Promise<void>
  canUseFeature: (feature: keyof TierFeatures) => boolean
  isAtCanvasLimit: (currentCount: number) => boolean
}

const FREE_FEATURES: TierFeatures = {
  canvas_limit: 3,
  dashboard_level: "basic",
  share_links: false,
  scaling_analysis: false,
  export_pdf: false,
  export_csv: false,
  export_markdown: false,
  export_code: false,
  scenario_comparison: false,
  marketplace_publish: false,
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  status: "active",
  currentPeriodEnd: null,
  stripeCustomerId: null,
  features: FREE_FEATURES,
  isLoading: false,

  fetchSubscription: async (userId: string) => {
    set({ isLoading: true })
    try {
      const supabase = createClient()
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
        .single()

      if (data) {
        set({
          tier: data.tier_id as TierId,
          status: data.status,
          currentPeriodEnd: data.current_period_end,
          stripeCustomerId: data.stripe_customer_id,
          features: (data.subscription_tiers as any)?.features ?? FREE_FEATURES,
        })
      }
    } catch {
      // No subscription row = free tier
      set({ tier: "free", features: FREE_FEATURES })
    } finally {
      set({ isLoading: false })
    }
  },

  canUseFeature: (feature) => {
    const { features } = get()
    const val = features[feature]
    if (typeof val === "boolean") return val
    return true
  },

  isAtCanvasLimit: (currentCount) => {
    const { features } = get()
    if (features.canvas_limit === -1) return false
    return currentCount >= features.canvas_limit
  },
}))
```

### 6.3 Upgrade Modal Component — `frontend/src/components/UpgradeModal.tsx`

```typescript
"use client"

import { useState } from "react"
import { useUser } from "@/store/useAuthStore"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type Props = {
  isOpen: boolean
  onClose: () => void
  trigger: string  // e.g. "canvas_limit", "share_links", "full_dashboard"
  requiredTier?: "starter" | "pro"
}

const TRIGGER_COPY: Record<string, { title: string; description: string }> = {
  canvas_limit: {
    title: "You've reached your canvas limit",
    description: "Free accounts can save up to 3 canvases. Upgrade to save more workflows.",
  },
  share_links: {
    title: "Share links are a Starter feature",
    description: "Upgrade to create read-only shareable links for your workflows.",
  },
  full_dashboard: {
    title: "Unlock the full estimation dashboard",
    description: "See health scores, bottleneck analysis, model mix charts, and critical path — all the insights that matter.",
  },
  scaling_analysis: {
    title: "What-if scaling is a Starter feature",
    description: "Project monthly costs at any production volume.",
  },
  export_advanced: {
    title: "Advanced export is a Starter feature",
    description: "Export estimation reports as PDF, CSV, or Markdown.",
  },
  scenario_comparison: {
    title: "Scenario comparison is a Pro feature",
    description: "Compare workflows side-by-side to find the optimal cost/latency tradeoff.",
  },
  export_code: {
    title: "Code export is a Pro feature",
    description: "Export your workflow as a LangGraph Python scaffold with cost estimates in the comments.",
  },
}

export default function UpgradeModal({ isOpen, onClose, trigger, requiredTier = "starter" }: Props) {
  const user = useUser()
  const [loading, setLoading] = useState<"starter" | "pro" | null>(null)
  const copy = TRIGGER_COPY[trigger] ?? { title: "Upgrade to unlock this feature", description: "" }

  const handleUpgrade = async (tier: "starter" | "pro") => {
    if (!user) return
    setLoading(tier)

    const priceId = tier === "starter"
      ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
      : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID

    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId: user.id }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{copy.title}</h2>
        <p className="text-sm text-gray-500 mb-6">{copy.description}</p>

        <div className="flex flex-col gap-3">
          {(requiredTier === "starter" || requiredTier === "pro") && (
            <button
              onClick={() => handleUpgrade("starter")}
              disabled={loading !== null}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading === "starter" ? "Redirecting…" : "Upgrade to Starter — $9/mo"}
            </button>
          )}
          {requiredTier === "pro" && (
            <button
              onClick={() => handleUpgrade("pro")}
              disabled={loading !== null}
              className="w-full rounded-md border border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition"
            >
              {loading === "pro" ? "Redirecting…" : "Upgrade to Pro — $19/mo"}
            </button>
          )}
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 transition">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 6.4 Gate Hook — `frontend/src/hooks/useGate.ts`

```typescript
import { useState } from "react"
import { useSubscriptionStore, TierFeatures } from "@/store/useSubscriptionStore"
import { PAYWALL_ENABLED } from "@/lib/flags"

export function useGate(feature: keyof TierFeatures) {
  const { canUseFeature } = useSubscriptionStore()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const check = (): boolean => {
    if (!PAYWALL_ENABLED) return true  // paywall not active yet
    if (canUseFeature(feature)) return true
    setShowUpgrade(true)
    return false
  }

  return { check, showUpgrade, setShowUpgrade }
}

// Usage:
// const { check, showUpgrade, setShowUpgrade } = useGate("share_links")
// const handleShare = () => { if (!check()) return; /* proceed */ }
```

---

## 7. Pricing Page

### 7.1 Route: `frontend/src/app/pricing/page.tsx`

The pricing page must exist at `/pricing` before launch even with the paywall off, so users have a reference point. With `PAYWALL_ENABLED=false`, show pricing as "Coming soon — join free now" so you capture signups without confusing people.

**Page sections:**
1. Headline: "Simple, honest pricing"
2. Three tier cards (Free / Starter / Pro) with feature comparison checkmarks
3. FAQ: "Can I try before buying?", "What counts as a canvas?", "What happens when I hit my limit?"
4. CTA: "Start for free — no credit card required"

### 7.2 Pricing Card Component (key fields)

```typescript
const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "For exploring and prototyping",
    cta: "Get started",
    href: "/canvases",
    highlighted: false,
    features: [
      "3 saved canvases",
      "Unlimited estimation runs",
      "Per-node cost & latency breakdown",
      "Basic estimate panel",
      "PNG & JSON export",
      "Browse marketplace templates",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$9",
    period: "/mo",
    description: "For engineers who need the full picture",
    cta: "Upgrade to Starter",
    highlighted: true,  // most popular
    features: [
      "15 saved canvases",
      "Everything in Free",
      "Full estimation dashboard",
      "Health score & bottleneck analysis",
      "Model mix & critical path",
      "Scaling & what-if projections",
      "Shareable read-only links",
      "PDF, CSV & Markdown export",
      "Publish to marketplace",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For teams optimising at scale",
    cta: "Upgrade to Pro",
    highlighted: false,
    features: [
      "Unlimited canvases",
      "Everything in Starter",
      "Scenario comparison drawer",
      "LangGraph code export",
      "Priority support",
    ],
  },
]
```

---

## 8. UI Gating — Where Upgrade Prompts Appear

### 8.1 Canvas Limit Gate (Sidebar / My Canvases)

```typescript
// Before creating a new canvas
const { isAtCanvasLimit } = useSubscriptionStore()
const canvasCount = savedWorkflows.length

const handleNewCanvas = () => {
  if (PAYWALL_ENABLED && isAtCanvasLimit(canvasCount)) {
    setUpgradeTrigger("canvas_limit")
    setShowUpgrade(true)
    return
  }
  // proceed
}
```

### 8.2 Full Dashboard Gate (EstimatePanel)

```typescript
// In EstimatePanel.tsx
const { features } = useSubscriptionStore()
const showFull = !PAYWALL_ENABLED || features.dashboard_level === "full"

{!showFull && (
  <div className="relative">
    <div className="blur-sm pointer-events-none">
      <HealthScore />
      <BottleneckTable />
      <ModelMixChart />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <UpgradePromptInline trigger="full_dashboard" />
    </div>
  </div>
)}
{showFull && (
  <>
    <HealthScore />
    <BottleneckTable />
    <ModelMixChart />
  </>
)}
```

### 8.3 Share Link Gate

```typescript
// In HeaderBar.tsx Share button
const { check, showUpgrade, setShowUpgrade } = useGate("share_links")

const handleShare = () => {
  if (!check()) return  // shows upgrade modal if gated
  setIsShareOpen(true)
}
```

### 8.4 Export Gate

```typescript
// In ExportDropdown.tsx
const { canUseFeature } = useSubscriptionStore()

// PDF/CSV/MD options
<button
  onClick={() => { if (!PAYWALL_ENABLED || canUseFeature("export_pdf")) exportPDF(); else showUpgrade("export_advanced") }}
  className={`... ${PAYWALL_ENABLED && !canUseFeature("export_pdf") ? "opacity-40" : ""}`}
>
  <Lock className={PAYWALL_ENABLED && !canUseFeature("export_pdf") ? "visible" : "hidden"} />
  Report as PDF
</button>
```

---

## 9. Customer Portal

```typescript
// frontend/src/components/NavProfile.tsx or settings page

const handleManageSubscription = async () => {
  const { stripeCustomerId } = useSubscriptionStore.getState()
  if (!stripeCustomerId) return

  const res = await fetch(`${API_BASE}/api/stripe/create-portal-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stripeCustomerId }),
  })
  const { url } = await res.json()
  window.location.href = url
}
```

Show "Manage subscription" in the NavProfile dropdown for subscribed users.

---

## 10. Stripe Dashboard Setup Checklist

Before writing any code, complete these steps in the Stripe Dashboard:

- [ ] Create account at stripe.com
- [ ] Create Product: "Neurovn Starter" — Recurring, $9/mo
- [ ] Create Product: "Neurovn Pro" — Recurring, $19/mo
- [ ] Copy both Price IDs into env vars
- [ ] Configure Customer Portal (Dashboard → Billing → Customer Portal)
  - Enable: Cancel subscription, Update payment method
- [ ] Add Webhook endpoint: `https://your-render-url/api/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Copy Webhook signing secret into env vars
- [ ] Test in test mode with Stripe test cards before going live

---

## 11. Testing

### 11.1 Local Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local FastAPI
stripe listen --forward-to localhost:8000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### 11.2 Test Cards

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

### 11.3 End-to-End Test Sequence

1. Sign in to Neurovn
2. Click Upgrade → Starter
3. Complete checkout with `4242 4242 4242 4242`, any future expiry, any CVC
4. Confirm redirect to `/editor?checkout=success`
5. Check Supabase `subscriptions` table — row should exist with `tier_id = 'starter'`
6. Confirm full dashboard now visible in EstimatePanel
7. Test Customer Portal link — opens Stripe portal
8. Cancel subscription in portal
9. Confirm `subscriptions` row updates to `tier_id = 'free'`

---

## 12. Render Cold Start — Pre-Paywall Fix

Before charging anyone, fix cold starts on Render's free tier.

**Immediate fix (free, 10 minutes):**

Go to [cron-job.org](https://cron-job.org), create a free account, set up a cron job:
- URL: `https://your-render-url.onrender.com/health`
- Schedule: every 10 minutes
- Method: GET

This prevents Render from sleeping the service. Costs nothing.

**When first paying user signs up:**

Upgrade the Render service from Starter to Standard ($25/mo). Always-on, no cold starts. The $25/mo is covered by 3 Starter subscribers.

---

## 13. Implementation Phases

### Phase 1 — Foundation (before launch, paywall off)
- [ ] Run `007_stripe_subscriptions.sql` migration in Supabase
- [ ] Install `stripe` in backend, `@stripe/stripe-js` in frontend
- [ ] Add all env vars to Render and Vercel dashboards
- [ ] Create `lib/flags.ts` with `PAYWALL_ENABLED=false`
- [ ] Set up Stripe Dashboard (products, prices, portal, webhook)
- [ ] Implement webhook handler in FastAPI
- [ ] Implement `useSubscriptionStore`
- [ ] Create `/pricing` page (CTA points to free signup)
- [ ] Add "Pricing" to landing page nav

### Phase 2 — Checkout Flow (before paywall activation)
- [ ] Implement `create-checkout-session` endpoint
- [ ] Implement `create-portal-session` endpoint
- [ ] Implement `UpgradeModal` component
- [ ] Implement `useGate` hook
- [ ] Test end-to-end in Stripe test mode

### Phase 3 — Paywall Activation
- [ ] Add gate to canvas creation (canvas_limit)
- [ ] Add blur/gate to full dashboard features
- [ ] Add gate to Share button
- [ ] Add gate to Export dropdown (PDF/CSV/MD)
- [ ] Add "Manage subscription" to NavProfile
- [ ] Set `NEXT_PUBLIC_PAYWALL_ENABLED=true` in Vercel
- [ ] Monitor for errors in Sentry

### Phase 4 — Post-Launch
- [ ] Upgrade Render to Standard plan when first subscriber signs up
- [ ] Add founding member discount (first 50 users get 20% off for life via Stripe coupon)
- [ ] Monitor churn via Stripe Dashboard

---

// lib/flags.ts
export const PAYWALL_ENABLED = process.env.NEXT_PUBLIC_PAYWALL_ENABLED === 'true'

// Usage anywhere in the app
{PAYWALL_ENABLED && <UpgradePrompt />}


Revised Tier Structure & Pricing
Three tiers, honest pricing for an early-stage tool:
FreeStarterProPrice$0$9/mo$19/moSaved canvases315UnlimitedEstimation runsUnlimitedUnlimitedUnlimitedBasic estimate panel✅✅✅Per-node breakdown✅✅✅Full dashboard (health, bottlenecks, model mix, critical path)❌✅✅Shareable read-only links❌✅✅Scaling & what-if analysis❌✅✅PDF/CSV/Markdown export❌✅✅Scenario comparison❌❌✅LangGraph code export❌❌✅Publish to marketplace❌✅✅Priority support❌❌✅


*Document version: 1.0 — Neurovn Stripe integration spec, March 2026*