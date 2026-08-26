import { describe, expect, it } from "vitest";

import { getCelebrationCopy } from "@/components/CelebrationOverlay";

describe("getCelebrationCopy", () => {
  it("keeps the full-packing copy for the complete variant", () => {
    expect(getCelebrationCopy("complete")).toEqual({
      title: "待产包已经准备完成！",
      description: "辛苦了，随时可以安心出发。",
    });
  });

  it("names the finished section for the section variant", () => {
    expect(getCelebrationCopy("section", { sectionLabel: "产房包" }).title).toBe(
      "产房包已经装好！",
    );
    expect(getCelebrationCopy("section").title).toContain("这个分类");
  });

  it("greets the baby by nickname for the birth variant", () => {
    expect(getCelebrationCopy("birth", { babyName: " 年年 " }).title).toBe(
      "年年出生了！",
    );
    expect(getCelebrationCopy("birth", { babyName: " " }).title).toBe("宝宝出生了！");
    expect(getCelebrationCopy("birth").title).toBe("宝宝出生了！");
  });
});