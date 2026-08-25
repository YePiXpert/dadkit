import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CHECKLIST_VIEWS } from "@/lib/checklist-v2";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistPage = readSource("app", "checklist", "page.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const checklistItemRow = readSource("components", "ChecklistItemRow.tsx");
const checklistItemDetailsDialog = readSource(
  "components",
  "ChecklistItemDetailsDialog.tsx",
);
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
);
const checklistGroupTabs = readSource("components", "ChecklistGroupTabs.tsx");
const checklistSectionPage = readSource(
  "app",
  "checklist",
  "[sectionId]",
  "page.tsx",
);
const checklistSectionWorkspace = readSource(
  "components",
  "ChecklistSectionWorkspace.tsx",
);

describe("V2 checklist experience", () => {
  it("uses the checklist workspace on the dedicated checklist page", () => {
    expect(checklistPage).toContain("<ChecklistWorkspace />");
    expect(homePage).toContain("<HomeDashboard />");
    expect(homePage).not.toContain("ChecklistWorkspace");
    expect(checklistPage).not.toContain("getBabySexLabel");
    expect(checklistPage).not.toContain("ChecklistProgressCard");
  });

  it("shows exactly the four V2 views in a fixed mobile grid", () => {
    expect(CHECKLIST_VIEWS.map((view) => view.shortLabel)).toEqual([
      "全部",
      "待购买",
      "待装包",
      "已装包",
    ]);
    expect(checklistGroupTabs).toContain('aria-label="清单视图"');
    expect(checklistGroupTabs).toContain("grid grid-cols-4");
    expect(checklistGroupTabs).toContain("aria-pressed={active}");
    expect(checklistGroupTabs).toContain("{counts[view.id]} 项");
    expect(checklistGroupTabs).not.toContain("overflow-x-auto");
    expect(checklistGroupTabs).not.toContain("min-w-max");
  });

  it("derives visible rows, sections and counters in one V2 traversal", () => {
    expect(checklistWorkspace).toContain("deriveChecklistView");
    expect(checklistWorkspace).toContain(
      "deriveChecklistView(checklist, { mode: checklistMode, view })",
    );
    expect(checklistWorkspace).toContain(
      "const { counts, packing, sections, visibleItems }",
    );
    expect(checklistWorkspace).toContain(
      '<HeroStat label="待买" value={counts.shopping} />',
    );
    expect(checklistWorkspace).toContain(
      '<HeroStat label="待装" value={counts.packing} />',
    );
    expect(checklistWorkspace).toContain(
      '<HeroStat label="已装" value={counts.packed} />',
    );
    expect(checklistWorkspace).toContain('setView("packed")');
  });

  it("uses the four V2 states for direct, reversible item actions", () => {
    const itemInteractionSources = `${checklistItemRow}\n${checklistItemDetailsDialog}`;

    expect(checklistItemRow).toContain('todo: "待处理"');
    expect(checklistItemRow).toContain('ready: "已备好"');
    expect(checklistItemRow).toContain('packed: "已装包"');
    expect(checklistItemRow).toContain('not_needed: "不需要"');
    expect(checklistItemRow).toContain("advanceItem(item.id)");
    expect(itemInteractionSources).toContain("toggleItemSkipped(item.id)");
    expect(itemInteractionSources).toContain("标记不需要");
    expect(itemInteractionSources).toContain("恢复物品");
    expect(checklistItemRow).toContain("memo(function ChecklistItemRow");
  });

  it("keeps unrelated product routes out of the checklist UI", () => {
    const checklistSources = `${checklistWorkspace}\n${checklistItemRow}`;

    for (const route of [
      "/setup",
      "/timeline",
      "/contractions",
      "/go",
      "/birth-plan",
      "/postpartum",
      "/share",
    ]) {
      expect(checklistSources).not.toContain(`href="${route}"`);
    }

    expect(checklistItemRow).not.toContain("isHospitalConfirmation");
    expect(checklistWorkspace).not.toContain("医院规则确认");
    expect(checklistWorkspace).not.toContain("暂时没有待问事项");
  });

  it("uses touch-friendly category summaries that only link to detail pages", () => {
    expect(checklistCategoryCard).toContain('import Link from "next/link"');
    expect(checklistCategoryCard).toContain("href={href}");
    expect(checklistCategoryCard).toContain("min-w-0 flex-1");
    expect(checklistCategoryCard).toContain("break-words");
    expect(checklistCategoryCard).toContain("还差 ${remaining} 项");
    expect(checklistCategoryCard).not.toContain("ChecklistItemRow");
    expect(checklistCategoryCard).not.toContain("aria-expanded");
  });

  it("routes all stable section ids through the independent detail page", () => {
    expect(checklistSectionPage).toContain("generateStaticParams");
    expect(checklistSectionPage).toContain("isChecklistSectionId(sectionId)");
    expect(checklistWorkspace).toContain(
      "getChecklistSectionHref(section.id, query)",
    );
    expect(checklistSectionWorkspace).toContain("deriveChecklistView(checklist");
    expect(checklistSectionWorkspace).toContain(
      "sections.find((candidate) => candidate.id === sectionId)",
    );
    expect(checklistSectionWorkspace).toContain("getChecklistHomeHref(query)");
  });

  it("keeps full item explanations by default with an optional hidden mode", () => {
    expect(checklistItemRow).not.toContain("ml-[6.5rem]");
    expect(checklistItemRow).toContain("min-w-0");
    expect(checklistItemRow).not.toContain("line-clamp");
    expect(checklistItemRow).toContain("showFullDescription ? (");
    expect(checklistItemRow).toContain("size-11");
    expect(checklistItemRow).toContain("showFullDescription = true");
    expect(checklistSectionWorkspace).toContain("useChecklistDescriptionPreference");
    expect(checklistSectionWorkspace).toContain("useChecklistViewPreference");
    expect(checklistSectionWorkspace).toContain(
      'compact={viewMode === "list"}',
    );
    expect(checklistSectionWorkspace).toContain("切换为紧凑列表");
    expect(checklistSectionWorkspace).toContain("showFullDescription={showFullDescriptions}");
    expect(checklistSectionWorkspace).toContain("不截断文字");
  });

  it("does not expose slash progress counters or raw slash-separated item copy", () => {
    const checklistSources = `${checklistWorkspace}\n${checklistCategoryCard}`;
    const itemSources = `${checklistItemRow}\n${checklistItemDetailsDialog}`;

    expect(checklistSources).not.toContain("{packing.completed}/{packing.total}");
    expect(checklistSources).not.toContain("{resolved}/{items.length}");
    expect(itemSources).toContain("formatChecklistDisplayText");
  });
});
