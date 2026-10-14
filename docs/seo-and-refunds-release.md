# Public SEO, logo assets and refunds

Deploy only after running `supabase/refund-process-upgrade.sql` after the previous platform/fee migrations. No live refunds, payouts, Search Console submissions or SQL were executed by local tests.

## Google Search Console

Verify the **Domain property** `premiumverific.com` using Google's provided DNS TXT value. DNS verification is not performed by adding a website logo or meta tag. Alternatively choose the HTTPS URL-prefix property and put its HTML verification token in Vercel `GOOGLE_SITE_VERIFICATION`, then redeploy. Submit `https://premiumverific.com/sitemap.xml` and inspect/request indexing of these five public URLs:

1. https://premiumverific.com/
2. https://premiumverific.com/virtual-numbers
3. https://premiumverific.com/sms-verification-guide
4. https://premiumverific.com/social-media-growth
5. https://premiumverific.com/refunds

Titles, descriptions, canonical URLs, Open Graph/Twitter metadata, WebSite/Organization data, internal navigation and a public-only sitemap are implemented. App/admin/wallet/refund-form routes and alternate deployment hosts carry noindex. Private HTML remains crawlable so Google can read noindex; API/token routes are disallowed in robots. Admin robots blocks its whole hostname. Noindex is not authentication. Google decides indexing/ranking and search-result logos; no top ranking, free-number offering, invented reviews or guaranteed monetisation is promised.

Source documentation: https://developers.google.com/search/docs/crawling-indexing/block-indexing and https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview.

## Branding

Original artwork remains `public/logo.jpg`. `public/brand/mark-master.png` is the imagegen-extracted orange/blue monogram. `scripts/build-brand-icons.mjs` creates browser/favicon, Apple home-screen and native Android/iPhone PNG size variants; mobile package IDs are unchanged. New icons appear in native apps only after rebuilding. Built-in imagegen prompt: "Extract ONLY the interlocking orange P and blue V monogram. Remove background texture, shadows and lettering. Preserve angular shape, proportions, arrangement and colours; no redesign. Center on a genuinely transparent square canvas with 10% padding."

## Refund safety and launch checks

Seven-day standard request window; target eligible processing within 72 hours **after verification**, not automatic approval. Mandatory consumer rights and support appeals remain available. The customer form owns real ledger IDs; one request per original transaction. Owner-only review rechecks original charge, terminal order status, undelivered-unit cap and prior linked/unattributed refunds. SMS/SMM service approval checks live provider state; screenshots alone are never approval. Legacy unlinked refunds or unlinked account orders require support reconciliation instead of guessing and risking duplicate credit.

Unused deposit approval reserves/debits available funds exactly once and pauses purchases. It does NOT transfer money. The owner must independently verify the original payment source, active orders, provider/merchant settlement, chargebacks and already-refunded amounts before sending a manual return. Mark Paid records only a genuinely settled original-source transfer; never act on a customer's forged payout screenshot or replacement destination. Rejecting a held request releases its reservation once. No external payout API is connected. Existing provider-allocation/debit compensation races remain a paid-launch blocker; audit in-flight orders before external payout. Ledger guards prevent hold spending, but do not undo provider allocations.

Apply the policy to website/bot/support operations consistently and obtain local legal review before paid launch: this page is a business policy, not a guarantee of regulatory compliance. Test ownership isolation, duplicates, partial refund caps, delivered-code rejection, legacy refunds, hold/release/payout transitions, ledger balances and real provider reconciliation on staging. Customer refunds and payout references remain private.

## Local checks

`scripts/check-refunds-sql.mjs` runs the actual migration and existing balance trigger in an isolated PGlite database; set `PGLITE_MODULE` to an installed PGlite module path. It never connects to Supabase. `scripts/check-public-seo.mjs` checks a local production server on port 3100 (or `CHECK_ORIGIN`): canonical metadata, five-entry sitemap, private noindex, genuine HTTP 404, icon delivery and unauthenticated refund API rejection. These checks do not replace real-provider staging tests or publish changes.
