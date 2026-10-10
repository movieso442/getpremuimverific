# Owner sign-in

The administrator sign-in is `/admin/login` (also on `admin.premiumverific.com`).
Only the confirmed Supabase account `mohammednurdine6@gmail.com` is authorized.
Google sign-in needs no website password. Customer sign-in is unchanged.

Before production use:

1. Run `admin-owner-access.sql` in Supabase SQL Editor, after the administrator
   table migrations. Rerun it if those optional tables are created later.
2. In Supabase Authentication → URL Configuration, allow these exact redirects:
   - `https://admin.premiumverific.com/admin/auth/callback`
   - `https://premiumverific.com/admin/auth/callback`
3. Keep the Google auth provider enabled. Its Google Console callback remains
   the Supabase project callback, not either application URL above.
4. Deploy the updated app and sign in on the admin subdomain with the owner
   Google account. That hostname has its own session, separate from customers.

## Administrator hostname

Keep `admin.premiumverific.com` assigned directly to this Vercel project, not
configured as a domain redirect to `premiumverific.com`. Opening its root `/`
goes to `/admin/login` on the same admin hostname. After sign-in, `/admin` and
`/admin/pricing` stay on that hostname too. APIs, JavaScript/CSS, and the Google
callback are not redirected to the customer domain.

Running SQL alone does not update routing: deploy the changed app code as well.

The owner profile is securely created/promoted by server code at first access.
Changing a customer profile's email or role cannot grant admin API access.
Payment-alert recipient configuration is separate from administrator sign-in.
