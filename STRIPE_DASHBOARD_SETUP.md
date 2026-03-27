# Stripe Dashboard Setup Guide

This document provides step-by-step instructions for configuring Stripe Dashboard for Neurovn's subscription billing system.

## Prerequisites

- A Stripe account (sign up at [stripe.com](https://stripe.com))
- Your Render backend URL (e.g., `https://your-backend.onrender.com`)
- Your Vercel frontend URL (e.g., `https://neurovn.vercel.app`)
- Access to your Supabase dashboard

---

## Step 1: Create Products and Prices

1. Go to **Stripe Dashboard** → **Products** → **Add product**
2. Create **Neurovn Starter**:
   - Product name: `Neurovn Starter`
   - Description: "AI workflow estimator with basic features"
   - Pricing: Select **Recurring** → **Monthly**
   - Price: `$9.00` USD (or your desired currency)
   - Click **Save**
   - **Copy the Price ID** (starts with `price_`) — you'll need it later
3. Create **Neurovn Pro**:
   - Product name: `Neurovn Pro`
   - Description: "Advanced AI workflow features with unlimited canvases"
   - Pricing: **Recurring** → **Monthly**
   - Price: `$19.00` USD
   - Click **Save**
   - **Copy the Price ID** (`price_...`)

---

## Step 2: Configure Customer Portal

The Customer Portal allows users to manage their subscription (update payment method, cancel).

1. Go to **Stripe Dashboard** → **Billing** → **Customer Portal** (or **Settings** → **Billing** → **Customer portal**)
2. Click **+ Add configuration** if no configuration exists
3. Configure the portal:
   - **Business name**: Neurovn
   - **Default return URL**: `https://your-frontend.vercel.app/editor` (or your dev URL)
   - **Enabled features**:
     - [x] **Update payment method**
     - [x] **Cancel subscription** (when canceled, shows a cancellation date and allows them to reactivate until the end of the period)
     - [ ] Switch pricing plans (optional — if enabled, users can upgrade/downgrade themselves)
   - **Customer controls**: enable at minimum: Payment methods, Subscription cancellation
4. Click **Save configuration**
5. **Copy the Customer Portal ID** (starts with `pcp_`) — you'll need it for the `create-portal-session` endpoint (optional but recommended)

---

## Step 3: Add Webhook Endpoint

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **+ Add endpoint**
3. **Endpoint URL**: `https://your-backend.onrender.com/api/stripe/webhook`
   - Replace `your-backend.onrender.com` with your actual Render URL
4. **Events to send** (select):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. After creation, you'll see a **Signing secret** (starts with `whsec_`). **Copy this immediately** — you'll need it for the `STRIPE_WEBHOOK_SECRET` environment variable.

---

## Step 4: Update Environment Variables

Add the values you copied to your environment:

### Render (Backend)

Set these in **Render Dashboard** → **Your Service** → **Environment**:

| Variable | Value |
|----------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` (from Stripe Dashboard → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from webhook endpoint) |
| `STRIPE_STARTER_PRICE_ID` | `price_...` (from Starter product) |
| `STRIPE_PRO_PRICE_ID` | `price_...` (from Pro product) |
| `STRIPE_CUSTOMER_PORTAL_ID` | `pcp_...` (from Customer Portal config) |
| `SUPABASE_SERVICE_ROLE_KEY` | (already set from previous steps) |
| `SUPABASE_URL` | (already set) |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |

### Vercel (Frontend)

Set these in **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` (from Stripe Dashboard → Developers → API keys) |
| `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | `price_...` (same as backend) |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | `price_...` (same as backend) |
| `NEXT_PUBLIC_PAYWALL_ENABLED` | `true` |

---

## Step 5: Update Subscription Tiers in Supabase

The migration `010_stripe_subscriptions.sql` created the `subscription_tiers` table with placeholder price IDs. Update them with your actual Stripe price IDs:

**Option A: Using Supabase SQL Editor** (recommended):

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run:

```sql
UPDATE subscription_tiers
SET stripe_price_id = 'price_YOUR_STARTER_PRICE_ID'
WHERE id = 'starter';

UPDATE subscription_tiers
SET stripe_price_id = 'price_YOUR_PRO_PRICE_ID'
WHERE id = 'pro';
```

Replace `price_YOUR_STARTER_PRICE_ID` and `price_YOUR_PRO_PRICE_ID` with your actual price IDs.

**Option B: Re-run migration** after editing the placeholders in `supabase/migrations/010_stripe_subscriptions.sql`, then redeploy to Supabase.

---

## Step 6: Verify Setup

1. **Backend Health Check**: Visit `https://your-backend.onrender.com/health` — should return `{"status":"ok"}`
2. **Test Webhook**: In Stripe → Webhooks, click the endpoint → **Send test webhook** → select `checkout.session.completed` → send. Should see a `200` response.
3. **Check Supabase**: In Supabase → Table Editor → `subscriptions` table should exist and be accessible.
4. **Frontend**: Navigate to your pricing page and verify the upgrade buttons appear.

---

## Migration Reference

The Supabase migration `010_stripe_subscriptions.sql` creates:

- `subscription_tiers` lookup table (free, starter, pro)
- `subscriptions` table synced from Stripe webhooks
- RLS policies (users can read/update their own subscription)
- Indexes for performance

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Webhook returns 500 | Verify `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are set in Render |
| Webhook signature mismatch | Re-copy webhook secret from Stripe Dashboard |
| No subscription created after checkout | Check webhook logs in Stripe → Webhooks → Recent events |
| "Invalid signature" in logs | Ensure webhook endpoint URL is correct and secret matches |
| Customer Portal returns 404 | Verify `STRIPE_CUSTOMER_PORTAL_ID` is set or remove it to use default |
