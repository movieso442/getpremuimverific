# 2% top-up fee release

Run the current complete `supabase/topup-fees-upgrade.sql` after the existing platform upgrades, before deploying these changes (rerun if you ran an earlier version). No production SQL has been run automatically. It also installs atomic `start_wallet_topup` and `submit_crypto_payment` routines and updates the customer-service number. The new columns store the fee separately from wallet credit. Existing rows retain fee zero. New mobile-money requests require explicit acceptance of the displayed fee; older APKs must be updated or customers must use the website.

Example: 5,000 XAF credit + 100 XAF service fee = 5,100 XAF requested. Operator/network fees are separate and are not guessed from another provider's screenshots. Fractional XAF fees round up to the nearest whole XAF.

Available methods: MTN MoMo, Orange Money, USDT on Tron/TRC20, BTC on Bitcoin, ETH on Ethereum/ERC20 or BNB Smart Chain/BEP20. Crypto uses the owner-supplied addresses and requires manual receipt/ownership verification. Do not send USDT on ERC20/BEP20 to an ETH option. No cards or PayPal are advertised by either bot.

Crypto customers agree the received crypto amount and XAF credit with support before sending. The required received value includes the 2% fee; approval credits only the agreed XAF wallet value. Inspect the fee on the admin claim before approving. The manual ledger trigger copies the fee for audit, without crediting it to the customer's balance.

Check the receiving Binance address/network again in Binance before launch. A checksum-valid address is not proof of ownership or receipt. Payunit collection/settlement uses the merchant account configured by the owner's credentials, not a direct Binance transfer. Confirm its merchant settlement destination in the Payunit dashboard.

Deploy backend and website together after SQL installation. Rebuild Android before publishing its download. Test a real transfer, reject/cancel, duplicate callbacks and exactly-once wallet credit; this change alone does not resolve the other launch blockers in `mobile/INSPECTION.md`.

The website and bot links share one method-first checkout: Method → Amount → Payment. The wallet balance is clickable. Crypto receipts are requested only after “I've paid”; transaction IDs and supported explorer links are accepted, while admin verification remains mandatory. Pending claims resume after reload, and another pending top-up is blocked or reused server-side. The retired manual mobile-money claim endpoint returns 410; historical claims remain reviewable. Customer support is +237 677034736, separate from the bot identity.

Local tests: `scripts/check-topup-flow.mjs` uses an isolated Playwright installation and mocks payment/REST calls. `scripts/check-topup-sql.mjs` uses an isolated PGlite installation and verifies the migration, retries, cross-method exclusion, atomic bot reservation, fee bookkeeping and exactly-once manual approval. Neither sends real money or alters the production database. These tests do not simulate distributed PostgreSQL connections or prove merchant/Binance settlement.
