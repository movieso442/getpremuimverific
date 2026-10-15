# Account creation, app authentication and Android warnings

## Findings on 15 October 2026

Public Auth settings show email/Google sign-in enabled, signup enabled and email
confirmation required. The address in the reported signup example already has
a confirmed Google identity. Supabase intentionally does not treat another signup
as a new account/password or guarantee another signup email. The website's old
generic success message and optimistic unconfirmed profile were misleading.
The website header's email login dialog also used a timeout instead of real
authentication; it now uses Supabase password sign-in.

The existing Resend account reports `premiumverific.com` as verified and recent
platform mail as delivered. This does not prove Supabase Auth is configured to
use Resend: inspecting/changing those project-level settings still requires the
owner's private management token or dashboard action. No new real signup email
has been sent as an implementation test.

The native Create account action now opens a full registration form. Confirmation
requests have truthful messaging and a resend cooldown. Do not disable email
confirmation to work around delivery problems or convert existing Google users
to password accounts without a verified password-recovery flow.

## Supabase email delivery

Inspect project Auth settings with a private `SUPABASE_ACCESS_TOKEN`, not the
database password or service-role key:

`node --env-file=.vercel/auth-diagnostics.env --env-file=.env scripts/configure-auth-delivery.mjs`

The production Resend credentials can be read into the ignored `.vercel` file
using `vercel env pull .vercel/auth-diagnostics.env --environment production`.
Never commit that file or paste its contents into chat. After reviewing current
settings, `--apply` configures the existing Resend sender and merges callback URLs
without disabling email confirmation. The script refuses to replace a different
custom SMTP provider. Verify the sender's domain status and delivery using an
authorized new test address; an existing Google account is not a signup-email
delivery test. Supabase's default SMTP is team-address restricted and currently
limited to two messages per hour; custom SMTP is required for public signups.

Manual alternative: Supabase → Authentication → email/SMTP configuration. Resend
SMTP host `smtp.resend.com`, port 465, username `resend`, password the existing
Resend API key, sender a verified `@premiumverific.com` address. Keep email
confirmation enabled. Do not expose management or SMTP keys in native/public env.

## Google / confirmation return to Android

Native PKCE starts in the app and stores its verifier in SecureStore. The redirect
is the website's `/auth/mobile-callback?app_state=<nonce>` page, which relays only
the one-use authorization code and nonce to `premiumverify://auth/callback`.
It never exchanges the native code on the server or copies access/refresh tokens
into links. This page bypasses the website auth/analytics shell, strips the code
from browser history and provides an explicit Open app fallback. The native app
handles open-session results, warm links and cold-start links, checks nonce/age,
and exchanges the code using its own PKCE verifier. It does not create a website
session as a substitute. Website Google/email callbacks use `/auth/callback` and
the website's own cookie-bound PKCE verifier.

Required Auth redirect entries:

- `https://premiumverific.com/auth/callback*`
- `https://premiumverific.com/auth/mobile-callback*`
- `premiumverify://auth/callback`

Test a real Google flow on a device after installing the new signed build. Also
test email confirmation, cancel/retry, app restart, duplicate callback delivery,
an expired nonce and attempts to relay arbitrary schemes/tokens.

## Chrome / Play Protect

The screenshots show Chrome's APK download caution and Play Protect's unfamiliar
developer warning, not proof of a detected malware family. A website cannot
remove or override those security decisions. Keep package/signing identity
stable; never rename/repack the app to evade classification or ask customers to
disable Play Protect. The app blocks unused storage, overlay, audio/camera,
contacts, device-SMS and package-installer permissions. This is least-privilege
hardening, not a claim that warnings are eliminated or a complete security audit.

Use a verified Google developer identity and reviewed Google Play distribution
where possible. If the app is wrongly flagged, the owner can use Google's app
verification appeal process with package `com.premiumverify.app`, the current
APK download URL/checksum and signing certificate SHA-256
`539da41782995ed2ee22205cce9a8ec662a647c266ab3d4dca404ff91b7fc425`.
Publishing/identity verification and appeals require the owner's Google account,
accurate identity information and Google's review; no instant approval is promised.

Primary references:
https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/reference/javascript/auth-signup
https://supabase.com/docs/guides/auth/native-mobile-deep-linking
https://support.google.com/googleplay/android-developer/answer/2992033
https://developer.android.com/developer-verification
