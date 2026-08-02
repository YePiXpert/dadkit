import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

const workspace = source("components/PlanningWorkspace.tsx");
const summary = source("components/PlanningSummaryCard.tsx");
const row = source("components/PlanningItemRow.tsx");
const dialog = source("components/ItemPlanningDialog.tsx");
const bulk = source("components/BulkPlanningDialog.tsx");
const details = source("components/ChecklistItemDetailsDialog.tsx");
const checklist = source("components/ChecklistWorkspace.tsx");

describe("planning product surface", () => {
  it("adds a compact home entry without replacing departure", () => {
    expect(checklist).toContain("PlanningSummaryCard compact");
    expect(checklist).toContain("DEPARTURE_PATH");
    expect(summary).toContain("家庭分工与采购");
    expect(summary).toContain("已经超过完成期限");
  });

  it("shows required summary metrics without misleading overspend copy", () => {
    for (const label of ["未分工", "已逾期", "未来 7 天", "预计总额", "实际已记录总额", "已覆盖"]) {
      expect(summary).toContain(label);
    }
    expect(summary).not.toContain("超支");
  });

  it("supports search, filters, assignees and optional not-needed rows", () => {
    for (const copy of ["搜索物品名称或备注", "未分工", "已逾期", "未来 7 天", "已填写预计价格", "已填写实际价格", "全部负责人", "包括“不需要”的物品"]) {
      expect(workspace).toContain(copy);
    }
  });

  it("uses a compact planning row rather than checklist artwork", () => {
    expect(row).toContain("getPlanningAssigneeLabel");
    expect(row).toContain("CATEGORY_LABELS");
    expect(row).not.toContain("ChecklistItemArt");
  });

  it("keeps all six fields in a reusable planning dialog", () => {
    for (const label of ["负责人", "完成期限", "该项预计总价", "该项实际总价", "购买渠道", "存放位置"]) {
      expect(dialog).toContain(label);
    }
    expect(dialog).toContain("aria-invalid");
    expect(dialog).toContain("inputMode=\"decimal\"");
    expect(dialog).toContain("ConfirmDialog");
  });

  it("integrates planning separately from item editing", () => {
    expect(details).toContain("ItemPlanningDialog");
    expect(details).toContain("分工与采购");
    expect(source("components/EditItemDialog.tsx")).not.toContain("estimatedPriceFen");
  });

  it("offers batch keep, set and clear for only the supported fields", () => {
    for (const label of ["负责人", "完成期限", "存放位置", "保持不变", "设置值", "清空"]) {
      expect(bulk).toContain(label);
    }
    expect(bulk).not.toContain("预计价格");
    expect(bulk).not.toContain("实际价格");
    expect(bulk).not.toContain("购买渠道");
  });
});
