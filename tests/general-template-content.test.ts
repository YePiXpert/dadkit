import { describe, expect, it } from "vitest";

import { generalTemplate } from "@/lib/templates/general";

function getTemplateItem(id: string) {
  const item = generalTemplate.find((candidate) => candidate.id === id);
  expect(item, `missing template item: ${id}`).toBeDefined();
  return item!;
}

describe("general checklist template", () => {
  it("contains only user-visible checklist rows", () => {
    expect(generalTemplate.length).toBeGreaterThan(0);
    expect(
      generalTemplate.some((item) => String(item.itemKind) === "question"),
    ).toBe(false);
    expect(
      generalTemplate.some(
        (item) => String(item.category) === "hospital_questions",
      ),
    ).toBe(false);
    expect(
      generalTemplate.every(
        (item) => item.itemKind === "item" || item.itemKind === "task",
      ),
    ).toBe(true);
  });

  it("keeps every physical item actionable", () => {
    const physicalItems = generalTemplate.filter(
      (item) => item.itemKind === "item",
    );

    expect(physicalItems.length).toBeGreaterThan(0);
    expect(
      physicalItems.filter((item) => !item.quantity?.trim()).map((item) => item.id),
    ).toEqual([]);
    expect(
      physicalItems.filter((item) => !item.note?.trim()).map((item) => item.id),
    ).toEqual([]);
  });

  it("has stable unique ids", () => {
    const ids = generalTemplate.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every last-minute task an explicit departure action", () => {
    const departureTasks = generalTemplate.filter(
      (item) => item.category === "last_minute" && item.itemKind === "task",
    );

    expect(departureTasks.length).toBeGreaterThan(0);
    expect(
      departureTasks
        .filter((item) => !item.note?.startsWith("出门前"))
        .map((item) => item.id),
    ).toEqual([]);
  });

  it("keeps key quantity and sizing guidance", () => {
    const laborPads = getTemplateItem("general-labor-pads");
    const laborPaper = getTemplateItem("general-labor-paper");
    const wardPads = getTemplateItem("general-postpartum-pads");
    const wardPaper = getTemplateItem("general-postpartum-paper");
    const sanitaryPads = getTemplateItem("general-postpartum-sanitary-pads");
    const underwear = getTemplateItem("general-postpartum-underwear");
    const diapers = getTemplateItem("general-baby-diapers");

    expect(laborPads.quantity).toContain("3 包");
    expect(laborPaper.quantity).toContain("2 包");
    expect(wardPads.quantity).toContain("2 包");
    expect(wardPaper.quantity).toContain("1 包");
    expect(sanitaryPads.quantity).toBe("2 包");
    expect(underwear.quantity).toContain("2 盒");
    expect(underwear.note).toContain("孕晚期腰臀围选码");
    expect(diapers.quantity).toContain("NB 码先备 1 小包");
    expect(diapers.note).toContain("宝宝体重");
  });

  it("keeps the requested documents and hospital supplies in their intended bags", () => {
    const requestedIdsByCategory = {
      documents: [
        "general-doc-health-book",
        "general-doc-prenatal-records",
        "general-doc-medical-card",
        "general-doc-id",
      ],
      mom_labor: [
        "general-labor-energy-food",
        "general-labor-snacks",
        "general-labor-power-bank",
        "general-labor-clothes",
        "general-labor-slippers",
        "general-labor-pads",
        "general-labor-paper",
        "general-labor-cup",
        "general-labor-ctg-belt",
      ],
      mom_postpartum: [
        "general-postpartum-yuezi-clothes",
        "general-postpartum-nursing-bra",
        "general-labor-socks",
        "general-postpartum-slippers",
        "general-labor-towels",
        "general-postpartum-belly-wrap",
        "general-postpartum-yuezi-hat-shoes",
        "general-postpartum-pads",
        "general-postpartum-paper",
        "general-postpartum-sanitary-pads",
        "general-postpartum-pull-up-pants",
        "general-postpartum-underwear",
        "general-postpartum-gloves",
        "general-postpartum-toilet-seat-covers",
        "general-postpartum-peri-bottle",
        "general-labor-moon-toothbrush",
        "general-postpartum-thermos",
        "general-postpartum-going-home-clothes",
        "general-labor-tissues",
      ],
      baby: [
        "general-baby-hospital-clothes",
        "general-baby-blanket",
        "general-baby-sheet",
        "general-baby-bath-basin",
        "general-baby-socks",
        "general-baby-hat",
        "general-baby-cover-blanket",
        "general-baby-towels",
        "general-baby-bath-towels",
        "general-baby-formula",
        "general-baby-formula-bottle",
        "general-baby-bottle-cleanser",
        "general-baby-bottle-brush",
        "general-baby-bottle-basin",
        "general-baby-diapers",
        "general-baby-cotton-tissues",
        "general-baby-cloud-tissues",
        "general-baby-wipes",
        "general-baby-changing-pads",
        "general-baby-diaper-cream",
        "general-baby-touch-oil",
        "general-baby-lotion",
        "general-baby-face-cream",
        "general-baby-laundry",
      ],
    } as const;

    for (const [category, ids] of Object.entries(requestedIdsByCategory)) {
      for (const id of ids) {
        const item = getTemplateItem(id);
        expect(item.category, id).toBe(category);
        expect(["core", "confirm"], id).toContain(item.packTier);
      }
    }

    expect(getTemplateItem("general-baby-bottle-basin").note).toContain(
      "普通塑料盆不能代替",
    );
  });

  it("classifies optional supplies as checklist purchases", () => {
    for (const id of ["general-postpartum-cold-pack"]) {
      const item = getTemplateItem(id);
      expect(item.priority).toBe("optional");
      expect(item.packTier).toBe("optional");
      expect(item.preparationKind).toBe("buy_and_pack");
    }

    for (const id of [
      "general-postpartum-basins",
      "general-baby-bottle-basin",
    ]) {
      const item = getTemplateItem(id);
      expect(item.packTier).toBe("confirm");
      expect(item.preparationKind).toBe("buy_and_pack");
    }

    const laundry = getTemplateItem("general-baby-laundry");
    expect(laundry.priority).toBe("optional");
    expect(laundry.packTier).toBe("confirm");
    expect(laundry.preparationKind).toBe("buy_and_pack");
  });
});
