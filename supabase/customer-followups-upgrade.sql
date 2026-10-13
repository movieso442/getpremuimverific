-- Short customer help emails. Does not cancel charges or modify wallet balances.
-- Run after the combined platform and fee upgrades. Browser roles have no access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.customer_email_preferences (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  followups_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::TEXT,'-','') || replace(gen_random_uuid()::TEXT,'-','')
);
CREATE TABLE IF NOT EXISTS public.customer_checkout_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'started' CHECK(state IN ('started','cancelled','issue','completed')),
  method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipient TEXT, sender TEXT, reply_to TEXT, unsubscribe_token TEXT, email_text TEXT, email_subject TEXT,
  attempts INT NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ, lease_until TIMESTAMPTZ,
  sent_at TIMESTAMPTZ, resend_id TEXT, last_error TEXT
);
CREATE INDEX IF NOT EXISTS customer_followups_profile_time_idx ON public.customer_checkout_followups(profile_id,created_at DESC);
ALTER TABLE public.customer_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_checkout_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_email_preferences, public.customer_checkout_followups FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.customer_email_preferences, public.customer_checkout_followups TO service_role;

CREATE OR REPLACE FUNCTION public.track_customer_checkout(p_profile UUID,p_id UUID,p_state TEXT,p_method TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_state NOT IN ('started','cancelled') OR p_state IS NULL OR p_id IS NULL THEN RAISE EXCEPTION 'Invalid checkout event'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_profile FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM public.customer_checkout_followups WHERE id=p_id AND profile_id<>p_profile) THEN RAISE EXCEPTION 'Checkout unavailable'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.customer_checkout_followups WHERE id=p_id)
     AND (SELECT count(*) FROM public.customer_checkout_followups WHERE profile_id=p_profile AND created_at>NOW()-INTERVAL '1 day')>=20 THEN RETURN; END IF;
  INSERT INTO public.customer_checkout_followups(id,profile_id,state,method) VALUES(p_id,p_profile,p_state,p_method)
  ON CONFLICT(id) DO UPDATE SET state=CASE WHEN customer_checkout_followups.state='cancelled' THEN 'cancelled' ELSE EXCLUDED.state END,method=EXCLUDED.method,last_activity_at=NOW()
    WHERE customer_checkout_followups.profile_id=p_profile AND customer_checkout_followups.state<>'completed' AND customer_checkout_followups.sent_at IS NULL;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_checkout(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_customer_checkout(UUID,UUID,TEXT,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.track_customer_payment_outcome()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE attempt UUID;
BEGIN
  IF NEW.type<>'deposit' OR NEW.status NOT IN ('completed','failed') THEN RETURN NEW; END IF;
  IF NEW.status='completed' THEN
    UPDATE public.customer_checkout_followups SET state='completed',lease_until=NULL
      WHERE profile_id=NEW.profile_id AND created_at<=NEW.created_at AND sent_at IS NULL;
  ELSE
    SELECT id INTO attempt FROM public.customer_checkout_followups WHERE profile_id=NEW.profile_id
      AND created_at<=NEW.created_at AND created_at>NOW()-INTERVAL '7 days' AND state<>'completed' AND sent_at IS NULL ORDER BY created_at DESC LIMIT 1;
    IF attempt IS NULL THEN
      INSERT INTO public.customer_checkout_followups(profile_id,state,method) VALUES(NEW.profile_id,'issue',NEW.payment_method);
    ELSE UPDATE public.customer_checkout_followups SET state='issue',last_activity_at=NOW() WHERE id=attempt; END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.track_customer_payment_outcome() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS track_customer_payment_outcome ON public.wallet_transactions;
CREATE TRIGGER track_customer_payment_outcome AFTER INSERT OR UPDATE OF status ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.track_customer_payment_outcome();

CREATE OR REPLACE FUNCTION public.reserve_customer_followup(p_sender TEXT,p_reply_to TEXT)
RETURNS SETOF public.customer_checkout_followups LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE candidate public.customer_checkout_followups%ROWTYPE; email TEXT; unsubscribe TEXT;
BEGIN
  SELECT c.* INTO candidate FROM public.customer_checkout_followups c
    JOIN public.profiles p ON p.id=c.profile_id JOIN auth.users u ON u.id=p.user_id
    LEFT JOIN public.customer_email_preferences pref ON pref.profile_id=p.id
    WHERE c.state<>'completed' AND c.sent_at IS NULL AND c.attempts<10
      AND c.last_activity_at<NOW()-INTERVAL '1 hour' AND c.created_at>NOW()-INTERVAL '7 days'
      AND (c.lease_until IS NULL OR c.lease_until<NOW())
      AND (c.first_attempt_at IS NULL OR c.first_attempt_at>NOW()-INTERVAL '23 hours')
      AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,FALSE)
      AND u.email IS NOT NULL AND u.email NOT LIKE '%.invalid' AND COALESCE(pref.followups_enabled,TRUE)
      AND NOT EXISTS(SELECT 1 FROM public.wallet_transactions w WHERE w.profile_id=p.id AND w.type='deposit' AND w.status='completed' AND w.created_at>=c.created_at)
      AND NOT EXISTS(SELECT 1 FROM public.customer_checkout_followups other WHERE other.profile_id=p.id AND other.id<>c.id AND (other.sent_at>NOW()-INTERVAL '7 days' OR other.first_attempt_at>NOW()-INTERVAL '7 days'))
    ORDER BY c.created_at FOR UPDATE OF c,p SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT u.email INTO email FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE p.id=candidate.profile_id;
  INSERT INTO public.customer_email_preferences(profile_id) VALUES(candidate.profile_id) ON CONFLICT(profile_id) DO NOTHING;
  SELECT unsubscribe_token INTO unsubscribe FROM public.customer_email_preferences WHERE profile_id=candidate.profile_id;
  RETURN QUERY UPDATE public.customer_checkout_followups SET lease_until=NOW()+INTERVAL '2 minutes',attempts=attempts+1,
    first_attempt_at=COALESCE(first_attempt_at,NOW()),recipient=COALESCE(recipient,email),sender=COALESCE(sender,p_sender),reply_to=COALESCE(reply_to,p_reply_to),unsubscribe_token=COALESCE(unsubscribe_token,unsubscribe)
    WHERE id=candidate.id RETURNING *;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_customer_followup(TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_customer_followup(TEXT,TEXT) TO service_role;
COMMIT;
