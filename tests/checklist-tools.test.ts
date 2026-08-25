import { afterEach, describe, expect, it, vi } from "vitest";

import { CUSTOM_PREPARATION_OPTIONS } from "@/lib/custom-item-options";
import { matchesChecklistSearch } from "@/lib/checklist-search";
import { formatChecklistAsText } from "@/lib/checklist-text";
import { getDaysUntilDueDate } from "@/lib/growth";
import { getStoredPackingPercent } from "@/lib/packing-progress";
import {
  clearChecklistMilestones,
  loadChecklistMilestones,
  markHalfwayMilestone,
  markSectionClearedMilestone,
} from "@/lib/checklist-milestones";
import { normalizeQuantityValue } from "@/components/QuantityStepper";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import type { ChecklistItem } from "@/lib/types";

function item(patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "test-item",
    name: "哺乳枕",
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checklist interaction helpers", () => {
  it("keeps the add and edit preparation choices aligned", () => {
    expect(CUSTOM_PREPARATION_OPTIONS.map((option) => option.value)).toEqual([
      "pack_existing",
      "buy_and_pack",
      "buy_for_home",
      "wash_then_pack",
    ]);
  });

  it("normalizes direct quantity input to positive integers", () => {
    expect(normalizeQuantityValue("10")).toBe("10");
    expect(normalizeQuantityValue("0", " 件")).toBe("1 件");
    expect(normalizeQuantityValue("-2")).toBe("1");
    expect(normalizeQuantityValue("abc")).toBe("1");
    expect(normalizeQuantityValue("", " 条")).toBe("1 条");
    expect(normalizeQuantityValue("2.8")).toBe("2");
  });

  it("searches item names and notes with normalized Chinese and English input", () => {
    const target = item({ name: "Baby Bottle", note: "产后夜间喂奶用" });

    expect(matchesChecklistSearch(target, "bottle")).toBe(true);
    expect(matchesChecklistSearch(target, "夜间")).toBe(true);
    expect(matchesChecklistSearch(target, "奶嘴")).toBe(false);
  });

  it("formats a readable grouped checklist and preserves skipped items", () => {
    const text = formatChecklistAsText([
      item({ name: "身份证", category: "documents", quantity: "2 张" }),
      item({ name: "产房拖鞋", status: "packed", quantity: "1 双" }),
      item({
        name: "哺乳内衣",
        category: "mom_postpartum",
        status: "packed",
        quantity: "2 件",
      }),
      item({
        name: "备用毛巾",
        category: "mom_postpartum",
        status: "not_needed",
      }),
    ]);

    expect(text).toContain("证件包\n☐ 身份证 · 2 张");
    expect(text).toContain("产房包\n☑ 产房拖鞋 · 1 双");
    expect(text).toContain(
      "病房包 · 妈妈\n☑ 哺乳内衣 · 2 件\n⊘ 备用毛巾（不需要）",
    );
  });

  it("calculates the due-date countdown on calendar-day boundaries", () => {
    expect(
      getDaysUntilDueDate("2026-08-10", new Date(2026, 7, 2, 12)),
    ).toBe(8);
    expect(getDaysUntilDueDate("not-a-date")).toBeUndefined();
  });

  it("reads the lightweight growth-page packing share percentage from storage", () => {
    installBrowserStorage({
      "dadkit:v3:checklist": JSON.stringify([
        item({ id: "packed", status: "packed", bag: "mom_bag" }),
        item({ id: "todo", status: "todo", bag: "mom_bag" }),
        item({ id: "last-minute", category: "last_minute", status: "todo" }),
      ]),
    });

    expect(getStoredPackingPercent()).toBe(50);
  });

  it("persists one-time checklist milestones until the checklist is reset", () => {
    installBrowserStorage();

    markHalfwayMilestone();
    markSectionClearedMilestone("mom");
    markSectionClearedMilestone("mom");

    expect(loadChecklistMilestones()).toEqual({
      reachedHalfway: true,
      clearedSectionIds: ["mom"],
    });

    clearChecklistMilestones();
    expect(loadChecklistMilestones()).toEqual({
      reachedHalfway: false,
      clearedSectionIds: [],
    });
  });
});
