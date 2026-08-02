import { describe, expect, it } from "vitest";

import { LEGACY_DAD_MEMBER_ID, LEGACY_MOM_MEMBER_ID } from "@/lib/household/migration";
import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { mergeItemPlanning } from "@/lib/planning/merge";
import { getItemPlanningValues } from "@/lib/planning/selectors";

function planningWith(id: string, patch: Partial<ReturnType<typeof createEmptyItemPlanningRecord>>) {
  const planning = createEmptyItemPlanning();
  planning.items[id] = { ...createEmptyItemPlanningRecord(), ...patch };
  return planning;
}

describe("planning v2 merge", () => {
  it("keeps edits to different fields and items", () => {
    const local = planningWith("bag", { assigneeIds: { value: [LEGACY_DAD_MEMBER_ID], updatedAt: 10 } });
    const remote = planningWith("bag", { dueDate: { value: "2026-08-08", updatedAt: 20 } });
    remote.items.other = { ...createEmptyItemPlanningRecord(), storageLocation: { value: "车内", updatedAt: 30 } };
    const merged = mergeItemPlanning(local, remote);
    expect(getItemPlanningValues(merged, "bag")).toMatchObject({ assigneeIds: [LEGACY_DAD_MEMBER_ID], dueDate: "2026-08-08" });
    expect(getItemPlanningValues(merged, "other").storageLocation).toBe("车内");
  });

  it("uses newer fields and keeps local on equal timestamps", () => {
    const local = planningWith("bag", { assigneeIds: { value: [LEGACY_DAD_MEMBER_ID], updatedAt: 20 } });
    const remote = planningWith("bag", { assigneeIds: { value: [LEGACY_MOM_MEMBER_ID], updatedAt: 20 } });
    expect(getItemPlanningValues(mergeItemPlanning(local, remote), "bag").assigneeIds).toEqual([LEGACY_DAD_MEMBER_ID]);
    remote.items.bag.assigneeIds.updatedAt = 21;
    expect(getItemPlanningValues(mergeItemPlanning(local, remote), "bag").assigneeIds).toEqual([LEGACY_MOM_MEMBER_ID]);
  });

  it("uses clearedAt as a global tombstone", () => {
    const remote = planningWith("bag", { assigneeIds: { value: [LEGACY_DAD_MEMBER_ID], updatedAt: 99 } });
    const local = { version: 2, clearedAt: 100, items: {} } as const;
    expect(getItemPlanningValues(mergeItemPlanning(local, remote), "bag").assigneeIds).toEqual([]);
    remote.items.bag.assigneeIds.updatedAt = 101;
    expect(getItemPlanningValues(mergeItemPlanning(local, remote), "bag").assigneeIds).toEqual([LEGACY_DAD_MEMBER_ID]);
  });

  it("does not mutate inputs", () => {
    const local = planningWith("a", { dueDate: { value: "2026-08-08", updatedAt: 1 } });
    const remote = planningWith("b", { storageLocation: { value: "家中", updatedAt: 2 } });
    const before = structuredClone([local, remote]);
    mergeItemPlanning(local, remote);
    expect([local, remote]).toEqual(before);
  });
});
