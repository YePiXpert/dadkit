import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);

describe("settings page copy", () => {
  it("uses the settings tabs and top description", () => {
    expect(settingsPage).toContain("<h1");
    expect(settingsPage).toContain("设置");
    expect(settingsPage).toContain(
      "数据保存在当前浏览器，可通过 JSON 或 WebDAV 手动备份。",
    );
    expect(settingsPage).toContain('value="backup"');
    expect(settingsPage).toContain('value="profile"');
    expect(settingsPage).toContain('value="advanced"');
    expect(settingsPage).toContain(">备份</TabsTrigger>");
    expect(settingsPage).toContain(">资料</TabsTrigger>");
    expect(settingsPage).toContain(">高级</TabsTrigger>");
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

  it("moves profile and high-risk settings into the right tabs", () => {
    expect(settingsPage).toContain("修改个人资料");
    expect(settingsPage).toContain("修改地区医院");
    expect(settingsPage).toContain("编辑医院信息");
    expect(settingsPage).toContain("当前数据摘要");
    expect(settingsPage).toContain("清空本地数据");
    expect(settingsPage).toContain("关于 DadKit");
    expect(settingsPage).toContain("免责声明");
    expect(settingsPage).toContain("WebDAV 凭据说明");
  });
});
