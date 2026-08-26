import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistPage = readSource("app", "checklist", "page.tsx");
const homeDashboard = readSource("components", "HomeDashboard.tsx");
const homeDashboardFeatures = [
  homeDashboard,
  readSource("components", "HomeStagePanel.tsx"),
  readSource("components", "HomeProgressPanel.tsx"),
].join("\n");
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
    expect(checklistWorkspace).toContain("产房、病房分开装，入院时更从容。");
    expect(checklistWorkspace).toContain("住院分包");
    expect(checklistWorkspace).toContain("后续准备");
    expect(checklistWorkspace).toContain("deriveChecklistView");
    expect(checklistWorkspace).toContain("visibleItems");
    expect(checklistWorkspace).toContain("counts");
  });

  it("leads with the pregnancy stage header and a quick-entry grid", () => {
    expect(homeDashboardFeatures).toContain("BabyHomeCard");
    expect(homeDashboardFeatures).toContain("GrowthAnalogyIllustration");
    expect(homeDashboardFeatures).toContain("距预产期");
    expect(homeDashboardFeatures).toContain("设置预产期");
    expect(homeDashboardFeatures).toContain("出生第");
    expect(homeDashboard).toContain("mobile-shell grid gap-4 sm:max-w-[42rem]");
    expect(homeDashboardFeatures).toContain("useGrowthStore");

    for (const href of ["/growth", "/baby", "/departure", "/settings/backup"]) {
      expect(homeDashboard).toContain(`href: "${href}"`);
    }
    expect(homeDashboard).toContain("CHECKLIST_PATH");
    expect(homeDashboard).not.toContain("PlanningSummaryCard");
    expect(homeDashboard).not.toContain('href: "/planning"');
    expect(homeDashboard).not.toContain('href: "/hospital"');

    expect(homeDashboardFeatures).not.toContain("getDepartureProgress");
    expect(homeDashboardFeatures).not.toContain("全部工具");
    expect(homeDashboardFeatures).not.toContain('href="/tools"');
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
