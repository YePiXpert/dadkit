# PWA First-Screen Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce first-screen overload in DadKit PWA pages while keeping existing features reachable.

**Architecture:** This is a presentational refactor. Keep Zustand state, generated checklist data, hospital answers, timeline tasks, and backup behavior unchanged. Compress page first screens by making secondary details collapsed or more compact, and protect the contracts with source-level tests plus mobile screenshots.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind, Zustand, Vitest, existing `page-shell`/`mobile-shell` classes.

---

## File Map

- Modify: `tests/hospital-page-copy.test.ts`
  - Guard compact hospital group links and split progress.
- Modify: `tests/checklist-page-copy.test.ts`
  - Guard compact checklist group tile dimensions.
- Modify: `tests/ui-style.test.ts`
  - Guard timeline collapsed-stage behavior and settings details sections.
- Modify: `components/ChecklistGroupTabs.tsx`
  - Reduce visual group tile height and icon size.
- Modify: `app/hospital/page.tsx`
  - Replace six full-width quick rows with compact group links.
- Modify: `components/TimelineDashboard.tsx`
  - Render current stage first; collapse other stages.
- Modify: `app/settings/page.tsx`
  - Collapse lower settings sections behind visible summaries.
- Modify: `.trellis/spec/frontend/quality-guidelines.md`
  - Capture the first-screen density convention after implementation.

Do not modify store schemas, persistence keys, generation rules, route names, PWA viewport metadata, or mobile nav route definitions.

---

### Task 1: Write Failing Layout Contract Tests

**Files:**
- Modify: `tests/hospital-page-copy.test.ts`
- Modify: `tests/checklist-page-copy.test.ts`
- Modify: `tests/ui-style.test.ts`

- [ ] **Step 1: Update hospital source tests**

Add assertions that hospital quick links use compact grid styling rather than full-width app rows:

```ts
expect(hospitalPage).toContain("HospitalQuickGrid");
expect(hospitalPage).toContain("grid-cols-2");
expect(hospitalPage).toContain("href={`#hospital-confirmation-${item.groupId}`}");
expect(hospitalPage).not.toContain("function HospitalQuickRow");
expect(hospitalPage).not.toContain("app-list-row min-h-[3.25rem]");
```

- [ ] **Step 2: Update checklist source tests**

Change the group-tab density assertion from the old tall card height to the new compact card height:

```ts
expect(checklistGroupTabs).toContain("min-h-[3.9rem]");
expect(checklistGroupTabs).toContain("size-6");
expect(checklistGroupTabs).not.toContain("min-h-[4.75rem]");
```

- [ ] **Step 3: Update timeline source tests**

Add assertions that only the current stage is in the default flow and other stages are collapsed:

```ts
expect(timelineDashboard).toContain("currentStageList");
expect(timelineDashboard).toContain("otherStageList");
expect(timelineDashboard).toContain("查看其他阶段");
expect(timelineDashboard).toMatch(/<details[\s\S]*查看其他阶段/);
```

- [ ] **Step 4: Update settings source tests**

Add assertions that lower settings sections use collapsed detail wrappers with visible IDs:

```ts
expect(settingsPage).toContain("SettingsDetailsSection");
expect(settingsPage).toContain('id="local-snapshots"');
expect(settingsPage).toContain('id="json-backup"');
expect(settingsPage).toContain('id="webdav-backup"');
expect(settingsPage).toContain("<details");
expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="最近备份"/);
expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="WebDAV 备份"/);
expect(settingsPage).not.toContain('<Card className="macaron-panel" id="local-snapshots"');
```

- [ ] **Step 5: Run targeted tests and verify they fail**

Run:

```powershell
npm.cmd test -- tests/hospital-page-copy.test.ts tests/checklist-page-copy.test.ts tests/ui-style.test.ts
```

Expected: failures mention missing `HospitalQuickGrid`, missing `min-h-[3.9rem]`, missing timeline details, and missing `SettingsDetailsSection`.

---

### Task 2: Compact Checklist Group Tiles

**Files:**
- Modify: `components/ChecklistGroupTabs.tsx`
- Test: `tests/checklist-page-copy.test.ts`

- [ ] **Step 1: Inspect current component**

Read:

```powershell
Get-Content -Encoding UTF8 -Path components\ChecklistGroupTabs.tsx
```

- [ ] **Step 2: Reduce tile height and icon scale**

In `ChecklistGroupTabs`, keep the grid and labels, but update the button and icon sizing. The button should use:

```tsx
className={cn(
  "grid min-h-[3.9rem] min-w-0 gap-1 rounded-lg border px-2.5 py-2 text-left shadow-sm transition-colors",
  active
    ? "border-primary bg-secondary text-primary"
    : "border-white/80 bg-card/85 text-foreground",
)}
```

The icon wrapper should use:

```tsx
<span
  className={cn(
    "flex size-8 shrink-0 items-center justify-center rounded-lg",
    active ? "bg-primary text-primary-foreground" : group.tone,
  )}
>
  <ChecklistGroupIcon group={group.id} className="size-6" />
</span>
```

If `ChecklistGroupIcon` does not accept `className`, add a prop:

```ts
function ChecklistGroupIcon({
  className = "size-7",
  group,
}: {
  className?: string;
  group: ChecklistVisualGroup;
}) {
  ...
}
```

Then replace each hardcoded `className="size-7"` in the SVGs with `className={className}`.

- [ ] **Step 3: Run checklist source test**

Run:

```powershell
npm.cmd test -- tests/checklist-page-copy.test.ts
```

Expected: pass.

---

### Task 3: Compact Hospital Group Entry Area

**Files:**
- Modify: `app/hospital/page.tsx`
- Test: `tests/hospital-page-copy.test.ts`

- [ ] **Step 1: Rename the group component**

Rename `HospitalQuickRow` to `HospitalQuickGridItem` and add a parent renderer:

```tsx
function HospitalQuickGrid({ items }: { items: HospitalQuickRowInput[] }) {
  return (
    <section className="mobile-shell grid grid-cols-2 gap-2 lg:max-w-none">
      {items.map((item) => (
        <HospitalQuickGridItem item={item} key={item.title} />
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Replace the render site**

Replace:

```tsx
<section className="mobile-shell grid gap-2 lg:max-w-none">
  {quickConfirmRows.map((item) => (
    <HospitalQuickRow item={item} key={item.title} />
  ))}
</section>
```

with:

```tsx
<HospitalQuickGrid items={quickConfirmRows} />
```

- [ ] **Step 3: Compact the item component**

Implement:

```tsx
function HospitalQuickGridItem({ item }: { item: HospitalQuickRowInput }) {
  const Icon = item.icon;
  const toneClass = {
    amber: "bg-amber-soft text-amber-foreground",
    coral: "bg-coral-soft text-coral-foreground",
    lavender: "bg-lavender text-lavender-foreground",
    mint: "bg-mint text-primary",
    peach: "bg-peach text-peach-foreground",
  }[item.tone];

  return (
    <a
      className="grid min-h-[4.5rem] min-w-0 gap-1.5 rounded-lg border border-white/80 bg-card/95 p-2.5 shadow-sm transition-colors active:bg-secondary"
      href={`#hospital-confirmation-${item.groupId}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={`app-icon-tile size-8 rounded-md ${toneClass}`}>
          <Icon className="size-4" />
        </span>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">
          {item.done ? "已确认" : "待确认"}
        </span>
      </span>
      <span className="block break-words text-sm font-bold leading-5">
        {item.title}
      </span>
      <span className="block break-words text-xs leading-4 text-muted-foreground">
        {item.caption}
      </span>
    </a>
  );
}
```

- [ ] **Step 4: Run hospital source test**

Run:

```powershell
npm.cmd test -- tests/hospital-page-copy.test.ts
```

Expected: pass.

---

### Task 4: Collapse Non-Current Timeline Stages

**Files:**
- Modify: `components/TimelineDashboard.tsx`
- Test: `tests/ui-style.test.ts`

- [ ] **Step 1: Split current and other stages**

After `overallPercent`, add:

```ts
const currentStageList = timeline.filter(
  (_stage, index) => index === currentStageIndex,
);
const otherStageList = timeline.filter(
  (_stage, index) => index !== currentStageIndex,
);
```

If `currentStageIndex < 0`, make `currentStageList` contain `currentStage` and `otherStageList` contain the rest:

```ts
const currentStageList =
  currentStageIndex >= 0 ? [timeline[currentStageIndex]] : currentStage ? [currentStage] : [];
const otherStageList = timeline.filter(
  (stage) => !currentStageList.some((current) => current.id === stage.id),
);
```

- [ ] **Step 2: Replace the full stage list render**

Replace the current `timeline.map(...)` block with:

```tsx
<div className="flex items-center justify-between px-1">
  <h2 className="text-sm font-black tracking-normal">阶段安排</h2>
  <span className="text-xs font-bold text-muted-foreground">
    先处理本阶段
  </span>
</div>
<ol className="grid min-w-0 gap-3 overflow-hidden">
  {currentStageList.map((stage) => {
    const index = timeline.findIndex((candidate) => candidate.id === stage.id);

    return (
      <TimelineStageRow
        checklist={checklist}
        currentStageIndex={currentStageIndex}
        dueDate={dueDate}
        hospitalAnswers={hospitalAnswers}
        index={index}
        key={stage.id}
        stage={stage}
        statuses={statuses}
        onToggleTask={onToggleTask}
      />
    );
  })}
</ol>
{otherStageList.length > 0 ? (
  <details className="rounded-lg border border-white/90 bg-card/90 p-3 shadow-sm">
    <summary className="cursor-pointer text-sm font-bold text-primary">
      查看其他阶段
    </summary>
    <ol className="mt-3 grid min-w-0 gap-3 overflow-hidden">
      {otherStageList.map((stage) => {
        const index = timeline.findIndex((candidate) => candidate.id === stage.id);

        return (
          <TimelineStageRow
            checklist={checklist}
            currentStageIndex={currentStageIndex}
            dueDate={dueDate}
            hospitalAnswers={hospitalAnswers}
            index={index}
            key={stage.id}
            stage={stage}
            statuses={statuses}
            onToggleTask={onToggleTask}
          />
        );
      })}
    </ol>
  </details>
) : null}
```

- [ ] **Step 3: Run timeline/source tests**

Run:

```powershell
npm.cmd test -- tests/ui-style.test.ts tests/timeline.test.ts
```

Expected: pass.

---

### Task 5: Collapse Lower Settings Detail Sections

**Files:**
- Modify: `app/settings/page.tsx`
- Test: `tests/settings-page-copy.test.ts`
- Test: `tests/ui-style.test.ts`

- [ ] **Step 1: Add `SettingsDetailsSection` helper**

Near `SettingsShortcutRow`, add:

```tsx
function SettingsDetailsSection({
  children,
  icon,
  id,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <details
      className="mobile-shell scroll-mt-24 rounded-lg border border-white/90 bg-card/95 p-4 shadow-soft lg:max-w-none"
      id={id}
    >
      <summary className="cursor-pointer list-none text-base font-bold">
        <span className="inline-flex items-center gap-2">
          {icon}
          {title}
        </span>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}
```

- [ ] **Step 2: Wrap lower settings sections**

Replace each lower `Card className="macaron-panel" id="..."` with `SettingsDetailsSection`. For example:

```tsx
<SettingsDetailsSection
  icon={<History className="size-4 text-primary" />}
  id="local-snapshots"
  title="最近备份"
>
  {snapshots.length === 0 ? (
    <p className="text-sm leading-6 text-muted-foreground">
      暂无本地备份。DadKit 会在导入、重置、清空或创建新清单前自动保存最近备份。
    </p>
  ) : (
    ...
  )}
</SettingsDetailsSection>
```

Use this wrapper for:

- `local-snapshots`
- `json-backup`
- `webdav-backup`
- `current-data-summary`
- `danger-zone`
- `about-dadkit`
- `disclaimer`
- `webdav-credentials`

For `current-data-summary`, add `id="current-data-summary"` to preserve an anchor for the visible section.

- [ ] **Step 3: Keep top shortcut IDs valid**

Add or keep shortcut rows for the visible detail summaries:

```tsx
<SettingsShortcutRow
  caption="本地数据和清单数量"
  href="#current-data-summary"
  icon={<Info className="size-4" />}
  title="当前数据摘要"
/>
```

- [ ] **Step 4: Run settings/source tests**

Run:

```powershell
npm.cmd test -- tests/settings-page-copy.test.ts tests/ui-style.test.ts
```

Expected: pass.

---

### Task 6: Update Spec, Run Full Verification, Commit and Push

**Files:**
- Modify: `.trellis/spec/frontend/quality-guidelines.md`
- Verify: source tests, lint, build, visual screenshots.

- [ ] **Step 1: Update frontend quality guideline**

Add to required patterns:

```md
* Primary PWA tabs should use first-screen compression: status and the next
  useful action above the fold, with secondary explanations, full histories,
  and advanced controls collapsed or moved below primary controls.
```

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm.cmd test
```

Expected: all Vitest tests pass.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: exit code 0. Existing warnings in `tests/webdav.test.ts` may remain if still present.

- [ ] **Step 4: Run build**

Run:

```powershell
npm.cmd run build
```

Expected: Next build compiles and type-checks successfully.

- [ ] **Step 5: Run visual screenshots**

Start the app with `npm.cmd run start -- --hostname 127.0.0.1 --port 3000`, then run:

```powershell
$env:BASE_URL="http://127.0.0.1:3000"
npm.cmd run visual:screenshots
```

Expected: `manifest.json` captures all routes with no network errors and no horizontal overflow. Inspect screenshots for `/`, `/checklist`, `/hospital`, `/timeline`, and `/settings`.

- [ ] **Step 6: Commit**

Stage only intended files:

```powershell
git add components/ChecklistGroupTabs.tsx app/hospital/page.tsx components/TimelineDashboard.tsx app/settings/page.tsx tests/hospital-page-copy.test.ts tests/checklist-page-copy.test.ts tests/settings-page-copy.test.ts tests/ui-style.test.ts .trellis/spec/frontend/quality-guidelines.md
git commit -m "Compress PWA first screens"
```

- [ ] **Step 7: Push**

Run:

```powershell
git push origin main
```

Expected: `main` pushed to origin.

---

## Self-Review Notes

- Spec coverage: Home is preserved as a focused "what now" surface; checklist group density is improved; hospital quick links compact; timeline non-current stages collapsed; settings details collapsed; share/go-mode left unchanged because they already lead with primary task surfaces and were not the main long-tab offenders.
- Placeholder scan: no unfinished marker or vague delayed-work steps.
- Type consistency: `HospitalQuickRowInput` remains the item input type; new hospital component names are `HospitalQuickGrid` and `HospitalQuickGridItem`; timeline variables are `currentStageList` and `otherStageList`; settings wrapper is `SettingsDetailsSection`.
