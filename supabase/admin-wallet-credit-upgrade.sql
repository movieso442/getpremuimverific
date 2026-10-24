-- Owner-only goodwill or exceptional wallet credit. This is not a provider refund.
-- Apply after wallet-purchase-safety-upgrade.sql. Existing balances are unchanged.
CREATE TABLE IF NOT EXISTS public.admin_wallet_credits (
  id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  amount_xaf NUMERIC(12,2) NOT NULL CHECK (amount_xaf > 0 AND amount_xaf <= 1000000 AND amount_xaf = ROUND(amount_xaf)),
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 20 AND 2000),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  transaction_id UUID UNIQUE REFERENCES public.wallet_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_wallet_credits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_wallet_credits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_wallet_credits TO service_role;

ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('deposit','sms_purchase','smm_order','account_purchase','refund','refund_hold','admin_credit'));

CREATE OR REPLACE FUNCTION public.update_user_balance()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed') THEN
    IF NEW.type IN ('deposit', 'refund', 'admin_credit') THEN
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

CREATE OR REPLACE FUNCTION public.issue_admin_wallet_credit(
  p_id UUID, p_profile UUID, p_reviewer UUID, p_amount NUMERIC, p_reason TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.admin_wallet_credits%ROWTYPE; credit_transaction_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
      WHERE p.id = p_reviewer AND p.role = 'admin'
        AND lower(u.email) = 'mohammednurdine6@gmail.com'
        AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE))
    THEN RAISE EXCEPTION 'Verified owner required'; END IF;
  IF p_id IS NULL OR p_profile IS NULL OR p_amount IS NULL OR p_amount <= 0
     OR p_amount > 1000000 OR p_amount <> ROUND(p_amount)
     OR p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 20 AND 2000
    THEN RAISE EXCEPTION 'Invalid wallet credit'; END IF;
  SELECT * INTO existing FROM public.admin_wallet_credits WHERE id = p_id;
  IF FOUND THEN
    IF existing.profile_id = p_profile AND existing.reviewer_id = p_reviewer
       AND existing.amount_xaf = p_amount AND existing.reason = trim(p_reason)
      THEN RETURN existing.transaction_id; END IF;
    RAISE EXCEPTION 'Credit request ID already used';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer wallet unavailable'; END IF;
  SELECT * INTO existing FROM public.admin_wallet_credits WHERE id = p_id;
  IF FOUND THEN
    IF existing.profile_id = p_profile AND existing.reviewer_id = p_reviewer
       AND existing.amount_xaf = p_amount AND existing.reason = trim(p_reason)
      THEN RETURN existing.transaction_id; END IF;
    RAISE EXCEPTION 'Credit request ID already used';
  END IF;
  INSERT INTO public.admin_wallet_credits(id,profile_id,amount_xaf,reason,reviewer_id)
    VALUES(p_id,p_profile,p_amount,trim(p_reason),p_reviewer);
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(p_profile,p_amount,'admin_credit','admin_adjustment','ADMIN-CREDIT-'||p_id,'completed',trim(p_reason))
    RETURNING id INTO credit_transaction_id;
  UPDATE public.admin_wallet_credits SET transaction_id = credit_transaction_id WHERE id = p_id;
  RETURN credit_transaction_id;
END; $$;
REVOKE ALL ON FUNCTION public.issue_admin_wallet_credit(UUID,UUID,UUID,NUMERIC,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.issue_admin_wallet_credit(UUID,UUID,UUID,NUMERIC,TEXT) TO service_role;
