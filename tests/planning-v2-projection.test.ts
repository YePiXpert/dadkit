import { describe, expect, it } from "vitest";

import { LEGACY_DAD_MEMBER_ID, LEGACY_MOM_MEMBER_ID } from "@/lib/household/migration";
import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { mergeItemPlanning } from "@/lib/planning/merge";
import { projectPlanningV2ToV1 } from "@/lib/planning/projection";
import { migratePlanningV1ToV2 } from "@/lib/household/migration";

describe("planning v2 legacy projection", () => {
  it("projects known and custom member combinations", () => {
    const planning = createEmptyItemPlanning();
    for (const [id, ids] of [["none", []], ["dad", [LEGACY_DAD_MEMBER_ID]], ["mom", [LEGACY_MOM_MEMBER_ID]], ["shared", [LEGACY_DAD_MEMBER_ID, LEGACY_MOM_MEMBER_ID].sort()], ["custom", ["member-custom"]]] as const) {
      planning.items[id] = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: [...ids], updatedAt: 10 } };
    }
    const projected = projectPlanningV2ToV1(planning);
    expect(Object.fromEntries(Object.entries(projected.items).map(([id, record]) => [id, record.assignee.value]))).toEqual({ none: "unassigned", dad: "dad", mom: "mom", shared: "shared", custom: "family" });
    expect(projected.items.custom.assignee.updatedAt).toBe(10);
  });

  it("does not degrade custom assignees after an unchanged old-client round trip", () => {
    const canonical = createEmptyItemPlanning();
    canonical.items.bag = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: ["member-custom"], updatedAt: 50 } };
    const roundTrip = migratePlanningV1ToV2(projectPlanningV2ToV1(canonical)).planning;
    expect(mergeItemPlanning(canonical, roundTrip).items.bag.assigneeIds.value).toEqual(["member-custom"]);
  });
});
