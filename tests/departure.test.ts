import { describe, expect, it } from "vitest";

import {
  deriveDepartureGroups,
  getDepartureProgress,
  getDepartureProgressFromGroups,
  isDepartureRelevantItem,
  type DepartureGroupId,
} from "@/lib/departure";
import type { ChecklistItem } from "@/lib/types";

function testItem(
  id: string,
  patch: Partial<ChecklistItem> = {},
): ChecklistItem {
  return {
    id,
    name: `测试物品 ${id}`,
    category: "mom_labor",
    priority: "recommended",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "confirm",
    itemKind: "item",
    preparationKind: "pack_existing",
    bag: "none",
    bulk: "small",
    timing: "prepare_now",
    ...patch,
  };
}

function groupIds(items: ChecklistItem[], groupId: DepartureGroupId) {
  return (
    deriveDepartureGroups(items)
      .find((group) => group.id === groupId)
      ?.items.map((item) => item.id) ?? []
  );
}

describe("departure checklist derivation", () => {
  it("puts document category, bag and inferred kind in the document group", () => {
    const items = [
      testItem("category", { category: "documents" }),
      testItem("bag", { bag: "documents_folder" }),
      testItem("kind", { preparationKind: "document" }),
    ];

    expect(groupIds(items, "documents")).toEqual([
      "category",
      "bag",
      "kind",
    ]);
  });

  it("puts every last-minute signal in the leaving group", () => {
    const items = [
      testItem("category", { category: "last_minute" }),
      testItem("bag", { bag: "last_minute" }),
      testItem("timing", { timing: "grab_before_leaving" }),
      testItem("status", { status: "last_minute" }),
      testItem("kind", { preparationKind: "last_minute" }),
    ];

    expect(groupIds(items, "lastMinute")).toEqual([
      "category",
      "bag",
      "timing",
      "status",
      "kind",
    ]);
  });

  it("puts car and install-or-place items in the car group", () => {
    const items = [
      testItem("car", { bag: "car" }),
      testItem("install", { preparationKind: "install_or_place" }),
    ];

    expect(groupIds(items, "car")).toEqual(["car", "install"]);
  });

  it("includes must or core items from the three critical bags", () => {
    const items = [
      testItem("must", {
        bag: "mom_bag",
        priority: "must",
        packTier: "optional",
      }),
      testItem("core", {
        bag: "baby_bag",
        priority: "recommended",
        packTier: "core",
      }),
      testItem("dad", {
        bag: "dad_backpack",
        priority: "must",
      }),
      testItem("task", {
        bag: "mom_bag",
        itemKind: "task",
        priority: "must",
      }),
    ];

    expect(groupIds(items, "criticalLuggage")).toEqual([
      "must",
      "core",
      "dad",
    ]);
  });

  it("excludes items marked not needed", () => {
    const item = testItem("skipped", {
      category: "documents",
      status: "not_needed",
    });

    expect(deriveDepartureGroups([item])).toEqual([]);
    expect(isDepartureRelevantItem(item)).toBe(false);
  });

  it("assigns a multi-match item to only the highest-priority group", () => {
    const item = testItem("multi", {
      category: "documents",
      bag: "car",
      priority: "must",
      status: "last_minute",
    });
    const groups = deriveDepartureGroups([item]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe("documents");
    expect(groups[0]?.items).toEqual([item]);
  });

  it("sorts incomplete items before completed items while staying stable", () => {
    const items = [
      testItem("done-first", { bag: "car", status: "packed" }),
      testItem("pending-first", { bag: "car" }),
      testItem("done-second", { bag: "car", status: "packed" }),
      testItem("pending-second", { bag: "car", status: "bought" }),
    ];

    expect(groupIds(items, "car")).toEqual([
      "pending-first",
      "pending-second",
      "done-first",
      "done-second",
    ]);
  });

  it("calculates confirmed, remaining and percentage from unique items", () => {
    const progress = getDepartureProgress([
      testItem("pending", { bag: "car" }),
      testItem("done", { bag: "mom_bag", priority: "must", status: "packed" }),
      testItem("skipped", { category: "documents", status: "not_needed" }),
    ]);

    expect(progress).toEqual({
      completed: 1,
      percent: 50,
      remaining: 1,
      total: 2,
    });
  });

  it("returns an empty zero progress state", () => {
    expect(deriveDepartureGroups([])).toEqual([]);
    expect(getDepartureProgress([])).toEqual({
      completed: 0,
      percent: 0,
      remaining: 0,
      total: 0,
    });
  });

  it("reuses already derived groups when calculating page progress", () => {
    const groups = deriveDepartureGroups([
      testItem("pending", { bag: "car" }),
      testItem("done", { bag: "mom_bag", priority: "must", status: "packed" }),
    ]);

    expect(getDepartureProgressFromGroups(groups)).toEqual({
      completed: 1,
      percent: 50,
      remaining: 1,
      total: 2,
    });
  });

  it("does not mutate the input array or its items", () => {
    const items = [
      testItem("done", { bag: "car", status: "packed" }),
      testItem("pending", { bag: "car" }),
    ];
    const before = structuredClone(items);
    const references = [...items];

    deriveDepartureGroups(items);

    expect(items).toEqual(before);
    expect(items[0]).toBe(references[0]);
    expect(items[1]).toBe(references[1]);
  });
});
