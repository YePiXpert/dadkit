import { describe, expect, it } from "vitest";

import {
  getChecklistSection,
  getChecklistViewItems,
} from "@/lib/checklist-v2";
import { generateChecklist } from "@/lib/rules";
import { generalTemplate } from "@/lib/templates/general";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/types";

const checklist = generateChecklist();

function getChecklistItem(id: string) {
  const item = checklist.find((candidate) => candidate.id === id);
  expect(item, `missing checklist item: ${id}`).toBeDefined();
  return item!;
}

describe("confinement (月子) template stock", () => {
  it("registers confinement categories with labels and order", () => {
    expect(CATEGORY_ORDER).toContain("confinement_mom");
    expect(CATEGORY_ORDER).toContain("confinement_baby");
    expect(CATEGORY_ORDER.indexOf("confinement_mom")).toBeGreaterThan(
      CATEGORY_ORDER.indexOf("baby"),
    );
    expect(CATEGORY_ORDER.indexOf("confinement_baby")).toBeLessThan(
      CATEGORY_ORDER.indexOf("partner"),
    );
    expect(CATEGORY_LABELS.confinement_mom).toBeTruthy();
    expect(CATEGORY_LABELS.confinement_baby).toBeTruthy();
  });

  it("adds a meaningful number of home-stocking items", () => {
    const confinementItems = generalTemplate.filter(
      (item) =>
        item.category === "confinement_mom" ||
        item.category === "confinement_baby",
    );

    expect(confinementItems.length).toBeGreaterThanOrEqual(30);
  });

  it("keeps confinement items out of hospital bags", () => {
    const confinementItems = checklist.filter(
      (item) =>
        item.category === "confinement_mom" ||
        item.category === "confinement_baby",
    );

    expect(confinementItems.length).toBeGreaterThan(0);
    for (const item of confinementItems) {
      expect(item.bag).toBe("none");
      expect(item.preparationKind).toBe("buy_for_home");
      expect(item.quantity?.trim()).toBeTruthy();
      expect(item.note?.trim()).toBeTruthy();
    }
  });

  it("covers key home-stocking staples from mature checklists", () => {
    for (const id of [
      "general-confinement-mom-yuezi-clothes",
      "general-confinement-mom-pads-stock",
      "general-confinement-baby-diapers-stock",
      "general-confinement-baby-bottles",
      "general-confinement-baby-formula",
      "general-confinement-baby-kettle",
      "general-confinement-baby-sterilizer",
      "general-confinement-baby-thermometer",
      "general-confinement-baby-vitamin-ad",
      "general-confinement-baby-bathtub",
      "general-confinement-baby-crib",
      "general-confinement-baby-stroller",
    ]) {
      getChecklistItem(id);
    }
  });

  it("maps confinement items into their own sections", () => {
    expect(getChecklistSection(getChecklistItem("general-confinement-mom-yuezi-clothes"))).toBe(
      "confinementMom",
    );
    expect(getChecklistSection(getChecklistItem("general-confinement-baby-bottles"))).toBe(
      "confinementBaby",
    );
  });

  it("lists todo home-stock purchases in the shopping view but never the packing view", () => {
    const shoppingItems = getChecklistViewItems(checklist, "shopping");
    const packingItems = getChecklistViewItems(checklist, "packing");

    expect(
      shoppingItems.some((item) => item.id === "general-confinement-baby-bottles"),
    ).toBe(true);
    expect(
      packingItems.some(
        (item) =>
          item.category === "confinement_mom" ||
          item.category === "confinement_baby",
      ),
    ).toBe(false);
  });

  it("keeps bought home-stock items out of the packing view", () => {
    const boughtChecklist = checklist.map((item) =>
      item.id === "general-confinement-baby-crib"
        ? { ...item, status: "bought" as const }
        : item,
    );
    const packingItems = getChecklistViewItems(boughtChecklist, "packing");

    expect(
      packingItems.some((item) => item.id === "general-confinement-baby-crib"),
    ).toBe(false);
  });

  it("adds the optional adult-diaper hospital item", () => {
    const item = getChecklistItem("general-postpartum-adult-diapers");
    expect(item.priority).toBe("optional");
    expect(item.preparationKind).toBe("buy_and_pack");
  });
});
