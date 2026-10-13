-- Optional private payment screenshots. Run after topup-fees-upgrade.sql.
BEGIN;
ALTER TABLE public.manual_payment_claims ADD COLUMN IF NOT EXISTS receipt_storage_path TEXT;
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES('payment-receipts', 'payment-receipts', FALSE, 3145728, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public = FALSE, file_size_limit = 3145728,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];
-- Restrictive policies block inherited permissive policies for this bucket.
-- Upload/download go through authenticated server routes using service_role.
DROP POLICY IF EXISTS "Payment receipts are server only" ON storage.objects;
CREATE POLICY "Payment receipts are server only" ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (bucket_id <> 'payment-receipts') WITH CHECK (bucket_id <> 'payment-receipts');
COMMIT;
