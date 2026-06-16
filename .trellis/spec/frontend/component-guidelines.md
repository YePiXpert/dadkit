# Component Guidelines

> How components are built in this project.

---

## Overview

DadKit components are mostly Tailwind-styled React function components. Prefer existing app classes and primitives over new one-off styling.

---

## Component Structure

Use page components for route-level orchestration and shared components for reusable presentation.

```tsx
type TimelineDashboardProps = {
  profile: UserProfile;
  checklist: ChecklistItem[];
  statuses: TimelineTaskStatus[];
  onToggleTask: (task: TimelineTask) => void;
};

export function TimelineDashboard(props: TimelineDashboardProps) {
  // render composed sections
}
```

Keep helper functions local to a component file when they only serve that component's presentation. Move them to `lib/` only when they become shared business logic.

---

## Props Conventions

* Define explicit `type` aliases for non-trivial props.
* Pass event handlers from route/store owners down to presentation components.
* Keep Zustand selectors and mutations in route/page-level components unless a component is intentionally store-aware.

---

## Styling Patterns

Use shared app classes from `app/globals.css` for repeated surfaces:

* `page-shell` for route page padding, bottom-nav clearance, and outer spacing.
* `mobile-shell` for narrow PWA content width.
* `pony-soft-card`, `pony-due-card`, `macaron-panel`, and `soft-detail` for existing card treatments.

For mobile/PWA routes, compose:

```tsx
<div className="page-shell">
  <section className="mobile-shell grid gap-3 overflow-hidden">
    ...
  </section>
</div>
```

Do not reintroduce a global mobile brand header. Desktop `AppHeader` is allowed because it is hidden on mobile.

## Design Decisions

### Task-Flow Mobile IA

**Context**: DadKit has several useful routes, but mobile pages can become hard
to scan if every page exposes every tool. The primary PWA use case is a dad
opening the app to decide the next action, not browsing a generic tool portal.

**Decision**: Keep the five mobile tabs stable and assign each a clear job:

* 首页: status, next actions, labor-mode entry, and a small set of frequent shortcuts.
* 清单: packing preparation, category grouping, filters, and checklist operations.
* 医院: hospital questions, admission rules, and hospital-specific notes.
* 时间线: pregnancy-stage rhythm and sequencing.
* 我的: profile, data backup/recovery, app information, safety, and about.

Home should not link to a generic tool directory. It may render only a small
set of concrete high-frequency actions, such as contraction tracking, admission
communication, or go-mode checks. Tools should surface in the route where they
belong, not as a directory inside Settings.

Settings can be denser because users visit it for management and recovery
tasks, but it must stay focused on profile, backup/recovery, app information,
and high-risk local-data actions. Do not use Settings/My as a catch-all tool
warehouse.

**Tests Required**: Source-level UI tests should guard the section labels and
key links when this contract changes, especially the `/go` home entry, absence
of `settings#more-tools`, and absence of tool-directory labels in Settings.

---

## Accessibility

* Interactive task rows should be buttons when they mutate state.
* Rows with a visible right-arrow affordance must be actionable. Use `Link`/`a`
  for navigation, `button` for mutation or expansion, or remove the arrow.
* Decorative images and lines should use either meaningful `alt` text or `aria-hidden`.
* Preserve at least 44px hit targets for primary mobile actions.

```tsx
// Correct: the row and arrow share the same click target.
<a className="app-list-row" href={`#hospital-confirmation-${groupId}`}>
  <span>{label}</span>
  <ArrowRight aria-hidden className="size-4" />
</a>
```

---

## Common Mistakes

### Local page fixes instead of shared shell fixes

If several pages need the same layout behavior, update the shared shell/class and tests instead of patching one page.

### Presentation logic growing inside route files

When a route file starts containing multiple card/list/panel components, split the presentation into `components/` and keep the route file focused on data wiring.
