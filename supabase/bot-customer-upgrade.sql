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
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf >= 500),
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
  amount_xaf NUMERIC(12, 2) NOT NULL CHECK (amount_xaf >= 500),
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
