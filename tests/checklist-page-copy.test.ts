import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const checklistPage = readFileSync(
  join(process.cwd(), "app", "checklist", "page.tsx"),
  "utf8",
);

describe("checklist page copy", () => {
  it("does not render the large unverified hospital warning", () => {
    expect(checklistPage).not.toContain("该医院模板尚未核验");
    expect(checklistPage).not.toContain("最近一次产检、入院须知或医院通知");
  });
});
