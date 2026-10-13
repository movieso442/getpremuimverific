-- Run after all-platform-upgrades.sql, before deploying the 2% top-up release.
-- Historical payments keep a zero fee and are verified at their original amount.
BEGIN;
UPDATE public.platform_settings SET support_phone = '+237 677034736', whatsapp_number = '237677034736', updated_at = NOW() WHERE id = TRUE;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS service_fee_xaf NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee_xaf >= 0);
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS service_fee_xaf NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee_xaf >= 0);
-- The existing wallet trigger credits only `amount`, not this fee.
-- The manual review RPC credits only the verified approved XAF wallet amount.
CREATE OR REPLACE FUNCTION public.copy_manual_payment_fee()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.reference LIKE 'MANUAL-%' THEN
    SELECT service_fee_xaf INTO NEW.service_fee_xaf FROM public.manual_payment_claims
      WHERE 'MANUAL-' || id = NEW.reference;
    NEW.service_fee_xaf := COALESCE(NEW.service_fee_xaf, 0);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.copy_manual_payment_fee() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS copy_manual_payment_fee ON public.wallet_transactions;
CREATE TRIGGER copy_manual_payment_fee BEFORE INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.copy_manual_payment_fee();
-- Serialize crypto submissions, including the bot capability reservation.
-- A retry of the same receipt returns the same claim; another pending claim
-- cannot be created concurrently for this wallet.
CREATE OR REPLACE FUNCTION public.submit_crypto_payment(
  p_profile UUID, p_method TEXT, p_hash TEXT, p_crypto NUMERIC,
  p_credit NUMERIC, p_address TEXT, p_link UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.manual_payment_claims%ROWTYPE; link public.bot_payment_links%ROWTYPE; result UUID;
BEGIN
  IF p_method NOT IN ('usdt_trc20','btc_bitcoin','eth_erc20','eth_bep20') OR p_crypto IS NULL OR p_crypto <= 0
     OR p_credit IS NULL OR p_credit < 3000 OR p_credit > 10000000 OR p_credit <> ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid payment details';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  SELECT * INTO existing FROM public.manual_payment_claims WHERE payment_method = p_method AND lower(transfer_reference) = lower(p_hash);
  IF FOUND THEN
    IF existing.profile_id = p_profile AND existing.crypto_amount = p_crypto AND existing.amount_xaf = p_credit
       AND existing.bot_payment_link_id IS NOT DISTINCT FROM p_link THEN RETURN existing.id; END IF;
    RAISE EXCEPTION 'Payment reference already used';
  END IF;
  IF EXISTS (SELECT 1 FROM public.manual_payment_claims WHERE profile_id = p_profile AND status = 'pending')
     OR EXISTS (SELECT 1 FROM public.wallet_transactions WHERE profile_id = p_profile AND type = 'deposit' AND status = 'pending') THEN
    RAISE EXCEPTION 'An existing payment is being checked';
  END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id = p_link AND profile_id = p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at <= NOW() OR link.payment_reference IS NOT NULL OR link.amount_xaf <> p_credit THEN
      RAISE EXCEPTION 'Payment link unavailable';
    END IF;
    UPDATE public.bot_payment_links SET payment_reference = 'PVC' || replace(gen_random_uuid()::TEXT, '-', '') WHERE id = link.id;
  END IF;
  INSERT INTO public.manual_payment_claims(profile_id, payment_method, transfer_reference, crypto_amount,
    amount_xaf, service_fee_xaf, receiving_address, bot_payment_link_id)
  VALUES (p_profile, p_method, lower(p_hash), p_crypto, p_credit, CEIL(p_credit * 0.02), p_address, p_link)
  RETURNING id INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_crypto_payment(UUID,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,UUID) TO service_role;
CREATE OR REPLACE FUNCTION public.start_wallet_topup(p_profile UUID, p_reference TEXT, p_credit NUMERIC, p_method TEXT, p_link UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.wallet_transactions%ROWTYPE; link public.bot_payment_links%ROWTYPE;
BEGIN
  IF p_method NOT IN ('mtn_momo','orange_money') OR p_credit IS NULL OR p_credit < 3000 OR p_credit > 10000000 OR p_credit <> ROUND(p_credit) THEN
    RAISE EXCEPTION 'Invalid top-up';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet unavailable'; END IF;
  IF p_link IS NOT NULL THEN
    SELECT * INTO link FROM public.bot_payment_links WHERE id = p_link AND profile_id = p_profile FOR UPDATE;
    IF NOT FOUND OR link.expires_at <= NOW() OR link.amount_xaf <> p_credit THEN RAISE EXCEPTION 'Payment link unavailable'; END IF;
    IF link.payment_reference IS NOT NULL THEN
      SELECT * INTO existing FROM public.wallet_transactions WHERE reference = link.payment_reference AND profile_id = p_profile;
      IF NOT FOUND THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
      RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
    END IF;
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE reference = p_reference;
  IF FOUND THEN
    IF existing.profile_id <> p_profile OR existing.amount <> p_credit OR existing.payment_method <> p_method THEN RAISE EXCEPTION 'Request ID already used'; END IF;
    RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
  END IF;
  SELECT * INTO existing FROM public.wallet_transactions WHERE profile_id = p_profile AND type = 'deposit' AND status = 'pending' ORDER BY created_at LIMIT 1;
  IF FOUND THEN
    IF p_link IS NOT NULL THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
    RETURN jsonb_build_object('created', FALSE, 'reference', existing.reference, 'status', existing.status);
  END IF;
  IF EXISTS (SELECT 1 FROM public.manual_payment_claims WHERE profile_id = p_profile AND status = 'pending') THEN RAISE EXCEPTION 'Another payment is being checked'; END IF;
  INSERT INTO public.wallet_transactions(profile_id, amount, type, payment_method, reference, status, service_fee_xaf, description)
    VALUES (p_profile, p_credit, 'deposit', p_method, p_reference, 'pending', CEIL(p_credit * 0.02), 'Wallet top-up; 2% service fee added on top');
  IF p_link IS NOT NULL THEN UPDATE public.bot_payment_links SET payment_reference = p_reference WHERE id = link.id; END IF;
  RETURN jsonb_build_object('created', TRUE, 'reference', p_reference, 'status', 'pending');
END;
$$;
REVOKE ALL ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_wallet_topup(UUID,TEXT,NUMERIC,TEXT,UUID) TO service_role;
COMMIT;
