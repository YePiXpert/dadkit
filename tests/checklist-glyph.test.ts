import { describe, expect, it } from "vitest";

import { getChecklistGlyphKey } from "@/components/ChecklistItemGlyph";

describe("original checklist glyph routing", () => {
  it("assigns stable semantic glyphs from item content", () => {
    expect(getChecklistGlyphKey({ category: "documents", name: "身份证件" })).toBe(
      "document",
    );
    expect(getChecklistGlyphKey({ category: "baby", name: "NB 纸尿裤" })).toBe(
      "diaper",
    );
    expect(getChecklistGlyphKey({ category: "baby", name: "备用奶瓶" })).toBe(
      "bottle",
    );
    expect(
      getChecklistGlyphKey({ category: "going_home", name: "安全座椅确认" }),
    ).toBe("car");
    expect(
      getChecklistGlyphKey({ category: "mom_postpartum", name: "一次性内裤" }),
    ).toBe("clothes");
  });
});
