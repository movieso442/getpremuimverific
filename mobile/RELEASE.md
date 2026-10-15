# Release and website downloads

## Crypto top-up and app-only sign-in — 15 October 2026

EAS build `018cf48b-186b-4805-8070-10e5b0a25c30` (versionCode 8) is queued.
It adds in-app crypto top-ups using the existing verified manual-payment API,
2% fee display, live server-provided addresses, USDT reference estimate and
pending-payment tracking. Mobile registration now accepts a six-digit email
confirmation code inside the app. Google uses a nonce-bound app redirect, while
website Google login retains its website callback. Android App Links are limited
to `/auth/mobile-callback` and signed by the existing build certificate.
The production web API, Supabase email template/redirect allowlist and website
asset association are deployed. Publish this APK only after EAS finishes and its
package, version, signing certificate, size and checksum are verified.

## Account creation and card removal — 15 October 2026

EAS build `6dbf8989-c2dc-430f-bf8e-0745139908b6` (versionCode 7) was submitted
with the native registration form, confirmation resend, HTTPS-to-app PKCE return,
warm/cold callback handling, card UI removal and least-privilege Android permission
blocking. Native TypeScript and Android/iOS production JS exports passed.
Pure callback tests check nonce/age, exact scheme/path and token-relay rejection.
Build 7 finished and was published as `android-v0.1.0-build7`; its signed APK
is 72,811,168 bytes with SHA-256
`f7fad61ea95c022428be439c3017673281875d0a914fdc2958a87e203666c56c`.
`aapt` reports package `com.premiumverify.app`, versionCode 7, and display name
`premiumverific`. APK v2 signature verification passed and the signing
certificate matches build 6. The website manifest now references build 7.
A real device Google/confirmation flow and
Google's app review are separate acceptance steps, not implied by compilation.

## Name and public presentation — 15 October 2026

Verified signed artifact: EAS `b14612da-8152-4cd6-8c00-6c677b8fb7e3`, version
0.1.0 / versionCode 6, 72,809,304 bytes. SHA-256:
`266291237a175486b4353d9f46300430e6797bbedf804f20529749fbc0818859`.
`aapt` reports `application-label:'premiumverific'`; the adaptive launcher
foreground was extracted and visually checked against the PV mark. APK v2
signature verifies and certificate SHA-256 matches build 3:
`539da41782995ed2ee22205cce9a8ec662a647c266ab3d4dca404ff91b7fc425`.
The APK is not debuggable. This is artifact verification, not a new live-payment
acceptance test.

The requested app display name is `premiumverific`; the Android package remains
`com.premiumverify.app` so existing installs can upgrade with the same signing
key. Build 6 adds the PV logo to the login screen and panel header and keeps the
existing branded launcher/adaptive icons. The public download filename is
`premiumverific.apk`. The website's beta banner/badge were removed at the owner's
request. This presentation change does not waive the documented acceptance tests
or paid-launch blockers. The older build-3 notes below are historical.

## Android beta build 3 — 14 October 2026

The owner requested direct website APK distribution. EAS build `1c7902ef-646b-4c4d-9ba3-99f20b106f5f` finished: version 0.1.0, versionCode 3, package `com.premiumverify.app`, 72,693,196 bytes. APK Signature Scheme v2 verifies, its signing certificate SHA-256 matches build 2 (`539da41782995ed2ee22205cce9a8ec662a647c266ab3d4dca404ff91b7fc425`), and its package is not debuggable. Binary SHA-256: `8c232b8f5885bf5bcb95403b7776696883307db915c1dada4d833127a8433915`.

The new website release mechanism keeps the APK in `public/downloads` and restores a verified GitHub release asset during build. The website displays it as a **beta**, not a cleared paid-launch release. See `docs/android-website-publishing.md`. The inspection/paid-launch blockers below still apply; download availability is not financial acceptance testing. The older paragraphs record the earlier build-2 inspection, not the current bundled beta publication policy.

The signed Android APK has been built, downloaded, signature-verified and smoke-tested at the native login screen in an isolated emulator. It is available for testing, not yet approved for public paid launch. See [INSPECTION.md](./INSPECTION.md) for verified checks and blockers. Exported JavaScript bundles in dist are NOT installable apps. Website APK download variables remain unset until release acceptance checks pass; iPhone customers use the website.

Android build submitted on 12 October 2026: [EAS build 1846930c](https://expo.dev/accounts/student-admin/projects/getpremuimverific/builds/1846930c-5f97-4f3f-a95f-4b69f6a6a547), version 0.1.0 / versionCode 2, release keystore generated and managed by EAS. Check its current result rather than assuming submission means success. Back up the signing credentials securely using `npx eas-cli credentials --platform android`; never commit/export them into the public download directory.

iOS Simulator build submitted: [EAS build c7f7b99c](https://expo.dev/accounts/student-admin/projects/getpremuimverific/builds/c7f7b99c-23a9-4d5c-8370-4024c8e34ccc). The ios-simulator profile needs no paid Apple membership, but its artifact is for Apple's simulator on macOS, NOT a real iPhone, TestFlight or the App Store. Run npm run build:ios-simulator to repeat it. Real iPhone distribution still needs enrollment/signing. Complete the encryption declaration in App Store Connect before TestFlight; this build does not automatically answer that declaration.

## Accounts and signing

1. Run all Expo/EAS commands from this repository's `mobile` directory (`cd mobile` from the website root). Expo is installed there, not in the Next.js website. Sign in with `npx eas-cli login` if your session expires.
2. This app is linked to @student-admin/getpremuimverific, project c0d05158-6d75-4762-bdbc-1e48ff1c3cc3. Do not initialize another project from the website root. Check the link with `npx eas-cli project:info`.
3. Configure public build variables from .env.example in that project's EAS production environment. Only the public website API URL, Supabase project URL and anon key belong in the binary. Never include provider, payment, Resend or Supabase service-role secrets.
4. Android: `npm run build:apk` uses android-download to produce an APK, not an AAB. Keep a recoverable backup of the signing key; future updates must use the same key. Expo is the configured cloud-build path, not a fundamental requirement: a locally signed Gradle build is also possible with an Android SDK/JDK and your own release signing configuration. Never publish Expo's default debug-keystore build as a release.
5. iPhone: enroll in Apple Developer, configure signing and an App Store Connect application, then `npm run build:iphone`. Upload the signed build to TestFlight using EAS Submit or Apple's tooling. Complete Apple's beta review as needed, then create a public tester link. A raw IPA is not a public iPhone download strategy; ad-hoc builds allow only provisioned devices.

App icons/splash assets, privacy disclosures and store/payment-rule review are still release tasks. No paid account purchase, store submission or live charge is part of this setup. Android cloud build setup uses the owner's linked Expo project.

## Configuration verified on 12 October 2026

- EAS owner/project verified, SDK 57 dependency compatibility checked, all 21 Expo Doctor checks passed, mobile TypeScript passed.
- Missing expo-font peer dependency installed and duplicate expo-constants copies deduplicated.
- Production EAS environment contains only the three public connection variables listed in .env.example; its build profiles explicitly select production.
- The archive includes mobile source/manifest and no .env/signing files or website source. Root package manifests/Git metadata are retained by EAS's monorepo archive machinery.
- The missing mobile routes were deployed to production with the owner's approval. Both the configured Vercel API deployment and premiumverific.com now return 200 for /api/mobile/sms/catalog and 401 for signed-out /api/mobile/account.

## Test before publishing

- Deploy accompanying API changes. Ensure the build API URL points at that deployment, not an older deployment.
- Add premiumverify://auth/callback to Supabase Auth redirect URLs. Test password login, confirmation and Google OAuth on real devices.
- Test number quote → buy → OTP inbox → copy, expiry, poor network, sign-out, restart and large text/Reduce Motion.
- Test social order limits/pricing and history; prevent duplicates after interruptions. Existing provider-allocation/wallet-debit atomicity remains a launch blocker.
- Test real MTN and Orange payments, including rejection, timeout, app background/restart and exactly-once wallet credit. Never retry an uncertain charge without checking its status.
- Resolve or assess remaining dependency audit findings. Do not force-downgrade Expo to clear the report.

## Publish on the website

Upload the verified, release-signed APK to HTTPS static/object storage. Record its SHA-256 with `Get-FileHash -Algorithm SHA256 -LiteralPath <apk-path>` and verify the published bytes match. Configure these SERVER environment variables on the website and redeploy:

```dotenv
APP_ANDROID_APK_URL=https://your-download-host/premium-verify-0.1.0.apk
APP_ANDROID_APK_SHA256=<64-character-sha256-of-published-apk>
APP_MOBILE_VERSION=0.1.0
APP_IOS_INSTALL_URL=https://testflight.apple.com/join/<your-public-tester-code>
```

After App Store release, APP_IOS_INSTALL_URL can instead be the official apps.apple.com listing. The download page requires HTTPS + APK filename + version + checksum for Android and an official Apple distribution URL for iPhone. These checks validate configuration, not signatures or binary safety: release verification must happen before setting them.

Homepage, public footer and panel sidebar link to /downloads. With missing/invalid metadata the page keeps website access available and offers no pretend download.
