import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const settingsPage = readFileSync(
  join(process.cwd(), "app", "settings", "page.tsx"),
  "utf8",
);

describe("V2 my page", () => {
  it("presents settings as My and explains the zero-input model", () => {
    expect(settingsPage).toContain(">我的</h1>");
    expect(settingsPage).toContain("清单开箱即用，资料和工具都按需使用。");
    expect(settingsPage).not.toContain("待产清单已生成");
    expect(settingsPage).not.toContain("PageIntro");
  });

  it("keeps profile explicitly optional without clearing checklist progress", () => {
    expect(settingsPage).toContain("我的资料");
    expect(settingsPage).toContain('title={profile ? "编辑资料" : "添加可选资料"}');
    expect(settingsPage).toContain("预产期、地区、医院等均可选，不填也能正常使用");
    expect(settingsPage).toContain("可随时修改，不会清空进度");
    expect(settingsPage).toContain('href="/setup"');
    expect(settingsPage).not.toMatch(/if\s*\(\s*!profile\s*\)/);
  });

  it("is the complete directory for optional tools", () => {
    expect(settingsPage).toContain("常用工具");

    for (const [href, title] of [
      ["/hospital", "医院确认"],
      ["/timeline", "准备时间线"],
      ["/contractions", "宫缩计时"],
      ["/go", "临出门检查"],
      ["/birth-plan", "分娩偏好"],
      ["/postpartum", "产后事项"],
      ["/share", "导出分享"],
    ]) {
      expect(settingsPage).toContain(`href="${href}"`);
      expect(settingsPage).toContain(`title="${title}"`);
    }
  });

  it("keeps local and WebDAV backup controls folded into one section", () => {
    expect(settingsPage).toContain("备份与恢复");
    expect(settingsPage).toContain("最近备份");
    expect(settingsPage).toMatch(/<details[\s\S]*导入 \/ 复制 JSON/);
    expect(settingsPage).toMatch(/<details[\s\S]*WebDAV 备份/);
    expect(settingsPage).toMatch(/<details[\s\S]*连接设置/);
    expect(settingsPage).toContain(
      "浏览器请求会经 DadKit 同源代理转发。",
    );
    expect(settingsPage).not.toContain("Capacitor");
    expect(settingsPage).not.toContain("native-http");
  });

  it("keeps privacy, support and the recoverable fresh-start action", () => {
    expect(settingsPage).toContain("关于 DadKit");
    expect(settingsPage).toContain("隐私政策");
    expect(settingsPage).toContain("支持与反馈");
    expect(settingsPage).toContain("DisclaimerBox");
    expect(settingsPage).toContain("恢复通用清单");
    expect(settingsPage).toContain("恢复为全新清单");
    expect(settingsPage).toContain(
      "清除当前进度、可选资料和备份设置，并立即重新生成一份开箱即用的通用清单。",
    );
  });
});
