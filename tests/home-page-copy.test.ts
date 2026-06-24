import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const homePage = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
const banned = (...parts: string[]) => parts.join("");

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
    expect(homePage).not.toContain(banned("女宝", "倒计时"));
    expect(homePage).toContain("方案已生成");
    expect(homePage).toContain("HomePlanReadyPanel");
    expect(homePage).toContain("HomePlanLink");
    expect(homePage).toContain('href: "/share"');
    expect(homePage).toContain("今日重点");
    expect(homePage).not.toContain(banned("姐妹", "今天先做"));
    expect(homePage).toContain("当前优先");
    expect(homePage).toContain("准备节奏");
    expect(homePage).toContain("入院准备");
    expect(homePage).not.toContain("dadkit-family-card-v2.png");
    expect(homePage).not.toContain("dadkit-bear-transparent.png");
    expect(homePage).toContain("HomeHeroCard");
    expect(homePage).toContain("TodayFocusPanel");
    expect(homePage).toContain("ReadinessMetricsPanel");
    expect(homePage).toContain("HomeToolsPanel");
    expect(homePage).toContain("HomeToolLink");
    expect(homePage).toContain("HomeLaborModePanel");
    expect(homePage).toContain('href="/go"');
    expect(homePage).toContain("快捷操作");
    expect(homePage).not.toContain("常用入口");
    expect(homePage).not.toContain("全部工具");
    expect(homePage).toContain("宫缩记录");
    expect(homePage).toContain("入院沟通");
    expect(homePage).toContain("临出门检查");
    expect(homePage).not.toContain("产后办理");
    expect(homePage).not.toContain('href="/settings#more-tools"');
    expect(homePage).not.toContain("HomeAppHeader");
    expect(homePage).not.toContain("dadkit-dad-avatar.png");
    expect(homePage).toContain("formatHomeDueDate");
    expect(homePage).not.toContain(banned("建议", "今天完成"));
    expect(homePage).not.toContain(banned("临产", "模式"));
    expect(homePage).not.toContain("工具宫格");
    expect(homePage).not.toContain("ToolGridLink");
    expect(homePage).not.toContain("completed/");
  });
});
