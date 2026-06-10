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
    expect(homePage).toContain("打开我的清单");
    expect(homePage).toContain("医院确认");
    expect(homePage).toContain("爸爸执行版");
    expect(homePage).toContain("查看示例");
    expect(homePage).toContain("不影响当前数据");
    expect(homePage).toContain("核心打包");
    expect(homePage).toContain("医院待问");
    expect(homePage).toContain("临出门");
    expect(homePage).not.toContain("completed/");
    expect(homePage).not.toContain("total");
  });
});
