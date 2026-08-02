import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistPage = readSource("app", "checklist", "page.tsx");
const homeDashboard = readSource("components", "HomeDashboard.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");

describe("checklist and home dashboard pages", () => {
  it("uses the checklist workspace at the dedicated checklist route", () => {
    expect(checklistPage).toContain("ChecklistWorkspace,");
    expect(checklistPage).toContain('from "@/components/ChecklistWorkspace"');
    expect(checklistPage).toContain("<ChecklistWorkspace />");
    expect(checklistPage).toContain("<Suspense");
    expect(homePage).toContain("<HomeDashboard />");
    expect(homePage).not.toContain("ChecklistWorkspace");
  });

  it("opens directly into an actionable checklist", () => {
    expect(checklistWorkspace).toContain("待产包清单");
    expect(checklistWorkspace).toContain("看一眼还差什么，准备好就打勾。");
    expect(checklistWorkspace).toContain("deriveChecklistView");
    expect(checklistWorkspace).toContain("visibleItems");
    expect(checklistWorkspace).toContain("counts");
  });

  it("surfaces departure, planning, baby and household entries on the dashboard", () => {
    expect(homeDashboard).toContain("准备出发");
    expect(homeDashboard).toContain("getDepartureProgress");
    expect(homeDashboard).toContain("DEPARTURE_PATH");
    expect(homeDashboard).toContain("项待确认");
    expect(homeDashboard).toContain("PlanningSummaryCard compact");
    expect(homeDashboard).toContain("BabyHomeCard");
    expect(homeDashboard).toContain("HouseholdFeaturePrompt");
    expect(homeDashboard).toContain("快捷入口");
    expect(homeDashboard).toContain("医院档案");
    expect(homeDashboard).toContain("宝宝成长记");
    expect(homeDashboard).toContain("useHouseholdStore");
    expect(homeDashboard).toContain("useGrowthStore");
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
