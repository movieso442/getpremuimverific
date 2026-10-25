-- Run after platform upgrades. Refund requests never create automatic credits.
-- Approved unused-deposit returns are reserved before manual original-source payout.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refund_hold BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_id UUID UNIQUE NOT NULL REFERENCES public.wallet_transactions(id),
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 20 AND 2000),
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','held','credited','paid','rejected')),
  approved_amount_xaf NUMERIC(12,2), reserved_amount_xaf NUMERIC(12,2) NOT NULL DEFAULT 0,
  review_note TEXT, payout_reference TEXT UNIQUE,
  reviewed_by UUID REFERENCES public.profiles(id), reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS refund_one_hold_per_profile ON public.refund_requests(profile_id) WHERE state='held';
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_requests FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.refund_requests TO service_role;
CREATE TABLE IF NOT EXISTS public.refund_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),request_id UUID NOT NULL REFERENCES public.refund_requests(id),
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),action TEXT NOT NULL,note TEXT NOT NULL,amount_xaf NUMERIC,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.refund_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.refund_review_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.refund_review_events TO service_role;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS refund_for_transaction_id UUID REFERENCES public.wallet_transactions(id);
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS refund_request_id UUID REFERENCES public.refund_requests(id);
CREATE UNIQUE INDEX IF NOT EXISTS wallet_refund_source_once ON public.wallet_transactions(refund_for_transaction_id) WHERE type='refund' AND refund_for_transaction_id IS NOT NULL;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
-- Preserve admin credits created by admin-wallet-credit-upgrade.sql on projects
-- that already have them; otherwise rebuilding this check rejects existing rows.
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check
  CHECK(type IN ('deposit','sms_purchase','smm_order','account_purchase','refund','refund_hold','admin_credit'));

CREATE OR REPLACE FUNCTION public.submit_refund_request(p_profile UUID,p_transaction UUID,p_reason TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source public.wallet_transactions%ROWTYPE; existing UUID; result UUID;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
  SELECT * INTO source FROM public.wallet_transactions WHERE id=p_transaction AND profile_id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction unavailable'; END IF;
  SELECT id INTO existing FROM public.refund_requests WHERE transaction_id=source.id AND profile_id=p_profile;
  IF FOUND THEN RETURN existing; END IF;
  IF source.status<>'completed' OR source.type NOT IN ('deposit','sms_purchase','smm_order','account_purchase') THEN RAISE EXCEPTION 'This transaction is not eligible for a new request'; END IF;
  IF source.created_at<NOW()-INTERVAL '7 days' THEN RAISE EXCEPTION 'Standard request window ended; contact support for an exceptional or statutory-rights review'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'Describe the issue in 20 to 2000 characters'; END IF;
  INSERT INTO public.refund_requests(profile_id,transaction_id,reason) VALUES(p_profile,source.id,trim(p_reason)) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.submit_refund_request(UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_refund_request(UUID,UUID,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.review_refund_request(p_request UUID,p_reviewer UUID,p_action TEXT,p_amount NUMERIC,p_note TEXT,p_payout_reference TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request public.refund_requests%ROWTYPE; source public.wallet_transactions%ROWTYPE; balance NUMERIC; max_credit NUMERIC; sms public.sms_orders%ROWTYPE; smm public.smm_orders%ROWTYPE; account public.account_orders%ROWTYPE;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.id=p_reviewer AND p.role='admin' AND lower(u.email)='mohammednurdine6@gmail.com' AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE)) THEN RAISE EXCEPTION 'Verified owner required'; END IF;
  IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 20 AND 2000 THEN RAISE EXCEPTION 'A verified review explanation is required'; END IF;
  SELECT * INTO request FROM public.refund_requests WHERE id=p_request;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request unavailable'; END IF;
  -- Same lock order as top-up reservation: profile first, then request/source.
  SELECT balance_xaf INTO balance FROM public.profiles WHERE id=request.profile_id FOR UPDATE;
  SELECT * INTO request FROM public.refund_requests WHERE id=p_request FOR UPDATE;
  SELECT * INTO source FROM public.wallet_transactions WHERE id=request.transaction_id AND profile_id=request.profile_id FOR UPDATE;
  IF p_action='reopen' THEN
    IF request.state<>'rejected' OR source.status<>'completed' OR request.reserved_amount_xaf<>0 THEN RAISE EXCEPTION 'Only a declined, unreserved request can be reopened'; END IF;
    INSERT INTO public.refund_review_events(request_id,reviewer_id,action,note) VALUES(request.id,p_reviewer,p_action,trim(p_note));
    UPDATE public.refund_requests SET state='pending',approved_amount_xaf=NULL,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'pending';
  END IF;
  IF request.state NOT IN ('pending','held') THEN RAISE EXCEPTION 'Request already reviewed'; END IF;
  INSERT INTO public.refund_review_events(request_id,reviewer_id,action,note,amount_xaf) VALUES(request.id,p_reviewer,p_action,trim(p_note),p_amount);
  IF p_action='reject' THEN
    IF request.state='held' THEN
      INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_request_id)
      VALUES(request.profile_id,request.reserved_amount_xaf,'refund',source.payment_method,'RF-RELEASE-'||request.id||'-'||gen_random_uuid(),'completed','Unused-deposit refund reservation released',request.id);
      UPDATE public.profiles SET refund_hold=FALSE WHERE id=request.profile_id;
    END IF;
    UPDATE public.refund_requests SET state='rejected',reserved_amount_xaf=0,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'rejected';
  END IF;
  IF p_action='mark_paid' THEN
    IF request.state<>'held' OR source.type<>'deposit' OR p_payout_reference IS NULL OR length(trim(p_payout_reference)) NOT BETWEEN 6 AND 200 THEN RAISE EXCEPTION 'A reserved deposit return and original-source payout reference are required'; END IF;
    IF EXISTS(SELECT 1 FROM public.sms_orders WHERE profile_id=request.profile_id AND status='waiting_sms') OR EXISTS(SELECT 1 FROM public.smm_orders WHERE profile_id=request.profile_id AND status IN ('pending','processing','in_progress')) OR EXISTS(SELECT 1 FROM public.account_orders WHERE profile_id=request.profile_id AND status='pending') THEN RAISE EXCEPTION 'Resolve active orders before marking payout'; END IF;
    UPDATE public.refund_requests SET state='paid',reserved_amount_xaf=0,payout_reference=trim(p_payout_reference),review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    UPDATE public.profiles SET refund_hold=FALSE WHERE id=request.profile_id;
    IF request.approved_amount_xaf=source.amount THEN UPDATE public.wallet_transactions SET status='refunded' WHERE id=source.id; END IF;
    RETURN 'paid';
  END IF;
  IF p_action<>'approve' OR request.state<>'pending' OR source.status<>'completed' THEN RAISE EXCEPTION 'Invalid review action'; END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_amount>source.amount OR p_amount<>ROUND(p_amount) THEN RAISE EXCEPTION 'Refund must be a whole positive XAF amount within the original charge'; END IF;
  IF EXISTS(SELECT 1 FROM public.wallet_transactions WHERE profile_id=request.profile_id AND type='refund' AND status='completed' AND (refund_for_transaction_id=source.id OR (refund_for_transaction_id IS NULL AND refund_request_id IS NULL AND created_at>=source.created_at))) THEN RAISE EXCEPTION 'Earlier refund needs reconciliation before another credit'; END IF;
  IF source.type='deposit' THEN
    IF balance<p_amount OR EXISTS(SELECT 1 FROM public.refund_requests WHERE profile_id=request.profile_id AND state='held') THEN RAISE EXCEPTION 'Unused funds unavailable or another return is reserved'; END IF;
    IF EXISTS(SELECT 1 FROM public.sms_orders WHERE profile_id=request.profile_id AND status='waiting_sms') OR EXISTS(SELECT 1 FROM public.smm_orders WHERE profile_id=request.profile_id AND status IN ('pending','processing','in_progress')) OR EXISTS(SELECT 1 FROM public.account_orders WHERE profile_id=request.profile_id AND status='pending') THEN RAISE EXCEPTION 'Resolve active orders before reserving unused funds'; END IF;
    UPDATE public.profiles SET balance_xaf=balance_xaf-p_amount,refund_hold=TRUE WHERE id=request.profile_id;
    -- This new ledger type is informational to the existing balance trigger;
    -- the exact reservation debit above happens once in this transaction.
    INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_request_id)
    VALUES(request.profile_id,p_amount,'refund_hold',source.payment_method,'RF-HOLD-'||request.id||'-'||gen_random_uuid(),'completed','Funds reserved for verified original-source deposit return',request.id);
    UPDATE public.refund_requests SET state='held',approved_amount_xaf=p_amount,reserved_amount_xaf=p_amount,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
    RETURN 'held';
  END IF;
  max_credit:=source.amount;
  IF source.type='sms_purchase' THEN
    IF source.reference !~ '^(BOT-)?SMS-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO sms FROM public.sms_orders WHERE id=regexp_replace(source.reference,'^(BOT-)?SMS-','')::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR sms.status NOT IN ('expired','canceled') OR sms.sms_code IS NOT NULL THEN RAISE EXCEPTION 'SMS must be verified undelivered and closed'; END IF;
  ELSIF source.type='smm_order' THEN
    IF source.reference !~ '^SMM-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO smm FROM public.smm_orders WHERE id=substring(source.reference FROM 5)::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR smm.status NOT IN ('canceled','partial') OR smm.quantity<=0 OR smm.remains<=0 OR smm.remains>smm.quantity THEN RAISE EXCEPTION 'Verify the closed order and undelivered units'; END IF;
    max_credit:=LEAST(source.amount,CEIL(source.amount*smm.remains/smm.quantity));
  ELSIF source.type='account_purchase' THEN
    IF source.reference !~ '^ACC-[a-fA-F0-9-]{36}$' THEN RAISE EXCEPTION 'Original order link needs manual reconciliation'; END IF;
    SELECT * INTO account FROM public.account_orders WHERE id=substring(source.reference FROM 5)::UUID AND profile_id=request.profile_id FOR UPDATE;
    IF NOT FOUND OR account.status<>'failed' OR account.credentials_data IS NOT NULL THEN RAISE EXCEPTION 'Account delivery must be verified failed'; END IF;
  END IF;
  IF p_amount>max_credit THEN RAISE EXCEPTION 'Amount exceeds the verified undelivered portion'; END IF;
  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description,refund_for_transaction_id,refund_request_id)
  VALUES(request.profile_id,p_amount,'refund',source.payment_method,'RF-CREDIT-'||request.id,'completed','Verified undelivered-service refund',source.id,request.id);
  UPDATE public.refund_requests SET state='credited',approved_amount_xaf=p_amount,review_note=trim(p_note),reviewed_by=p_reviewer,reviewed_at=NOW() WHERE id=request.id;
  IF p_amount=source.amount THEN UPDATE public.wallet_transactions SET status='refunded' WHERE id=source.id; END IF;
  RETURN 'credited';
END; $$;
REVOKE ALL ON FUNCTION public.review_refund_request(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_refund_request(UUID,UUID,TEXT,NUMERIC,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_refund_hold_purchases()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE held BOOLEAN;
BEGIN
  IF NEW.type IN ('sms_purchase','smm_order','account_purchase') AND NEW.status='completed' THEN
    SELECT refund_hold INTO held FROM public.profiles WHERE id=NEW.profile_id FOR UPDATE;
    IF held THEN RAISE EXCEPTION 'Purchases paused during an unused-deposit return'; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_refund_hold_purchases() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_refund_hold_purchases ON public.wallet_transactions;
CREATE TRIGGER guard_refund_hold_purchases BEFORE INSERT OR UPDATE OF status ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_refund_hold_purchases();
COMMIT;
