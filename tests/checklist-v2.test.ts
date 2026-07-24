import { describe, expect, it } from "vitest";

import {
  CHECKLIST_VIEWS,
  getChecklistItemState,
  getChecklistViewCounts,
  getChecklistViewItems,
} from "@/lib/checklist-v2";
import type {
  ChecklistItem,
  PackStatus,
  PreparationKind,
} from "@/lib/types";

function checklistItem(
  id: string,
  status: PackStatus,
  preparationKind: PreparationKind = "buy_and_pack",
): ChecklistItem {
  return {
    id,
    name: `测试物品 ${id}`,
    category: "mom_labor",
    priority: "must",
    status,
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind,
    bag: "mom_bag",
    bulk: "small",
    timing: preparationKind === "wash_then_pack" ? "wash_before_pack" : "pack_now",
  };
}

describe("V2 checklist views", () => {
  it("exposes exactly the three user-facing views", () => {
    expect(CHECKLIST_VIEWS).toEqual([
      { id: "all", label: "全部物品", shortLabel: "全部" },
      { id: "shopping", label: "待购买", shortLabel: "待购买" },
      { id: "packing", label: "待装包", shortLabel: "待装包" },
    ]);
  });

  it("projects persisted item statuses into the four V2 states", () => {
    expect(getChecklistItemState(checklistItem("todo", "todo"))).toBe("todo");
    expect(getChecklistItemState(checklistItem("bought", "bought"))).toBe(
      "ready",
    );
    expect(getChecklistItemState(checklistItem("washed", "washed"))).toBe(
      "ready",
    );
    expect(getChecklistItemState(checklistItem("packed", "packed"))).toBe(
      "packed",
    );
    expect(
      getChecklistItemState(checklistItem("provided", "hospital_provided")),
    ).toBe("packed");
    expect(
      getChecklistItemState(checklistItem("skipped", "not_needed")),
    ).toBe("not_needed");
  });

  it("separates purchase and packing queues without hiding terminal items from all", () => {
    const items = [
      checklistItem("buy", "todo", "buy_and_pack"),
      checklistItem("wash", "todo", "wash_then_pack"),
      checklistItem("owned", "todo", "pack_existing"),
      checklistItem("ready", "bought", "buy_and_pack"),
      checklistItem("packed", "packed", "buy_and_pack"),
      checklistItem("skipped", "not_needed", "buy_and_pack"),
    ];

    expect(getChecklistViewItems(items, "all").map((item) => item.id)).toEqual(
      items.map((item) => item.id),
    );
    expect(
      getChecklistViewItems(items, "shopping").map((item) => item.id),
    ).toEqual(["buy"]);
    expect(
      getChecklistViewItems(items, "packing").map((item) => item.id),
    ).toEqual(["wash", "owned", "ready"]);
  });

  it("derives every displayed count from the same view selectors", () => {
    const items = [
      checklistItem("buy", "todo", "buy_and_pack"),
      checklistItem("owned", "todo", "pack_existing"),
      checklistItem("ready", "washed", "wash_then_pack"),
      checklistItem("packed", "packed"),
      checklistItem("skipped", "not_needed"),
    ];
    const counts = getChecklistViewCounts(items);

    for (const view of CHECKLIST_VIEWS) {
      expect(counts[view.id]).toBe(
        getChecklistViewItems(items, view.id).length,
      );
    }

    expect(counts).toEqual({ all: 5, shopping: 1, packing: 2 });
  });
});
