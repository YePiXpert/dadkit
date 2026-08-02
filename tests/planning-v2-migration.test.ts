import { describe, expect, it } from "vitest";

import { LEGACY_DAD_MEMBER_ID, LEGACY_FAMILY_MEMBER_ID, LEGACY_MOM_MEMBER_ID, migratePlanningV1ToV2 } from "@/lib/household/migration";
import { createEmptyItemPlanningRecordV1, createEmptyItemPlanningV1 } from "@/lib/planning/defaults";

describe("planning v1 to v2 migration", () => {
  it("maps every legacy role deterministically and only creates used members", () => {
    const legacy = createEmptyItemPlanningV1();
    for (const [id, value] of [["none", "unassigned"], ["dad", "dad"], ["mom", "mom"], ["shared", "shared"], ["family", "family"]] as const) {
      legacy.items[id] = { ...createEmptyItemPlanningRecordV1(), assignee: { value, updatedAt: 20 } };
    }
    const migrated = migratePlanningV1ToV2(legacy);
    expect(migrated.planning.items.none.assigneeIds.value).toEqual([]);
    expect(migrated.planning.items.dad.assigneeIds.value).toEqual([LEGACY_DAD_MEMBER_ID]);
    expect(migrated.planning.items.mom.assigneeIds.value).toEqual([LEGACY_MOM_MEMBER_ID]);
    expect(migrated.planning.items.shared.assigneeIds.value).toEqual([LEGACY_DAD_MEMBER_ID, LEGACY_MOM_MEMBER_ID].sort());
    expect(migrated.planning.items.family.assigneeIds.value).toEqual([LEGACY_FAMILY_MEMBER_ID]);
    expect(Object.keys(migrated.household.members).sort()).toEqual([LEGACY_DAD_MEMBER_ID, LEGACY_FAMILY_MEMBER_ID, LEGACY_MOM_MEMBER_ID].sort());
    expect(migrated.planning.items.dad.assigneeIds.updatedAt).toBe(20);
  });

  it("is pure and deterministic", () => {
    const input = createEmptyItemPlanningV1();
    input.items.dad = { ...createEmptyItemPlanningRecordV1(), assignee: { value: "dad", updatedAt: 10 } };
    const before = structuredClone(input);
    expect(migratePlanningV1ToV2(input)).toEqual(migratePlanningV1ToV2(input));
    expect(input).toEqual(before);
  });
});
