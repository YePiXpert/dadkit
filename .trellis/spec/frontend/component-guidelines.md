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

---

## Accessibility

* Interactive task rows should be buttons when they mutate state.
* Decorative images and lines should use either meaningful `alt` text or `aria-hidden`.
* Preserve at least 44px hit targets for primary mobile actions.

---

## Common Mistakes

### Local page fixes instead of shared shell fixes

If several pages need the same layout behavior, update the shared shell/class and tests instead of patching one page.

### Presentation logic growing inside route files

When a route file starts containing multiple card/list/panel components, split the presentation into `components/` and keep the route file focused on data wiring.
