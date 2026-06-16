import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homePage = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");

describe("home page copy", () => {
  it("does not show the old compact-mode badge or duplicate disclaimer", () => {
    expect(homePage).not.toContain("精简模式");
    expect(homePage).not.toContain("DisclaimerBox");
    expect(homePage.match(/非医疗建议/g) ?? []).toHaveLength(1);
  });

  it("uses the focused home actions and low-anxiety metrics", () => {
    expect(homePage).toContain("生成待产包清单");
    expect(homePage).not.toContain("查看示例");
    expect(homePage).not.toContain('href="/example"');
    expect(homePage).toContain("formatBabyZodiacLine");
    expect(homePage).toContain("getBabyMascot");
    expect(homePage).toContain("预产期倒计时");
    expect(homePage).not.toContain("女宝倒计时");
    expect(homePage).toContain("今日优先");
    expect(homePage).not.toContain("姐妹今天先做");
    expect(homePage).toContain("当前优先");
    expect(homePage).toContain("查看全部");
    expect(homePage).toContain("准备进度");
    expect(homePage).not.toContain("dadkit-family-card-v2.png");
    expect(homePage).toContain("dadkit-bear-transparent.png");
    expect(homePage).toContain("HomeHeroCard");
    expect(homePage).toContain("TodayActionsPanel");
    expect(homePage).toContain("OverallProgressPanel");
    expect(homePage).toContain("HomeToolsPanel");
    expect(homePage).toContain("HomeToolLink");
    expect(homePage).toContain("HomeLaborModePanel");
    expect(homePage).toContain('href="/go"');
    expect(homePage).toContain("常用入口");
    expect(homePage).toContain("全部工具");
    expect(homePage).not.toContain("全部工具在我的");
    expect(homePage).toContain("宫缩记录");
    expect(homePage).toContain("分娩偏好卡");
    expect(homePage).toContain("产后办理");
    expect(homePage).toContain('href="/settings#more-tools"');
    expect(homePage).not.toContain("HomeAppHeader");
    expect(homePage).not.toContain("dadkit-dad-avatar.png");
    expect(homePage).toContain("formatHomeDueDate");
    expect(homePage).not.toContain("建议今天完成");
    expect(homePage).not.toContain("临产模式");
    expect(homePage).not.toContain("工具宫格");
    expect(homePage).not.toContain("ToolGridLink");
    expect(homePage).not.toContain("completed/");
  });
});
