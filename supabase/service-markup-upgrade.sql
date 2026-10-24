-- Add the remaining 1 percentage point to provider-backed SMS and SMM prices.
-- Existing retail prices already include a 2% uplift in application logic;
-- the resulting total service uplift is 3% above the configured base price.
-- This setting applies to new quotes/orders only. Existing balances and orders
-- are not changed. Safe to rerun; a previously configured value is preserved.
BEGIN;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS extra_service_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 1.00;

ALTER TABLE public.platform_settings
  DROP CONSTRAINT IF EXISTS platform_settings_extra_service_markup_percent_check;
ALTER TABLE public.platform_settings
  ADD CONSTRAINT platform_settings_extra_service_markup_percent_check
  CHECK (extra_service_markup_percent BETWEEN 0 AND 10);

COMMIT;
