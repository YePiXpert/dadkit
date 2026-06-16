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
  it("uses the app-like hospital confirmation list copy", () => {
    expect(hospitalPage).not.toContain("高优先级问题");
    expect(hospitalPage).not.toContain("入院路线 / 电话 / 停车");
    expect(hospitalPage).not.toContain('value="provided"');
    expect(hospitalPage).toContain("医院规则");
    expect(hospitalPage).toContain(
      "入院流程、医院提供物品、陪产和缴费信息提前确认",
    );
    expect(hospitalPage).toContain("医院规则确认表");
    expect(hospitalPage).toContain("下一项先确认");
    expect(hospitalPage).toContain("家人要确认");
    expect(hospitalPage).toContain("高级设置");
    expect(hospitalPage).toContain("lg:grid-cols-[1.15fr_0.85fr]");
    expect(hospitalPage).toContain("macaron-panel p-4");
    expect(hospitalPage).not.toContain("TabsTrigger");
    expect(hospitalPage).not.toContain("TabsList");
  });

  it("keeps confirmation items directly actionable", () => {
    expect(hospitalQuestionCard).toContain("chooseStatus");
    expect(hospitalQuestionCard).toContain("补充记录");
    expect(hospitalQuestionCard).toContain("修改记录");
    expect(hospitalQuestionCard).toContain("aria-label");
  });
});
