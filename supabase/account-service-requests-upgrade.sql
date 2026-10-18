-- Manual account-service enquiries. No wallet charge or automatic supplier order.
-- Run after all-platform-upgrades.sql. Supplier identity and notes are private.
BEGIN;
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
COMMIT;
