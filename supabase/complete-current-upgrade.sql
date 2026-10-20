-- Premium Verific: complete catch-up SQL for an existing or new Supabase project.
-- Paste this ENTIRE file into the Supabase SQL Editor and run it once.
-- All changes are in one transaction: an error rolls everything back.
-- Rerunning is supported by the source migrations, but do not run an older
-- migration afterward: it could restore an obsolete 3,000 XAF minimum.
-- No customer balances are reset. No card-top-up migration is included.
-- No API, Resend, payment, or BeanSMS secrets belong in SQL.
-- The embedded ECB observation is a short-lived seed; the server cron must
-- refresh the USD $3-equivalent minimum on subsequent business days.

BEGIN;

-- ================================================================
-- all-platform-upgrades.sql
-- ================================================================
-- Premium Verify: complete combined database upgrade
-- Copy this ENTIRE file into Supabase SQL Editor and run it once.
-- Includes base schema, catalog, admin settings/analytics/pricing, bot
-- identities, manual crypto approvals, Resend outbox and owner-only access.
-- Existing data/balances are not reset. Changes commit together or roll back.
-- Resend credentials stay in server environment variables, never in SQL.

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

-- ================================================================
-- topup-fees-upgrade.sql
-- ================================================================
-- Run after all-platform-upgrades.sql. Safe to rerun for the crypto-only fee release.
-- Historical payments keep a zero fee and are verified at their original amount.
UPDATE public.platform_settings SET support_phone = '+237 640 796 062', whatsapp_number = '237640796062', updated_at = NOW() WHERE id = TRUE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS service_fee_xaf NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee_xaf >= 0);
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS service_fee_xaf NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee_xaf >= 0);
-- The existing wallet trigger credits only `amount`, not this fee.
-- The manual review RPC credits only the verified approved XAF wallet amount.
CREATE OR REPLACE FUNCTION public.copy_manual_payment_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.reference LIKE 'MANUAL-%' THEN
    SELECT service_fee_xaf INTO NEW.service_fee_xaf FROM public.manual_payment_claims
      WHERE 'MANUAL-' || id = NEW.reference;
    NEW.service_fee_xaf := COALESCE(NEW.service_fee_xaf, 0);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.copy_manual_payment_fee() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS copy_manual_payment_fee ON public.wallet_transactions;
CREATE TRIGGER copy_manual_payment_fee BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.copy_manual_payment_fee();
-- Serialize crypto submissions, including the bot capability reservation.
-- A retry of the same receipt returns the same claim; another pending claim
-- cannot be created concurrently for this wallet.
CREATE OR REPLACE FUNCTION public.submit_crypto_payment(
  p_profile UUID, p_method TEXT, p_hash TEXT, p_crypto NUMERIC,
  p_credit NUMERIC, p_address TEXT, p_link UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.manual_payment_claims%ROWTYPE; link public.bot_payment_links%ROWTYPE; result UUID;
BEGIN
  IF p_method NOT IN ('usdt_trc20','btc_bitcoin','eth_erc20','eth_bep20') OR p_crypto IS NULL OR p_crypto <= 0
     OR p_credit IS NULL OR p_credit < 3000 OR p_credit > 10000000 OR p_credit <> ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid payment details';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  SELECT * INTO existing FROM public.manual_payment_claims WHERE payment_method = p_method AND lower(transfer_reference) = lower(p_hash);
  IF FOUND THEN
    IF existing.profile_id = p_profile AND existing.crypto_amount = p_crypto AND existing.amount_xaf = p_credit
       AND existing.bot_payment_link_id IS NOT DISTINCT FROM p_link THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'Payment reference already used';
  END IF;
  IF EXISTS (SELECT 1 FROM public.manual_payment_claims WHERE profile_id = p_profile AND status = 'pending')
     OR EXISTS (SELECT 1 FROM public.wallet_transactions WHERE profile_id = p_profile AND type = 'deposit' AND status = 'pending') THEN
    RAISE EXCEPTION 'An existing payment is being checked';
  END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id = p_link AND profile_id = p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at <= NOW() OR link.payment_reference IS NOT NULL OR link.amount_xaf <> p_credit THEN
      RAISE EXCEPTION 'Payment link unavailable';
    END IF;
    UPDATE public.bot_payment_links SET payment_reference = 'PVC' || replace(gen_random_uuid()::TEXT, '-', '') WHERE id = link.id;
  END IF;
  INSERT INTO public.manual_payment_claims(profile_id, payment_method, transfer_reference, crypto_amount,
    amount_xaf, service_fee_xaf, receiving_address, bot_payment_link_id)
  VALUES (p_profile, p_method, lower(p_hash), p_crypto, p_credit, CEIL(p_credit * 0.02), p_address, p_link)
  RETURNING id INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) TO service_role;
CREATE OR REPLACE FUNCTION public.start_wallet_topup(p_profile UUID, p_reference TEXT, p_credit NUMERIC, p_method TEXT, p_link UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.wallet_transactions%ROWTYPE; link public.bot_payment_links%ROWTYPE;
BEGIN
  IF p_method NOT IN ('mtn_momo','orange_money') OR p_credit IS NULL OR p_credit < 3000 OR p_credit > 10000000 OR p_credit <> ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid top-up';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id = p_link AND profile_id = p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at <= NOW() OR link.amount_xaf <> p_credit THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    IF link.payment_reference IS NOT NULL THEN
      SELECT * INTO existing FROM public.wallet_transactions WHERE reference = link.payment_reference AND profile_id = p_profile;
      IF NOT FOUND THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
      RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
    END IF;
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE reference = p_reference;
  IF FOUND THEN
    IF existing.profile_id <> p_profile OR existing.amount <> p_credit OR existing.payment_method <> p_method THEN RAISE EXCEPTION 'Request ID already used'; END IF;
    RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE profile_id = p_profile AND type = 'deposit' AND status = 'pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    IF p_link IS NOT NULL THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
    RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
  END IF;
  IF EXISTS (SELECT 1 FROM public.manual_payment_claims WHERE profile_id = p_profile AND status = 'pending') THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
  INSERT INTO public.wallet_transactions(profile_id, amount, type, payment_method, reference, status, service_fee_xaf, description)
    VALUES (p_profile, p_credit, 'deposit', p_method, p_reference, 'pending', 0, 'Mobile-money wallet top-up; no platform top-up fee');
  IF p_link IS NOT NULL THEN UPDATE public.bot_payment_links SET payment_reference = p_reference WHERE id = link.id; END IF;
  RETURN jsonb_build_object('created', TRUE, 'reference', p_reference, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) TO service_role;

-- ================================================================
-- payment-receipts-upgrade.sql
-- ================================================================
-- Optional private payment screenshots. Run after topup-fees-upgrade.sql.
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT;
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES('payment-receipts', 'payment-receipts', FALSE, 3145728, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public = FALSE, file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];
-- Restrictive policies block inherited permissive policies for this bucket.
-- Upload/download go through authenticated server routes using service_role.
DROP POLICY IF EXISTS "Payment receipts are server only" ON storage.objects;
CREATE POLICY "Payment receipts are server only" ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (bucket_id <> 'payment-receipts') WITH CHECK (bucket_id <> 'payment-receipts');

-- ================================================================
-- customer-followups-upgrade.sql
-- ================================================================
-- Short customer help emails. Does not cancel charges or modify wallet balances.
-- Run after the combined platform and fee upgrades. Browser roles have no access.
CREATE TABLE IF NOT EXISTS public.customer_email_preferences (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  followups_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::TEXT,'-','') || replace(gen_random_uuid()::TEXT,'-','')
);
CREATE TABLE IF NOT EXISTS public.customer_checkout_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'started' CHECK(state IN ('started','cancelled','issue','completed')),
  method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient TEXT, sender TEXT, reply_to TEXT, unsubscribe_token TEXT, email_text TEXT, email_subject TEXT,
  attempts INT NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ, lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ, resend_id TEXT, last_error TEXT
);
CREATE INDEX IF NOT EXISTS customer_followups_profile_time_idx ON public.customer_checkout_followups(profile_id,created_at DESC);
ALTER TABLE public.customer_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_checkout_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_email_preferences, public.customer_checkout_followups FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.customer_email_preferences, public.customer_checkout_followups TO service_role;

CREATE OR REPLACE FUNCTION public.track_customer_checkout(p_profile UUID,p_id UUID,p_state TEXT,p_method TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_state NOT IN ('started','cancelled') OR p_state IS NULL OR p_id IS NULL THEN RAISE EXCEPTION 'Invalid checkout event'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM public.customer_checkout_followups WHERE id=p_id AND profile_id<>p_profile) THEN RAISE EXCEPTION 'Checkout unavailable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customer_checkout_followups WHERE id=p_id)
     AND (SELECT count(*) FROM public.customer_checkout_followups WHERE profile_id=p_profile AND created_at>NOW()-INTERVAL '1 day')>=20 THEN RETURN; END IF;
  INSERT INTO public.customer_checkout_followups(id,profile_id,state,method) VALUES(p_id,p_profile,p_state,p_method)
  ON CONFLICT(id) DO UPDATE SET state=CASE WHEN customer_checkout_followups.state='cancelled' THEN 'cancelled' ELSE EXCLUDED.state END,method=EXCLUDED.method,last_activity_at=NOW()
    WHERE customer_checkout_followups.profile_id=p_profile AND customer_checkout_followups.state<>'completed' AND customer_checkout_followups.sent_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_checkout(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_customer_checkout(UUID,UUID,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.track_customer_payment_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE attempt UUID;
BEGIN
  IF NEW.type<>'deposit' OR NEW.status NOT IN ('completed','failed') THEN RETURN NEW; END IF;
  IF NEW.status='completed' THEN
    UPDATE public.customer_checkout_followups SET state='completed',lease_until=NULL
      WHERE profile_id=NEW.profile_id AND created_at<=NEW.created_at AND sent_at IS NULL;
  ELSE
    SELECT id INTO attempt FROM public.customer_checkout_followups WHERE profile_id=NEW.profile_id
      AND created_at<=NEW.created_at AND created_at>NOW()-INTERVAL '7 days' AND state<>'completed' AND sent_at IS NULL ORDER BY created_at DESC LIMIT 1;
    IF attempt IS NULL THEN
      INSERT INTO public.customer_checkout_followups(profile_id,state,method) VALUES(NEW.profile_id,'issue',NEW.payment_method);
    ELSE UPDATE public.customer_checkout_followups SET state='issue',last_activity_at=NOW() WHERE id=attempt; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_payment_outcome() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS track_customer_payment_outcome ON public.wallet_transactions;
CREATE TRIGGER track_customer_payment_outcome AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.track_customer_payment_outcome();

CREATE OR REPLACE FUNCTION public.reserve_customer_followup(p_sender TEXT,p_reply_to TEXT)
RETURNS SETOF public.customer_checkout_followups LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE candidate public.customer_checkout_followups%ROWTYPE; email TEXT; unsubscribe TEXT;
BEGIN
  SELECT c.* INTO candidate FROM public.customer_checkout_followups c
    JOIN public.profiles p ON p.id=c.profile_id JOIN auth.users u ON u.id=p.user_id
    LEFT JOIN public.customer_email_preferences pref ON pref.profile_id=p.id
    WHERE c.state<>'completed' AND c.sent_at IS NULL AND c.attempts<10
      AND c.last_activity_at<NOW()-INTERVAL '1 hour' AND c.created_at>NOW()-INTERVAL '7 days'
      AND (c.lease_until IS NULL OR c.lease_until<NOW())
      AND (c.first_attempt_at IS NULL OR c.first_attempt_at>NOW()-INTERVAL '23 hours')
      AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE)
      AND u.email IS NOT NULL AND u.email NOT LIKE '%.invalid' AND COALESCE(pref.followups_enabled,TRUE)
      AND NOT EXISTS(SELECT 1 FROM public.wallet_transactions w WHERE w.profile_id=p.id AND w.type='deposit' AND w.status='completed' AND w.created_at>=c.created_at)
      AND NOT EXISTS(SELECT 1 FROM public.customer_checkout_followups other WHERE other.profile_id=p.id AND other.id<>c.id AND (other.sent_at>NOW()-INTERVAL '7 days' OR other.first_attempt_at>NOW()-INTERVAL '7 days'))
    ORDER BY c.created_at FOR UPDATE OF c,p SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT u.email INTO email FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE p.id=candidate.profile_id;
  INSERT INTO public.customer_email_preferences(profile_id) VALUES(candidate.profile_id) ON CONFLICT(profile_id) DO NOTHING;
  SELECT unsubscribe_token INTO unsubscribe FROM public.customer_email_preferences WHERE profile_id=candidate.profile_id;
  RETURN QUERY UPDATE public.customer_checkout_followups SET lease_until=NOW()+INTERVAL '2 minutes',attempts=attempts+1,
    first_attempt_at=COALESCE(first_attempt_at,NOW()),recipient=COALESCE(recipient,email),sender=COALESCE(sender,p_sender),reply_to=COALESCE(reply_to,p_reply_to),unsubscribe_token=COALESCE(unsubscribe_token,unsubscribe)
    WHERE id=candidate.id RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_customer_followup(TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_customer_followup(TEXT,TEXT) TO service_role;

-- ================================================================
-- customer-followups-pending-upgrade.sql
-- ================================================================
-- Run after customer-followups-upgrade.sql. New pending deposits (including
-- Android/bot payments) become eligible for a help email if never completed.
-- This records intent only; it neither changes balances nor cancels payments.
ALTER TABLE public.customer_checkout_followups
  ADD COLUMN IF NOT EXISTS transaction_id UUID UNIQUE REFERENCES public.wallet_transactions(id);

CREATE OR REPLACE FUNCTION public.track_customer_payment_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE attempt UUID;
BEGIN
  IF NEW.type <> 'deposit' OR NEW.status NOT IN ('pending','completed','failed') THEN RETURN NEW; END IF;

  IF NEW.status = 'pending' THEN
    -- Only the first pending insert should create a follow-up. Reuse a recent
    -- website checkout event where possible so one attempt yields one email.
    IF TG_OP = 'INSERT' THEN
      SELECT id INTO attempt FROM public.customer_checkout_followups
        WHERE profile_id = NEW.profile_id AND transaction_id IS NULL
          AND state IN ('started','cancelled') AND sent_at IS NULL
          AND created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
      IF attempt IS NULL THEN
        INSERT INTO public.customer_checkout_followups(profile_id,state,method,transaction_id)
          VALUES (NEW.profile_id,'started',NEW.payment_method,NEW.id);
      ELSE
        UPDATE public.customer_checkout_followups
          SET transaction_id = NEW.id, method = NEW.payment_method, last_activity_at = NOW()
          WHERE id = attempt;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    UPDATE public.customer_checkout_followups SET state = 'completed', lease_until = NULL
      WHERE profile_id = NEW.profile_id AND sent_at IS NULL
        AND (transaction_id = NEW.id OR created_at <= NEW.created_at);
    RETURN NEW;
  END IF;

  SELECT id INTO attempt FROM public.customer_checkout_followups
    WHERE transaction_id = NEW.id AND profile_id = NEW.profile_id AND sent_at IS NULL
    FOR UPDATE;
  IF attempt IS NULL THEN
    SELECT id INTO attempt FROM public.customer_checkout_followups
      WHERE profile_id = NEW.profile_id AND transaction_id IS NULL
        AND created_at <= NEW.created_at AND created_at > NOW() - INTERVAL '7 days'
        AND state <> 'completed' AND sent_at IS NULL
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;
  IF attempt IS NULL THEN
    INSERT INTO public.customer_checkout_followups(profile_id,state,method,transaction_id)
      VALUES (NEW.profile_id,'issue',NEW.payment_method,NEW.id);
  ELSE
    UPDATE public.customer_checkout_followups
      SET state = 'issue', transaction_id = NEW.id, method = NEW.payment_method,
          last_activity_at = NOW()
      WHERE id = attempt;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_payment_outcome() FROM PUBLIC,anon,authenticated;

-- ================================================================
-- refund-process-upgrade.sql
-- ================================================================
-- Run after platform upgrades. Refund requests never create automatic credits.
-- Approved unused-deposit returns are reserved before manual original-source payout.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refund_hold BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID UNIQUE NOT NULL REFERENCES public.wallet_transactions(id),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 20 AND 2000),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','held','credited','paid','rejected')),
  approved_amount_xaf NUMERIC(12,2), reserved_amount_xaf NUMERIC(12,2) NOT NULL DEFAULT 0,
  review_note TEXT, payout_reference TEXT UNIQUE,
  reviewed_by UUID REFERENCES public.profiles(id), reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS refund_one_hold_per_profile ON public.refund_requests(profile_id) WHERE state='held';
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.refund_requests TO service_role;
CREATE TABLE IF NOT EXISTS public.refund_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),request_id UUID NOT NULL REFERENCES public.refund_requests(id),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),action TEXT NOT NULL,note TEXT NOT NULL,amount_xaf NUMERIC,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.refund_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_review_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.refund_review_events TO service_role;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS refund_for_transaction_id UUID REFERENCES public.wallet_transactions(id);
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS refund_request_id UUID REFERENCES public.refund_requests(id);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_refund_source_once ON public.wallet_transactions(refund_for_transaction_id) WHERE type='refund' AND refund_for_transaction_id IS NOT NULL;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK(type IN ('deposit','sms_purchase','smm_order','account_purchase','refund','refund_hold'));

CREATE OR REPLACE FUNCTION public.submit_refund_request(p_profile UUID,p_transaction UUID,p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source public.wallet_transactions%ROWTYPE; existing UUID; result UUID;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
  SELECT * INTO source FROM public.wallet_transactions WHERE id=p_transaction AND profile_id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction unavailable'; END IF;
  SELECT id INTO existing FROM public.refund_requests WHERE transaction_id=source.id AND profile_id=p_profile;
  IF FOUND THEN RETURN existing; END IF;
  IF source.status<>'completed' OR source.type NOT IN ('deposit','sms_purchase','smm_order','account_purchase') THEN RAISE EXCEPTION 'This transaction is not eligible for a new request'; END IF;
  IF source.created_at<NOW()-INTERVAL '7 days' THEN RAISE EXCEPTION 'Standard request window ended; contact support for an exceptional or statutory-rights review'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Describe the issue in 20 to 2000 characters'; END IF;
  INSERT INTO public.refund_requests(profile_id,transaction_id,reason) VALUES(p_profile,source.id,trim(p_reason)) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_refund_request(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_refund_request(UUID,UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.review_refund_request(p_request UUID,p_reviewer UUID,p_action TEXT,p_amount NUMERIC,p_note TEXT,p_payout_reference TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request public.refund_requests%ROWTYPE; source public.wallet_transactions%ROWTYPE; balance NUMERIC; max_credit NUMERIC; sms public.sms_orders%ROWTYPE; smm public.smm_orders%ROWTYPE; account public.account_orders%ROWTYPE;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.id=p_reviewer AND p.role='admin' AND lower(u.email)='mohammednurdine6@gmail.com' AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE)) THEN RAISE EXCEPTION 'Verified owner required'; END IF;
  IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'A verified review explanation is required'; END IF;
  SELECT * INTO request FROM public.refund_requests WHERE id=p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable'; END IF;
  -- Same lock order as top-up reservation: profile first, then request/source.
  SELECT balance_xaf INTO balance FROM public.profiles WHERE id=request.profile_id FOR UPDATE;
  SELECT * INTO request FROM public.refund_requests WHERE id=p_request FOR UPDATE;
  SELECT * INTO source FROM public.wallet_transactions WHERE id=request.transaction_id AND profile_id=request.profile_id FOR UPDATE;
  IF p_action='reopen' THEN
    IF request.state<>'rejected' OR source.status<>'completed' OR request.reserved_amount_xaf<>0 THEN RAISE EXCEPTION 'Only a declined, unreserved request can be reopened'; END IF;
    INSERT INTO public.refund_review_events(request_id,reviewer_id,action,note) VALUES(request.id,p_reviewer,p_action,trim(p_note));
    UPDATE public.refund_requests SET state='pending',approved_amount_xaf=NULL,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'pending';
  END IF;
  IF request.state NOT IN ('pending','held') THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
  INSERT INTO public.refund_review_events(request_id,reviewer_id,action,note,amount_xaf) VALUES(request.id,p_reviewer,p_action,trim(p_note),p_amount);
  IF p_action='reject' THEN
    IF request.state='held' THEN
      INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_request_id)
      VALUES(request.profile_id,request.reserved_amount_xaf,'refund',source.payment_method,'RF-RELEASE-'||request.id||'-'||gen_random_uuid(),'completed','Unused-deposit refund reservation released',request.id);
      UPDATE public.profiles SET refund_hold=FALSE WHERE id=request.profile_id;
    END IF;
    UPDATE public.refund_requests SET state='rejected',reserved_amount_xaf=0,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'rejected';
  END IF;
  IF p_action='mark_paid' THEN
    IF request.state<>'held' OR source.type<>'deposit' OR p_payout_reference IS NULL OR length(trim(p_payout_reference)) NOT BETWEEN 6 AND 200 THEN RAISE EXCEPTION 'A reserved deposit return and original-source payout reference are required'; END IF;
    IF EXISTS(SELECT 1 FROM public.sms_orders WHERE profile_id=request.profile_id AND status='waiting_sms') OR EXISTS(SELECT 1 FROM public.smm_orders WHERE profile_id=request.profile_id AND status IN ('pending','processing','in_progress')) OR EXISTS(SELECT 1 FROM public.account_orders WHERE profile_id=request.profile_id AND status='pending') THEN RAISE EXCEPTION 'Resolve active orders before marking payout'; END IF;
    UPDATE public.refund_requests SET state='paid',reserved_amount_xaf=0,payout_reference=trim(p_payout_reference),review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    UPDATE public.profiles SET refund_hold=FALSE WHERE id=request.profile_id;
    IF request.approved_amount_xaf=source.amount THEN UPDATE public.wallet_transactions SET status='refunded' WHERE id=source.id; END IF;
    RETURN 'paid';
  END IF;
  IF p_action<>'approve' OR request.state<>'pending' OR source.status<>'completed' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_amount>source.amount OR p_amount<>ROUND(p_amount) THEN RAISE EXCEPTION 'Refund must be a whole positive XAF amount within the original charge'; END IF;
  IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE profile_id=request.profile_id AND type='refund' AND status='completed' AND (refund_for_transaction_id=source.id OR (refund_for_transaction_id IS NULL AND refund_request_id IS NULL AND created_at>=source.created_at))) THEN RAISE EXCEPTION 'Earlier refund needs reconciliation before another credit'; END IF;
  IF source.type='deposit' THEN
    IF balance<p_amount OR EXISTS(SELECT 1 FROM public.refund_requests WHERE profile_id=request.profile_id AND state='held') THEN RAISE EXCEPTION 'Unused funds unavailable or another return is reserved'; END IF;
    IF EXISTS(SELECT 1 FROM public.sms_orders WHERE profile_id=request.profile_id AND status='waiting_sms') OR EXISTS(SELECT 1 FROM public.smm_orders WHERE profile_id=request.profile_id AND status IN ('pending','processing','in_progress')) OR EXISTS(SELECT 1 FROM public.account_orders WHERE profile_id=request.profile_id AND status='pending') THEN RAISE EXCEPTION 'Resolve active orders before reserving unused funds'; END IF;
    UPDATE public.profiles SET balance_xaf=balance_xaf-p_amount,refund_hold=TRUE WHERE id=request.profile_id;
    -- This new ledger type is informational to the existing balance trigger;
    -- the exact reservation debit above happens once in this transaction.
    INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_request_id)
    VALUES(request.profile_id,p_amount,'refund_hold',source.payment_method,'RF-HOLD-'||request.id||'-'||gen_random_uuid(),'completed','Funds reserved for verified original-source deposit return',request.id);
    UPDATE public.refund_requests SET state='held',approved_amount_xaf=p_amount,reserved_amount_xaf=p_amount,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'held';
  END IF;
  max_credit:=source.amount;
  IF source.type='sms_purchase' THEN
    IF source.reference !~ '^(BOT-)?SMS-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO sms FROM public.sms_orders WHERE id=regexp_replace(source.reference,'^(BOT-)?SMS-','')::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR sms.status NOT IN ('expired','canceled') OR sms.sms_code IS NOT NULL THEN RAISE EXCEPTION 'SMS must be verified undelivered and closed'; END IF;
  ELSIF source.type='smm_order' THEN
    IF source.reference !~ '^SMM-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO smm FROM public.smm_orders WHERE id=substring(source.reference FROM 5)::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR smm.status NOT IN ('canceled','partial') OR smm.quantity<=0 OR smm.remains<=0 OR smm.remains>smm.quantity THEN RAISE EXCEPTION 'Verify the closed order and undelivered units'; END IF;
    max_credit:=LEAST(source.amount,CEIL(source.amount*smm.remains/smm.quantity));
  ELSIF source.type='account_purchase' THEN
    IF source.reference !~ '^ACC-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO account FROM public.account_orders WHERE id=substring(source.reference FROM 5)::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR account.status<>'failed' OR account.credentials_data IS NOT NULL THEN RAISE EXCEPTION 'Account delivery must be verified failed'; END IF;
  END IF;
  IF p_amount>max_credit THEN RAISE EXCEPTION 'Amount exceeds the verified undelivered portion'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_for_transaction_id,refund_request_id)
  VALUES(request.profile_id,p_amount,'refund',source.payment_method,'RF-CREDIT-'||request.id,'completed','Verified undelivered-service refund',source.id,request.id);
  UPDATE public.refund_requests SET state='credited',approved_amount_xaf=p_amount,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
  IF p_amount=source.amount THEN UPDATE public.wallet_transactions SET status='refunded' WHERE id=source.id; END IF;
  RETURN 'credited';
END; $$;
REVOKE ALL ON FUNCTION public.review_refund_request(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_refund_request(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_refund_hold_purchases()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE held BOOLEAN;
BEGIN
  IF NEW.type IN ('sms_purchase','smm_order','account_purchase') AND NEW.status='completed' THEN
    SELECT refund_hold INTO held FROM public.profiles WHERE id=NEW.profile_id FOR UPDATE;
    IF held THEN RAISE EXCEPTION 'Purchases paused during an unused-deposit return'; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_refund_hold_purchases() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_refund_hold_purchases ON public.wallet_transactions;
CREATE TRIGGER guard_refund_hold_purchases BEFORE INSERT OR UPDATE OF status ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_refund_hold_purchases();

-- ================================================================
-- sms-providers-upgrade.sql
-- ================================================================
-- Private supplier organisation. BeanSMS is registered, NOT enabled for sales.
-- Run after all-platform-upgrades.sql. Never store API secrets in these tables.
CREATE TABLE IF NOT EXISTS public.sms_providers (
  id TEXT PRIMARY KEY CHECK(id IN ('fivesim','beansms')),
  name TEXT NOT NULL, enabled BOOLEAN NOT NULL DEFAULT FALSE,
  readiness TEXT NOT NULL DEFAULT 'needs_verification' CHECK(readiness IN ('needs_verification','ready','paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.sms_providers(id,name,enabled,readiness) VALUES
 ('fivesim','5SIM',TRUE,'ready'),('beansms','BeanSMS',FALSE,'needs_verification') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.sms_provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),provider_id TEXT NOT NULL REFERENCES public.sms_providers(id),
  canonical_service TEXT NOT NULL,canonical_country TEXT NOT NULL,
  supplier_service TEXT NOT NULL,supplier_country TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,verified_at TIMESTAMPTZ,
  UNIQUE(provider_id,canonical_service,canonical_country),
  CHECK(NOT enabled OR verified_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS public.sms_provider_orders (
  sms_order_id UUID PRIMARY KEY REFERENCES public.sms_orders(id),
  provider_id TEXT NOT NULL REFERENCES public.sms_providers(id),supplier_order_id TEXT NOT NULL,
  supplier_service TEXT,supplier_country TEXT,supplier_operator TEXT,
  quoted_supplier_amount NUMERIC(16,6) CHECK(quoted_supplier_amount>0),
  actual_supplier_amount NUMERIC(16,6) CHECK(actual_supplier_amount>0),
  supplier_currency TEXT CHECK(supplier_currency IN ('USD','RUB')),
  cost_verified BOOLEAN NOT NULL DEFAULT FALSE,
  fx_xaf_per_usd NUMERIC(16,6) CHECK(fx_xaf_per_usd>0),
  sale_xaf NUMERIC(12,2) NOT NULL CHECK(sale_xaf>=0),
  supplier_refund_state TEXT NOT NULL DEFAULT 'not_checked' CHECK(supplier_refund_state IN ('not_checked','pending','confirmed','denied')),
  supplier_refund_reference TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id,supplier_order_id)
);
-- Historical supplier cost is UNKNOWN, not a manufactured profit estimate.
INSERT INTO public.sms_provider_orders(sms_order_id,provider_id,supplier_order_id,supplier_service,supplier_country,sale_xaf)
 SELECT id,'fivesim',provider_order_id,service_code,country_code,price_xaf FROM public.sms_orders WHERE provider_order_id IS NOT NULL
 ON CONFLICT(sms_order_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.track_existing_sms_provider()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.provider_order_id IS NOT NULL THEN
  INSERT INTO public.sms_provider_orders(sms_order_id,provider_id,supplier_order_id,supplier_service,supplier_country,sale_xaf)
   VALUES(NEW.id,'fivesim',NEW.provider_order_id,NEW.service_code,NEW.country_code,NEW.price_xaf) ON CONFLICT(sms_order_id) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_existing_sms_provider() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS track_existing_sms_provider ON public.sms_orders;
CREATE TRIGGER track_existing_sms_provider AFTER INSERT ON public.sms_orders FOR EACH ROW EXECUTE FUNCTION public.track_existing_sms_provider();
-- Customer order rows stay provider-neutral; costs/mappings are server-only.
ALTER TABLE public.sms_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_provider_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_providers,public.sms_provider_services,public.sms_provider_orders FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.sms_providers,public.sms_provider_services,public.sms_provider_orders TO service_role;

-- ================================================================
-- account-service-requests-upgrade.sql
-- ================================================================
-- Manual account-service enquiries. No wallet charge or automatic supplier order.
-- Run after all-platform-upgrades.sql. Supplier identity and notes are private.
CREATE TABLE IF NOT EXISTS public.account_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram','tiktok','other')),
  requirements TEXT NOT NULL CHECK(length(requirements) BETWEEN 10 AND 300),
  quantity INT NOT NULL CHECK(quantity BETWEEN 1 AND 100),
  details TEXT NOT NULL CHECK(length(details) BETWEEN 10 AND 1000),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','reviewing','quoted','resolved','declined','cancelled')),
  quote_xaf NUMERIC(12,2) CHECK(quote_xaf IS NULL OR quote_xaf > 0),
  supplier_id TEXT CHECK(supplier_id IN ('beansms','other')),
  supplier_reference TEXT,
  supplier_cost_amount NUMERIC(16,6) CHECK(supplier_cost_amount IS NULL OR supplier_cost_amount >= 0),
  supplier_cost_currency TEXT CHECK(supplier_cost_currency IN ('USD','XAF')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS account_service_requests_profile_time_idx
  ON public.account_service_requests(profile_id,created_at DESC);
ALTER TABLE public.account_service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_service_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.account_service_requests TO service_role;

CREATE OR REPLACE FUNCTION public.submit_account_service_request(
  p_profile UUID,p_platform TEXT,p_requirements TEXT,p_quantity INT,p_details TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result UUID;
BEGIN
  IF p_platform NOT IN ('facebook','instagram','tiktok','other')
     OR p_requirements IS NULL OR length(trim(p_requirements)) NOT BETWEEN 10 AND 300
     OR p_details IS NULL OR length(trim(p_details)) NOT BETWEEN 10 AND 1000
     OR p_quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid account-service request'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
  IF (SELECT count(*) FROM public.account_service_requests
      WHERE profile_id=p_profile AND created_at>NOW()-INTERVAL '1 day')>=5
    THEN RAISE EXCEPTION 'Daily request limit reached'; END IF;
  INSERT INTO public.account_service_requests(profile_id,platform,requirements,quantity,details)
    VALUES(p_profile,p_platform,trim(p_requirements),p_quantity,trim(p_details)) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_account_service_request(UUID,TEXT,TEXT,INT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_account_service_request(UUID,TEXT,TEXT,INT,TEXT) TO service_role;

-- ================================================================
-- daily-topup-minimum-upgrade.sql
-- ================================================================
-- Run after topup-fees-upgrade.sql. Wallet and settlement remain in XAF.
-- A server cron records the latest ECB USD/EUR observation and derives the
-- USD 3 minimum using BEAC's fixed 655.957 XAF/EUR parity.
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS usd_per_eur_reference NUMERIC(12,6);
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS usd_reference_date DATE;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS minimum_topup_xaf INT NOT NULL DEFAULT 3000;
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_minimum_topup_xaf_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_minimum_topup_xaf_check CHECK (minimum_topup_xaf BETWEEN 900 AND 4000);

CREATE OR REPLACE FUNCTION public.set_daily_topup_reference(p_usd_per_eur NUMERIC,p_date DATE)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE minimum_xaf INT;
BEGIN
  IF p_usd_per_eur IS NULL OR p_usd_per_eur NOT BETWEEN 0.5 AND 2
    OR p_date IS NULL OR p_date>current_date OR p_date<current_date-7
    THEN RAISE EXCEPTION 'Invalid reference observation'; END IF;
  minimum_xaf:=CEIL(3*655.957/p_usd_per_eur);
  UPDATE public.platform_settings SET usd_per_eur_reference=p_usd_per_eur,
    usd_reference_date=p_date,minimum_topup_xaf=minimum_xaf,updated_at=NOW()
    WHERE id=TRUE AND (usd_reference_date IS NULL OR usd_reference_date<=p_date);
  IF NOT FOUND THEN RAISE EXCEPTION 'Reference is older than the current observation'; END IF;
  RETURN minimum_xaf;
END; $$;
REVOKE ALL ON FUNCTION public.set_daily_topup_reference(NUMERIC,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_daily_topup_reference(NUMERIC,DATE) TO service_role;

-- Historical small claims/links remain readable. Creation is guarded by the
-- server and the reservation RPC, whose threshold is the current reference.
ALTER TABLE public.bot_payment_links DROP CONSTRAINT IF EXISTS bot_payment_links_amount_xaf_check;
ALTER TABLE public.bot_payment_links ADD CONSTRAINT bot_payment_links_amount_xaf_check CHECK(amount_xaf>0) NOT VALID;
ALTER TABLE public.manual_payment_claims DROP CONSTRAINT IF EXISTS manual_payment_claims_amount_xaf_check;
ALTER TABLE public.manual_payment_claims ADD CONSTRAINT manual_payment_claims_amount_xaf_check CHECK(amount_xaf>0) NOT VALID;

CREATE OR REPLACE FUNCTION public.submit_crypto_payment(
  p_profile UUID,p_method TEXT,p_hash TEXT,p_crypto NUMERIC,p_credit NUMERIC,p_address TEXT,p_link UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.manual_payment_claims%ROWTYPE; link public.bot_payment_links%ROWTYPE; result UUID; minimum_xaf INT;
BEGIN
  SELECT minimum_topup_xaf INTO minimum_xaf FROM public.platform_settings WHERE id=TRUE;
  IF minimum_xaf IS NULL THEN RAISE EXCEPTION 'Reference minimum unavailable'; END IF;
  IF p_method NOT IN ('usdt_trc20','btc_bitcoin','eth_erc20','eth_bep20') OR p_crypto IS NULL OR p_crypto<=0
     OR p_credit IS NULL OR p_credit<minimum_xaf OR p_credit>10000000 OR p_credit<>ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid payment details'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  SELECT * INTO existing FROM public.manual_payment_claims WHERE payment_method=p_method AND lower(transfer_reference)=lower(p_hash);
  IF FOUND THEN
    IF existing.profile_id=p_profile AND existing.crypto_amount=p_crypto AND existing.amount_xaf=p_credit
      AND existing.bot_payment_link_id IS NOT DISTINCT FROM p_link THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'Payment reference already used';
  END IF;
  IF EXISTS(SELECT 1 FROM public.manual_payment_claims WHERE profile_id=p_profile AND status='pending')
    OR EXISTS(SELECT 1 FROM public.wallet_transactions WHERE profile_id=p_profile AND type='deposit' AND status='pending')
    THEN RAISE EXCEPTION 'An existing payment is being checked'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id=p_link AND profile_id=p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at<=NOW() OR link.payment_reference IS NOT NULL OR link.amount_xaf<>p_credit
      THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    UPDATE public.bot_payment_links SET payment_reference='PVC'||replace(gen_random_uuid()::TEXT,'-','') WHERE id=link.id;
  END IF;
  INSERT INTO public.manual_payment_claims(profile_id,payment_method,transfer_reference,crypto_amount,amount_xaf,service_fee_xaf,receiving_address,bot_payment_link_id)
    VALUES(p_profile,p_method,lower(p_hash),p_crypto,p_credit,CEIL(p_credit*0.02),p_address,p_link) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.start_wallet_topup(p_profile UUID,p_reference TEXT,p_credit NUMERIC,p_method TEXT,p_link UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.wallet_transactions%ROWTYPE; link public.bot_payment_links%ROWTYPE; minimum_xaf INT;
BEGIN
  SELECT minimum_topup_xaf INTO minimum_xaf FROM public.platform_settings WHERE id=TRUE;
  IF minimum_xaf IS NULL THEN RAISE EXCEPTION 'Reference minimum unavailable'; END IF;
  IF p_method NOT IN ('mtn_momo','orange_money') OR p_credit IS NULL OR p_credit<minimum_xaf OR p_credit>10000000 OR p_credit<>ROUND(p_credit)
    THEN RAISE EXCEPTION 'Invalid top-up'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id=p_link AND profile_id=p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at<=NOW() OR link.amount_xaf<>p_credit THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    IF link.payment_reference IS NOT NULL THEN
      SELECT * INTO existing FROM public.wallet_transactions WHERE reference=link.payment_reference AND profile_id=p_profile;
      IF NOT FOUND THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
      RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
    END IF;
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE reference=p_reference;
  IF FOUND THEN
    IF existing.profile_id<>p_profile OR existing.amount<>p_credit OR existing.payment_method<>p_method THEN RAISE EXCEPTION 'Request ID already used'; END IF;
    RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE profile_id=p_profile AND type='deposit' AND status='pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    IF p_link IS NOT NULL THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
    RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
  END IF;
  IF EXISTS(SELECT 1 FROM public.manual_payment_claims WHERE profile_id=p_profile AND status='pending') THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,service_fee_xaf,description)
    VALUES(p_profile,p_credit,'deposit',p_method,p_reference,'pending',0,'Mobile-money wallet top-up; no platform top-up fee');
  IF p_link IS NOT NULL THEN UPDATE public.bot_payment_links SET payment_reference=p_reference WHERE id=link.id; END IF;
  RETURN jsonb_build_object('created',TRUE,'reference',p_reference,'status','pending');
END; $$;
REVOKE ALL ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) TO service_role;

-- Verification may happen after a later daily rate change. A previously
-- submitted claim must not become unreviewable merely because that moved.
CREATE OR REPLACE FUNCTION public.review_manual_payment(p_claim_id UUID,p_reviewer UUID,p_action TEXT,p_amount_xaf NUMERIC DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claim public.manual_payment_claims%ROWTYPE; credit NUMERIC;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE p.id=p_reviewer AND p.role='admin' AND lower(u.email)='mohammednurdine6@gmail.com'
      AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE))
    THEN RAISE EXCEPTION 'Verified owner required'; END IF;
  SELECT * INTO claim FROM public.manual_payment_claims WHERE id=p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment claim not found'; END IF;
  IF claim.status<>'pending' THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;
  IF p_action='reject' THEN
    UPDATE public.manual_payment_claims SET status='rejected',reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=claim.id;
    RETURN 'rejected';
  END IF;
  IF p_action<>'confirm' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  credit:=CASE WHEN claim.payment_method IN ('eth_erc20','eth_bep20','usdt_trc20','btc_bitcoin') THEN p_amount_xaf ELSE claim.amount_xaf END;
  IF credit IS NULL OR credit<=0 OR credit>10000000 OR credit<>ROUND(credit)
    THEN RAISE EXCEPTION 'Verified credit must be a whole positive XAF amount'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(claim.profile_id,credit,'deposit',claim.payment_method,'MANUAL-'||claim.id,'completed',
      'Admin verified manual deposit: '||claim.transfer_reference);
  UPDATE public.manual_payment_claims SET status='confirmed',approved_amount_xaf=credit,
    reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=claim.id;
  RETURN 'confirmed';
END; $$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID,UUID,TEXT,NUMERIC) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID,UUID,TEXT,NUMERIC) TO service_role;

-- ================================================================
-- customer-support-number-upgrade.sql
-- ================================================================
-- Run after the platform settings table exists. This changes public support contacts only.
UPDATE public.platform_settings
SET support_phone = '+237 640 796 062',
    whatsapp_number = '237640796062',
    updated_at = NOW()
WHERE id = TRUE;

-- ECB USD per EUR observation on 2026-10-19: 1.1225.
-- Skip this seed if the SQL is run more than seven days after observation.
DO $$ BEGIN
  IF CURRENT_DATE BETWEEN DATE '2026-10-19' AND DATE '2026-10-19' + 7 THEN
    PERFORM public.set_daily_topup_reference(1.1225, DATE '2026-10-19');
  END IF;
END $$;

COMMIT;

SELECT 'Complete Supabase upgrade applied' AS result,
  (SELECT minimum_topup_xaf FROM public.platform_settings WHERE id=TRUE) AS minimum_topup_xaf,
  (SELECT usd_reference_date FROM public.platform_settings WHERE id=TRUE) AS usd_reference_date;
