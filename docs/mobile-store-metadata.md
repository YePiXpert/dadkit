# DadKit mobile store metadata draft

Status as of 2026-06-30. This file is a non-secret staging sheet for App
Store Connect, TestFlight, Google Play, and direct APK testing. Replace
placeholders before upload, and do not commit account credentials, signing
keys, screenshots containing private family data, or WebDAV secrets.

## App identity

- App name: `DadKit`
- Bundle/package id: `com.yepixpert.dadkit`
- Version: `1.3.0`
- Build number: `2`
- Primary category candidate: Health & Fitness
- Alternate category candidate: Productivity
- Privacy Policy URL: `<public-origin>/privacy`
- Support URL: `<public-origin>/support`
- Support channel: `https://github.com/YePiXpert/dadkit/issues`

Use Health & Fitness if the listing clearly frames DadKit as maternity
preparation support. Use Productivity if the listing should avoid sounding like
a medical or clinical product. In either category, keep the review notes clear:
DadKit is a preparation checklist and coordination tool, not medical advice,
diagnosis, or emergency guidance.

## Short listing copy

### Subtitle / short description

Maternity prep checklist for dads and families.

### Promotional text

Plan the hospital bag, labor timeline, family communication, and backup notes
in a local-first mobile app.

### Full description

DadKit helps dads and families prepare for birth with a practical mobile
checklist, hospital communication notes, contraction timing, birth plan
prompts, postpartum reminders, and shareable summaries.

The app is local-first: family preparation data stays on the device unless the
user chooses to export it or manually configures WebDAV backup. DadKit does not
require an account, does not include ads, and does not use analytics SDKs in
the current mobile build.

DadKit is a preparation and coordination tool. It does not provide medical
diagnosis, treatment, or emergency advice. Users should follow their hospital,
clinician, and local emergency guidance.

### Keywords

maternity, birth plan, hospital bag, contractions, dad checklist, postpartum,
family preparation, local first, WebDAV backup

## TestFlight beta information

### Beta app description

DadKit is a local-first maternity preparation app for dads and families. This
beta focuses on checklist flows, hospital notes, timeline, contraction timer,
share/export, and optional WebDAV backup.

### What to test

- Complete initial setup and confirm the home screen reflects the due-date
  timeline.
- Review checklist, hospital, timeline, go mode, contractions, birth plan,
  postpartum, share/export, and settings.
- Verify the privacy and support pages open from Settings.
- On Android, verify direct APK install from the handoff package.
- If you have a safe test WebDAV account, verify connection, upload, conflict
  handling, download, and restore. Do not use real family data for beta backup
  testing.

### Feedback note

Please include device model, OS version, app version, what you expected, what
happened, and whether the issue repeats. Do not include WebDAV passwords,
phone numbers, hospital IDs, certificate photos, or real family screenshots.

### Contact placeholders

- Feedback email: `<feedback-email>`
- Marketing URL: `<public-origin>`
- Privacy URL: `<public-origin>/privacy`
- Support URL: `<public-origin>/support`

### App Store screenshot drafts

- App Store 6.9-inch screenshots:
  `dist/mobile-handoff/store-screenshots/app-store-6-9/`.
- Count: 10 screenshots.
- Size: `1290x2796` portrait PNG.
- Source command: `npm run mobile:handoff:store-screenshots`.
- These are generated from real DadKit pages with sample local data. Do not use
  screenshots containing real phone numbers, hospital IDs, family data, WebDAV
  credentials, account data, or signing information.

## App Review notes

DadKit does not require a login. The reviewer can use the app immediately after
opening it and can enter sample due-date/profile data during setup.

The WebDAV backup feature is optional and user-configured. DadKit does not
collect the WebDAV username or app password; the user supplies credentials for
their chosen provider. Reviewers can skip WebDAV or use a non-secret test
account supplied outside the binary when needed.

DadKit stores preparation data locally on the device and supports JSON export.
The current build has no ads, no analytics SDK, and no developer-operated
account or cloud backend.

Medical disclaimer: DadKit is not a medical device and is not intended for
diagnosis, treatment, emergency triage, or clinical decision-making.

## App privacy draft

Current implementation assumption:

- Developer-collected data: none.
- Third-party analytics SDKs: none.
- Ads or tracking SDKs: none.
- Account creation: none.
- Optional user-directed WebDAV backup: user data may be uploaded to the
  user's chosen WebDAV provider only after the user configures credentials and
  starts backup.

If App Store Connect asks whether the developer collects data from the app, the
current code supports answering that the developer does not collect data. Revisit
this answer before release if analytics, crash reporting, a hosted sync server,
remote config, email support attachments, or any developer-operated backend is
added.

## Google Play / Android notes

- Direct APK testing uses `dist/mobile-handoff/dadkit-1.3.0-debug.apk`.
- Google Play release testing should use a signed AAB from
  `npm run mobile:android:release:aab`.
- Google Play feature graphic draft:
  `resources/store/dadkit-google-play-feature.png`.
- Feature graphic size: `1024x500`, 24-bit PNG without alpha. It is generated
  with image2 and contains no readable text, people, faces, hands, phone
  numbers, hospital IDs, private documents, WebDAV credentials, or signing
  secrets.
- The package name is `com.yepixpert.dadkit`; treat it as permanent once an
  artifact is uploaded to Play Console.
- Internal testing is enough for the first closed tester loop. Complete store
  listing, app content, data safety, content rating, and target-audience
  answers before broader release.

## Source checks

Official references checked on 2026-06-30:

- Apple TestFlight overview:
  https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
- Apple app privacy management:
  https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Apple upload builds:
  https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Google Play app testing:
  https://support.google.com/googleplay/android-developer/answer/9845334
- Google Play preview assets / feature graphic:
  https://support.google.com/googleplay/android-developer/answer/9866151
- Apple screenshot specifications:
  https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/
- Google Play app content:
  https://support.google.com/googleplay/android-developer/answer/9859455
