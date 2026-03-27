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
  'starter', 'Starter', 'price_starter_actual_id_here', -- REPLACE with actual Stripe Starter price ID
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
  'pro', 'Pro', 'price_pro_actual_id_here', -- REPLACE with actual Stripe Pro price ID
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
-- The webhook handler must use SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
-- No additional policies needed; service role automatically bypasses RLS.
-- This comment documents the intended webhook authentication method.
