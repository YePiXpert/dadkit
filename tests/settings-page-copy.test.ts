import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);
const banned = (...parts: string[]) => parts.join("");

describe("settings page copy", () => {
  it("uses a mobile app settings header and single-page sections", () => {
    expect(settingsPage).not.toContain("<PageIntro");
    expect(settingsPage).toContain("formatBabyZodiacLine");
    expect(settingsPage).not.toContain("getBabyMascot");
    expect(settingsPage).toContain("待产清单已生成");
    expect(settingsPage).not.toContain(banned("安心", "待产清单"));
    expect(settingsPage).not.toContain(banned("专属", "清单"));
    expect(settingsPage).not.toContain("dadkit-dad-avatar.png");
    expect(settingsPage).toContain("list-row");
    expect(settingsPage).toContain("SettingsShortcutRow");
    expect(settingsPage).toContain("资料");
    expect(settingsPage).toContain("备份与恢复");
    expect(settingsPage).toContain("应用信息");
    expect(settingsPage).toContain("SettingsDetailsSection");
    expect(settingsPage).not.toContain("常用小工具");
    expect(settingsPage).not.toContain("完整工具目录");
    expect(settingsPage).toContain('href="#webdav-backup"');
    expect(settingsPage).toContain('href="#json-backup"');
    expect(settingsPage).toContain('href="#current-data-summary"');
    expect(settingsPage).toContain("getReviewPageHref(PUBLIC_PRIVACY_PATH)");
    expect(settingsPage).toContain("getReviewPageHref(PUBLIC_SUPPORT_PATH)");
    expect(settingsPage).toContain('id="local-snapshots"');
    expect(settingsPage).toContain('id="disclaimer"');
    expect(settingsPage).toContain('id="webdav-credentials"');
    expect(settingsPage).toContain("<details");
    expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="最近备份"/);
    expect(settingsPage).toMatch(/<SettingsDetailsSection[\s\S]*title="WebDAV 备份"/);
    expect(settingsPage).not.toContain('<Card className="macaron-panel" id="local-snapshots"');
    expect(settingsPage).not.toContain("TabsTrigger");
  });

  it("shows only two recent backups before the full backup details", () => {
    expect(settingsPage).toContain("const recentSnapshots = snapshots.slice(0, 2)");
    expect(settingsPage).toContain("recentSnapshots.map");
    expect(settingsPage).toContain("查看全部备份");
  });

  it("keeps JSON and WebDAV connection settings folded by default", () => {
    expect(settingsPage).toMatch(/<details[\s\S]*导入 \/ 复制 JSON/);
    expect(settingsPage).toMatch(/<details[\s\S]*连接设置/);
  });

  it("keeps profile and high-risk settings visible in the settings list", () => {
    expect(settingsPage).toContain("编辑资料");
    expect(settingsPage).toContain("修改地区医院");
    expect(settingsPage).toContain("当前数据摘要");
    expect(settingsPage).toContain("清空本地数据");
    expect(settingsPage).toContain("关于 DadKit");
    expect(settingsPage).toContain("免责声明");
    expect(settingsPage).toContain("隐私政策");
    expect(settingsPage).toContain("支持与反馈");
    expect(settingsPage).toContain("WebDAV 凭据说明");
    expect(settingsPage).not.toContain("本地开发 / 未注入");
  });

  it("does not use My as a tool directory", () => {
    expect(settingsPage).not.toContain('id="more-tools"');
    expect(settingsPage).not.toContain('href="/contractions#labor-alerts"');
    expect(settingsPage).not.toContain('href="/contractions"');
    expect(settingsPage).not.toContain('href="/birth-plan"');
    expect(settingsPage).not.toContain('href="/postpartum"');
    expect(settingsPage).not.toContain("临产提醒");
    expect(settingsPage).not.toContain("宫缩记录");
    expect(settingsPage).not.toContain("分娩偏好卡");
    expect(settingsPage).not.toContain("产后办理");
  });
});
