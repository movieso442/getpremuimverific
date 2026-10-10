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
