# Mobile experience

The design targets short flows for a signed-in customer with a funded wallet. Counts below exclude typing, scrolling, signing in and operator PIN approval; they are design targets, not measured real-device timings.

| Task | Path | Target taps |
| --- | --- | --- |
| Get a number | App → country → review/buy → confirm | 4 from Numbers |
| Copy an OTP | Inbox → copy code | 2 from another tab |
| Social order | Boost → service → review/order → confirm | 4, plus entering link/quantity; platform filter adds 1 |
| Top up | Wallet → operator → pay | 3 with default amount, plus entering number and approving on phone |

## Implemented principles

- Five persistent, icon-and-label destinations: Numbers, Inbox, Boost, Wallet and Account. Selection, search and form data survive tab switching.
- Wallet amount is a shortcut, not an extra menu. Number purchase automatically opens Inbox; social purchase opens order history.
- Large touch targets, readable dark text, clear prices and explicit purchase confirmation. Copy actions give a short toast rather than another confirmation dialog.
- Search and platform filters replace nested social-service menus. Only 12 results render initially; customers can reveal more.
- Independent account/inbox refreshes and parallel OTP checks prevent one slow OTP request holding the entire panel. Requests time out; financial requests are never blindly retried.
- Brief opacity/button motion uses the native animation driver and respects system Reduce Motion. Haptics are optional; failure never blocks copying.
- Pending payments remain pending until the backend verifies them. No PIN field, fake success or provider-branded hosted checkout is added to the app.

## Research used

- [Android navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns): navigation bars suit 3–5 same-level destinations.
- [Apple reduced-motion evaluation](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria): respect Reduce Motion and avoid relying on movement to convey meaning.
- [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/) and [Apple TestFlight](https://developer.apple.com/testflight/): Android APK distribution differs from iPhone's signed distribution/testing.

These sources informed the structure; they do not prove retention gains. Validate actual task completion on real small Android/iPhone devices, with larger text, screen readers, Reduce Motion, poor connectivity and interrupted payments before release.
