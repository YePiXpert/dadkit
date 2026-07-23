# DadKit mobile build notes

DadKit uses a Capacitor local bundle for native packaging. The web app is
exported to `out/`, then copied into the native Android and iOS projects.

## Commands

- `npm run mobile:web` builds the static web bundle for Capacitor.
- `npm run mobile:assets` regenerates Android/iOS native icons and splash assets.
- `npm run mobile:sync` rebuilds the web bundle, syncs Android/iOS projects, and
  refreshes native assets.
- `npm run mobile:android:debug` builds a debug APK after sync.
- `npm run mobile:android:handoff` rebuilds the debug APK and writes a
  tester-friendly package under `dist/mobile-handoff/`.
- `npm run mobile:android:release` builds a signed release APK after sync when
  Android release signing environment variables are present.
- `npm run mobile:android:release:aab` builds a signed release AAB after sync
  when Android release signing environment variables are present.
- `npm run mobile:android:verify` verifies the debug APK package metadata and
  debug signature.
- `npm run mobile:android:install` installs and launches the debug APK on the
  connected Android device or emulator.
- `npm run mobile:handoff:screenshots` captures real mobile screenshots into
  `dist/mobile-handoff/screenshots/` for tester notes and store prep.
- `npm run mobile:handoff:store-screenshots` captures 10 App Store 6.9-inch
  screenshot drafts into `dist/mobile-handoff/store-screenshots/app-store-6-9/`.
- `npm run mobile:handoff:archive` refreshes the shareable Android tester ZIP
  under `dist/mobile-handoff/`.
- `npm run mobile:ios:sync` syncs the iOS project and refreshes native assets
  for Xcode/TestFlight work.
- `npm run mobile:ios:verify` checks the iOS handoff project, bundle id,
  native version, copied web bundle, icon, and splash assets.
- Final handoff checklist: `docs/mobile-release-readiness.md`.
- Store/TestFlight metadata draft: `docs/mobile-store-metadata.md`.
- Tester guide: `docs/mobile-tester-guide.md`.

The Android debug APK is produced at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The Android tester handoff package is produced at:

```text
dist/mobile-handoff/dadkit-1.3.0-debug.apk
dist/mobile-handoff/index.html
dist/mobile-handoff/cover.png
dist/mobile-handoff/google-play-feature.png
dist/mobile-handoff/tester-guide.md
dist/mobile-handoff/dadkit-1.3.0-mobile-handoff.zip
dist/mobile-handoff/store-screenshots/app-store-6-9/
```

The screenshot handoff package is produced at:

```text
dist/mobile-handoff/screenshots/
```

`npm run mobile:handoff:verify` validates the generated handoff package,
including APK checksum, `index.html`, `cover.png`, screenshot manifest, 12
captured screenshots, screenshot horizontal-overflow diagnostics, App Store
6.9-inch screenshot dimensions/diagnostics, Google Play feature graphic
dimensions/color type, and the shareable ZIP contents. It writes
`dist/mobile-handoff/readiness-report.md`,
`dist/mobile-handoff/readiness-report.json`, and refreshes
`dist/mobile-handoff/dadkit-1.3.0-mobile-handoff.zip` after successful
verification.

## Android prerequisites

- JDK 21 available to the build. The script auto-detects the local Temurin JDK
  21 ZIP install when `JAVA_HOME` is not set.
- Android Studio or command-line Android SDK installed.
- Android SDK Platform 36, build tools, and platform tools available.

The generated project currently uses:

- `compileSdkVersion = 36`
- `targetSdkVersion = 36`
- Android Gradle Plugin `8.13.0`
- Gradle wrapper `8.14.3`
- Capacitor Android Java compatibility `VERSION_21`

Android publishing note: this task's APK is intentionally a debug package for
local install and APK handoff. Android's debug certificate is insecure by
design and is not accepted by most app stores, including Google Play. A later
store release should add a release keystore and produce a signed release APK or
AAB.

Release signing environment variables:

- `DADKIT_ANDROID_KEYSTORE_PATH`
- `DADKIT_ANDROID_KEYSTORE_PASSWORD`
- `DADKIT_ANDROID_KEY_ALIAS`
- `DADKIT_ANDROID_KEY_PASSWORD`

The release Gradle config only signs release artifacts when all four variables
are present. Keep the keystore and passwords outside the repository.

On the current Windows host, `npm run mobile:android:debug` produces a debug
APK at `android/app/build/outputs/apk/debug/app-debug.apk`. The generated debug
APK has package id `com.yepixpert.dadkit`, app label `DadKit`, version `1.3.0`
(version code `2`),
`minSdkVersion` 24, and `targetSdkVersion` 36. It verifies with APK Signature
Scheme v2.

To install on a phone:

1. Enable Developer options and USB debugging on the Android device.
2. Connect the device and approve the USB debugging prompt.
3. Run `npm run mobile:android:install`.
4. If more than one device is connected, set `ANDROID_SERIAL` to the target
   device serial and rerun the install command.

## Native visual assets

Native assets are generated from the `resources/` directory:

- `resources/icon.png` reuses the DadKit PWA icon as the native launcher source.
- `resources/splash-source.png` is the image2-generated DadKit splash source.
- `resources/splash.png` is the `2732x2732` production splash source used by
  `@capacitor/assets`.
- `resources/store/dadkit-handoff-cover.png` is the image2-generated visual
  cover copied into the Android tester handoff page.
- `resources/store/dadkit-google-play-feature-source.png` is the image2 source
  for the Google Play feature graphic draft.
- `resources/store/dadkit-google-play-feature.png` is the cropped 1024x500
  24-bit PNG copied into the handoff package as `google-play-feature.png`.
- `dist/mobile-handoff/store-screenshots/app-store-6-9/` is generated output
  for App Store 6.9-inch screenshot drafts. It contains 10 PNGs at 1290x2796
  plus a manifest, and is refreshed by `npm run mobile:handoff:store-screenshots`.

The asset command intentionally targets only `--ios --android` so it does not
rewrite the existing PWA manifest or service-worker asset contract.

Security note: `npm audit --omit=dev` currently reports 0 vulnerabilities.
Full dev audit still reports unresolved transitive advisories from
`@capacitor/assets` (`@trapezedev/project` / nested `@capacitor/cli` tooling).
Keep `@capacitor/assets` as build-time tooling only; do not ship it in runtime
dependencies.

## iOS and TestFlight prerequisites

- macOS with Xcode. Capacitor iOS is managed with Xcode, and the current
  Capacitor docs require Xcode 26.0+ for the iOS platform.
- Apple Developer Program membership for signing and App Store Connect upload.
- A bundle identifier matching `com.yepixpert.dadkit`.

The iOS project is generated under `ios/App/`. After `npm run mobile:ios:sync`,
open the iOS project through `npx cap open ios` or `ios/App/App.xcodeproj` in
Xcode, configure signing with the final Apple Developer account, archive, and
upload to App Store Connect for TestFlight.

The current handoff project is configured as:

- Bundle id: `com.yepixpert.dadkit`
- Display name: `DadKit`
- Marketing version: `1.3.0`
- Build number: `2`
- iOS deployment target: `15.0`

TestFlight handoff checklist:

1. Run `npm run mobile:ios:sync` on the repo before handing it to macOS/Xcode.
2. On macOS, open the project with `npx cap open ios` or Xcode.
3. Select the `App` target and set Team, Bundle Identifier
   `com.yepixpert.dadkit`, Version, and Build.
4. Confirm app icons and splash assets are present under
   `ios/App/App/Assets.xcassets`.
5. Choose a generic iOS device or real device target, then run
   Product > Archive.
6. In Organizer, choose Distribute App > App Store Connect and upload the
   signed archive.
7. In App Store Connect, wait for processing, provide beta test information,
   then add the build to TestFlight internal testing.
8. For external testers, create a tester group and submit the first beta build
   for Beta App Review when App Store Connect asks for it.

Official TestFlight limits checked on 2026-06-30:

- A build can be tested for up to 90 days.
- Internal testing supports up to 100 App Store Connect users with app access.
- External testing supports up to 10,000 people.
- The first build added to an external tester group is sent to App Review.
- Apple also supports Xcode Cloud and Transporter as upload paths, but both
  still require Apple signing and App Store Connect access.

Keep signing certificates, API keys, issuer IDs, private keys, provisioning
profiles, and Apple account credentials outside the repository.

Review/readiness items before inviting testers:

- Add support/contact metadata in App Store Connect.
- Provide a privacy policy URL that matches the local-first data model.
- Make clear that DadKit is a preparation checklist/tool and not medical
  diagnosis or medical advice.
- Confirm WebDAV credentials are user-entered and not collected by DadKit.
- Confirm backup/restore behavior with non-secret test data before using real
  family data.

App metadata placeholders after deploying the web/PWA surface:

- Privacy Policy URL: `<public-origin>/privacy`
- Support URL: `<public-origin>/support`
- Public support channel: `https://github.com/YePiXpert/dadkit/issues`
- Store/TestFlight copy draft: `docs/mobile-store-metadata.md`
- Beta feedback note: ask testers not to include WebDAV passwords, phone
  numbers, hospital IDs, certificate photos, or real family screenshots.

Native static-export note:

- Public web metadata URLs stay `/privacy` and `/support`.
- The Capacitor bundle writes internal app links as `/privacy/index.html` and
  `/support/index.html` during `npm run mobile:web`, because direct Android
  WebView navigation to `/privacy/` or `/support/` can be served by the app
  shell instead of the exported route HTML.
- After installing the APK, verify the static review pages with:
  `node scripts/verify-android-webview-route.mjs https://localhost/privacy/index.html 隐私政策`
  and
  `node scripts/verify-android-webview-route.mjs https://localhost/support/index.html 支持与反馈`.

Official references:

- Capacitor icons/splash: https://capacitorjs.com/docs/guides/splash-screens-and-icons
- Capacitor iOS: https://capacitorjs.com/docs/ios
- Android JDK setup: https://developer.android.com/build/jdks
- Apple build uploads: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple TestFlight overview: https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/

## WebDAV backup test target

Use runtime app settings for credentials. Do not commit usernames, phone
numbers, app passwords, exported secrets, or credential screenshots.

123pan WebDAV non-secret connection details:

- Endpoint: `https://webdav.123pan.cn/webdav`
- Remote directory: `/DadKit`
- Backup file: `dadkit-backup.json`
- Full backup path: `/DadKit/dadkit-backup.json`

In Capacitor native builds, DadKit uses the native HTTP transport for WebDAV.
The browser/PWA build continues to use the same-origin `/api/webdav` proxy.

Manual Android APK WebDAV acceptance:

1. Install and launch the APK with `npm run mobile:android:install`.
2. Open DadKit settings and confirm the prefilled 123pan endpoint, then enter
   the username and app password manually.
3. Use the prefilled remote directory `/DadKit` and backup file
   `dadkit-backup.json`.
4. Run connection test, upload backup, download/restore, and conflict handling.
5. Confirm the remote file exists at `/DadKit/dadkit-backup.json`.
6. Do not capture screenshots or logs containing the username or app password.

Repeatable WebDAV acceptance scripts:

```powershell
# Prompted Windows flow; avoids putting secrets in command history.
npm run webdav:verify:prompt
npm run mobile:android:webdav:verify:prompt

# Environment-variable flow for non-interactive local shells.
$env:DADKIT_WEBDAV_USERNAME="<123pan WebDAV username>"
$env:DADKIT_WEBDAV_SECRET="<123pan app password>"
npm run webdav:verify
npm run mobile:android:webdav:verify
Remove-Item Env:DADKIT_WEBDAV_USERNAME
Remove-Item Env:DADKIT_WEBDAV_SECRET
```

- `npm run webdav:verify` checks the provider path from the host machine.
- `npm run mobile:android:webdav:verify` checks the installed APK's Capacitor
  native HTTP path through the Android WebView.
- The `:prompt` variants ask for credentials at runtime on Windows PowerShell
  and clear the process environment variables before exiting.
- `npm run mobile:handoff:verify` checks that the APK, iOS handoff project,
  privacy/support routes, native assets, release checklist, and mobile npm
  scripts are present before handoff. It also confirms the generated ZIP
  includes the APK, checksum, tester guide, readiness reports, image2 cover,
  Google Play feature graphic, App Store screenshot manifest, and first
  screenshot.
- Both scripts use the non-secret default target above and write a synthetic
  DadKit acceptance backup, then download it and verify the checksum.
- Both scripts intentionally refuse to replace an existing
  `/DadKit/dadkit-backup.json` unless it was created by the acceptance script.
  Set `DADKIT_WEBDAV_ALLOW_OVERWRITE=1` only when it is acceptable to replace
  the remote test file.
- `HTTP 401` usually means the WebDAV username or app password is wrong;
  `HTTP 403` usually means the authorized WebDAV directory lacks read/write
  permission for the target path.
- Do not paste real credentials into docs, commits, screenshots, issue reports,
  or shared logs. Use environment variables only for the local test session.

Current local-machine status:

- Android emulator install/launch works on Windows using an ASCII SDK/AVD path
  workaround when the user profile path contains non-ASCII characters.
- `npm run mobile:android:debug` rebuilt and verified the debug APK.
- `npm run mobile:android:install` installed and launched the APK on
  `emulator-5554`.
- APK WebView text verification passed for `/settings/index.html`,
  `/privacy/index.html`, and `/support/index.html`.
- 123pan acceptance is scripted but still requires local runtime credentials;
  do not write the username or app password into repo files, screenshots, or
  logs.
