import { afterEach, describe, expect, it, vi } from "vitest";

import { getChecklistViewItems } from "@/lib/checklist-v2";
import {
  getQuickStatusOptionsForItem,
  getStatusLabelForItem,
  getStatusOptionsForItem,
  inferPreparationKind,
} from "@/lib/preparation";
import { generateChecklist } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";

function testItem(patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "test-item",
    name: "测试项目",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "general",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

function generatedItem(id: string) {
  const item = generateChecklist().find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`missing generated item ${id}`);
  }

  return item;
}

function installLocalStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    },
  });
}

function resetStoreState() {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
  });
}

afterEach(() => {
  resetStoreState();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("checklist preparation semantics", () => {
  it("cycles buy-and-pack items through quick statuses", () => {
    installLocalStorage();
    const item = generatedItem("general-postpartum-underwear");

    useDadKitStore.setState({
      checklist: [{ ...item, status: "todo" }],
      customItems: [],
    });

    useDadKitStore.getState().advanceItem(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("bought");
    useDadKitStore.getState().advanceItem(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("packed");
    useDadKitStore.getState().advanceItem(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("todo");

    expect(getQuickStatusOptionsForItem(item)).toEqual([
      "todo",
      "bought",
      "packed",
    ]);
  });

  it("keeps the explicit not-needed choice outside the quick cycle", () => {
    const item = generatedItem("general-postpartum-underwear");

    expect(getStatusOptionsForItem(item)).toContain("not_needed");
    expect(getQuickStatusOptionsForItem(item)).not.toContain("not_needed");
  });

  it("uses document, last-minute, task, shopping and washing semantics", () => {
    const document = generatedItem("general-doc-id");
    const phone = generatedItem("general-labor-phone");
    const task = generatedItem("general-partner-doc-folder");
    const underwear = generatedItem("general-postpartum-underwear");
    const babyClothes = generatedItem("general-baby-home-clothes");

    expect(inferPreparationKind(document)).toBe("document");
    expect(getStatusLabelForItem("todo", document)).toBe("待整理");
    expect(inferPreparationKind(phone)).toBe("last_minute");
    expect(getStatusLabelForItem("todo", phone)).not.toBe("待购买");
    expect(inferPreparationKind(task)).toBe("task");
    expect(getStatusLabelForItem("todo", task)).toBe("待完成");
    expect(inferPreparationKind(underwear)).toBe("buy_and_pack");
    expect(getStatusLabelForItem("todo", underwear)).toBe("待购买");
    expect(inferPreparationKind(babyClothes)).toBe("wash_then_pack");
    expect(getStatusLabelForItem("todo", babyClothes)).toBe("待清洗");
  });

  it("derives the shopping queue only from buy-and-pack items", () => {
    const shoppingIds = getChecklistViewItems(
      generateChecklist(),
      "shopping",
    ).map((item) => item.id);

    for (const id of [
      "general-doc-id",
      "general-doc-medical-card",
      "general-doc-prenatal-records",
      "general-labor-phone",
      "general-partner-save-phone",
      "general-partner-family-notice",
      "general-last-phone",
    ]) {
      expect(shoppingIds).not.toContain(id);
    }

    expect(shoppingIds).toContain("general-postpartum-underwear");
    expect(shoppingIds).toContain("general-postpartum-pads");
    expect(shoppingIds).toContain("general-baby-diapers");
  });

  it("persists preparation kind for custom items and edits", () => {
    installLocalStorage();

    useDadKitStore.getState().addCustomItem({
      name: "自定义产褥垫",
      category: "mom_postpartum",
      priority: "must",
      preparationKind: "buy_and_pack",
    });

    const item = useDadKitStore.getState().customItems[0];
    expect(item?.preparationKind).toBe("buy_and_pack");

    useDadKitStore.getState().updateItem(item.id, {
      preparationKind: "pack_existing",
    });
    expect(useDadKitStore.getState().customItems[0]?.preparationKind).toBe(
      "pack_existing",
    );
    expect(
      useDadKitStore.getState().checklist.find((candidate) => candidate.id === item.id)
        ?.preparationKind,
    ).toBe("pack_existing");
  });

  it("keeps a neutral fallback for existing physical items", () => {
    const item = testItem({ preparationKind: undefined });
    expect(inferPreparationKind(item)).toBe("pack_existing");
  });
});
