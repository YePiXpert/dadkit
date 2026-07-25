import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);

const REMOVED_PRODUCT_ROUTES = [
  "/setup",
  "/hospital",
  "/timeline",
  "/contractions",
  "/go",
  "/birth-plan",
  "/postpartum",
  "/share",
] as const;

describe("data and backup page", () => {
  it("presents the second product surface as data and backup", () => {
    expect(settingsPage).toContain(">数据与备份</h1>");
    expect(settingsPage).toContain("清单默认只保存在这个浏览器");
    expect(settingsPage).toContain("JSON");
    expect(settingsPage).toContain("WebDAV");
    expect(settingsPage).not.toContain(">我的</h1>");
  });

  it("contains only the four data-management capabilities", () => {
    expect(settingsPage).toContain("手动备份");
    expect(settingsPage).toContain("复制 JSON");
    expect(settingsPage).toContain("导入 JSON");
    expect(settingsPage).toContain("本机恢复点");
    expect(settingsPage).toContain("最多保留 5 份");
    expect(settingsPage).toContain("WebDAV 备份");
    expect(settingsPage).toContain("清空并重新开始");
  });

  it("has no profile or removed-tool entry points", () => {
    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(settingsPage).not.toContain(`href="${route}"`);
    }

    expect(settingsPage).not.toContain("我的资料");
    expect(settingsPage).not.toContain("常用工具");
    expect(settingsPage).not.toContain("formatBabyZodiacLine");
    expect(settingsPage).not.toContain("state.profile");
  });

  it("keeps destructive actions recoverable and feedback accessible", () => {
    expect(settingsPage).toContain("操作前会先创建恢复点");
    expect(settingsPage).toContain("恢复点只在当前浏览器中");
    expect(settingsPage).toContain('aria-live="polite"');
    expect(settingsPage).toContain('role={ok === false ? "alert" : "status"}');
  });

  it("keeps privacy and support as subordinate data-page links", () => {
    expect(settingsPage).toContain("PUBLIC_PRIVACY_PATH");
    expect(settingsPage).toContain("PUBLIC_SUPPORT_PATH");
    expect(settingsPage).toContain("隐私说明");
    expect(settingsPage).toContain("支持与反馈");
  });
});
