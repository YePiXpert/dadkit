import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

const retiredComponents = [
  "components/BulkPlanningDialog.tsx",
  "components/ItemPlanningDialog.tsx",
  "components/PlanningItemRow.tsx",
  "components/PlanningSummaryCard.tsx",
  "components/PlanningWorkspace.tsx",
  "components/household/MemberMultiSelect.tsx",
];

describe("retired planning product surface", () => {
  it("removes every user-facing planning entry and editor", () => {
    const visibleSources = [
      source("components/HomeDashboard.tsx"),
      source("components/ChecklistItemDetailsDialog.tsx"),
      source("app/tools/page.tsx"),
    ].join("\n");

    expect(visibleSources).not.toContain("家庭分工");
    expect(visibleSources).not.toContain("分工与采购");
    expect(visibleSources).not.toContain('href: "/planning"');
    expect(visibleSources).not.toContain("ItemPlanningDialog");

    for (const component of retiredComponents) {
      expect(existsSync(join(process.cwd(), component))).toBe(false);
    }
  });

  it("redirects stale planning links to the tools hub", () => {
    const page = source("app/planning/page.tsx");

    expect(page).toContain('redirect("/tools")');
    expect(page).not.toContain("PlanningWorkspace");
  });

  it("keeps six useful dashboard shortcuts after retirement", () => {
    const home = source("components/HomeDashboard.tsx");

    expect(home).toContain('href: "/settings/backup"');
    expect(home).toContain('title: "备份与恢复"');
  });
});
