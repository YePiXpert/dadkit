# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

DadKit is a Next.js App Router PWA with Tailwind, Zustand, and local-first storage. Frontend changes should preserve the mobile/PWA app feel first: narrow content, no horizontal overflow, bottom navigation clearance, and predictable page structure.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Active |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Active |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Active |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |

---

## Pre-Development Checklist

Before editing frontend code:

* Search for existing shared shell/classes/components before adding local layout fixes.
* For PWA/mobile pages, use the shared `page-shell` + `mobile-shell` strategy unless there is a documented reason not to.
* Keep page files focused on data wiring and route-level state; move repeated or large presentation sections into `components/`.
* If changing layout, update tests that guard the relevant UI contract.
* If changing mobile behavior, run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`; use `npm.cmd run visual:screenshots` when visual verification is needed.

---

## Quality Check

Frontend work is not complete until:

* No page-local mobile width workaround is introduced when a shared shell can express the behavior.
* The duplicate mobile top brand banner stays absent.
* PWA viewport and gesture guards stay intact.
* Existing route data flow and local-first storage behavior are unchanged unless the task explicitly covers them.
