-- Run AFTER bot-customer-upgrade.sql. Approval is manual, never automatic proof.
BEGIN;
ALTER TABLE public.manual_payment_claims ALTER COLUMN bot_payment_link_id DROP NOT NULL;
ALTER TABLE public.manual_payment_claims DROP CONSTRAINT IF EXISTS manual_payment_claims_payment_method_check;
ALTER TABLE public.manual_payment_claims ADD CONSTRAINT manual_payment_claims_payment_method_check
  CHECK (payment_method IN ('mtn_momo', 'orange_money', 'eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin'));
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS crypto_amount NUMERIC(30,18);
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS receiving_address TEXT;
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS approved_amount_xaf NUMERIC(12,2);
DROP INDEX IF EXISTS public.manual_crypto_transaction_unique;
CREATE UNIQUE INDEX manual_crypto_transaction_unique
  ON public.manual_payment_claims(payment_method, lower(transfer_reference))
  WHERE payment_method IN ('eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin');

-- Serialize reviews and commit the wallet deposit + claim together.
CREATE OR REPLACE FUNCTION public.review_manual_payment(p_claim_id UUID, p_reviewer UUID, p_action TEXT, p_amount_xaf NUMERIC DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claim public.manual_payment_claims%ROWTYPE; credit NUMERIC;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_reviewer AND role = 'admin') THEN
    RAISE EXCEPTION 'Administrator required';
  END IF;
  SELECT * INTO claim FROM public.manual_payment_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment claim not found'; END IF;
  IF claim.status <> 'pending' THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;
  IF p_action = 'reject' THEN
    UPDATE public.manual_payment_claims SET status = 'rejected', reviewed_by = p_reviewer, reviewed_at = NOW() WHERE id = claim.id;
    RETURN 'rejected';
  END IF;
  IF p_action <> 'confirm' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  credit := CASE WHEN claim.payment_method IN ('eth_erc20', 'eth_bep20', 'usdt_trc20', 'btc_bitcoin') THEN p_amount_xaf ELSE claim.amount_xaf END;
  IF credit IS NULL OR credit < 3000 OR credit > 10000000 OR credit <> ROUND(credit) THEN
    RAISE EXCEPTION 'Verified credit must be a whole XAF amount between 3000 and 10000000';
  END IF;
  INSERT INTO public.wallet_transactions(profile_id, amount, type, payment_method, reference, status, description)
    VALUES(claim.profile_id, credit, 'deposit', claim.payment_method, 'MANUAL-' || claim.id, 'completed',
      'Admin verified manual deposit: ' || claim.transfer_reference);
  UPDATE public.manual_payment_claims SET status = 'confirmed', approved_amount_xaf = credit,
    reviewed_by = p_reviewer, reviewed_at = NOW() WHERE id = claim.id;
  RETURN 'confirmed';
END;
$$;
REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, UUID, TEXT, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, UUID, TEXT, NUMERIC) TO service_role;

-- Customers must not grant themselves admin or manufacture wallet credits.
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE(full_name, phone_number, currency, avatar_url) ON public.profiles TO authenticated;
REVOKE ALL ON public.manual_payment_claims FROM anon, authenticated;
COMMIT;
