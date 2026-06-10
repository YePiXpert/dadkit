import { describe, expect, it } from "vitest";

import {
  getStatusLabelForItem,
  getStatusOptionsForItem,
  inferPreparationKind,
  isShoppingListItem,
} from "@/lib/preparation";
import { generateChecklist } from "@/lib/rules";
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

describe("preparation semantics", () => {
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

  it("treats car seat confirmation as install or place", () => {
    const item = generatedItem("general-going-home-car-seat");

    expect(inferPreparationKind(item)).toBe("install_or_place");
    expect(getStatusLabelForItem("todo", item)).not.toBe("待购买");
  });

  it("uses question and task labels for hospital questions and dad tasks", () => {
    const question = generatedItem("general-question-pads");
    const task = generatedItem("general-partner-save-phone");

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
    ];
    const shoppingIds = generateChecklist(makeProfile())
      .filter(isShoppingListItem)
      .map((item) => item.id);

    for (const id of excludedIds) {
      expect(shoppingIds).not.toContain(id);
    }

    expect(shoppingIds).toContain("general-postpartum-underwear");
    expect(shoppingIds).toContain("general-postpartum-pads");
    expect(shoppingIds).toContain("general-baby-diapers");
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
