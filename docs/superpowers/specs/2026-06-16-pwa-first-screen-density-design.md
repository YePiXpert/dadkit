# PWA First-Screen Density Design

Date: 2026-06-16

## Goal

Make DadKit feel more like a mature PWA by reducing first-screen overload. Pages may remain scrollable when the content is useful, but the first viewport should focus on status and the next useful action instead of exposing every tool, explanation, or full list immediately.

## Scope

This design covers the five primary PWA tabs and closely related utility pages:

- Home
- Checklist
- Hospital
- Timeline
- Settings
- Share and go-mode only where they affect first-screen density

The work should not remove major features, routes, local-first data, backup behavior, PWA installation behavior, or existing checklist/hospital/timeline semantics.

## Non-Goals

- Do not split the app into many new routes just to reduce page height.
- Do not hide essential status behind navigation.
- Do not reintroduce the old mobile brand banner.
- Do not solve length by shrinking text until rows feel cramped.
- Do not use marketing or platform-growth language in product surfaces.

## Recommended Approach

Use "first-screen compression plus progressive disclosure":

- First screen: status, current priority, and one obvious action.
- Below first screen: grouped details, secondary actions, and advanced controls.
- Long explanatory sections: default-collapsed unless they are part of the active workflow.
- Dense rows: use compact cards or list rows, but keep 44px touch targets and wrapping text.

This keeps the app functional without turning each tab into a long documentation page.

## Page Design

### Home

The first viewport should contain:

- Countdown hero.
- Go-mode entry.
- Today's priority tasks.

Move lower-priority status panels and shortcuts further down in a tighter grouped section. Keep the home page useful as the "what should I do now?" surface, not a directory of every feature.

### Checklist

The first viewport should contain:

- Page title and brief context.
- Packing progress.
- Packing groups.

Keep checklist actions in a collapsed area. When the user is in the `all` group, show group summary cards. When the user chooses a specific group, prioritize the actual items for that group and avoid showing redundant summary sections first.

The group count and visible list must continue to use the same selector/helper, currently `getChecklistVisualGroupItems`.

### Hospital

The first viewport should contain:

- Hospital status.
- Split progress: hospital questions and family confirmations.
- The next pending confirmation.
- Compact group jump controls.

The full confirmation table should sit below the first-screen summary. Group jump controls should be real links/buttons, not decorative arrows.

Hospital question progress and family/dad task progress must remain separate. Their sum should not be the primary progress number.

### Timeline

The first viewport should contain:

- Current stage title.
- Overall progress.
- Current-stage progress.
- Current priority tasks.

Stage arrangement should avoid rendering the full timeline as an immediately long wall. Show the current stage first. Past/future stages can be grouped behind a compact control or collapsed section.

### Settings

The first viewport should contain:

- Profile summary.
- Three management groups: profile, backup, app information.

Details such as WebDAV credential notes, disclaimers, advanced reset/export text, and long explanatory copy should be collapsed or moved below the entry rows. Settings should feel like a settings screen, not a backend admin page.

### Share and Go Mode

Share and go-mode can remain richer than the primary tabs because users enter them for a specific task. Still, the first viewport should present the main action first:

- Share: summary card and primary copy/export actions before detailed text variants.
- Go mode: readiness, contact/route action, and essentials before longer supporting sections.

## Component and Structure Implications

- Prefer extracting repeated compact sections into shared components only if the same pattern appears in multiple pages.
- Keep route pages responsible for selecting store data and deciding which sections render.
- Keep presentation helpers in `lib/presentation*` when they define shared display semantics or counts.
- Avoid page-local width hacks; continue using `page-shell` and `mobile-shell`.
- Use native `details` only where the summary text is clear and the collapsed content is secondary. Use buttons/tabs where the user needs an app-like mode switch.

## Data Flow

The optimization is presentational. Existing stores and generated data should remain unchanged:

- Zustand state shape stays unchanged.
- Checklist generation stays unchanged.
- Hospital answers stay unchanged.
- Timeline task status stays unchanged.
- WebDAV and local backup behavior stay unchanged.

Where progress or counts are displayed, source them from the existing shared helpers instead of recomputing separate page-local totals.

## Error Handling

No new network or persistence error paths are expected. Existing empty states should remain:

- No profile: route-level empty state points to setup.
- No matching checklist items: existing empty state remains.
- Missing hospital profile: hospital page still works with "unknown hospital" state.

Collapsed sections must not hide the only path out of an empty or setup-required state.

## Testing Plan

Source-level tests should guard the main layout contracts:

- Home does not become a generic tool directory.
- Checklist actions remain collapsed and group counts align with rendered groups.
- Hospital keeps split progress and actionable group jumps.
- Timeline does not render all stages as a static first-screen wall.
- Settings does not expose all advanced details at the top.

Run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For visual verification, run mobile screenshots and inspect changed routes:

```powershell
npm.cmd run visual:screenshots
```

The manifest must show no horizontal overflow. Changed-route screenshots should show that the first viewport has a clear primary action and no long explanatory block above core controls.

## Acceptance Criteria

- The first viewport of each primary tab has one clear job.
- Users can still reach all existing features.
- No duplicate mobile brand banner returns.
- No horizontal overflow appears in the visual screenshot manifest.
- Existing tests pass, and new/updated tests protect the compact-first-screen contracts.
- The implementation is committed on `main` after verification.
