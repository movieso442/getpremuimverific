-- Reserve wallet funds before any paid supplier request. Safe to rerun.
-- Existing orders and balances are deliberately not modified.
CREATE TABLE IF NOT EXISTS public.wallet_purchase_reservations (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('smm_order', 'sms_purchase')),
  source TEXT NOT NULL CHECK (source IN ('web', 'bot')),
  amount_xaf NUMERIC(12,2) NOT NULL CHECK (amount_xaf > 0 AND amount_xaf = ROUND(amount_xaf)),
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'submitted', 'released')),
  provider_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.wallet_purchase_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wallet_purchase_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.wallet_purchase_reservations TO service_role;

-- A completed purchase ledger debit must fail if the wallet cannot cover it.
-- The conditional UPDATE takes a row lock, so concurrent debits serialize.
CREATE OR REPLACE FUNCTION public.update_user_balance()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    IF NEW.type IN ('deposit', 'refund') THEN
      UPDATE public.profiles SET balance_xaf = balance_xaf + NEW.amount WHERE id = NEW.profile_id;
    ELSIF NEW.type IN ('sms_purchase', 'smm_order', 'account_purchase') THEN
      UPDATE public.profiles SET balance_xaf = balance_xaf - NEW.amount
        WHERE id = NEW.profile_id AND balance_xaf >= NEW.amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.update_user_balance() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_wallet_purchase(
  p_id UUID, p_profile UUID, p_type TEXT, p_source TEXT, p_amount NUMERIC
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wallet public.profiles%ROWTYPE; reference TEXT;
BEGIN
  IF p_id IS NULL OR p_profile IS NULL OR p_type NOT IN ('smm_order','sms_purchase')
     OR p_source NOT IN ('web','bot') OR p_amount IS NULL OR p_amount <= 0
     OR p_amount <> ROUND(p_amount) THEN RAISE EXCEPTION 'Invalid purchase reservation'; END IF;
  SELECT * INTO wallet FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  IF wallet.refund_hold THEN RAISE EXCEPTION 'Purchases paused during refund review'; END IF;
  IF COALESCE(wallet.balance_xaf, 0) < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
  reference := CASE WHEN p_type = 'smm_order' THEN 'SMM-'
    WHEN p_source = 'bot' THEN 'BOT-SMS-' ELSE 'SMS-' END || p_id;
  INSERT INTO public.wallet_purchase_reservations(id,profile_id,purchase_type,source,amount_xaf)
    VALUES(p_id,p_profile,p_type,p_source,p_amount);
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(p_profile,p_amount,p_type,'wallet',reference,'completed','Wallet funds reserved before supplier request');
  RETURN p_id;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_wallet_purchase(UUID,UUID,TEXT,TEXT,NUMERIC) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_wallet_purchase(UUID,UUID,TEXT,TEXT,NUMERIC) TO service_role;

-- Record supplier acceptance before saving the customer-facing order. If that
-- save fails, the reservation and supplier ID remain available for reconciliation.
CREATE OR REPLACE FUNCTION public.mark_wallet_purchase_submitted(p_id UUID,p_provider_order_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_provider_order_id IS NULL OR length(trim(p_provider_order_id)) = 0 THEN RAISE EXCEPTION 'Supplier order ID required'; END IF;
  UPDATE public.wallet_purchase_reservations SET state='submitted',provider_order_id=trim(p_provider_order_id),updated_at=NOW()
    WHERE id=p_id AND (state='reserved' OR (state='submitted' AND provider_order_id=trim(p_provider_order_id)));
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase reservation unavailable'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.mark_wallet_purchase_submitted(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_wallet_purchase_submitted(UUID,TEXT) TO service_role;

-- Only a definite supplier rejection can release a still-unsubmitted purchase.
-- Network timeouts and unknown supplier outcomes require manual reconciliation.
CREATE OR REPLACE FUNCTION public.release_wallet_purchase(p_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reservation public.wallet_purchase_reservations%ROWTYPE;
BEGIN
  SELECT * INTO reservation FROM public.wallet_purchase_reservations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase reservation unavailable'; END IF;
  IF reservation.state='released' THEN RETURN FALSE; END IF;
  IF reservation.state<>'reserved' OR reservation.provider_order_id IS NOT NULL THEN
    RAISE EXCEPTION 'Accepted supplier purchase cannot be automatically released';
  END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(reservation.profile_id,reservation.amount_xaf,'refund','wallet','PURCHASE-RELEASE-'||p_id,'completed',
      'Supplier declined purchase before creating an order');
  UPDATE public.wallet_purchase_reservations SET state='released',updated_at=NOW() WHERE id=p_id;
  RETURN TRUE;
END; $$;
REVOKE ALL ON FUNCTION public.release_wallet_purchase(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_wallet_purchase(UUID) TO service_role;

-- Browser roles may read their own orders, but only trusted server code may
-- create or change supplier-backed orders.
REVOKE INSERT,UPDATE,DELETE ON public.smm_orders,public.sms_orders FROM anon,authenticated;
