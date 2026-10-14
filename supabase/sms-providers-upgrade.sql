-- Private supplier organisation. BeanSMS is registered, NOT enabled for sales.
-- Run after all-platform-upgrades.sql. Never store API secrets in these tables.
BEGIN;
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
COMMIT;
