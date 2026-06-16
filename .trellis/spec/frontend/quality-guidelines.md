# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

Frontend quality in DadKit is judged by app-like mobile behavior, stable PWA layout, small enough components, and source-level tests that catch regressions.

---

## Forbidden Patterns

### Duplicate mobile brand banner

Do not render a global mobile top brand strip with DadKit name/avatar/calendar controls. Route pages should identify themselves through their own page content.

### Embedded horizontal page scrollers

Avoid `overflow-x-auto`, `min-w-max`, and sticky chip bars inside core mobile pages unless the task explicitly designs that interaction. Previous mobile issues came from content becoming wider than the PWA viewport.

### Single-line truncation in compact mobile rows

Avoid `truncate` or `whitespace-nowrap` on mobile task titles, checklist category names, settings shortcuts, and hospital confirmation rows. Long Chinese copy should stay inside the PWA shell by using `min-w-0` on the flex/grid cell and `break-words` with an explicit compact line-height on the text.

### One-off page width workarounds

Do not add local `max-w-*` wrappers to fix mobile width if `mobile-shell` can represent the intended app width.

### Marketing or platform copy inside core app UI

Do not use platform-growth language in product surfaces: community slang,
screenshot/post framing, or one-click growth phrasing. DadKit is a preparation
tool first. Core pages should label what the user can do or inspect: tasks,
status, export, backup, timeline, and collaboration.

Do not make the interface feel like a promotion by using emotional claims or
over-personalized labels. Keep gender and zodiac details as profile metadata,
not primary action labels. Avoid pressure subtitles and labels that route users
through account/profile wording when a direct action label is clearer. Prefer
concrete status and action copy: "预产期倒计时", "当前优先",
"待产清单已生成", "全部工具", "准备摘要", and "入院沟通信息".

---

## Required Patterns

* Preserve PWA viewport settings in `app/layout.tsx`: `width: "device-width"`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`, and `viewportFit: "cover"`.
* Preserve gesture guards in `components/PwaRegister.tsx` for `gesturestart`, `gesturechange`, `gestureend`, and multitouch `touchmove`.
* Align mobile bottom navigation with the shared mobile shell width.
* Keep generated/data behavior in `lib/` and page presentation in `components/`.
* Keep in-app copy practical and restrained. Prefer concrete nouns and actions such as "今日优先", "导出与协作", "摘要卡片", "复制清单", and "详细文本". Avoid telling users what a UI is for if the action label already makes it clear.
* Keep primary PWA tab first screens compressed. The default mobile flow should show current status plus the next useful action; secondary histories, all-stage lists, and advanced backup/settings controls should move behind `<details>` summaries or below compact grids. Source tests should guard the markers that enforce this, such as `HospitalQuickGrid`, `currentStageList`/`otherStageList`, and `SettingsDetailsSection`.
* Derive count badges and the visible item list from the same selector/helper. If
  a tab uses `getChecklistVisualGroupItems(items, groupId)` for rendering, use
  that same result for its `total`/`remaining` badge. Do not recompute with a
  broader category filter in the page.
* Keep hospital confirmation progress split by intent: hospital rule questions
  are counted separately from family/dad action tasks. Do not present their sum
  as the primary progress number.

---

## Testing Requirements

For mobile/PWA layout changes:

* Update `tests/ui-style.test.ts` when a source-level UI contract changes.
* Confirm the duplicate mobile top banner remains absent.
* Confirm the timeline does not reintroduce static milestone rows or local width hacks.
* Run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For visual verification, use:

```powershell
npm.cmd run visual:screenshots
```

### Visual Screenshot Contract

#### 1. Scope / Trigger

Use `scripts/capture-mobile-screenshots.mjs` for mobile layout verification when a change touches page composition, copy density, mobile width, PWA chrome, or bottom navigation. It is the preferred fallback when the Codex in-app Browser cannot access localhost because of enterprise policy.

#### 2. Signatures

Command:

```powershell
npm.cmd run visual:screenshots
```

Optional environment:

* `BASE_URL`: running app origin, default `http://127.0.0.1:3000`.
* `OUT_DIR`: screenshot output directory.
* `VISUAL_WIDTH`, `VISUAL_HEIGHT`, `VISUAL_DPR`: viewport override.
* `DADKIT_VISUAL_DUE_DATE`, `DADKIT_VISUAL_BABY_SEX`: seeded profile values.
* `CHROME_PATH`: Chrome/Edge executable override.

#### 3. Contracts

* The script launches Chrome/Edge with `--remote-debugging-pipe`, not a localhost DevTools port.
* The script seeds `dadkit:user-profile` and `dadkit:checklist-mode` before route capture.
* Every route in `ROUTES` must produce a PNG and a `manifest.json` entry.
* Each manifest entry must include viewport width, `scrollWidth`, `bodyScrollWidth`, profile presence, text sample, and diagnostics.

#### 4. Validation & Error Matrix

* Browser executable missing -> fail with setup error.
* Captured count differs from `ROUTES.length` -> fail.
* Any `network` or `exception` diagnostic -> fail.
* Browser error-page text such as `ERR_CONNECTION` -> fail.
* `scrollWidth` or `bodyScrollWidth` exceeds viewport width by more than 1px -> fail.

#### 5. Good/Base/Bad Cases

* Good: production `next start` is running, all routes capture, manifest widths are `390/390/390`.
* Base: dev server is running; capture is valid, but inspect screenshots for dev-only overlays.
* Bad: no server is running; screenshots may be created, but command must exit non-zero because diagnostics show connection errors.

#### 6. Tests Required

* Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
* Run visual screenshots after the app server is ready.
* Read `manifest.json` and confirm changed routes have `scrollWidth === width` and no network/exception diagnostics.
* Open at least changed route screenshots for visual inspection.

#### 7. Wrong vs Correct

Wrong:

```powershell
npm.cmd run visual:screenshots
# Accepting an empty directory or browser error screenshots as a pass.
```

Correct:

```powershell
$env:BASE_URL="http://127.0.0.1:3218"
$env:OUT_DIR=".visual-screenshots\current"
npm.cmd run visual:screenshots
```

Then confirm the manifest has no failed diagnostics and no horizontal overflow.

---

## Code Review Checklist

* Does each mobile page use `page-shell` and `mobile-shell` consistently?
* Are route files mostly data wiring rather than large presentation files?
* Did the change avoid new global state, public APIs, and data format changes unless required?
* Are tests updated to protect the behavior that changed?
