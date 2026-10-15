# Card wallet top-ups — activation checklist

The web wallet and native source use Payunit-hosted checkout temporarily. No
Premium Verific field, API, log or table collects PANs or CVVs. Moving to an
embedded form requires a documented provider-hosted-fields/tokenization SDK and
merchant/acquirer confirmation of the applicable PCI requirements. Level 2 KYC
alone is not that confirmation.

## Before enabling real payments

Deployment checks on 15 October 2026: the card schema/RPC probes passed. The
legacy merchant-method probe returned only `CM_ORANGE` and `CM_MTNMOMO`.
The owner challenged whether the legacy result applied to newer card checkout,
so the newer API and its actual hosted interface were also checked:

- The same live key created a checkout successfully. Authenticated status
  matched the merchant reference, XAF gross amount and `LIVE` mode. Its initial
  status was `INITIATED`, now normalized to pending by our verifier.
- The hosted page's `/api/gateway/checkout/detail/{checkout_id}` response listed
  only `merchant.application.psp = CM_MTNMOMO, CM_ORANGE`. The actual visible
  checkout also offered only those two methods; it had no card entry option.
- The documented direct-card processing endpoint accepted an authenticated
  negative validation probe and returned `Payment card info missing`. No card
  number was sent. This proves the route is reachable, NOT that a live card
  charge is enabled or would settle successfully.
- The SDK's alternative Collect flow was also initialized with the documented
  `pay_with: WORLD_VISA` parameter. It returned an HTTPS `pay.payunit.net`
  transaction URL, but its actual hosted payment-method selector was empty.
  The provider list still contained just MTN/Orange. This alternative did not
  expose a usable card checkout either.
- Payunit's KYC docs say Level 2 permits all available methods for the relevant
  country. They do not document that every application automatically receives
  the `WORLD_VISA` subscription. Eligibility and this application's actual
  payment-method configuration are distinct observations.

`PAYUNIT_CARD_ENABLED` remains disabled because this key's hosted checkout
currently has no card option. Check the merchant application's payment-method
configuration / ask Payunit to attach the card method to application
`premiumverific`, then repeat a hosted check before enabling customer card
checkout. A successful checkout initialization alone is not card acceptance.
No probe submitted a real payment or created a customer wallet transaction.

Primary references: https://developer.payunit.net/kyc,
https://developer.payunit.net/add-payment-method,
https://developer.payunit.net/checkout/initialize-payment,
https://developer.payunit.net/checkout/make-payment.

1. Run `supabase/card-topups-upgrade.sql` in the project's Supabase SQL editor,
   after the existing platform and top-up-fee migrations. Keep RLS and the
   service-only RPC permissions. Back up production before database changes.
2. Ask Payunit to confirm card collection is enabled for this merchant, the
   supported networks/countries/currencies, 3-D Secure, actual collection fees,
   settlement fees, chargeback procedures and original-card refund procedure.
   KYC verification does not guarantee every card is accepted.
3. Set server-only Vercel `PAYUNIT_CARD_ENABLED=true`, `PAYUNIT_MODE=live`, the
   existing Payunit live credentials, and `NEXT_PUBLIC_APP_URL=https://premiumverific.com`.
   Never put payment credentials in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.
   Redeploy after setting environment variables. Leave the flag false until
   schema, payment methods and live merchant capability are confirmed.
4. Verify notification delivery to
   `https://premiumverific.com/api/payments/webhooks/payunit-card`. Notifications
   are only hints: an authenticated provider query must independently match the
   live checkout ID, merchant reference, gross XAF amount and successful status.
5. Perform a small authorized live card payment and verify one wallet credit,
   the disclosed fee, cancellation/decline, issuer authentication, delayed
   notification, return from checkout, and statement reconciliation. No real
   card payment has been performed by the implementation tests.
6. Build and publish a new signed Android APK containing `mobile/src/CardTopup.tsx`.
   The previously published APK does not gain new code through a web deployment.

## Fees, limits and recovery

- Cards: **1.4%** of wallet credit, rounded up to whole XAF. A 5,000 XAF top-up
  charges 5,070 XAF and credits **5,000**, never 5,070.
- MTN / Orange: zero platform top-up fee. Crypto: 2%. Issuer, operator and network
  charges are separate. The platform's 1.4% fee is not a verified Payunit tariff
  and may not cover the merchant's actual costs.
- Initial card limits: 3,000–100,000 XAF per checkout, three checkout creations
  per rolling hour, 200,000 XAF total requests per rolling 24 hours per wallet.
  Failed attempts count toward these limits to reduce card-testing abuse.
- Accounts require a verified email. Profile ownership is derived from the
  verified session, not a submitted user ID. Authenticated clients cannot invoke
  card reservation/finalization SQL directly.
- Request keys are persisted before payment requests. Initialization is never
  automatically repeated after an ambiguous response. A pending checkout blocks
  another deposit through the existing profile-lock reservation rules.
- Lost initialization responses or expired but unresolved checkouts require
  reconciliation/support; do not mark a payment failed merely because the user
  closed checkout or a local timer expired. Refunds must be reviewed and paid
  through the original payment source, not a customer-supplied destination.
- Server-side payment proof and idempotent credits do not remove card fraud or
  chargeback risk. The existing service delivery/fulfilment launch blockers must
  also be addressed before a general paid launch.

## Verification

`node --import tsx --test lib/payments/cards.test.ts lib/payments/topup-fees.test.ts`

`node scripts/check-card-topups-sql.mjs <path-to-@electric-sql/pglite/dist/index.js>`

The SQL checks use an isolated database and never connect to production. They
verify behavior and privileges, not real payment acceptance or load/concurrency.
