# State Management

> How state is managed in this project.

---

## Overview

DadKit uses Zustand for app-wide client state and `lib/storage.ts` for
local-first persistence. User-owned data must round-trip through localStorage,
JSON export/import, snapshots, and WebDAV backup unless a task explicitly marks
it as ephemeral UI state.

---

## Scenario: Extending Local-First User Data

### 1. Scope / Trigger

Use this contract when adding a persisted field used by more than one UI route.
This is cross-layer work because the field moves through defaults, store state,
storage import/export, share text, and page components.

### 2. Signatures

For birth/admission communication fields:

```ts
export type BirthPlan = {
  hospitalPhone: string;
  hospitalAddress: string;
  hospitalRouteNotes: string;
  nightEntranceNotes: string;
  parkingNotes: string;
  // existing communication fields...
};

export function mergeBirthPlan(saved?: Partial<BirthPlan>): BirthPlan;
export function saveBirthPlan(plan: BirthPlan): void;
export function loadBirthPlan(): BirthPlan;
```

### 3. Contracts

Persisted fields are plain strings. Missing fields from older backups must be
filled by `mergeBirthPlan` defaults, not treated as import errors.

`exportData().birthPlan` must include the fields. `importData()` must accept a
partial `birthPlan` object and preserve omitted existing data unless the import
explicitly supplies replacement values.

### 4. Validation & Error Matrix

| Condition | Behavior |
|---|---|
| `birthPlan` omitted from import | Keep existing local birth plan |
| `birthPlan` is not an object | Return `ok:false`, do not mutate local data |
| New string field omitted in old backup | Default to `""` through `mergeBirthPlan` |
| New string field supplied | Persist and expose through store hydration |

### 5. Good/Base/Bad Cases

Good: add a field to `BirthPlan`, `DEFAULT_BIRTH_PLAN`, field metadata, share
text, and storage tests in one change.

Base: UI-only text or derived progress stays local to the component and does not
enter Zustand.

Bad: adding a new route input that writes to localStorage directly, bypassing
`saveBirthPlan` and JSON export/import.

### 6. Tests Required

Add or update tests that assert:

* Defaults include the new persisted fields.
* Share/export text includes user-entered values when relevant.
* `exportData()` and `importData()` preserve the fields.
* Source-level UI tests guard the route/component contract when layout changes.

### 7. Wrong vs Correct

#### Wrong

```ts
localStorage.setItem("dadkit:hospital-address", value);
```

This bypasses snapshots, export/import, and WebDAV backup.

#### Correct

```ts
saveBirthPlan({ ...birthPlan, hospitalAddress: value });
```

The field stays inside the existing local-first data contract.
