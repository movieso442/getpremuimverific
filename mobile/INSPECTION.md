# Release inspection — 12 October 2026

## Decision: testing is ready; paid public launch is NOT cleared

iPhone customers can use the website. Android customers can use the website or test the native APK. Do not treat successful builds and endpoint checks as proof that the complete financial/customer lifecycle is safe.

## Verified

- Production website/backend deployed to the existing Vercel project and premiumverific.com. Both that domain and getpremuimverific.vercel.app expose the mobile routes.
- Nine read-only live checks passed: catalogue/downloads return 200; signed-out mobile account, SMS inbox, admin overview/manual reviews and cron routes return 401. An invalid native token is rejected.
- Ten database tables and required columns are present: profiles, SMS/SMM orders, wallet transactions, settings, retail prices, bot payment links, manual crypto claims, email outbox and audit events. No customer rows were fetched or modified by these checks.
- All 18 automated owner/routing/crypto/email/payment/release tests passed. Email and financial tests use mocks, not live transfers.
- All 21 Expo Doctor checks and mobile TypeScript/dependency compatibility checks passed.
- Android EAS build 1846930c-5f97-4f3f-a95f-4b69f6a6a547 finished. Version 0.1.0, versionCode 2; package com.premiumverify.app; APK size 72,663,811 bytes. Downloaded APK verified with apksigner (v2 signature), installed successfully and rendered the native login screen in an isolated read-only Android emulator. Package flags do not include DEBUGGABLE. No customer account/purchase was created in that emulator, which was shut down afterwards.
- APK SHA-256: 944a088bb46037c3221d54859c86265c9f8db611b04440c2fbe4d0d9bc0db247.
- iOS Simulator build c7f7b99c-23a9-4d5c-8370-4024c8e34ccc finished; it is NOT an installable iPhone release. We are not pursuing paid iPhone distribution now.

The initial interrupted APK download was incomplete. It was replaced only after a fresh full download passed signature verification; the checksum above belongs to the verified full APK.

## Launch blockers found by code inspection

1. **Wallet reservation, order persistence and duplicate purchase prevention.** app/api/v1/sms/order/route.ts:106 and app/api/v1/smm/order/route.ts:32 read a balance, call the provider, then insert an order and a separate ledger entry. Parallel requests can both pass the same balance check; provider success followed by database failure can leave an orphan/unpaid allocation; uncertain retries can duplicate orders. supabase/all-platform-upgrades.sql:203/332 uses GREATEST(0, balance - amount), masking overspending instead of rejecting it. Native button locks are not a server-side solution. Need atomic wallet reservations, stable request keys, durable pending-order records, reconciliation and safe compensation across website/native/bots.

2. **Expiry, cancellation and partial-order financial reconciliation.** lib/sms/sync.ts marks certain provider terminal statuses canceled but does not create a wallet refund, and lacks a complete expiry policy. lib/smm/sync.ts updates canceled/partial status without corresponding wallet adjustments. Establish the provider-refund policy and an exactly-once refund ledger; do not blindly refund uncertain provider outcomes.

3. **Background OTP and notification scheduling.** vercel.json runs both status jobs once per day. Browser and native foreground checks help active users, but daily cron cannot guarantee timely codes when they close the app/browser. Bot notification failures are not durably retried after an order becomes received. The email outbox's 23-hour retry window can also expire before the next daily cron. Need a frequent authenticated worker/scheduler and durable notification retries; then verify on real devices. Changing the schedule requires checking the hosting plan/support, not simply claiming background delivery works.

4. **Bot SMM consistency.** lib/whatsapp/bot.ts:560–601 and corresponding Telegram code still calculate from fixed/local rates and directly overwrite profile balances rather than recording the same durable order/ledger workflow used by the website. These paths need to use the same live pricing and financial reservation service before advertising bot purchases. Legacy SMS code also remains, although the new SMS entry path uses the live catalogue.

5. **Live database privilege/trigger audit is unfinished.** The combined migration still defines FOR ALL ownership policies for SMS/SMM/account orders. It revokes wallet/profile writes but does not similarly revoke order writes. Verify actual authenticated grants and make server-owned order fields read-only to customers. REST table/column existence checks do not establish which migration version, functions, triggers or grants are currently installed; do not claim that they do.

## Required real-device acceptance tests

- Existing account signup/email confirmation/password login/Google OAuth, including the premiumverify://auth/callback allowlist.
- One real MTN payment and one Orange payment: approval, cancellation, timeout, repeated callback, app restart and exactly-once wallet credit.
- Manual crypto claim → owner verifies actual receipt → approval → exactly-once credit → admin notification. A customer claim/screenshot is never payment proof.
- Funded SMS purchase → received code → browser/native inbox → copy; expiry/cancellation/reconciliation and server-side cross-account isolation.
- SMM order → provider status → completed/partial/canceled → correct financial outcome and order history.
- Parallel purchases with only one order's balance; simulated provider success/database failure; uncertain network retry. No live destructive or financial concurrency test has been run.

## Remaining limitations

- Native catalogue currently has 13 countries and 12 app choices; prices/stock are live, but this is not the full provider catalogue.
- Bot/web account linking is not implemented; a bot identity is not automatically the same as a verified website account.
- Native crypto claims and background push are not implemented; website/manual support remains available.
- Mobile dependency audit previously reported 22 transitive findings (15 high, 7 moderate), requiring assessment/remediation. Expo Doctor does not replace a security audit.
- Full-project lint previously reported 21 errors/60 warnings; do not report the whole project as lint-clean.
- APK is for testing; public website APK download variables remain unset until lifecycle and device acceptance checks pass. Production deployment did not initiate a charge, send test email or review a manual claim.

Repeat the read-only checks from the website root with `node scripts/check-launch-readiness.mjs` (Node 24). This reads local server configuration without printing keys. It is a smoke check, not a full security or financial audit.

For actual live grants/functions/triggers, run supabase/launch-inspection.sql in the Supabase SQL Editor and return its results. That file is strictly read-only; it does not apply migrations or change balances.
