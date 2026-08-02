import { describe, expect, it } from "vitest";

import { migrateBabyV1ToV2, projectBabyV2ToV1 } from "@/lib/baby/portable";
import type { CareEventV1 } from "@/lib/baby/types";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { projectExportDataForVersion } from "@/lib/data/format";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { migratePlanningV1ToV2 } from "@/lib/household/migration";
import { isHouseholdPortableData } from "@/lib/household/validation";
import { createEmptyItemPlanningRecordV1 } from "@/lib/planning/defaults";
import { projectPlanningV2ToV1 } from "@/lib/planning/projection";
import type { ItemPlanningPortableDataV1 } from "@/lib/planning/types";
import { mergeExportData } from "@/lib/sync/merge";
import { calculateChecksum } from "@/lib/webdav/checksum";
import { portableV9 } from "@/tests/helpers/portable-data";

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

describe("v9 migration and validation performance", () => {
  it("strictly validates 100 household records including tombstones", () => {
    const household = createEmptyHousehold();
    for (let index = 0; index < 100; index += 1) {
      const id = `member-${String(index).padStart(3, "0")}`;
      household.members[id] = {
        id,
        createdAt: index + 1,
        displayName: { value: `成员${index}`, updatedAt: index + 1 },
        relationshipLabel: { value: "", updatedAt: index + 1 },
        deleted: { value: index >= 12, updatedAt: index + 1 },
      };
    }
    expect(withinBudget(() => isHouseholdPortableData(household))).toBe(true);
  });

  it("migrates and projects 2,000 planning records", () => {
    const planning: ItemPlanningPortableDataV1 = { version: 1, clearedAt: 0, items: {} };
    for (let index = 0; index < 2_000; index += 1) {
      planning.items[`item-${index}`] = {
        ...createEmptyItemPlanningRecordV1(),
        assignee: { value: index % 2 ? "shared" : "family", updatedAt: index + 1 },
      };
    }
    const migrated = withinBudget(() => migratePlanningV1ToV2(planning));
    expect(Object.keys(migrated.planning.items)).toHaveLength(2_000);
    const projected = withinBudget(() => projectPlanningV2ToV1(migrated.planning));
    expect(Object.keys(projected.items)).toHaveLength(2_000);
  });

  it("migrates, merges and checksums 25,000 v8/v9 baby events", () => {
    const babyV2 = createEmptyBabyData();
    const babyV1 = projectBabyV2ToV1(babyV2);
    babyV1.care.events = legacyEvents();
    const migrated = withinBudget(() => migrateBabyV1ToV2(babyV1));
    expect(migrated.care.events).toHaveLength(25_000);
    expect(migrated.care.events[0]?.recordedByMemberId).toBeNull();
    migrated.care.events = migrated.care.events.map((event) => ({
      ...event,
      recordedByMemberId: "member-a",
    }));

    const canonical = portableV9({ baby: migrated });
    const legacy = withinBudget(() => projectExportDataForVersion(canonical, 8));
    const merged = withinBudget(() => mergeExportData(canonical, legacy));
    expect(merged.baby.care.events).toHaveLength(25_000);
    expect(merged.baby.care.events[0]?.recordedByMemberId).toBe("member-a");
    const checksum = withinBudget(() => calculateChecksum(merged));
    expect(checksum).toBe(withinBudget(() => calculateChecksum(merged)));
  });
});
