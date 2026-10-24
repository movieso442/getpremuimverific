-- Run after topup-fees-upgrade.sql. Wallet and settlement remain in XAF.
-- A server cron records the latest ECB USD/EUR observation and derives the
-- USD 3 minimum using BEAC's fixed 655.957 XAF/EUR parity.
BEGIN;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS usd_per_eur_reference NUMERIC(12,6);
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS usd_reference_date DATE;
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS minimum_topup_xaf INT NOT NULL DEFAULT 3000;
ALTER TABLE public.platform_settings DROP CONSTRAINT IF EXISTS platform_settings_minimum_topup_xaf_check;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_minimum_topup_xaf_check CHECK (minimum_topup_xaf BETWEEN 900 AND 4000);

CREATE OR REPLACE FUNCTION public.set_daily_topup_reference(p_usd_per_eur NUMERIC,p_date DATE)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE minimum_xaf INT;
BEGIN
  IF p_usd_per_eur IS NULL OR p_usd_per_eur NOT BETWEEN 0.5 AND 2
    OR p_date IS NULL OR p_date>current_date OR p_date<current_date-7
    THEN RAISE EXCEPTION 'Invalid reference observation'; END IF;
  minimum_xaf:=CEIL(3*655.957/p_usd_per_eur);
  UPDATE public.platform_settings SET usd_per_eur_reference=p_usd_per_eur,
    usd_reference_date=p_date,minimum_topup_xaf=minimum_xaf,updated_at=NOW()
    WHERE id=TRUE AND (usd_reference_date IS NULL OR usd_reference_date<=p_date);
  IF NOT FOUND THEN RAISE EXCEPTION 'Reference is older than the current observation'; END IF;
  RETURN minimum_xaf;
END; $$;
REVOKE ALL ON FUNCTION public.set_daily_topup_reference(NUMERIC,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_daily_topup_reference(NUMERIC,DATE) TO service_role;

-- Historical small claims/links remain readable. Creation is guarded by the
-- server and the reservation RPC, whose threshold is the current reference.
ALTER TABLE public.bot_payment_links DROP CONSTRAINT IF EXISTS bot_payment_links_amount_xaf_check;
ALTER TABLE public.bot_payment_links ADD CONSTRAINT bot_payment_links_amount_xaf_check CHECK(amount_xaf>0) NOT VALID;
ALTER TABLE public.manual_payment_claims DROP CONSTRAINT IF EXISTS manual_payment_claims_amount_xaf_check;
ALTER TABLE public.manual_payment_claims ADD CONSTRAINT manual_payment_claims_amount_xaf_check CHECK(amount_xaf>0) NOT VALID;

CREATE OR REPLACE FUNCTION public.submit_crypto_payment(
  p_profile UUID,p_method TEXT,p_hash TEXT,p_crypto NUMERIC,p_credit NUMERIC,p_address TEXT,p_link UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.manual_payment_claims%ROWTYPE; link public.bot_payment_links%ROWTYPE; result UUID; minimum_xaf INT;
BEGIN
  SELECT minimum_topup_xaf INTO minimum_xaf FROM public.platform_settings WHERE id=TRUE;
  IF minimum_xaf IS NULL THEN RAISE EXCEPTION 'Reference minimum unavailable'; END IF;
  IF p_method NOT IN ('usdt_trc20','btc_bitcoin','eth_erc20','eth_bep20') OR p_crypto IS NULL OR p_crypto<=0
     OR p_credit IS NULL OR p_credit<minimum_xaf OR p_credit>10000000 OR p_credit<>ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid payment details'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  SELECT * INTO existing FROM public.manual_payment_claims WHERE payment_method=p_method AND lower(transfer_reference)=lower(p_hash);
  IF FOUND THEN
    IF existing.profile_id=p_profile AND existing.crypto_amount=p_crypto AND existing.amount_xaf=p_credit
      AND existing.bot_payment_link_id IS NOT DISTINCT FROM p_link THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'Payment reference already used';
  END IF;
  IF EXISTS(SELECT 1 FROM public.manual_payment_claims WHERE profile_id=p_profile AND status='pending')
    OR EXISTS(SELECT 1 FROM public.wallet_transactions WHERE profile_id=p_profile AND type='deposit' AND status='pending')
    THEN RAISE EXCEPTION 'An existing payment is being checked'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id=p_link AND profile_id=p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at<=NOW() OR link.payment_reference IS NOT NULL OR link.amount_xaf<>p_credit
      THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    UPDATE public.bot_payment_links SET payment_reference='PVC'||replace(gen_random_uuid()::TEXT,'-','') WHERE id=link.id;
  END IF;
  INSERT INTO public.manual_payment_claims(profile_id,payment_method,transfer_reference,crypto_amount,amount_xaf,service_fee_xaf,receiving_address,bot_payment_link_id)
    VALUES(p_profile,p_method,lower(p_hash),p_crypto,p_credit,CEIL(p_credit*0.02),p_address,p_link) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.start_wallet_topup(p_profile UUID,p_reference TEXT,p_credit NUMERIC,p_method TEXT,p_link UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.wallet_transactions%ROWTYPE; link public.bot_payment_links%ROWTYPE; minimum_xaf INT;
BEGIN
  SELECT minimum_topup_xaf INTO minimum_xaf FROM public.platform_settings WHERE id=TRUE;
  IF minimum_xaf IS NULL THEN RAISE EXCEPTION 'Reference minimum unavailable'; END IF;
  IF p_method NOT IN ('mtn_momo','orange_money') OR p_credit IS NULL OR p_credit<minimum_xaf OR p_credit>10000000 OR p_credit<>ROUND(p_credit)
    THEN RAISE EXCEPTION 'Invalid top-up'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id=p_link AND profile_id=p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at<=NOW() OR link.amount_xaf<>p_credit THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    IF link.payment_reference IS NOT NULL THEN
      SELECT * INTO existing FROM public.wallet_transactions WHERE reference=link.payment_reference AND profile_id=p_profile;
      IF NOT FOUND THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
      RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
    END IF;
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE reference=p_reference;
  IF FOUND THEN
    IF existing.profile_id<>p_profile OR existing.amount<>p_credit OR existing.payment_method<>p_method THEN RAISE EXCEPTION 'Request ID already used'; END IF;
    RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE profile_id=p_profile AND type='deposit' AND status='pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    IF p_link IS NOT NULL THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
    RETURN jsonb_build_object('created',FALSE,'reference',existing.reference,'status',existing.status);
  END IF;
  IF EXISTS(SELECT 1 FROM public.manual_payment_claims WHERE profile_id=p_profile AND status='pending') THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,service_fee_xaf,description)
    VALUES(p_profile,p_credit,'deposit',p_method,p_reference,'pending',CEIL(p_credit*0.02),'Mobile-money wallet top-up; 2% platform fee added on top');
  IF p_link IS NOT NULL THEN UPDATE public.bot_payment_links SET payment_reference=p_reference WHERE id=link.id; END IF;
  RETURN jsonb_build_object('created',TRUE,'reference',p_reference,'status','pending');
END; $$;
REVOKE ALL ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) TO service_role;

-- Verification may happen after a later daily rate change. A previously
-- submitted claim must not become unreviewable merely because that moved.
CREATE OR REPLACE FUNCTION public.review_manual_payment(p_claim_id UUID,p_reviewer UUID,p_action TEXT,p_amount_xaf NUMERIC DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE claim public.manual_payment_claims%ROWTYPE; credit NUMERIC;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
    WHERE p.id=p_reviewer AND p.role='admin' AND lower(u.email)='mohammednurdine6@gmail.com'
      AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE))
    THEN RAISE EXCEPTION 'Verified owner required'; END IF;
  SELECT * INTO claim FROM public.manual_payment_claims WHERE id=p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment claim not found'; END IF;
  IF claim.status<>'pending' THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;
  IF p_action='reject' THEN
    UPDATE public.manual_payment_claims SET status='rejected',reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=claim.id;
    RETURN 'rejected';
  END IF;
  IF p_action<>'confirm' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  credit:=CASE WHEN claim.payment_method IN ('eth_erc20','eth_bep20','usdt_trc20','btc_bitcoin') THEN p_amount_xaf ELSE claim.amount_xaf END;
  IF credit IS NULL OR credit<=0 OR credit>10000000 OR credit<>ROUND(credit)
    THEN RAISE EXCEPTION 'Verified credit must be a whole positive XAF amount'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(claim.profile_id,credit,'deposit',claim.payment_method,'MANUAL-'||claim.id,'completed',
      'Admin verified manual deposit: '||claim.transfer_reference);
  UPDATE public.manual_payment_claims SET status='confirmed',approved_amount_xaf=credit,
    reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=claim.id;
  RETURN 'confirmed';
END; $$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID,UUID,TEXT,NUMERIC) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID,UUID,TEXT,NUMERIC) TO service_role;
COMMIT;
