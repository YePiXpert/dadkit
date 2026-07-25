import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");

describe("checklist home page", () => {
  it("uses the checklist workspace at the root route", () => {
    expect(homePage).toContain("ChecklistWorkspace,");
    expect(homePage).toContain('from "@/components/ChecklistWorkspace"');
    expect(homePage).toContain("<ChecklistWorkspace />");
    expect(homePage).toContain("<Suspense");
  });

  it("opens directly into an actionable checklist", () => {
    expect(checklistWorkspace).toContain("待产包清单");
    expect(checklistWorkspace).toContain("看一眼还差什么，准备好就打勾。");
    expect(checklistWorkspace).toContain("getChecklistViewItems");
    expect(checklistWorkspace).toContain("getChecklistViewCounts");
  });

  it("does not depend on optional profile or removed tools", () => {
    expect(checklistWorkspace).not.toContain("state.profile");
    expect(checklistWorkspace).not.toContain("profile?.");
    expect(checklistWorkspace).not.toContain('href="/setup"');
    expect(checklistWorkspace).not.toContain('href="/hospital"');
    expect(checklistWorkspace).not.toContain("getPregnancyProgress");
    expect(checklistWorkspace).not.toContain("getCountdownLabel");
  });

  it("does not restore the former dashboard model", () => {
    const homeSources = `${homePage}\n${checklistWorkspace}`;

    expect(homeSources).not.toContain("buildPreparationSummary");
    expect(homeSources).not.toContain("PREPARATION_MODULE_WEIGHTS");
    expect(homeSources).not.toContain("HomeHeroCard");
    expect(homeSources).not.toContain("TodayFocusPanel");
    expect(homeSources).not.toContain("ReadinessMetricsPanel");
  });

  it("keeps the safety boundary once", () => {
    expect(
      checklistWorkspace.match(/清单是准备参考，不替代医院通知或医疗建议。/g) ?? [],
    ).toHaveLength(1);
  });
});
