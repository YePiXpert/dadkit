import { describe, expect, it } from "vitest";

import { getChecklistViewItems } from "@/lib/checklist-v2";
import {
  calculatePackingCompletion,
  filterItemsForChecklistMode,
  generateChecklist,
  isPackingProgressItem,
} from "@/lib/rules";
import type { ChecklistItem } from "@/lib/types";

function customItem(patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "custom-item",
    name: "自定义物品",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "pack_existing",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

describe("fixed checklist generation", () => {
  it("generates one neutral checklist without profile input", () => {
    const items = generateChecklist();
    const ids = items.map((item) => item.id);

    expect(items.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(items.some((item) => String(item.itemKind) === "question")).toBe(
      false,
    );
    expect(
      items.some((item) => String(item.category) === "hospital_questions"),
    ).toBe(false);
  });

  it("does not generate invisible orphan rows", () => {
    const items = generateChecklist();

    expect(getChecklistViewItems(items, "all").map((item) => item.id)).toEqual(
      items.map((item) => item.id),
    );
  });

  it("keeps essential hospital-bag items in the fixed template", () => {
    const names = generateChecklist().map((item) => item.name);

    for (const expected of [
      "身份证件",
      "产检资料",
      "产褥垫 / 产后卫生巾",
      "一次性内裤",
      "尿不湿",
      "宝宝出院衣物",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("filters optional rows in lean mode without deleting them", () => {
    const allItems = generateChecklist();
    const leanItems = filterItemsForChecklistMode(allItems, "lean");

    expect(leanItems.length).toBeLessThan(allItems.length);
    expect(leanItems.length).toBeGreaterThan(0);
    expect(
      leanItems.every(
        (item) =>
          item.packTier === "core" ||
          item.packTier === "confirm" ||
          item.source === "user" ||
          item.status !== "todo",
      ),
    ).toBe(true);
    expect(filterItemsForChecklistMode(allItems, "full")).toEqual(allItems);
  });

  it("preserves current progress when regenerating", () => {
    const initial = generateChecklist();
    const target = initial.find(
      (item) => item.id === "general-postpartum-underwear",
    );
    expect(target).toBeDefined();

    const regenerated = generateChecklist({
      currentItems: [{ ...target!, status: "packed" }],
    });

    expect(
      regenerated.find((item) => item.id === target!.id)?.status,
    ).toBe("packed");
  });

  it("restores custom items and hidden template choices", () => {
    const hiddenId = "general-baby-nail-clipper";
    const item = customItem();
    const generated = generateChecklist({
      customItems: [item],
      hiddenTemplateItemIds: [hiddenId],
    });

    expect(generated.some((candidate) => candidate.id === hiddenId)).toBe(false);
    expect(generated).toContainEqual(item);
  });

  it("deduplicates same-name custom rows within one category", () => {
    const generated = generateChecklist({
      customItems: [
        customItem({ id: "custom-1", name: "备用毛巾", quantity: "1 条" }),
        customItem({ id: "custom-2", name: "备用毛巾", quantity: "2 条" }),
      ],
    });
    const matches = generated.filter(
      (item) => item.category === "mom_labor" && item.name === "备用毛巾",
    );

    expect(matches).toHaveLength(1);
  });
});

describe("packing progress", () => {
  it("counts only packable physical items", () => {
    const items = [
      customItem({ id: "todo", status: "todo" }),
      customItem({ id: "packed", status: "packed" }),
      customItem({
        id: "task",
        itemKind: "task",
        bag: "none",
        status: "packed",
      }),
      customItem({
        id: "last-minute",
        category: "last_minute",
        bag: "last_minute",
        status: "packed",
      }),
      customItem({ id: "skipped", status: "not_needed" }),
    ];

    expect(items.map(isPackingProgressItem)).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(calculatePackingCompletion(items)).toEqual({
      completed: 1,
      percent: 50,
      total: 2,
    });
  });
});
