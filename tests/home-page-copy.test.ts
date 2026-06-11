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
    expect(homePage).toContain("创建清单");
    expect(homePage).not.toContain("查看示例");
    expect(homePage).not.toContain('href="/example"');
    expect(homePage).toContain("医院确认");
    expect(homePage).toContain("时间线");
    expect(homePage).toContain("临出门");
    expect(homePage).toContain("备份/设置");
    expect(homePage).toContain("今天该做");
    expect(homePage).toContain("当前阶段");
    expect(homePage).not.toContain("宫缩记录\" />");
    expect(homePage).not.toContain("分娩偏好卡\" />");
    expect(homePage).toContain("核心打包");
    expect(homePage).toContain("医院待问");
    expect(homePage).toContain("临出门");
    expect(homePage).not.toContain("completed/");
    expect(homePage).not.toContain("total");
  });
});
