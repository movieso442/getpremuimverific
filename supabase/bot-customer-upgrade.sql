-- Bot customer identity upgrade
-- Run once in the Supabase SQL Editor before deploying bot account creation.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_chat_id_unique
  ON public.profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- Profiles created by WhatsApp use the verified sender phone number supplied
-- by Meta. Telegram profiles use telegram_chat_id and do not invent a phone.
