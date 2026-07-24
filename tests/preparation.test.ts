import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getQuickStatusOptionsForItem,
  getStatusLabelForItem,
  getStatusOptionsForItem,
  inferPreparationKind,
} from "@/lib/preparation";
import {
  filterItemsByVisualGroup,
  getChecklistVisualGroupItems,
} from "@/lib/presentation";
import { generateChecklist } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem, UserProfile } from "@/lib/types";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    dueDate: "2026-08-01",
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...overrides,
  };
}

function testItem(patch: Partial<ChecklistItem>): ChecklistItem {
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
  const item = generateChecklist(makeProfile()).find((candidate) => candidate.id === id);

  if (!item) {
    throw new Error(`missing generated item ${id}`);
  }

  return item;
}

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  vi.stubGlobal("window", { localStorage });

  return store;
}

function resetStoreState() {
  useDadKitStore.setState({
    hydrated: false,
    profile: undefined,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
    hospitalOverrides: [],
    hospitalAnswers: [],
    timelineTaskStatuses: [],
    filters: {
      category: "all",
      status: "all",
      priority: "all",
    },
  });
}

afterEach(() => {
  resetStoreState();
  vi.unstubAllGlobals();
});

describe("preparation semantics", () => {
  it("cycles buy-and-pack items through quick statuses only", () => {
    installLocalStorage();
    const item = generatedItem("general-postpartum-underwear");

    useDadKitStore.setState({
      checklist: [{ ...item, status: "todo" }],
      customItems: [],
    });

    useDadKitStore.getState().cycleItemStatus(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("bought");

    useDadKitStore.getState().cycleItemStatus(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("packed");

    useDadKitStore.getState().cycleItemStatus(item.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("todo");

    expect(getQuickStatusOptionsForItem(item)).not.toContain("hospital_provided");
    expect(getQuickStatusOptionsForItem(item)).not.toContain("not_needed");
  });

  it("keeps full buy-and-pack options for the dropdown", () => {
    const item = generatedItem("general-postpartum-underwear");

    expect(getStatusOptionsForItem(item)).toContain("hospital_provided");
    expect(getStatusOptionsForItem(item)).toContain("not_needed");
  });

  it("treats document items as document preparation", () => {
    const item = generatedItem("general-doc-id");

    expect(inferPreparationKind(item)).toBe("document");
    expect(getStatusOptionsForItem(item)).not.toContain("bought");
    expect(getStatusOptionsForItem(item)).not.toContain("washed");
    expect(getStatusLabelForItem("todo", item)).toBe("待整理");
    expect(getStatusLabelForItem("bought", item)).toBe("待整理");
  });

  it("uses document labels for medical cards and prenatal records", () => {
    expect(getStatusLabelForItem("todo", generatedItem("general-doc-medical-card"))).toBe(
      "待整理",
    );
    expect(
      getStatusLabelForItem("todo", generatedItem("general-doc-prenatal-records")),
    ).toBe("待整理");
  });

  it("does not treat phones as shopping items", () => {
    const item = generatedItem("general-labor-phone");

    expect(inferPreparationKind(item)).toBe("last_minute");
    expect(getStatusLabelForItem("todo", item)).not.toBe("待购买");
  });

  it("keeps last-minute family notifications out of shopping semantics", () => {
    const item = generatedItem("general-partner-family-notice");

    expect(["last_minute", "task"]).toContain(inferPreparationKind(item));
    expect(getStatusLabelForItem("todo", item)).not.toBe("待购买");
  });

  it("uses a preparation fallback for existing items", () => {
    const item = testItem({ preparationKind: "pack_existing" });

    expect(getStatusLabelForItem("washed", item)).toBe("待准备");
    expect(getStatusLabelForItem("washed", item)).not.toBe("待清洗");
  });

  it("treats car seat confirmation as install or place", () => {
    const item = generatedItem("general-going-home-car-seat");

    expect(inferPreparationKind(item)).toBe("install_or_place");
    expect(getStatusLabelForItem("todo", item)).not.toBe("待购买");
  });

  it("uses question and task labels for hospital questions and dad tasks", () => {
    const question = generatedItem("general-question-pads");
    const task = generatedItem("general-partner-doc-folder");

    expect(inferPreparationKind(question)).toBe("question");
    expect(getStatusLabelForItem("todo", question)).toBe("待问");
    expect(inferPreparationKind(task)).toBe("task");
    expect(getStatusLabelForItem("todo", task)).toBe("待完成");
  });

  it("uses shopping and washing labels for matching items", () => {
    const underwear = generatedItem("general-postpartum-underwear");
    const babyClothes = generatedItem("general-baby-home-clothes");

    expect(inferPreparationKind(underwear)).toBe("buy_and_pack");
    expect(getStatusLabelForItem("todo", underwear)).toBe("待购买");
    expect(inferPreparationKind(babyClothes)).toBe("wash_then_pack");
    expect(getStatusLabelForItem("todo", babyClothes)).toBe("待清洗");
  });

  it("keeps non-shopping items out of the shopping list", () => {
    const excludedIds = [
      "general-doc-id",
      "general-doc-medical-card",
      "general-doc-prenatal-records",
      "general-labor-phone",
      "general-question-pads",
      "general-partner-save-phone",
      "general-partner-family-notice",
      "general-last-phone",
    ];
    const shoppingIds = filterItemsByVisualGroup(
      generateChecklist(makeProfile()),
      "shopping",
    ).map((item) => item.id);

    for (const id of excludedIds) {
      expect(shoppingIds).not.toContain(id);
    }

    expect(shoppingIds).toContain("general-postpartum-underwear");
    expect(shoppingIds).toContain("general-postpartum-pads");
    expect(shoppingIds).toContain("general-baby-diapers");
  });

  it("uses one source for checklist group counts and visible items", () => {
    const items = generateChecklist(makeProfile());
    const dadItems = getChecklistVisualGroupItems(items, "dad");

    expect(filterItemsByVisualGroup(items, "dad")).toEqual(dadItems);
    expect(dadItems.map((item) => item.id)).toEqual([
      "general-partner-id",
      "general-partner-charger",
      "general-partner-water-snacks",
      "general-partner-clothes",
      "general-partner-toiletries",
      "general-partner-glasses",
    ]);
    expect(dadItems.every((item) => item.itemKind === "item")).toBe(true);
    expect(dadItems.every((item) => item.bag === "dad_backpack")).toBe(true);
  });

  it("saves preparationKind when adding custom items", () => {
    installLocalStorage();

    useDadKitStore.getState().addCustomItem({
      name: "自定义产褥垫",
      category: "mom_postpartum",
      priority: "must",
      preparationKind: "buy_and_pack",
    });

    expect(useDadKitStore.getState().customItems[0]?.preparationKind).toBe(
      "buy_and_pack",
    );
    expect(useDadKitStore.getState().checklist[0]?.preparationKind).toBe(
      "buy_and_pack",
    );
  });

  it("updates preparationKind when editing custom items", () => {
    installLocalStorage();
    const item = testItem({
      id: "custom-item",
      source: "user",
      preparationKind: "pack_existing",
    });

    useDadKitStore.setState({
      checklist: [item],
      customItems: [item],
    });

    useDadKitStore.getState().updateItem(item.id, {
      preparationKind: "last_minute",
    });

    expect(useDadKitStore.getState().customItems[0]?.preparationKind).toBe(
      "last_minute",
    );
    expect(useDadKitStore.getState().checklist[0]?.preparationKind).toBe(
      "last_minute",
    );
  });

  it("infers preparation kind for legacy items without preparationKind", () => {
    expect(
      inferPreparationKind(
        testItem({
          name: "身份证件",
          category: "documents",
          preparationKind: undefined,
        }),
      ),
    ).toBe("document");
    expect(
      inferPreparationKind(
        testItem({
          name: "一次性内裤",
          preparationKind: undefined,
        }),
      ),
    ).toBe("buy_and_pack");
  });
});
