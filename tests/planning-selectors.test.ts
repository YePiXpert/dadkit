import { describe, expect, it } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { derivePlanningRows, derivePlanningSummary } from "@/lib/planning/selectors";
import type { ChecklistItem } from "@/lib/types";

const item = (id: string): ChecklistItem => ({ id, name: id, category: "baby", priority: "must", status: "todo", source: "general", editable: false, removable: false, timing: "pack_now" });

describe("planning v2 selectors", () => {
  it("treats an empty assignee list as unassigned", () => {
    const planning = createEmptyItemPlanning();
    planning.items.a = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: ["member-a"], updatedAt: 1 } };
    const summary = derivePlanningSummary([item("a"), item("b")], planning, "2026-08-01");
    expect(summary.unassignedCount).toBe(1);
  });

  it("filters by a dynamic member id", () => {
    const planning = createEmptyItemPlanning();
    planning.items.a = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: ["member-a", "member-b"], updatedAt: 1 } };
    planning.items.b = { ...createEmptyItemPlanningRecord(), assigneeIds: { value: ["member-b"], updatedAt: 1 } };
    expect(derivePlanningRows([item("a"), item("b")], planning, { today: "2026-08-01", assignee: "member-a" }).map((row) => row.item.id)).toEqual(["a"]);
  });
});
