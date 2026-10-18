# Customer checkout help emails

Run `supabase/customer-followups-upgrade.sql` after the platform/fee migrations.
Then run `supabase/customer-followups-pending-upgrade.sql` to link new pending
wallet deposits to follow-ups, including Android and bot payments. The pending
upgrade does not backfill older transactions or send emails on its own.
In Vercel, set `CUSTOMER_FOLLOWUP_EMAILS_ENABLED=true`, a verified
`RESEND_FROM_EMAIL`, `RESEND_API_KEY`, `CUSTOMER_FOLLOWUP_REPLY_TO` (default
`hello@premiumverific.com`) and a long random `CRON_SECRET`, then deploy.
The upgrades are installed in the connected Supabase project, but delivery
remains off until the required sender/API-key settings are configured.

Website method selection records a server-authenticated checkout attempt.
Cancel/Leave checkout records an exit, never a provider cancellation or refund.
Closing a browser is inferred from a recorded attempt becoming inactive; this
is not proof of abandonment. Best-effort tracking failures never block payments.
Customers who never select a method, guests and bot-only identities without a
confirmed Supabase email are not emailed. Known failed deposit events are also
tracked by the database trigger, including authenticated Android deposits.

Wait at least one hour after the last event. Suppress outreach after a later
completed top-up or an opt-out. Use only the confirmed Auth email (never a
customer-editable profile email). At most one customer help email per seven
days, including reserved/uncertain deliveries. Recheck identity/preferences and
completion before sending. Keep messages short, with reply-to, WhatsApp, opt-out
and a warning not to pay again while a payment is being checked. This is not
a marketing campaign or a failed-sign-in email flow.

The cron runs daily at 08:15 UTC (09:15 Cameroon), processing at most five
emails per run. Checkout activity can additionally drain one eligible event.
The one-hour grace period is a minimum eligibility delay, not a guaranteed
one-hour delivery time. More frequent background delivery needs a supported
scheduler/hosting plan and an explicitly configured schedule; the current daily
setup has limited throughput. See https://vercel.com/docs/cron-jobs/usage-and-pricing.

Durable leases and Resend idempotency protect retries. Retry only within 23 hours
of the first attempt (within Resend's deduplication window); do not resend uncertain
older deliveries with a new key. Verify the sender domain and actual Reply-To
mailbox, test on a staging recipient, and review delivery/complaint rates before
enabling. Opt-out requires a deliberate POST; email-link previews cannot opt a
customer out. Changing email branding/templates should retain outbox payloads.
Reference: https://resend.com/docs/dashboard/emails/idempotency-keys.
