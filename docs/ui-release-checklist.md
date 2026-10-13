# Premium Verific UI update

Local changes: immediate insufficient-balance routing, readable labels, compact mobile navigation, true sign-out to the homepage, Premium Verific display branding, support-led account and Facebook recovery forms, catalogue-based calculator, and country-based indicative currency display.

Account requests do not imply stocked products or charge a wallet. Facebook support only covers owned/authorised accounts and official recovery paths; never collect passwords, PINs or OTPs.

## Deployment gates

### Vercel admin password

Set `ADMIN_LOGIN_PASSWORD` in Vercel Project Settings → Environment Variables
for Production, then redeploy. Use a new strong secret, not the password shared
in chat. This is a server-only additional login check, never a browser variable.
It must match the password on the existing Supabase Auth owner account
`mohammednurdine6@gmail.com`; adding the variable does not change that password.
The server first authenticates the real confirmed owner through Supabase and
then applies the env check before writing session cookies. Incorrect or missing
owner identity cannot be replaced with a manufactured owner. If the variable is
blank, existing Supabase owner-password login works as before. Google owner
login is separate and unchanged. Existing sessions are not revoked simply by
changing this variable; sign out/revoke sessions separately when rotating access.

### Platform release

1. Rerun the latest `supabase/topup-fees-upgrade.sql` after the combined platform SQL (new MTN/Orange fees are zero; crypto fees remain 2%), then run `supabase/payment-receipts-upgrade.sql` for private receipts and deploy this backend. Historical fee rows remain unchanged. Service pricing includes the separate confirmed 2% uplift in shared retail helpers, including overrides. Do not deploy the new checkout against the old mobile-fee function.
2. Admin email/password is now the primary sign-in method. Set a fresh password for the existing `mohammednurdine6@gmail.com` Supabase Auth identity; do not create a second owner identity or hardcode a password in the app. No live password change was performed. For optional Google sign-in, Supabase Authentication → URL Configuration → Redirect URLs must include `https://admin.premiumverific.com/auth/callback`. The old longer callback remains internally compatible. An omitted/disallowed OAuth redirect can fall back to the customer Site URL. This external configuration has not been verified remotely.
3. Admin root rewrites internally to `/admin` without moving the visible URL to the customer site. Signed-out visitors see the owner email/password form directly, not a preview. On the admin hostname successful login returns to `/`. All financial/customer APIs still require verified owner access. A public live administrator dashboard is not enabled.
4. Rebuild Android after deploying the matching fee backend. Existing version 0.1.0 build 2 predates the fee consent flow and is not a public paid-service release. Set the APK URL, SHA-256 and version only after device acceptance checks. iPhone users use the web panel.
5. Existing profiles keep their chosen currency. Select Automatic in Profile for IP-country defaults. New profiles default to Automatic. Vercel supplies country; no GPS permission is used. Daily Frankfurter reference rates are display-only, never used for settlement. On a timeout/old rate show XAF instead of a guessed conversion.
6. Existing stored customer phone numbers are not bulk-erased: there is no reliable record of which were user-entered versus historical defaults. New profiles never receive a support number automatically; customers can correct their own number in Profile.

Remaining launch gates: wallet purchase concurrency/compensation, provider refund/cancellation handling, rapid background OTP delivery, and real-device payment/order acceptance. These UI changes do not resolve those backend lifecycle risks.

Reference documentation:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://vercel.com/docs/headers/request-headers
- https://frankfurter.dev/
