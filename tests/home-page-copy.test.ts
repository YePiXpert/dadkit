import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");

describe("V2 home page", () => {
  it("uses the checklist workspace at the root route", () => {
    expect(homePage).toContain(
      'import { ChecklistWorkspace } from "@/components/ChecklistWorkspace"',
    );
    expect(homePage).toContain("return <ChecklistWorkspace />");
  });

  it("opens directly into an actionable checklist without requiring profile data", () => {
    expect(checklistWorkspace).toContain("待产包清单");
    expect(checklistWorkspace).toContain("看一眼还差什么，准备好就打勾。");
    expect(checklistWorkspace).toContain("getChecklistViewItems");
    expect(checklistWorkspace).toContain("getChecklistViewCounts");
    expect(checklistWorkspace).toContain(
      "预产期可选：填写后开启孕周、时间线和证件提醒",
    );
    expect(checklistWorkspace).not.toMatch(/if\s*\(\s*!profile\s*\)/);
  });

  it("does not restore the dashboard or four-pillar readiness model", () => {
    const homeSources = `${homePage}\n${checklistWorkspace}`;

    expect(homeSources).not.toContain("buildPreparationSummary");
    expect(homeSources).not.toContain("PREPARATION_MODULE_WEIGHTS");
    expect(homeSources).not.toContain("HomeHeroCard");
    expect(homeSources).not.toContain("TodayFocusPanel");
    expect(homeSources).not.toContain("ReadinessMetricsPanel");
    expect(homeSources).not.toContain("今日重点");
    expect(homeSources).not.toContain("四根柱子");
  });

  it("keeps the safety boundary with the checklist instead of duplicating it", () => {
    expect(
      checklistWorkspace.match(/清单是准备参考，不替代医院通知或医疗建议。/g) ?? [],
    ).toHaveLength(1);
  });
});
