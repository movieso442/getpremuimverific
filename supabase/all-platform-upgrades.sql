-- Premium Verify: complete combined database upgrade
-- Copy this ENTIRE file into Supabase SQL Editor and run it once.
-- Includes base schema, catalog, admin settings/analytics/pricing, bot
-- identities, manual crypto approvals, Resend outbox and owner-only access.
-- Existing data/balances are not reset. Changes commit together or roll back.
-- Resend credentials stay in server environment variables, never in SQL.
BEGIN;

-- ================================================================
-- schema.sql
-- ================================================================
-- ====================================================================
-- AgoVerify + JustAnotherPanel Platform - Supabase Database Schema
-- Execute this script in your Supabase SQL Editor (https://supabase.com)
-- ====================================================================

-- 1. Create Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  balance_xaf NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'XAF',
  avatar_url TEXT,
  phone_number TEXT,
  telegram_chat_id TEXT UNIQUE,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'sms_purchase', 'smm_order', 'account_purchase', 'refund')),
  payment_method TEXT NOT NULL, -- 'mtn_momo', 'orange_money', 'visa_mastercard', 'crypto_usdt'
  reference TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Virtual SMS Orders Table
CREATE TABLE IF NOT EXISTS public.sms_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  sms_code TEXT,
  price_xaf NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_sms' CHECK (status IN ('waiting_sms', 'received', 'expired', 'canceled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sms_orders ADD COLUMN IF NOT EXISTS provider_order_id TEXT UNIQUE;

-- 4. Create SMM Services Catalog (used by `npm run db:seed`)
CREATE TABLE IF NOT EXISTS public.smm_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rate_usd NUMERIC(10, 4) NOT NULL,
  rate_xaf NUMERIC(12, 2) NOT NULL,
  min INT NOT NULL,
  max INT NOT NULL,
  dripfeed BOOLEAN DEFAULT FALSE,
  refill BOOLEAN DEFAULT FALSE,
  cancel BOOLEAN DEFAULT FALSE,
  service_type TEXT DEFAULT 'Default',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create SMM Panel Orders Table (JustAnotherPanel Integration)
CREATE TABLE IF NOT EXISTS public.smm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id INT NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_link TEXT NOT NULL,
  quantity INT NOT NULL,
  charge_xaf NUMERIC(12, 2) NOT NULL,
  start_count INT DEFAULT 0,
  remains INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'in_progress', 'completed', 'canceled', 'partial')),
  api_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Digital Accounts & Services Marketplace Orders
CREATE TABLE IF NOT EXISTS public.account_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  category TEXT NOT NULL,
  price_xaf NUMERIC(12, 2) NOT NULL,
  delivery_type TEXT NOT NULL DEFAULT 'instant', -- 'instant', 'manual'
  credentials_data JSONB, -- stores account details/instructions securely
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Developer API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Webhook Endpoints Table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- Array of events: ['order.created', 'sms.received', 'order.cancelled', 'order.expired']
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Admin financial ledger. Expenses must be recorded here to calculate profit;
-- customer deposits are wallet liabilities, not platform revenue.
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('provider_cost', 'payment_fee', 'operating_expense', 'adjustment')),
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf > 0),
  description TEXT NOT NULL,
  reference TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Single source of truth for customer-facing support details and pricing.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  support_email TEXT NOT NULL DEFAULT 'hello@premiumverific.com',
  support_phone TEXT NOT NULL DEFAULT '+237 640 796 062',
  whatsapp_number TEXT NOT NULL DEFAULT '237640796062',
  smm_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (smm_markup_multiplier >= 1 AND smm_markup_multiplier <= 10),
  sms_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (sms_markup_multiplier >= 1 AND sms_markup_multiplier <= 10),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.platform_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS Policies for user ownership access
DROP POLICY IF EXISTS "Users can access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can access own SMS orders" ON public.sms_orders;
DROP POLICY IF EXISTS "Users can access own SMM orders" ON public.smm_orders;
DROP POLICY IF EXISTS "Users can access own account orders" ON public.account_orders;
DROP POLICY IF EXISTS "Users can manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage webhooks" ON public.webhooks;
DROP POLICY IF EXISTS "Admins can manage financial entries" ON public.financial_entries;
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;

CREATE POLICY "Users can access own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own SMS orders" ON public.sms_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own SMM orders" ON public.smm_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own account orders" ON public.account_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can manage API keys" ON public.api_keys FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can manage webhooks" ON public.webhooks FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Admins can manage financial entries" ON public.financial_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger to update balance on deposits
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    IF NEW.type IN ('deposit', 'refund') THEN
    UPDATE public.profiles SET balance_xaf = balance_xaf + NEW.amount WHERE id = NEW.profile_id;
    ELSIF NEW.type IN ('sms_purchase', 'smm_order', 'account_purchase') THEN
    UPDATE public.profiles SET balance_xaf = GREATEST(0, balance_xaf - NEW.amount) WHERE id = NEW.profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_wallet_transaction_insert ON public.wallet_transactions;
CREATE TRIGGER on_wallet_transaction_insert
AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION update_user_balance();

-- ================================================================
-- live-provider-pricing-upgrade.sql
-- ================================================================
-- Live provider catalogue upgrade
-- Run once in Supabase SQL Editor. It makes all existing JAP services safe to
-- refresh from the admin dashboard and records the time of each refresh.

CREATE TABLE IF NOT EXISTS public.smm_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rate_usd NUMERIC(10, 4) NOT NULL,
  rate_xaf NUMERIC(12, 2) NOT NULL,
  min INT NOT NULL,
  max INT NOT NULL,
  dripfeed BOOLEAN DEFAULT FALSE,
  refill BOOLEAN DEFAULT FALSE,
  cancel BOOLEAN DEFAULT FALSE,
  service_type TEXT DEFAULT 'Default',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.smm_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view SMM services" ON public.smm_services;
CREATE POLICY "Anyone can view SMM services" ON public.smm_services
  FOR SELECT USING (TRUE);

-- ================================================================
-- admin-platform-upgrade.sql
-- ================================================================
-- Premium Verify administrator settings upgrade
-- Run this once in Supabase SQL Editor before using the new Admin settings form.

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  support_email TEXT NOT NULL DEFAULT 'hello@premiumverific.com',
  support_phone TEXT NOT NULL DEFAULT '+237 640 796 062',
  whatsapp_number TEXT NOT NULL DEFAULT '237640796062',
  smm_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (smm_markup_multiplier >= 1 AND smm_markup_multiplier <= 10),
  sms_markup_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (sms_markup_multiplier >= 1 AND sms_markup_multiplier <= 10),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Ensure your own signed-in profile can access the administrator portal.
-- Replace this with the email you use to log into Premium Verify.
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';

-- ================================================================
-- launch-readiness-upgrade.sql
-- ================================================================
-- Premium Verify launch-readiness upgrade. Run once in Supabase SQL Editor.
-- Accounting entries make the administrator profit view auditable. Deposits
-- remain wallet liabilities; record provider fees and operating costs here.
CREATE TABLE IF NOT EXISTS public.financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('provider_cost', 'payment_fee', 'operating_expense', 'adjustment')),
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf > 0),
  description TEXT NOT NULL,
  reference TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage financial entries" ON public.financial_entries;
CREATE POLICY "Admins can manage financial entries" ON public.financial_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Individual SMM retail-price overrides (per 1,000 provider units).
CREATE TABLE IF NOT EXISTS public.smm_service_prices (
  service_id INT PRIMARY KEY,
  retail_rate_xaf NUMERIC(12, 2) NOT NULL CHECK (retail_rate_xaf > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.smm_service_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage SMM service prices" ON public.smm_service_prices;
CREATE POLICY "Admins can manage SMM service prices" ON public.smm_service_prices FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Anonymous page views and checkout starts are written only by the server API;
-- no browser role can read this telemetry.
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'checkout_started', 'checkout_redirected', 'checkout_start_failed')),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  path TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON public.audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_type_created_at_idx ON public.audit_events (event_type, created_at DESC);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Refunds restore a customer wallet exactly once when their transaction changes
-- to completed; purchases still debit only on their first completed state.
CREATE OR REPLACE FUNCTION public.update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    IF NEW.type IN ('deposit', 'refund') THEN
      UPDATE public.profiles SET balance_xaf = balance_xaf + NEW.amount WHERE id = NEW.profile_id;
    ELSIF NEW.type IN ('sms_purchase', 'smm_order', 'account_purchase') THEN
      UPDATE public.profiles SET balance_xaf = GREATEST(0, balance_xaf - NEW.amount) WHERE id = NEW.profile_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- bot-customer-upgrade.sql
-- ================================================================
-- Bot customer identity upgrade
-- Run once in the Supabase SQL Editor before deploying bot account creation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_unique
  ON public.profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- Profiles created by WhatsApp use the verified sender phone number supplied
-- by Meta. Telegram profiles use telegram_chat_id and do not invent a phone.

-- A short-lived, unguessable link lets a bot customer open a secure top-up
-- page without first creating a separate website login. Only server code uses
-- this table; the token is the customer's temporary capability.
CREATE TABLE IF NOT EXISTS public.bot_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf >= 3000),
  payment_reference TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_payment_links_token_idx
  ON public.bot_payment_links (token);

ALTER TABLE public.bot_payment_links ENABLE ROW LEVEL SECURITY;
-- No browser policy: payment links are read and redeemed only by trusted
-- server routes using the Supabase service-role key.

-- A manual mobile-money claim is never a wallet credit by itself. It remains
-- pending until an administrator matches it against the real MTN/Orange
-- transaction and confirms it in the administrator portal.
CREATE TABLE IF NOT EXISTS public.manual_payment_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_payment_link_id UUID UNIQUE NOT NULL REFERENCES public.bot_payment_links(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf >= 3000),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mtn_momo', 'orange_money')),
  payer_phone TEXT,
  transfer_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS manual_payment_claims_status_idx
  ON public.manual_payment_claims (status, created_at DESC);

ALTER TABLE public.manual_payment_claims ENABLE ROW LEVEL SECURITY;
-- No browser policy: claims are submitted and reviewed only by trusted server
-- routes. A customer cannot mark their own payment as confirmed.

-- Existing deployments created the original 500 XAF constraints. Raise both
-- limits so every wallet entry point enforces the same US$5 minimum.
ALTER TABLE public.bot_payment_links DROP CONSTRAINT IF EXISTS bot_payment_links_amount_xaf_check;
ALTER TABLE public.bot_payment_links ADD CONSTRAINT bot_payment_links_amount_xaf_check CHECK (amount_xaf >= 3000) NOT VALID;
ALTER TABLE public.manual_payment_claims DROP CONSTRAINT IF EXISTS manual_payment_claims_amount_xaf_check;
ALTER TABLE public.manual_payment_claims ADD CONSTRAINT manual_payment_claims_amount_xaf_check CHECK (amount_xaf >= 3000) NOT VALID;

-- ================================================================
-- manual-crypto-upgrade.sql
-- ================================================================
-- Run AFTER bot-customer-upgrade.sql. Approval is manual, never automatic proof.

ALTER TABLE public.manual_payment_claims ALTER COLUMN bot_payment_link_id DROP NOT NULL;
ALTER TABLE public.manual_payment_claims DROP CONSTRAINT IF EXISTS manual_payment_claims_payment_method_check;
ALTER TABLE public.manual_payment_claims ADD CONSTRAINT manual_payment_claims_payment_method_check
  CHECK (payment_method IN ('mtn_momo', 'orange_money', 'eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin'));
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS crypto_amount NUMERIC(30,18);
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS receiving_address TEXT;
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS approved_amount_xaf NUMERIC(12,2);
DROP INDEX IF EXISTS public.manual_crypto_transaction_unique;
CREATE UNIQUE INDEX manual_crypto_transaction_unique
  ON public.manual_payment_claims(payment_method, lower(transfer_reference))
  WHERE payment_method IN ('eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin');

-- Serialize reviews and commit the wallet deposit + claim together.
CREATE OR REPLACE FUNCTION public.review_manual_payment(p_claim_id UUID, p_reviewer UUID, p_action TEXT, p_amount_xaf NUMERIC DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claim public.manual_payment_claims%ROWTYPE; credit NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reviewer AND role = 'admin') THEN
    RAISE EXCEPTION 'Administrator required';
  END IF;
  SELECT * INTO claim FROM public.manual_payment_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment claim not found'; END IF;
  IF claim.status <> 'pending' THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;
  IF p_action = 'reject' THEN
    UPDATE public.manual_payment_claims SET status = 'rejected', reviewed_by = p_reviewer, reviewed_at = NOW() WHERE id = claim.id;
    RETURN 'rejected';
  END IF;
  IF p_action <> 'confirm' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  credit := CASE WHEN claim.payment_method IN ('eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin') THEN p_amount_xaf ELSE claim.amount_xaf END;
  IF credit IS NULL OR credit < 3000 OR credit > 10000000 OR credit <> ROUND(credit) THEN
    RAISE EXCEPTION 'Verified credit must be a whole XAF amount between 3000 and 10000000';
  END IF;
  INSERT INTO public.wallet_transactions(profile_id, amount, type, payment_method, reference, status, description)
    VALUES(claim.profile_id, credit, 'deposit', claim.payment_method, 'MANUAL-' || claim.id, 'completed',
      'Admin verified manual deposit: ' || claim.transfer_reference);
  UPDATE public.manual_payment_claims SET status = 'confirmed', approved_amount_xaf = credit,
    reviewed_by = p_reviewer, reviewed_at = NOW() WHERE id = claim.id;
  RETURN 'confirmed';
END;
$$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, UUID, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, UUID, TEXT, NUMERIC) TO service_role;

-- Customers must not grant themselves admin or manufacture wallet credits.
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE(full_name, phone_number, currency, avatar_url) ON public.profiles TO authenticated;
REVOKE ALL ON public.manual_payment_claims FROM anon, authenticated;

-- ================================================================
-- admin-notifications-upgrade.sql
-- ================================================================
-- Run after manual-crypto-upgrade.sql. Events commit with the payment itself.

CREATE TABLE IF NOT EXISTS public.admin_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  recipient TEXT,
  sender TEXT,
  attempts INT NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ,
  lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_notification_outbox ADD COLUMN IF NOT EXISTS first_attempt_at TIMESTAMPTZ;
ALTER TABLE public.admin_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.queue_admin_payment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE customer_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  -- The claim-confirmed event already covers this ledger credit.
  IF TG_TABLE_NAME = 'wallet_transactions' AND (to_jsonb(NEW)->>'reference') LIKE 'MANUAL-%' THEN RETURN NEW; END IF;
  SELECT concat_ws(' / ', full_name, email) INTO customer_name FROM public.profiles WHERE id = NEW.profile_id;
  INSERT INTO public.admin_notification_outbox(event_key, profile_id, payload)
  VALUES(TG_TABLE_NAME || ':' || NEW.id || ':' || NEW.status, NEW.profile_id,
    jsonb_build_object('source', TG_TABLE_NAME, 'record_id', NEW.id, 'customer', customer_name, 'payment', to_jsonb(NEW)))
  ON CONFLICT(event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS queue_admin_claim_notification ON public.manual_payment_claims;
CREATE TRIGGER queue_admin_claim_notification AFTER INSERT OR UPDATE OF status ON public.manual_payment_claims
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_payment_notification();
DROP TRIGGER IF EXISTS queue_admin_transaction_notification ON public.wallet_transactions;
CREATE TRIGGER queue_admin_transaction_notification AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_payment_notification();

CREATE OR REPLACE FUNCTION public.reserve_admin_notification(p_sender TEXT, p_recipient TEXT)
RETURNS SETOF public.admin_notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    UPDATE public.admin_notification_outbox SET lease_until = NOW() + INTERVAL '2 minutes',
      attempts = attempts + 1, first_attempt_at = COALESCE(first_attempt_at, NOW()),
      sender = COALESCE(sender, p_sender), recipient = COALESCE(recipient, p_recipient)
    WHERE id = (SELECT id FROM public.admin_notification_outbox
      WHERE sent_at IS NULL AND attempts < 10 AND (lease_until IS NULL OR lease_until < NOW())
        AND (first_attempt_at IS NULL OR first_attempt_at > NOW() - INTERVAL '23 hours')
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_admin_notification(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_admin_notification(TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.queue_admin_payment_notification() FROM PUBLIC, anon, authenticated;

-- ================================================================
-- admin-owner-access.sql
-- ================================================================
-- Owner-only administrator access. Run in Supabase SQL Editor.
-- Safe to rerun; existing customer data and wallet balances are unchanged.

CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'mohammednurdine6@gmail.com'
      AND email_confirmed_at IS NOT NULL
      AND NOT COALESCE(is_anonymous, FALSE)
  );
$$;
REVOKE ALL ON FUNCTION public.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated, service_role;

-- A restrictive policy also blocks old role-only permissive policies. Skip
-- optional tables until their respective platform migrations have been run.
DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['platform_settings', 'financial_entries', 'smm_service_prices'] LOOP
    IF to_regclass('public.' || target) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Verified owner only" ON public.%I', target);
      EXECUTE format('CREATE POLICY "Verified owner only" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner())', target);
    END IF;
  END LOOP;
END;
$$;

-- Keep customers from editing their role or manufacturing wallet deposits.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE(full_name, phone_number, currency, avatar_url) ON public.profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;

-- Only promote a profile tied to the confirmed Supabase identity, not a
-- customer-editable profile email. New owner profiles are created at sign-in.
UPDATE public.profiles p SET role = 'admin'
FROM auth.users u
WHERE p.user_id = u.id AND lower(u.email) = 'mohammednurdine6@gmail.com'
  AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous, FALSE);

-- NOT VALID minimum-deposit constraints preserve historical 500 XAF rows
-- while still enforcing 3000 XAF on new/updated records.
REVOKE ALL ON public.bot_payment_links, public.manual_payment_claims, public.audit_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bot_payment_links, public.manual_payment_claims, public.audit_events TO service_role;

COMMIT;

SELECT 'Database upgrades completed' AS result;

