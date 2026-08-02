import { describe, expect, it } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningDraft, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { isItemPlanningPortableData, validateItemPlanningDraft } from "@/lib/planning/validation";

describe("planning v2 validation", () => {
  it("normalizes multi assignees and text", () => {
    const result = validateItemPlanningDraft({ ...createEmptyItemPlanningDraft(), assigneeIds: ["member-b", "member-a", "member-a"], purchaseChannel: "  京东  ", dueDate: "" });
    expect(result.ok).toBe(true);
    expect(result.values?.assigneeIds).toEqual(["member-a", "member-b"]);
    expect(result.values?.purchaseChannel).toBe("京东");
  });

  it("rejects dangerous ids and too many assignees", () => {
    expect(validateItemPlanningDraft({ ...createEmptyItemPlanningDraft(), assigneeIds: ["__proto__"] }).ok).toBe(false);
    expect(validateItemPlanningDraft({ ...createEmptyItemPlanningDraft(), assigneeIds: Array.from({ length: 13 }, (_, index) => `member-${index}`) }).ok).toBe(false);
  });

  it("strictly validates portable version 2", () => {
    const planning = createEmptyItemPlanning();
    planning.items.bag = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: ["member-a"], updatedAt: 1 } };
    expect(isItemPlanningPortableData(planning)).toBe(true);
    expect(isItemPlanningPortableData({ ...planning, version: 1 })).toBe(false);
    expect(isItemPlanningPortableData({ ...planning, injected: true })).toBe(false);
  });
});
