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
    expect(homePage).toContain("距离预产期还剩");
    expect(homePage).toContain("今日行动 3 项");
    expect(homePage).toContain("查看全部");
    expect(homePage).toContain("整体准备进度");
    expect(homePage).toContain("dadkit-family-card-v2.png");
    expect(homePage).toContain("dadkit-bear-transparent.png");
    expect(homePage).toContain("HomeHeroCard");
    expect(homePage).toContain("TodayActionsPanel");
    expect(homePage).toContain("OverallProgressPanel");
    expect(homePage).toContain("预产期：");
    expect(homePage).toContain("建议今天完成");
    expect(homePage).not.toContain("工具宫格");
    expect(homePage).not.toContain("ToolGridLink");
    expect(homePage).not.toContain("completed/");
  });
});
