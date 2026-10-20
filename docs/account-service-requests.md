# Account-service requests

BeanSMS publicly documents an SMS-number reseller API, not an API for its
Facebook/Instagram account-store products. Do not invent an account purchase
endpoint or promise instant account delivery. The agreed interim workflow is
manual, admin-reviewed and does not charge the customer for an enquiry.
The owner's marketplace screenshot confirms that its dashboard lists account
categories including Facebook, Instagram and TikTok, but a dashboard catalogue
is not proof that those products are exposed to reseller API keys. Do not copy
stock figures into our public site: they are time-sensitive and unverified.

The same request endpoint powers `/accounts` and the Android Account screen.
Customers see their request status and an indicative XAF quote, never the
supplier identity, supplier reference, internal note or acquisition cost.
Only the verified owner admin can review requests at
`/admin/account-service-requests` and record BeanSMS/other privately. The
review tool does not debit a wallet, buy from a supplier or mark an order paid.
Use a separately verified payment/order process before promising fulfilment.

`supabase/account-service-requests-upgrade.sql` is installed in the connected
Supabase project. Requests require a confirmed Supabase account and are capped
at five per profile per day. The service-role API performs validation and the
database function enforces the profile lock and limit. Never enter customer
passwords or verification codes in the request details.

To automate inventory, purchase, delivery and refunds later, obtain BeanSMS's
official account-store API specification and test it with a funded staging
account. The public SMS API docs alone are not sufficient.
