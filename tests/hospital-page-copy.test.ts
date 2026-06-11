import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const hospitalPage = readFileSync(
  join(process.cwd(), "app", "hospital", "page.tsx"),
  "utf8",
);
const hospitalQuestionCard = readFileSync(
  join(process.cwd(), "components", "HospitalQuestionCard.tsx"),
  "utf8",
);

describe("hospital page copy", () => {
  it("uses the new hospital confirmation tab copy", () => {
    expect(hospitalPage).not.toContain("高优先级问题");
    expect(hospitalPage).not.toContain("入院路线 / 电话 / 停车");
    expect(hospitalPage).not.toContain('value="provided"');
    expect(hospitalPage).toContain("医院确认");
    expect(hospitalPage).toContain("下次产检要问");
    expect(hospitalPage).toContain("爸爸要确认");
    expect(hospitalPage).toContain("高级设置");
    expect(hospitalPage.match(/<TabsTrigger/g) ?? []).toHaveLength(3);
  });

  it("keeps confirmation items directly actionable", () => {
    expect(hospitalQuestionCard).toContain("chooseStatus");
    expect(hospitalQuestionCard).toContain("补充记录");
    expect(hospitalQuestionCard).toContain("修改记录");
    expect(hospitalQuestionCard).toContain("aria-label");
  });
});
