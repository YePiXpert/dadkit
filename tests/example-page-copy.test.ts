import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const examplePage = readFileSync(
  join(process.cwd(), "app", "example", "page.tsx"),
  "utf8",
);

describe("example page copy", () => {
  it("makes clear that preview does not overwrite real data", () => {
    expect(examplePage).toContain("只读预览");
    expect(examplePage).toContain("不会覆盖或写入你的真实数据");
    expect(examplePage).toContain("创建我的清单");
  });
});
