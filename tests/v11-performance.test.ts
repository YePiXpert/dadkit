import { describe, expect, it } from "vitest";

import { migrateBabyV1ToV2, projectBabyV2ToV1 } from "@/lib/baby/portable";
import type { CareEventV1 } from "@/lib/baby/types";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { upgradeExportDataToLatest } from "@/lib/data/format";
import { mergeExportData } from "@/lib/sync/merge";
import { calculateChecksum } from "@/lib/checksum";
import { portableV8, portableV11 } from "@/tests/helpers/portable-data";

function withinBudget<T>(operation: () => T, milliseconds = 3_000) {
  const started = performance.now();
  const result = operation();
  expect(performance.now() - started).toBeLessThan(milliseconds);
  return result;
}

function legacyEvents(count = 25_000): CareEventV1[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `event-${String(index).padStart(5, "0")}`,
    type: "diaper" as const,
    note: "",
    createdAt: index + 1,
    updatedAt: index + 1,
    deletedAt: null,
    occurredAt: "2026-08-01T00:00:00.000Z",
    kind: index % 2 ? "wet" as const : "dirty" as const,
  }));
}

describe("v11 migration and validation performance", () => {
  it("migrates, merges and checksums 25,000 v8/v11 baby events", () => {
    const babyV2 = createEmptyBabyData();
    const babyV1 = projectBabyV2ToV1(babyV2);
    babyV1.care.events = legacyEvents();
    const migrated = withinBudget(() => migrateBabyV1ToV2(babyV1));
    expect(migrated.care.events).toHaveLength(25_000);

    const canonical = portableV11({ baby: migrated });
    const legacy = withinBudget(() =>
      upgradeExportDataToLatest(portableV8({ baby: projectBabyV2ToV1(migrated) })),
    );
    const merged = withinBudget(() => mergeExportData(canonical, legacy));
    expect(merged.baby.care.events).toHaveLength(25_000);
    const checksum = withinBudget(() => calculateChecksum(merged));
    expect(checksum).toBe(withinBudget(() => calculateChecksum(merged)));
  });
});
