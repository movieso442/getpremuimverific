-- Refund an unused FiveSIM activation exactly once. Customer-requested
-- cancellation retains 50 XAF; provider-confirmed expiry is refunded in full.
-- Run after wallet-purchase-safety-upgrade.sql and refund-process-upgrade.sql.
ALTER TABLE public.wallet_purchase_reservations
  DROP CONSTRAINT IF EXISTS wallet_purchase_reservations_state_check;
ALTER TABLE public.wallet_purchase_reservations
  ADD CONSTRAINT wallet_purchase_reservations_state_check
  CHECK (state IN ('reserved','submitted','released','refunded'));

ALTER TABLE public.sms_orders
  ADD COLUMN IF NOT EXISTS cancellation_fee_xaf NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (cancellation_fee_xaf >= 0);

DROP FUNCTION IF EXISTS public.refund_ended_sms_order(UUID,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.refund_ended_sms_order(
  p_order_id UUID, p_provider_order_id TEXT, p_final_status TEXT,
  p_customer_cancel BOOLEAN DEFAULT FALSE
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  activation public.sms_orders%ROWTYPE;
  purchase public.wallet_transactions%ROWTYPE;
  reservation public.wallet_purchase_reservations%ROWTYPE;
  refund public.wallet_transactions%ROWTYPE;
  refund_reference TEXT;
  fee NUMERIC(12,2);
  refund_amount NUMERIC(12,2);
BEGIN
  IF p_order_id IS NULL OR p_provider_order_id IS NULL
     OR p_final_status NOT IN ('canceled','expired') OR p_customer_cancel IS NULL THEN
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
    IF refund.profile_id<>activation.profile_id OR refund.type<>'refund' THEN
      RAISE EXCEPTION 'Existing SMS refund needs reconciliation';
    END IF;
    RETURN jsonb_build_object('status',activation.status,'refunded_xaf',refund.amount,
      'cancellation_fee_xaf',activation.cancellation_fee_xaf,'already_refunded',TRUE);
  END IF;
  IF activation.status='canceled' AND activation.cancellation_fee_xaf>0 THEN
    RETURN jsonb_build_object('status',activation.status,
      'refunded_xaf',GREATEST(0,activation.price_xaf-activation.cancellation_fee_xaf),
      'cancellation_fee_xaf',activation.cancellation_fee_xaf,'already_refunded',TRUE);
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

  fee := CASE WHEN p_customer_cancel AND p_final_status='canceled' THEN LEAST(50,activation.price_xaf) ELSE 0 END;
  refund_amount := activation.price_xaf-fee;
  UPDATE public.sms_orders SET status=p_final_status,cancellation_fee_xaf=fee
    WHERE id=activation.id AND status IN ('waiting_sms','canceled','expired') AND sms_code IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'SMS activation changed while cancellation was being settled'; END IF;

  IF refund_amount>0 THEN
    INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status,description)
      VALUES(activation.profile_id,refund_amount,'refund','wallet',refund_reference,'completed',
        CASE WHEN fee>0 THEN 'Unused SMS activation canceled by customer; 50 XAF cancellation fee retained'
          WHEN p_final_status='expired' THEN 'Unused SMS activation expired without a code' ELSE 'Unused SMS activation canceled without a fee' END);
  END IF;
  IF FOUND AND reservation.id IS NOT NULL THEN
    UPDATE public.wallet_purchase_reservations SET state='refunded',updated_at=NOW() WHERE id=reservation.id;
  END IF;
  RETURN jsonb_build_object('status',p_final_status,'refunded_xaf',refund_amount,
    'cancellation_fee_xaf',fee,'already_refunded',FALSE);
END;
$$;
REVOKE ALL ON FUNCTION public.refund_ended_sms_order(UUID,TEXT,TEXT,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_ended_sms_order(UUID,TEXT,TEXT,BOOLEAN) TO service_role;
