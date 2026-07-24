import { describe, expect, it } from "vitest";

import { generalTemplate } from "@/lib/templates/general";

function getTemplateItem(id: string) {
  const item = generalTemplate.find((candidate) => candidate.id === id);
  expect(item, `missing template item: ${id}`).toBeDefined();
  return item!;
}

describe("general template content", () => {
  it("keeps every physical item actionable", () => {
    const physicalItems = generalTemplate.filter((item) => item.itemKind === "item");

    expect(generalTemplate).toHaveLength(116);
    expect(physicalItems).toHaveLength(74);
    expect(
      physicalItems.filter((item) => !item.quantity?.trim()).map((item) => item.id),
    ).toEqual([]);
    expect(
      physicalItems.filter((item) => !item.note?.trim()).map((item) => item.id),
    ).toEqual([]);
    expect(
      physicalItems.filter((item) => !item.note?.includes("；")).map((item) => item.id),
    ).toEqual([]);
  });

  it("preserves confirmation questions without shopping copy", () => {
    const questions = generalTemplate.filter((item) => item.itemKind === "question");

    expect(questions).toHaveLength(22);
    expect(questions.every((item) => item.name.endsWith("？"))).toBe(true);
    expect(questions.filter((item) => item.note || item.quantity).map((item) => item.id)).toEqual(
      [],
    );
  });

  it("gives every last-minute task an explicit departure action", () => {
    const departureTasks = generalTemplate.filter(
      (item) => item.category === "last_minute" && item.itemKind === "task",
    );

    expect(departureTasks).toHaveLength(12);
    expect(
      departureTasks.filter((item) => !item.note?.startsWith("出门前")).map((item) => item.id),
    ).toEqual([]);
  });

  it("keeps the key quantity and sizing guidance", () => {
    const pads = getTemplateItem("general-postpartum-pads");
    const underwear = getTemplateItem("general-postpartum-underwear");
    const diapers = getTemplateItem("general-baby-diapers");

    expect(pads.quantity).toBe("10-20 片");
    expect(pads.note).toContain("六十乘九十厘米");

    expect(underwear.quantity).toContain("预计住院天数 + 2 条");
    expect(underwear.note).toContain("孕晚期实际腰臀围选码");

    expect(diapers.quantity).toContain("NB 码先备 1 小包");
    expect(diapers.note).toContain("宝宝体重");
    expect(diapers.note).toContain("决定是否换码");
  });
});
