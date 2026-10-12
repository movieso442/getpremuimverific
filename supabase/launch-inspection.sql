-- READ-ONLY inspection, not a schema upgrade. Run in Supabase SQL Editor.
-- Returns grants/policies/functions/triggers, not customer records or balances.
BEGIN TRANSACTION READ ONLY;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  AND table_name IN ('profiles', 'wallet_transactions', 'sms_orders', 'smm_orders',
    'account_orders', 'manual_payment_claims', 'bot_payment_links', 'admin_notification_outbox')
ORDER BY table_name, grantee, privilege_type;

SELECT table_name, column_name, grantee, privilege_type
FROM information_schema.role_column_grants
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, column_name, privilege_type;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'wallet_transactions', 'sms_orders', 'smm_orders',
    'account_orders', 'manual_payment_claims', 'platform_settings', 'smm_service_prices')
ORDER BY tablename, policyname;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN ('profiles', 'wallet_transactions', 'sms_orders', 'smm_orders',
    'manual_payment_claims', 'bot_payment_links', 'admin_notification_outbox');

SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS customer_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS server_execute,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('update_user_balance',
  'review_manual_payment', 'reserve_admin_notification', 'is_platform_owner');

SELECT t.tgname, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
  AND c.relname IN ('wallet_transactions', 'manual_payment_claims');

COMMIT;
