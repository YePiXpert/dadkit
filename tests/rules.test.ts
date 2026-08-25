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
    const ids = new Set(generateChecklist().map((item) => item.id));

    for (const id of [
      "general-doc-id",
      "general-doc-health-book",
      "general-doc-prenatal-records",
      "general-labor-pads",
      "general-postpartum-pads",
      "general-postpartum-gloves",
      "general-postpartum-underwear",
      "general-baby-diapers",
      "general-baby-bottle-basin",
      "general-baby-home-clothes",
    ]) {
      expect(ids.has(id), id).toBe(true);
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

  it("keeps requested labor and ward supplies visible in lean mode", () => {
    const leanIds = new Set(
      filterItemsForChecklistMode(generateChecklist(), "lean").map(
        (item) => item.id,
      ),
    );

    for (const id of [
      "general-doc-health-book",
      "general-labor-energy-food",
      "general-labor-pads",
      "general-postpartum-yuezi-clothes",
      "general-postpartum-gloves",
      "general-postpartum-thermos",
      "general-baby-sheet",
      "general-baby-bath-basin",
      "general-baby-bath-towels",
      "general-baby-bottle-basin",
      "general-baby-cotton-tissues",
      "general-baby-cloud-tissues",
    ]) {
      expect(leanIds.has(id), id).toBe(true);
    }
  });

  it("keeps same-name rows in different workflow sections", () => {
    const prenatalRows = generateChecklist().filter(
      (item) => item.name === "产检资料",
    );

    expect(prenatalRows.map((item) => item.category)).toEqual([
      "documents",
      "last_minute",
    ]);
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

  it("migrates previous template text without overwriting user edits", () => {
    const initial = generateChecklist();
    const diapers = initial.find(
      (item) => item.id === "general-confinement-baby-diapers-stock",
    );
    const formula = initial.find(
      (item) => item.id === "general-confinement-baby-formula",
    );
    expect(diapers).toBeDefined();
    expect(formula).toBeDefined();

    const regenerated = generateChecklist({
      currentItems: [
        {
          ...diapers!,
          status: "bought",
          quantity: "NB 约 200 片 + S 码 1 包",
          note: "用于月子里每天约十至十二片；预估八斤以上可直接囤 S 码，建议先囤试用装锁定适合的品牌。常见品牌：大王光羽、好奇小森林、露安适、bbc。",
        },
        {
          ...formula!,
          quantity: "用户自定义数量",
          note: "用户自定义说明",
        },
      ],
    });
    const migratedDiapers = regenerated.find(
      (item) => item.id === diapers!.id,
    );
    const preservedFormula = regenerated.find(
      (item) => item.id === formula!.id,
    );

    expect(migratedDiapers).toMatchObject({
      status: "bought",
      quantity: "NB 试用装或小包 1-2 包，S 码暂不多囤",
    });
    expect(migratedDiapers?.note).toContain("先备试用装或一两小包");
    expect(preservedFormula).toMatchObject({
      quantity: "用户自定义数量",
      note: "用户自定义说明",
    });
  });

  it("upgrades former hospital defaults while preserving edited hospital text", () => {
    const initial = generateChecklist();
    const pads = initial.find(
      (item) => item.id === "general-postpartum-pads",
    );
    const bottleBrush = initial.find(
      (item) => item.id === "general-baby-bottle-brush",
    );
    expect(pads).toBeDefined();
    expect(bottleBrush).toBeDefined();

    const regenerated = generateChecklist({
      currentItems: [
        {
          ...pads!,
          status: "bought",
          quantity: "10-20 片",
          note: "用于住院期间铺垫床面和按需更换；建议先备六十乘九十厘米产褥垫十至二十片，并向医院确认是否还需产后卫生巾。",
        },
        {
          ...bottleBrush!,
          quantity: "用户仍想带两套",
          note: "用户自定义的奶瓶刷说明",
        },
      ],
    });
    const migratedPads = regenerated.find((item) => item.id === pads!.id);
    const preservedBottleBrush = regenerated.find(
      (item) => item.id === bottleBrush!.id,
    );

    expect(migratedPads).toMatchObject({
      status: "bought",
      quantity: pads!.quantity,
      note: pads!.note,
    });
    expect(preservedBottleBrush).toMatchObject({
      quantity: "用户仍想带两套",
      note: "用户自定义的奶瓶刷说明",
    });
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

  it("merges a renamed user overlay by id without duplicating the template row", () => {
    const current = generateChecklist().find(
      (item) => item.id === "general-postpartum-pads",
    );
    expect(current).toBeDefined();

    const generated = generateChecklist({
      customItems: [
        {
          ...current!,
          category: "mom_labor",
          name: "产褥垫 / 产后卫生巾",
          note: "用户自定义说明",
          packTier: "core",
          priority: "must",
          quantity: "用户自定义数量",
          source: "user",
        },
      ],
    });
    const matches = generated.filter((item) => item.id === current!.id);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      category: current!.category,
      name: current!.name,
      note: "用户自定义说明",
      packTier: current!.packTier,
      priority: current!.priority,
      quantity: "用户自定义数量",
    });
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
