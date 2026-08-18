import { readFileSync } from "node:fs";
import { join } from "node:path";

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

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

describe("sharing helpers", () => {
  it("formats family, checklist, and growth messages with their useful context", () => {
    const invite = formatFamilyInviteShareText(
      "小林家",
      "https://dadkit.example/join?token=abc123",
      "ABCD-2345",
    );
    expect(invite).toContain("小林家");
    expect(invite).toContain("https://dadkit.example/join?token=abc123");
    expect(invite).toContain("ABCD-2345");
    expect(invite).toContain("同一条一次性邀请");
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

describe("share entry points", () => {
  it("wires celebration, growth and family invites through the shared helper", () => {
    const celebration = readSource("components", "CelebrationOverlay.tsx");
    const growth = readSource("components", "GrowthWorkspace.tsx");
    const syncSettings = readSource(
      "components",
      "sync",
      "SyncSettingsWorkspace.tsx",
    );

    expect(celebration).toContain(
      "shareText(formatChecklistShareText(packingPercent))",
    );
    expect(celebration).toContain("分享给家人");
    expect(growth).toContain("formatGrowthShareText(");
    expect(growth).toContain("分享本周");
    expect(syncSettings).toContain("formatFamilyInviteShareText(");
    expect(syncSettings).toContain("shareText(");
    expect(syncSettings).not.toContain("navigator.share");
  });
});
