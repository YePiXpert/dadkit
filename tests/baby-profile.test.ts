import { describe, expect, it } from "vitest";

import {
  formatBabyZodiacLine,
  getBabySex,
  getChineseZodiacInfo,
} from "@/lib/baby-profile";

describe("baby profile helpers", () => {
  it("derives zodiac from the due date using Chinese New Year boundaries", () => {
    expect(getChineseZodiacInfo("2026-09-04")).toMatchObject({
      animal: "马",
      branch: "午",
      element: "火",
      lunarYear: 2026,
      stem: "丙",
    });
    expect(formatBabyZodiacLine({ babySex: "girl", dueDate: "2026-09-04" })).toBe(
      "丙午年 · 火马女宝",
    );
    expect(formatBabyZodiacLine({ babySex: "girl", dueDate: "2026-02-16" })).toBe(
      "乙巳年 · 木蛇女宝",
    );
  });

  it("falls back to neutral baby copy for missing or invalid profile values", () => {
    expect(getBabySex({ babySex: "invalid" as never })).toBe("unknown");
    expect(formatBabyZodiacLine({ dueDate: undefined })).toBe("宝宝");
  });
});
