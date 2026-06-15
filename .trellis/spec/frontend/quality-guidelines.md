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

---

## Required Patterns

* Preserve PWA viewport settings in `app/layout.tsx`: `width: "device-width"`, `initialScale: 1`, `maximumScale: 1`, `userScalable: false`, and `viewportFit: "cover"`.
* Preserve gesture guards in `components/PwaRegister.tsx` for `gesturestart`, `gesturechange`, `gestureend`, and multitouch `touchmove`.
* Align mobile bottom navigation with the shared mobile shell width.
* Keep generated/data behavior in `lib/` and page presentation in `components/`.

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

This script uses local Chrome/Edge DevTools Protocol and is the preferred fallback when the Codex in-app Browser cannot access `127.0.0.1:3000` because of enterprise network policy.

---

## Code Review Checklist

* Does each mobile page use `page-shell` and `mobile-shell` consistently?
* Are route files mostly data wiring rather than large presentation files?
* Did the change avoid new global state, public APIs, and data format changes unless required?
* Are tests updated to protect the behavior that changed?
