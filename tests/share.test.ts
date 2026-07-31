import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatChecklistShareText,
  formatFamilyInviteShareText,
  formatGrowthShareText,
  shareText,
} from "@/lib/share";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sharing helpers", () => {
  it("formats family, checklist, and growth messages with their useful context", () => {
    expect(formatFamilyInviteShareText("小林家", "DAD-123")).toContain("DAD-123");
    expect(formatChecklistShareText(64)).toContain("64%");
    expect(formatGrowthShareText(24, "玉米", 64)).toContain("孕 24 周");
    expect(formatGrowthShareText(24, "玉米", 64)).toContain("玉米");
  });

  it("prefers the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    await expect(shareText("准备好了", "DadKit")).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ text: "准备好了", title: "DadKit" });
  });

  it("copies the text when native sharing is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(shareText("准备好了")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("准备好了");
  });
});
