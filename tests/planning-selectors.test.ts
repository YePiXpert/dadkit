import { describe, expect, it } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import {
  derivePlanningRows,
  derivePlanningSummary,
} from "@/lib/planning/selectors";
import type { ChecklistItem } from "@/lib/types";

function item(id: string, patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id,
    name: id,
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "general",
    editable: false,
    removable: true,
    timing: "pack_now",
    packTier: "core",
    ...patch,
  };
}

describe("planning selectors", () => {
  it("counts assignments, due windows and price coverage correctly", () => {
    const checklist = [
      item("overdue"),
      item("today"),
      item("day7"),
      item("packed", { status: "packed" }),
      item("ignored", { status: "not_needed" }),
    ];
    const planning = createEmptyItemPlanning();
    planning.items.overdue = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "dad", updatedAt: 1 },
      dueDate: { value: "2026-07-31", updatedAt: 1 },
      estimatedPriceFen: { value: 0, updatedAt: 1 },
    };
    planning.items.today = {
      ...createEmptyItemPlanningRecord(),
      dueDate: { value: "2026-08-01", updatedAt: 1 },
      actualPriceFen: { value: 1_000, updatedAt: 1 },
    };
    planning.items.day7 = {
      ...createEmptyItemPlanningRecord(),
      dueDate: { value: "2026-08-08", updatedAt: 1 },
    };
    planning.items.packed = {
      ...createEmptyItemPlanningRecord(),
      dueDate: { value: "2026-07-01", updatedAt: 1 },
    };
    planning.items.orphan = {
      ...createEmptyItemPlanningRecord(),
      actualPriceFen: { value: 9_999, updatedAt: 1 },
    };

    expect(derivePlanningSummary(checklist, planning, "2026-08-01")).toEqual({
      activeCount: 4,
      unassignedCount: 3,
      overdueCount: 1,
      dueSoonCount: 2,
      estimatedTotalFen: 0,
      actualTotalFen: 1_000,
      estimatedCoverageCount: 1,
      actualCoverageCount: 1,
    });
  });

  it("sorts stably by urgency without mutating checklist", () => {
    const checklist = [item("other"), item("due7"), item("late"), item("today")];
    const before = structuredClone(checklist);
    const planning = createEmptyItemPlanning();
    planning.items.due7 = { ...createEmptyItemPlanningRecord(), dueDate: { value: "2026-08-08", updatedAt: 1 } };
    planning.items.late = { ...createEmptyItemPlanningRecord(), dueDate: { value: "2026-07-31", updatedAt: 1 } };
    planning.items.today = { ...createEmptyItemPlanningRecord(), dueDate: { value: "2026-08-01", updatedAt: 1 } };

    expect(
      derivePlanningRows(checklist, planning, { today: "2026-08-01" }).map(
        ({ item: rowItem }) => rowItem.id,
      ),
    ).toEqual(["late", "today", "due7", "other"]);
    expect(checklist).toEqual(before);
  });

  it("filters unassigned, not-needed and search results", () => {
    const checklist = [
      item("dad", { name: "证件" }),
      item("free", { name: "奶瓶" }),
      item("skip", { status: "not_needed" }),
    ];
    const planning = createEmptyItemPlanning();
    planning.items.dad = { ...createEmptyItemPlanningRecord(), assignee: { value: "dad", updatedAt: 1 } };
    const rows = derivePlanningRows(checklist, planning, {
      today: "2026-08-01",
      filter: "unassigned",
      query: "奶",
    });
    expect(rows.map(({ item: rowItem }) => rowItem.id)).toEqual(["free"]);
  });
});
