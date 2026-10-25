-- Return the wallet charge exactly once when an unused FiveSIM activation is
-- canceled by the customer or expires at the provider without an SMS.
-- Run after wallet-purchase-safety-upgrade.sql and refund-process-upgrade.sql.
ALTER TABLE public.wallet_purchase_reservations
  DROP CONSTRAINT IF EXISTS wallet_purchase_reservations_state_check;
ALTER TABLE public.wallet_purchase_reservations
  ADD CONSTRAINT wallet_purchase_reservations_state_check
  CHECK (state IN ('reserved','submitted','released','refunded'));

CREATE OR REPLACE FUNCTION public.refund_ended_sms_order(
  p_order_id UUID, p_provider_order_id TEXT, p_final_status TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  activation public.sms_orders%ROWTYPE;
  purchase public.wallet_transactions%ROWTYPE;
  reservation public.wallet_purchase_reservations%ROWTYPE;
  refund public.wallet_transactions%ROWTYPE;
  refund_reference TEXT;
BEGIN
  IF p_order_id IS NULL OR p_provider_order_id IS NULL
     OR p_final_status NOT IN ('canceled','expired') THEN
    RAISE EXCEPTION 'Invalid SMS cancellation details';
  END IF;

  SELECT * INTO activation FROM public.sms_orders WHERE id=p_order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SMS order unavailable'; END IF;
  -- Keep the wallet lock order consistent with purchase and refund operations.
  PERFORM 1 FROM public.profiles WHERE id=activation.profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer wallet unavailable'; END IF;
  SELECT * INTO activation FROM public.sms_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR activation.provider_order_id IS DISTINCT FROM p_provider_order_id THEN
    RAISE EXCEPTION 'SMS order unavailable';
  END IF;
  IF activation.sms_code IS NOT NULL OR activation.status='received' THEN
    RAISE EXCEPTION 'An SMS code was received; no automatic refund is allowed';
  END IF;

  refund_reference := 'SMS-END-REFUND-' || activation.id;
  SELECT * INTO refund FROM public.wallet_transactions WHERE reference=refund_reference;
  IF FOUND THEN
    IF refund.profile_id<>activation.profile_id OR refund.type<>'refund' OR refund.amount<>activation.price_xaf THEN
      RAISE EXCEPTION 'Existing SMS refund needs reconciliation';
    END IF;
    RETURN jsonb_build_object('status',activation.status,'refunded_xaf',refund.amount,'already_refunded',TRUE);
  END IF;

  IF activation.status NOT IN ('waiting_sms','canceled','expired') THEN
    RAISE EXCEPTION 'SMS activation is not eligible for cancellation refund';
  END IF;
  SELECT * INTO purchase FROM public.wallet_transactions
    WHERE profile_id=activation.profile_id AND type='sms_purchase' AND amount=activation.price_xaf
      AND reference IN ('SMS-'||activation.id,'BOT-SMS-'||activation.id)
      AND status='completed'
    ORDER BY created_at LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Original SMS wallet charge unavailable'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions w
    WHERE w.profile_id=activation.profile_id AND w.type='refund' AND w.status='completed'
      AND w.refund_for_transaction_id=purchase.id
  ) THEN RAISE EXCEPTION 'This SMS purchase already has a refund; reconcile it before crediting again'; END IF;

  SELECT * INTO reservation FROM public.wallet_purchase_reservations WHERE id=activation.id FOR UPDATE;
  IF FOUND AND (reservation.profile_id<>activation.profile_id OR reservation.purchase_type<>'sms_purchase'
      OR reservation.provider_order_id IS DISTINCT FROM activation.provider_order_id) THEN
    RAISE EXCEPTION 'SMS purchase reservation does not match supplier order';
  END IF;

  UPDATE public.sms_orders SET status=p_final_status
    WHERE id=activation.id AND status IN ('waiting_sms','canceled','expired') AND sms_code IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'SMS activation changed while cancellation was being settled'; END IF;

  INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
    VALUES(activation.profile_id,activation.price_xaf,'refund','wallet',refund_reference,'completed',
      CASE WHEN p_final_status='expired' THEN 'Unused SMS activation expired without a code' ELSE 'Unused SMS activation canceled by customer' END);
  IF FOUND AND reservation.id IS NOT NULL THEN
    UPDATE public.wallet_purchase_reservations SET state='refunded',updated_at=NOW() WHERE id=reservation.id;
  END IF;
  RETURN jsonb_build_object('status',p_final_status,'refunded_xaf',activation.price_xaf,'already_refunded',FALSE);
END;
$$;
REVOKE ALL ON FUNCTION public.refund_ended_sms_order(UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ended_sms_order(UUID,TEXT,TEXT) TO service_role;
