-- Run after topup-fees-upgrade.sql and the platform upgrades.
-- Card data never enters these tables. Only service_role may operate checkout.
BEGIN;
CREATE TABLE IF NOT EXISTS public.payunit_card_checkouts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), profile_id UUID NOT NULL REFERENCES public.profiles(id),
 transaction_id UUID UNIQUE NOT NULL REFERENCES public.wallet_transactions(id),
 request_key UUID NOT NULL, checkout_id TEXT UNIQUE, checkout_url TEXT,
 expires_at TIMESTAMPTZ, verify_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(profile_id,request_key)
);
ALTER TABLE public.payunit_card_checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payunit_card_checkouts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.payunit_card_checkouts TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_card_topup(p_profile UUID,p_key UUID,p_amount NUMERIC)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE session public.payunit_card_checkouts%ROWTYPE; payment public.wallet_transactions%ROWTYPE; ref TEXT;
BEGIN
 IF p_key IS NULL OR p_amount IS NULL OR p_amount<3000 OR p_amount>100000 OR p_amount<>ROUND(p_amount) THEN RAISE EXCEPTION 'Card top-ups must be whole amounts from 3000 to 100000 XAF'; END IF;
 PERFORM 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.id=p_profile AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE) FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'Verified wallet required'; END IF;
 SELECT * INTO session FROM public.payunit_card_checkouts WHERE profile_id=p_profile AND request_key=p_key;
 IF FOUND THEN
  SELECT * INTO payment FROM public.wallet_transactions WHERE id=session.transaction_id;
  IF payment.amount<>p_amount THEN RAISE EXCEPTION 'Request already used for a different amount'; END IF;
  RETURN jsonb_build_object('created',FALSE,'reference',payment.reference,'status',payment.status,'checkout_url',session.checkout_url,'expires_at',session.expires_at);
 END IF;
 IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE profile_id=p_profile AND type='deposit' AND status='pending') OR EXISTS(SELECT 1 FROM public.manual_payment_claims WHERE profile_id=p_profile AND status='pending') THEN RAISE EXCEPTION 'An existing payment needs checking before another top-up'; END IF;
 IF (SELECT count(*) FROM public.payunit_card_checkouts WHERE profile_id=p_profile AND created_at>NOW()-INTERVAL '1 hour')>=3 THEN RAISE EXCEPTION 'Too many card checkout attempts; try later or contact support'; END IF;
 IF (SELECT COALESCE(sum(w.amount),0) FROM public.payunit_card_checkouts c JOIN public.wallet_transactions w ON w.id=c.transaction_id WHERE c.profile_id=p_profile AND c.created_at>NOW()-INTERVAL '24 hours')+p_amount>200000 THEN RAISE EXCEPTION 'Daily card top-up limit reached'; END IF;
 ref:='PC'||substring(replace(gen_random_uuid()::TEXT,'-','') FROM 1 FOR 17);
 INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,service_fee_xaf,description)
 VALUES(p_profile,p_amount,'deposit','payunit_card',ref,'pending',CEIL(p_amount*0.014),'Card wallet top-up; 1.4% service fee added on top') RETURNING * INTO payment;
 INSERT INTO public.payunit_card_checkouts(profile_id,transaction_id,request_key) VALUES(p_profile,payment.id,p_key);
 RETURN jsonb_build_object('created',TRUE,'reference',ref,'status','pending');
END; $$;

CREATE OR REPLACE FUNCTION public.attach_card_checkout(p_reference TEXT,p_checkout TEXT,p_url TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_checkout IS NULL OR p_url IS NULL OR p_checkout !~ '^PU_LIVE_[a-fA-F0-9-]{36}$' OR p_url<>'https://checkout.payunit.net/'||p_checkout THEN RAISE EXCEPTION 'Invalid live hosted checkout'; END IF;
 UPDATE public.payunit_card_checkouts c SET checkout_id=p_checkout,checkout_url=p_url,expires_at=NOW()+INTERVAL '15 minutes'
 FROM public.wallet_transactions w WHERE w.id=c.transaction_id AND w.reference=p_reference AND w.payment_method='payunit_card' AND w.status='pending' AND c.checkout_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Checkout is already initialized or unavailable'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.claim_card_verification(p_reference TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result TEXT;
BEGIN
 UPDATE public.payunit_card_checkouts c SET verify_after=NOW()+INTERVAL '5 seconds' FROM public.wallet_transactions w
 WHERE c.transaction_id=w.id AND w.reference=p_reference AND w.status='pending' AND w.payment_method='payunit_card' AND c.checkout_id IS NOT NULL AND c.verify_after<=NOW()
 RETURNING c.checkout_id INTO result;
 RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_card_topup(p_reference TEXT,p_checkout TEXT,p_amount NUMERIC,p_currency TEXT,p_mode TEXT,p_status TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE payment public.wallet_transactions%ROWTYPE; session public.payunit_card_checkouts%ROWTYPE; next_status TEXT;
BEGIN
 SELECT * INTO payment FROM public.wallet_transactions WHERE reference=p_reference AND payment_method='payunit_card' AND type='deposit' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Card payment unavailable'; END IF;
 SELECT * INTO session FROM public.payunit_card_checkouts WHERE transaction_id=payment.id;
 IF NOT FOUND OR session.checkout_id IS NULL OR session.checkout_id IS DISTINCT FROM p_checkout OR p_amount IS DISTINCT FROM (payment.amount+payment.service_fee_xaf) OR p_currency IS DISTINCT FROM 'XAF' OR p_mode IS DISTINCT FROM 'LIVE' OR payment.service_fee_xaf<>CEIL(payment.amount*0.014) THEN RAISE EXCEPTION 'Provider payment proof does not match the reserved wallet top-up'; END IF;
 IF payment.status<>'pending' THEN RETURN payment.status; END IF;
 next_status:=CASE WHEN p_status='SUCCESS' THEN 'completed' WHEN p_status IN ('FAILED','CANCELLED') THEN 'failed' ELSE 'pending' END;
 IF next_status<>'pending' THEN UPDATE public.wallet_transactions SET status=next_status WHERE id=payment.id AND status='pending'; END IF;
 RETURN next_status;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_card_topup(UUID,UUID,NUMERIC),public.attach_card_checkout(TEXT,TEXT,TEXT),public.claim_card_verification(TEXT),public.finalize_card_topup(TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_card_topup(UUID,UUID,NUMERIC),public.attach_card_checkout(TEXT,TEXT,TEXT),public.claim_card_verification(TEXT),public.finalize_card_topup(TEXT,TEXT,NUMERIC,TEXT,TEXT,TEXT) TO service_role;
COMMIT;
