# DadKit mobile tester guide

Use this guide when sending the Android APK handoff package to a tester. It is
safe to share because it contains no WebDAV credentials, signing keys, Apple
account data, phone numbers, hospital IDs, or private family data.

## Before testing

1. Use a test profile and sample due date. Do not use real family documents or
   private screenshots during beta testing.
2. If the package was sent as one file, unzip
   `dist/mobile-handoff/dadkit-1.3.0-mobile-handoff.zip` first.
3. Install the APK from `dist/mobile-handoff/dadkit-1.3.0-debug.apk`.
4. Open `dist/mobile-handoff/index.html` to review the APK checksum, cover,
   screenshots, readiness report, and expected test focus.
5. If Android blocks installation, enable install-from-this-source for the file
   manager or browser used to open the APK.

## Smoke test

1. Launch DadKit and complete setup with sample data.
2. Confirm the home screen shows a due-date countdown and progress cards.
3. Open the bottom tabs: home, checklist, hospital, timeline, and settings.
4. Confirm the app stays inside the phone width with no sideways scrolling.
5. Open Settings, Privacy, and Support.

## Core workflow test

1. Checklist: mark a few preparation items complete, then revisit the page and
   confirm progress persists.
2. Hospital: enter sample hospital contact and route notes; do not enter real
   phone numbers or hospital IDs.
3. Timeline: review pregnancy-stage cards and confirm current-stage copy reads
   sensibly.
4. Go mode: review action cards and confirm the page feels useful during a
   time-sensitive hospital departure.
5. Contractions: start and stop a few sample contraction entries.
6. Birth plan and postpartum: add sample notes and confirm they are saved.
7. Share/export: create a summary using sample data only.

## Optional WebDAV test

Run WebDAV only with a safe test account and sample DadKit data.

Expected remote backup path:

```text
https://webdav.123pan.cn/webdav/DadKit/dadkit-backup.json
```

Test steps:

1. Enter the WebDAV endpoint, username, app password, `/DadKit`, and
   `dadkit-backup.json` in Settings.
2. Run connection test.
3. Upload a backup.
4. Download and restore the backup.
5. Trigger conflict handling by uploading again after changing sample data.

Do not send WebDAV usernames, app passwords, phone numbers, hospital IDs,
certificate photos, or real family screenshots in feedback.

## Feedback template

```text
Device:
Android version:
DadKit version:
APK SHA-256:
Area tested:
What I expected:
What happened:
Can I repeat it:
Screenshot/video included: yes/no
Sensitive data removed: yes/no
```

## Pass criteria

- Install succeeds on at least one Android phone or emulator.
- Setup, navigation, and settings work.
- Checklist/hospital/timeline/go mode/contractions/share flows are usable with
  sample data.
- Privacy and support pages open.
- No sideways scrolling on the captured mobile width.
- Optional WebDAV test writes and restores only sample data.
