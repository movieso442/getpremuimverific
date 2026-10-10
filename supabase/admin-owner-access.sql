-- Owner-only administrator access. Run in Supabase SQL Editor.
-- Safe to rerun; existing customer data and wallet balances are unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_platform_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'mohammednurdine6@gmail.com'
      AND email_confirmed_at IS NOT NULL
      AND NOT COALESCE(is_anonymous, FALSE)
  );
$$;
REVOKE ALL ON FUNCTION public.is_platform_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_owner() TO authenticated, service_role;

-- A restrictive policy also blocks old role-only permissive policies. Skip
-- optional tables until their respective platform migrations have been run.
DO $$
DECLARE target TEXT;
BEGIN
  FOREACH target IN ARRAY ARRAY['platform_settings', 'financial_entries', 'smm_service_prices'] LOOP
    IF to_regclass('public.' || target) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Verified owner only" ON public.%I', target);
      EXECUTE format('CREATE POLICY "Verified owner only" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_platform_owner()) WITH CHECK (public.is_platform_owner())', target);
    END IF;
  END LOOP;
END;
$$;

-- Keep customers from editing their role or manufacturing wallet deposits.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE(full_name, phone_number, currency, avatar_url) ON public.profiles TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM anon, authenticated;

-- Only promote a profile tied to the confirmed Supabase identity, not a
-- customer-editable profile email. New owner profiles are created at sign-in.
UPDATE public.profiles p SET role = 'admin'
FROM auth.users u
WHERE p.user_id = u.id AND lower(u.email) = 'mohammednurdine6@gmail.com'
  AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous, FALSE);
COMMIT;
