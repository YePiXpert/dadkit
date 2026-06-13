import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const checklistPage = readFileSync(
  join(process.cwd(), "app", "checklist", "page.tsx"),
  "utf8",
);
const checklistItemRow = readFileSync(
  join(process.cwd(), "components", "ChecklistItemRow.tsx"),
  "utf8",
);
const checklistCategoryCard = readFileSync(
  join(process.cwd(), "components", "ChecklistCategoryCard.tsx"),
  "utf8",
);
const checklistGroupTabs = readFileSync(
  join(process.cwd(), "components", "ChecklistGroupTabs.tsx"),
  "utf8",
);

describe("checklist page copy", () => {
  it("does not render the large unverified hospital warning", () => {
    expect(checklistPage).not.toContain("该医院模板尚未核验");
    expect(checklistPage).not.toContain("最近一次产检、入院须知或医院通知");
  });

  it("links confirmation rows to the hospital confirmation workflow", () => {
    expect(checklistItemRow).toContain("isHospitalConfirmation");
    expect(checklistItemRow).toContain('href="/hospital"');
    expect(checklistItemRow).toContain("去确认");
  });

  it("keeps checklist controls in the normal page flow", () => {
    expect(checklistPage).toContain("清单工作台");
    expect(checklistPage).toContain("筛选与操作");
    expect(checklistPage).toContain("ChecklistProgressCard");
    expect(checklistPage).toContain("分类入口");
    expect(checklistPage).toContain("当前没有待购买物品");
    expect(checklistPage).toContain("暂时没有待问事项");
    expect(checklistPage).not.toContain("PageIntro");
    expect(checklistPage).not.toContain("sticky top-0");
    expect(checklistPage).not.toContain("z-30");
    expect(checklistPage).not.toContain("backdrop-blur");
  });

  it("keeps checklist view choices visible without an embedded horizontal scroller", () => {
    expect(checklistGroupTabs).toContain("grid grid-cols-2");
    expect(checklistGroupTabs).toContain("min-h-[4.75rem]");
    expect(checklistGroupTabs).toContain("ChecklistGroupIcon");
    expect(checklistGroupTabs).toContain("<svg");
    expect(checklistGroupTabs).toContain("未完成 {count.remaining} 项");
    expect(checklistPage).toContain("groupCounts");
    expect(checklistGroupTabs).not.toContain("overflow-x-auto");
    expect(checklistGroupTabs).not.toContain("min-w-max");
    expect(checklistPage).not.toContain("SlidersHorizontal");
  });

  it("memoizes checklist rows for item-level updates", () => {
    expect(checklistItemRow).toContain("memo(function ChecklistItemRow");
    expect(checklistItemRow).toContain("ChecklistItemRow.displayName");
  });

  it("uses app-like category cards and stable action rows", () => {
    expect(checklistCategoryCard).toContain("app-list-row");
    expect(checklistCategoryCard).toContain("app-icon-tile");
    expect(checklistCategoryCard).toContain("completion.percent");
    expect(checklistCategoryCard).toContain("未完成");
    expect(checklistItemRow).toContain("flex-wrap items-center justify-end");
    expect(checklistItemRow).toContain("sm:flex-nowrap");
    expect(checklistItemRow).toContain("shrink-0");
  });
});
