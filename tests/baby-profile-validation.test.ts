import { describe, expect, it } from "vitest";

import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { isBabyProfilePortableData, normalizeBabyText, validateBabyProfileDraft } from "@/lib/baby/validation";

describe("baby profile validation", () => {
  it("accepts a valid leap-day profile", () => {
    const result = validateBabyProfileDraft({ nickname: " 小满 ", birthDate: "2024-02-29", birthTime: "08:06", sex: "girl" }, { today: "2026-08-02" });
    expect(result.ok).toBe(true);
    expect(result.values.nickname).toBe("小满");
  });

  it("requires birth date and rejects future or invalid calendar dates", () => {
    expect(validateBabyProfileDraft({ nickname: "", birthDate: "", birthTime: "", sex: "unspecified" }, { today: "2026-08-02" }).ok).toBe(false);
    expect(validateBabyProfileDraft({ nickname: "", birthDate: "2026-08-03", birthTime: "", sex: "unspecified" }, { today: "2026-08-02" }).ok).toBe(false);
    expect(validateBabyProfileDraft({ nickname: "", birthDate: "2026-02-30", birthTime: "", sex: "unspecified" }, { today: "2026-08-02" }).ok).toBe(false);
  });

  it("rejects invalid time and long nickname while removing controls", () => {
    expect(validateBabyProfileDraft({ nickname: "宝宝", birthDate: "2026-08-02", birthTime: "24:00", sex: "boy" }, { today: "2026-08-02" }).ok).toBe(false);
    expect(validateBabyProfileDraft({ nickname: "a".repeat(41), birthDate: "2026-08-02", birthTime: "", sex: "boy" }, { today: "2026-08-02" }).ok).toBe(false);
    expect(normalizeBabyText(" 宝\u0000宝 ")).toBe("宝宝");
  });

  it("strictly rejects unknown fields and invalid timestamps without mutation", () => {
    const profile = createEmptyBabyProfile();
    const before = structuredClone(profile);
    expect(isBabyProfilePortableData({ ...profile, unknown: true })).toBe(false);
    expect(isBabyProfilePortableData({ ...profile, clearedAt: -1 })).toBe(false);
    expect(profile).toEqual(before);
  });
});
