# Directory Structure

> How frontend code is organized in this project.

---

## Overview

This repo uses Next.js App Router pages under `app/`, shared UI and route presentation components under `components/`, and local-first business logic under `lib/`.

---

## Directory Layout

```text
app/
  layout.tsx              # Root shell, metadata, PWA viewport, global nav wiring
  <route>/page.tsx        # Route entry points and page-level state wiring
components/
  ui/                     # Low-level reusable UI primitives
  *.tsx                   # Shared app components and route presentation sections
lib/
  store.ts                # Zustand app store
  storage.ts              # localStorage import/export/persistence helpers
  timeline.ts             # Timeline data generation and completion logic
  rules.ts                # Checklist generation and item normalization logic
public/
  illustrations/          # Raster mascot and app illustration assets
tests/
  *.test.ts               # Unit and source-level UI guard tests
scripts/
  capture-mobile-screenshots.mjs
```

---

## Module Organization

Route files should stay thin when the page grows beyond simple markup:

```tsx
// app/timeline/page.tsx
export default function TimelinePage() {
  // read store state, handle route-level empty states, pass props down
  return <TimelineDashboard {...props} />;
}
```

Presentation-heavy sections belong in `components/`:

```tsx
// components/TimelineDashboard.tsx
export function TimelineDashboard(props: TimelineDashboardProps) {
  // compose timeline cards, task rows, progress panels
}
```

Business/data logic belongs in `lib/`, not in component files. For example, timeline generation and completion rules live in `lib/timeline.ts`; route components should consume those helpers rather than duplicating date or completion logic.

---

## Naming Conventions

* Route entry points use `app/<route>/page.tsx`.
* Shared route presentation components use PascalCase names in `components/`, such as `TimelineDashboard.tsx`.
* Low-level UI primitives stay in `components/ui/`.
* App-wide CSS utility classes live in `app/globals.css`.

---

## Common Mistakes

### Page-local mobile width fixes

Do not add a one-off wrapper such as `max-w-[390px]` inside a route page when the shared `mobile-shell` can carry the rule.

```tsx
// Wrong
<section className="mx-auto max-w-[390px] overflow-hidden" />

// Correct
<section className="mobile-shell overflow-hidden" />
```

This keeps PWA page width consistent across routes and prevents later pages from drifting.
