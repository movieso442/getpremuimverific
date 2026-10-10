-- Run after manual-crypto-upgrade.sql. Events commit with the payment itself.
BEGIN;
CREATE TABLE IF NOT EXISTS public.admin_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  recipient TEXT,
  sender TEXT,
  attempts INT NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ,
  lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  resend_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.admin_notification_outbox ADD COLUMN IF NOT EXISTS first_attempt_at TIMESTAMPTZ;
ALTER TABLE public.admin_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.admin_notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.queue_admin_payment_notification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE customer_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  -- The claim-confirmed event already covers this ledger credit.
  IF TG_TABLE_NAME = 'wallet_transactions' AND (to_jsonb(NEW)->>'reference') LIKE 'MANUAL-%' THEN RETURN NEW; END IF;
  SELECT concat_ws(' / ', full_name, email) INTO customer_name FROM public.profiles WHERE id = NEW.profile_id;
  INSERT INTO public.admin_notification_outbox(event_key, profile_id, payload)
  VALUES(TG_TABLE_NAME || ':' || NEW.id || ':' || NEW.status, NEW.profile_id,
    jsonb_build_object('source', TG_TABLE_NAME, 'record_id', NEW.id, 'customer', customer_name, 'payment', to_jsonb(NEW)))
  ON CONFLICT(event_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS queue_admin_claim_notification ON public.manual_payment_claims;
CREATE TRIGGER queue_admin_claim_notification AFTER INSERT OR UPDATE OF status ON public.manual_payment_claims
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_payment_notification();
DROP TRIGGER IF EXISTS queue_admin_transaction_notification ON public.wallet_transactions;
CREATE TRIGGER queue_admin_transaction_notification AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_payment_notification();

CREATE OR REPLACE FUNCTION public.reserve_admin_notification(p_sender TEXT, p_recipient TEXT)
RETURNS SETOF public.admin_notification_outbox LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    UPDATE public.admin_notification_outbox SET lease_until = NOW() + INTERVAL '2 minutes',
      attempts = attempts + 1, first_attempt_at = COALESCE(first_attempt_at, NOW()),
      sender = COALESCE(sender, p_sender), recipient = COALESCE(recipient, p_recipient)
    WHERE id = (SELECT id FROM public.admin_notification_outbox
      WHERE sent_at IS NULL AND attempts < 10 AND (lease_until IS NULL OR lease_until < NOW())
        AND (first_attempt_at IS NULL OR first_attempt_at > NOW() - INTERVAL '23 hours')
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_admin_notification(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_admin_notification(TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.queue_admin_payment_notification() FROM PUBLIC, anon, authenticated;
COMMIT;
