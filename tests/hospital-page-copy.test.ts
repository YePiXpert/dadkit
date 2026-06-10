import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const hospitalPage = readFileSync(
  join(process.cwd(), "app", "hospital", "page.tsx"),
  "utf8",
);

describe("hospital page copy", () => {
  it("uses the new hospital confirmation tab copy", () => {
    expect(hospitalPage).not.toContain("高优先级问题");
    expect(hospitalPage).not.toContain("入院路线 / 电话 / 停车");
    expect(hospitalPage).toContain("医院确认");
    expect(hospitalPage).toContain("下次产检要问");
    expect(hospitalPage).toContain("爸爸要确认");
  });
});

