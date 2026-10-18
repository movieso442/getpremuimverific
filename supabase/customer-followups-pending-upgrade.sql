-- Run after customer-followups-upgrade.sql. New pending deposits (including
-- Android/bot payments) become eligible for a help email if never completed.
-- This records intent only; it neither changes balances nor cancels payments.
BEGIN;
ALTER TABLE public.customer_checkout_followups
  ADD COLUMN IF NOT EXISTS transaction_id UUID UNIQUE REFERENCES public.wallet_transactions(id);

CREATE OR REPLACE FUNCTION public.track_customer_payment_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE attempt UUID;
BEGIN
  IF NEW.type <> 'deposit' OR NEW.status NOT IN ('pending','completed','failed') THEN RETURN NEW; END IF;

  IF NEW.status = 'pending' THEN
    -- Only the first pending insert should create a follow-up. Reuse a recent
    -- website checkout event where possible so one attempt yields one email.
    IF TG_OP = 'INSERT' THEN
      SELECT id INTO attempt FROM public.customer_checkout_followups
        WHERE profile_id = NEW.profile_id AND transaction_id IS NULL
          AND state IN ('started','cancelled') AND sent_at IS NULL
          AND created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
      IF attempt IS NULL THEN
        INSERT INTO public.customer_checkout_followups(profile_id,state,method,transaction_id)
          VALUES (NEW.profile_id,'started',NEW.payment_method,NEW.id);
      ELSE
        UPDATE public.customer_checkout_followups
          SET transaction_id = NEW.id, method = NEW.payment_method, last_activity_at = NOW()
          WHERE id = attempt;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' THEN
    UPDATE public.customer_checkout_followups SET state = 'completed', lease_until = NULL
      WHERE profile_id = NEW.profile_id AND sent_at IS NULL
        AND (transaction_id = NEW.id OR created_at <= NEW.created_at);
    RETURN NEW;
  END IF;

  SELECT id INTO attempt FROM public.customer_checkout_followups
    WHERE transaction_id = NEW.id AND profile_id = NEW.profile_id AND sent_at IS NULL
    FOR UPDATE;
  IF attempt IS NULL THEN
    SELECT id INTO attempt FROM public.customer_checkout_followups
      WHERE profile_id = NEW.profile_id AND transaction_id IS NULL
        AND created_at <= NEW.created_at AND created_at > NOW() - INTERVAL '7 days'
        AND state <> 'completed' AND sent_at IS NULL
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;
  IF attempt IS NULL THEN
    INSERT INTO public.customer_checkout_followups(profile_id,state,method,transaction_id)
      VALUES (NEW.profile_id,'issue',NEW.payment_method,NEW.id);
  ELSE
    UPDATE public.customer_checkout_followups
      SET state = 'issue', transaction_id = NEW.id, method = NEW.payment_method,
          last_activity_at = NOW()
      WHERE id = attempt;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_payment_outcome() FROM PUBLIC,anon,authenticated;
COMMIT;
