import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);
const banned = (...parts: string[]) => parts.join("");

describe("settings page copy", () => {
  it("uses a mobile app settings header without illustrations", () => {
    expect(settingsPage).not.toContain("<PageIntro");
    expect(settingsPage).toContain("formatBabyZodiacLine");
    expect(settingsPage).not.toContain("getBabyMascot");
    expect(settingsPage).toContain("待产清单已生成");
    expect(settingsPage).not.toContain(banned("安心", "待产清单"));
    expect(settingsPage).not.toContain(banned("专属", "清单"));
    expect(settingsPage).not.toContain("dadkit-dad-avatar.png");
    expect(settingsPage).not.toContain("CuteIllustration");
  });

  it("is a flat list of cards without a duplicated shortcut grid", () => {
    expect(settingsPage).toContain("资料");
    expect(settingsPage).toContain("备份与恢复");
    expect(settingsPage).toContain("关于 DadKit");
    expect(settingsPage).toContain("清空本地数据");
    expect(settingsPage).toContain("SettingsShortcutRow");
    expect(settingsPage).toContain("list-row");
    expect(settingsPage).not.toContain("SettingsDetailsSection");
    expect(settingsPage).not.toContain("应用信息");
    expect(settingsPage).not.toContain('href="#local-snapshots"');
    expect(settingsPage).not.toContain('href="#json-backup"');
    expect(settingsPage).not.toContain('href="#webdav-backup"');
    expect(settingsPage).not.toContain('href="#about-dadkit"');
    expect(settingsPage).not.toContain('href="#disclaimer"');
    expect(settingsPage).not.toContain('href="#current-data-summary"');
  });

  it("drops the low-value data summary and standalone credential note sections", () => {
    expect(settingsPage).not.toContain("当前数据摘要");
    expect(settingsPage).not.toContain('id="current-data-summary"');
    expect(settingsPage).not.toContain('id="webdav-credentials"');
    expect(settingsPage).not.toContain("WebDAV 凭据说明");
    expect(settingsPage).not.toContain("清单模式");
  });

  it("keeps backup tools folded inside the backup card", () => {
    expect(settingsPage).toMatch(/<details[\s\S]*导入 \/ 复制 JSON/);
    expect(settingsPage).toMatch(/<details[\s\S]*WebDAV 备份/);
    expect(settingsPage).toMatch(/<details[\s\S]*连接设置/);
    expect(settingsPage).toContain("最近备份");
    expect(settingsPage).toContain("查看全部备份");
    expect(settingsPage).toContain("const recentSnapshots = snapshots.slice(0, 2)");
    expect(settingsPage).toContain("recentSnapshots.map");
  });

  it("keeps profile, about and danger-zone entries", () => {
    expect(settingsPage).toContain("编辑资料");
    expect(settingsPage).toContain("修改地区医院");
    expect(settingsPage).toContain("DisclaimerBox");
    expect(settingsPage).toContain("隐私政策");
    expect(settingsPage).toContain("支持与反馈");
    expect(settingsPage).toContain("getReviewPageHref(PUBLIC_PRIVACY_PATH)");
    expect(settingsPage).toContain("getReviewPageHref(PUBLIC_SUPPORT_PATH)");
    expect(settingsPage).toContain("清空本地数据");
    expect(settingsPage).not.toContain("本地开发 / 未注入");
  });

  it("does not use settings as a tool directory", () => {
    expect(settingsPage).not.toContain('id="more-tools"');
    expect(settingsPage).not.toContain('href="/contractions#labor-alerts"');
    expect(settingsPage).not.toContain('href="/contractions"');
    expect(settingsPage).not.toContain('href="/birth-plan"');
    expect(settingsPage).not.toContain('href="/postpartum"');
    expect(settingsPage).not.toContain("临产提醒");
    expect(settingsPage).not.toContain("宫缩记录");
    expect(settingsPage).not.toContain("分娩偏好卡");
    expect(settingsPage).not.toContain("产后办理");
    expect(settingsPage).not.toContain("常用小工具");
    expect(settingsPage).not.toContain("完整工具目录");
    expect(settingsPage).not.toContain("TabsTrigger");
  });
});
