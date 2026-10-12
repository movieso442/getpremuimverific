# Premium Verify — Android and iPhone

Native Expo / React Native starter sharing the website's verified Supabase accounts and server APIs. This is not an embedded website.

Implemented: email/password and Google sign-in, live SMS quotes/purchase, foreground OTP inbox refresh, SMM catalogue/order, MTN/Orange direct checkout, payment status, transaction and order history.

## Local setup

1. Copy .env.example to .env. Set the website HTTPS API URL and the same public Supabase URL/anon key as the website. Never copy payment/provider/service-role secrets.
2. Run npm install, then npx expo install --check, then npm run typecheck.
3. Run npm start. Use a development build for Google OAuth and payment/device testing.
4. Add premiumverify://auth/callback to Supabase Auth's allowed redirect URLs. Enable Google and email/password providers.
5. Deploy the accompanying website routes before using this app.

## Builds

Follow [RELEASE.md](./RELEASE.md) for accounts, signing, Android APK builds, iPhone TestFlight and the website download links. Use npm run build:apk and npm run build:iphone after linking your own Expo project and configuring credentials. Install expo-dev-client with npx expo install expo-dev-client for development builds.

Store releases require the relevant Apple/Google developer account, app icons/splash assets, privacy/store disclosures and review of the payment rules for the digital services being sold. No store submission or paid build has been started.

Android direct APK installation does not require a Google Play developer account. Public iPhone testing uses a signed TestFlight build, not a downloadable APK. [UX.md](./UX.md) records the short-flow design, accessibility choices and research.

## Limitations to verify before launch

- Real phones must test OAuth, MTN and Orange operator prompts, interrupted requests, and confirmed wallet credits. No live charge is triggered by local tests.
- OTP refresh runs while the app is active. Background push notifications/continuous delivery are not implemented.
- Native SMS currently supports the purchase endpoint's existing country/service selections; quotes and availability are live, but this is not yet the provider's full catalogue.
- Native crypto claim submission is not included; the website retains that flow.
- Existing bot accounts are not automatically merged by phone/name. Account linking needs a separate verified flow.
- Existing SMS/SMM order placement is not atomic across provider allocation and wallet debit. Concurrent purchase/retry reliability needs hardening before calling the lifecycle production-audited.
- The operator PIN prompt is never rendered by this app; its merchant text is controlled outside the app.
- Dependency audit currently reports 22 transitive findings (15 high, 7 moderate) in the Expo/Metro/iOS-build toolchain. Non-breaking audit fixes have been applied, but findings remain. Do not use the suggested forced downgrade to Expo 44; investigate upstream patches and assess these before distribution.
