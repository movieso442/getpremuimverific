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

-- 4. Create SMM Panel Orders Table (JustAnotherPanel Integration)
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

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smm_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Create basic RLS Policies for user ownership access
CREATE POLICY "Users can access own profile" ON public.profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own SMS orders" ON public.sms_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own SMM orders" ON public.smm_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can access own account orders" ON public.account_orders FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can manage API keys" ON public.api_keys FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));
CREATE POLICY "Users can manage webhooks" ON public.webhooks FOR ALL USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Trigger to update balance on deposits
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    IF NEW.type = 'deposit' THEN
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
