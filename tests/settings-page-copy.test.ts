import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);

describe("settings page copy", () => {
  it("uses a mobile app settings header and single-page sections", () => {
    expect(settingsPage).not.toContain("<PageIntro");
    expect(settingsPage).toContain("formatBabyZodiacLine");
    expect(settingsPage).toContain("getBabyMascot");
    expect(settingsPage).toContain("待产清单已生成");
    expect(settingsPage).not.toContain("安心待产清单");
    expect(settingsPage).not.toContain("专属清单");
    expect(settingsPage).not.toContain("dadkit-dad-avatar.png");
    expect(settingsPage).toContain("app-list-card");
    expect(settingsPage).toContain("SettingsShortcutRow");
    expect(settingsPage).toContain("我的资料");
    expect(settingsPage).toContain("常用小工具");
    expect(settingsPage).toContain("数据备份");
    expect(settingsPage).toContain("应用与安全");
    expect(settingsPage).toContain('href="#webdav-backup"');
    expect(settingsPage).toContain('href="#json-backup"');
    expect(settingsPage).toContain('id="local-snapshots"');
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
    expect(settingsPage).toContain("修改个人资料");
    expect(settingsPage).toContain("修改地区医院");
    expect(settingsPage).toContain("编辑医院信息");
    expect(settingsPage).toContain("当前数据摘要");
    expect(settingsPage).toContain("清空本地数据");
    expect(settingsPage).toContain("关于 DadKit");
    expect(settingsPage).toContain("免责声明");
    expect(settingsPage).toContain("WebDAV 凭据说明");
    expect(settingsPage).not.toContain("本地开发 / 未注入");
  });

  it("surfaces the complete tool directory without adding another main tab", () => {
    expect(settingsPage).toContain('id="more-tools"');
    expect(settingsPage).toContain('href="/contractions#labor-alerts"');
    expect(settingsPage).toContain("临产提醒");
    expect(settingsPage).toContain("破水/见红/胎动异常");
    expect(settingsPage).toContain("宫缩记录");
    expect(settingsPage).toContain("分娩偏好卡");
    expect(settingsPage).toContain("产后办理");
  });
});
