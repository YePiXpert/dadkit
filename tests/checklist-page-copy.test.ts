import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CHECKLIST_VIEWS } from "@/lib/checklist-v2";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const homePage = readSource("app", "page.tsx");
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const checklistItemRow = readSource("components", "ChecklistItemRow.tsx");
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
);
const checklistGroupTabs = readSource("components", "ChecklistGroupTabs.tsx");

describe("V2 checklist experience", () => {
  it("uses the checklist workspace as the only home implementation", () => {
    expect(homePage).toContain("<ChecklistWorkspace />");
    expect(homePage).not.toContain("getBabySexLabel");
    expect(homePage).not.toContain("ChecklistProgressCard");
  });

  it("shows exactly the three V2 views in a fixed mobile grid", () => {
    expect(CHECKLIST_VIEWS.map((view) => view.shortLabel)).toEqual([
      "全部",
      "待购买",
      "待装包",
    ]);
    expect(checklistGroupTabs).toContain('aria-label="清单视图"');
    expect(checklistGroupTabs).toContain("grid grid-cols-3");
    expect(checklistGroupTabs).toContain("aria-pressed={active}");
    expect(checklistGroupTabs).toContain("{counts[view.id]} 项");
    expect(checklistGroupTabs).not.toContain("overflow-x-auto");
    expect(checklistGroupTabs).not.toContain("min-w-max");
  });

  it("derives visible rows, sections and counters from the same V2 selectors", () => {
    expect(checklistWorkspace).toContain("getChecklistViewCounts(modeItems)");
    expect(checklistWorkspace).toContain("getChecklistViewItems(modeItems, view)");
    expect(checklistWorkspace).toContain("groupChecklistViewItems(visibleItems)");
    expect(checklistWorkspace).toContain("待买 {counts.shopping}");
    expect(checklistWorkspace).toContain("待装 {counts.packing}");
    expect(checklistWorkspace).toContain("共 {counts.all} 项");
  });

  it("uses the four V2 states for direct, reversible item actions", () => {
    expect(checklistItemRow).toContain('todo: "待处理"');
    expect(checklistItemRow).toContain('ready: "已备好"');
    expect(checklistItemRow).toContain('packed: "已装包"');
    expect(checklistItemRow).toContain('not_needed: "不需要"');
    expect(checklistItemRow).toContain("advanceItem(item.id)");
    expect(checklistItemRow).toContain("toggleItemSkipped(item.id)");
    expect(checklistItemRow).toContain("标记不需要");
    expect(checklistItemRow).toContain("恢复物品");
    expect(checklistItemRow).toContain("memo(function ChecklistItemRow");
  });

  it("keeps tools and hospital questions out of the main checklist rows", () => {
    expect(checklistItemRow).not.toContain('href="/hospital"');
    expect(checklistItemRow).not.toContain("isHospitalConfirmation");
    expect(checklistWorkspace).not.toContain("医院规则确认");
    expect(checklistWorkspace).not.toContain("暂时没有待问事项");
  });

  it("uses collapsible, touch-friendly category cards", () => {
    expect(checklistCategoryCard).toContain("aria-expanded={open}");
    expect(checklistCategoryCard).toContain("min-w-0 flex-1");
    expect(checklistCategoryCard).toContain("break-words");
    expect(checklistCategoryCard).toContain("还剩 ${remaining} 项");
    expect(checklistCategoryCard).toContain("这一包已完成");
  });
});
