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
    const pads = getTemplateItem("general-postpartum-pads");
    const underwear = getTemplateItem("general-postpartum-underwear");
    const diapers = getTemplateItem("general-baby-diapers");

    expect(pads.quantity).toBe("10-20 片");
    expect(pads.note).toContain("六十乘九十厘米");
    expect(underwear.quantity).toContain("预计住院天数 + 2 条");
    expect(underwear.note).toContain("孕晚期实际腰臀围选码");
    expect(diapers.quantity).toContain("NB 码先备 1 小包");
    expect(diapers.note).toContain("宝宝体重");
  });

  it("classifies optional supplies as checklist purchases", () => {
    for (const id of [
      "general-postpartum-cold-pack",
      "general-postpartum-basins",
      "general-baby-laundry",
    ]) {
      const item = getTemplateItem(id);
      expect(item.priority).toBe("optional");
      expect(item.packTier).toBe("optional");
      expect(item.preparationKind).toBe("buy_and_pack");
    }
  });
});
