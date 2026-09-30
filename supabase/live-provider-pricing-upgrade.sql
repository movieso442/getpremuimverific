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
