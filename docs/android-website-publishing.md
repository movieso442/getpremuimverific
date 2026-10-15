# Put the Android app on the website

## Current automated bundled release

Build 7 is declared in `lib/mobile/android-release.json`. Its verified APK is
kept locally at `public/downloads/premiumverific.apk`, backed by the versioned
public GitHub release asset `android-v0.1.0-build7/premiumverific.apk`. The
installed display name is `premiumverific` and its PV launcher icon was inspected
inside the signed APK. The package/signing certificate remain update-compatible
with build 3. The binary is intentionally ignored by Git and Vercel source
uploads. `npm run build` restores it from GitHub when absent and verifies size
and SHA-256 before Next builds. No API function proxies the APK.

The download card uses the same-origin URL and `download="premiumverific.apk"`.
The upstream GitHub source remains versioned; the website's friendly URL must not
be given immutable caching. The card displays version/build, size and checksum;
the owner requested removal of the public beta notice on 15 October 2026.
Internal release checks and launch blockers remain documented and have not been
waived. This bundled release does **not** require manual `APP_ANDROID_*`
variables; those remain an optional fallback. Native payment acceptance is
separate from successful builds/checksum checks.

For updates, build a new APK, verify signing/version and checksum, publish a new versioned GitHub release asset, and update the bundled release manifest. Never replace a versioned asset with different bytes or change the checksum without verifying its source. `scripts/check-bundled-download.mjs` validates the actual served APK and button (set `CHECK_ORIGIN` for production).

The customer page is `https://premiumverific.com/downloads` (plural). It already renders a real APK download button when all three release values below are valid. Do not manually replace the button or upload a JavaScript bundle as an app. iPhone users continue using the website.

## 1. Build the current app

First deploy/test the matching backend, resolve the paid-launch blockers in `mobile/RELEASE.md`, and verify the three public EAS production variables against `mobile/.env.example`. Keep Supabase service-role/provider/admin passwords OUT of the app. The older October 12 APK does not contain all the latest payment/icon changes.

Update the display version in `mobile/app.json` for this release, keeping the existing Android package and signing key. From the repository root in PowerShell:

```powershell
cd mobile
npx eas-cli whoami
npm run typecheck
npm run build:apk
```

Use the linked `student-admin/getpremuimverific` Expo project. Download the `.apk` from the successful EAS build. An `.aab` is for Play distribution, not direct installation. Install/test it on a real Android phone: sign-in, quotes/orders/OTP, no MoMo/Orange platform top-up fee, crypto fee, interrupted/pending payments, refunds/support and new icon. Production build profiles increment the Android version code remotely. Back up the existing EAS signing key privately; future updates must use that same key.

Reference: https://docs.expo.dev/build-reference/apk/.

## 2. Publish the verified APK as a public download

One straightforward option is a **public GitHub release**. Use a public app-release repository (a private repository's asset will not download anonymously). In GitHub: Releases → Draft a new release → select/create your version tag → upload the signed APK as a release asset → Publish release. Do not commit the APK, `.env` or keystore into source control.

For example, rename the tested file to `premium-verific-0.1.1.apk` and publish an asset URL shaped like:

```text
https://github.com/YOUR_ACCOUNT/premium-verific-app/releases/download/v0.1.1/premium-verific-0.1.1.apk
```

This is an example, not an existing published release. Use the actual stable HTTPS asset URL; it must end in `.apk`. Any suitable public HTTPS object/file host also works. Open it signed out or in a private browser window to confirm customers can download without a GitHub login.

Reference: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository.

## 3. Calculate and verify the checksum

On the downloaded, signature-verified APK:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\path\premium-verific-0.1.1.apk'
```

Download the published asset again and calculate its checksum too. The two hashes must match. This protects download integrity; a hash alone does not verify release signing or app safety.

## 4. Enable the website button in Vercel

Vercel → getpremuimverific project → Settings → Environment Variables → Production. Set:

```dotenv
APP_ANDROID_APK_URL=https://github.com/YOUR_ACCOUNT/premium-verific-app/releases/download/v0.1.1/premium-verific-0.1.1.apk
APP_ANDROID_APK_SHA256=PASTE_THE_ACTUAL_64_CHARACTER_SHA256
APP_MOBILE_VERSION=0.1.1
```

Version must match the actual APK. These are website server variables, not mobile build variables. Leave `APP_IOS_INSTALL_URL` unset for website-only iPhone access. Redeploy the website; editing local `.env` does not change an existing Vercel deployment.

## 5. Verify and submit the page

Visit `/downloads` on Android: confirm version/hash, download/install the exact release and test opening it. Recheck from a signed-out browser. The page must show `Download Android APK`; if it still shows web access, one of the release variables is missing/invalid or the deployment has not picked it up. Submit the updated sitemap and inspect `/downloads` in Google Search Console after deployment. `/download` is only a redirect alias.

The new brand favicon is already delivered at `/favicon.ico` and `/brand/icon-512.png`. Google search may retain the old icon for days/weeks after a new crawl; request indexing of the homepage rather than repeatedly changing the favicon URL. Google does not guarantee a search-result favicon: https://developers.google.com/search/docs/appearance/favicon-in-search.
