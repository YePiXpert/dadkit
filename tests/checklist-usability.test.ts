import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  matchesChecklistSearch,
  normalizeChecklistSearch,
} from "@/lib/checklist-search";
import type { ChecklistItem } from "@/lib/types";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

function listSourceFiles(...segments: string[]): string[] {
  const root = join(process.cwd(), ...segments);
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);

    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(...segments, entry));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

function item(patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "search-item",
    name: "一次性内裤",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "buy_and_pack",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

const addItemDialog = readSource("components", "AddItemDialog.tsx");
const editItemDialog = readSource("components", "EditItemDialog.tsx");
const celebrationOverlay = readSource("components", "CelebrationOverlay.tsx");
const checklistCategoryCard = readSource(
  "components",
  "ChecklistCategoryCard.tsx",
);
const checklistItemDetailsDialog = readSource(
  "components",
  "ChecklistItemDetailsDialog.tsx",
);
const checklistSectionWorkspace = readSource(
  "components",
  "ChecklistSectionWorkspace.tsx",
);
const checklistWorkspace = readSource("components", "ChecklistWorkspace.tsx");
const confirmDialog = readSource("components", "ConfirmDialog.tsx");
const emptyState = readSource("components", "EmptyState.tsx");
const growthWorkspace = readSource("components", "GrowthWorkspace.tsx");
const homeGrowthHint = readSource("components", "HomeGrowthHint.tsx");
const itemPhotoField = readSource("components", "ItemPhotoField.tsx");
const backupSettingsPage = readSource("app", "settings", "backup", "page.tsx");
const store = readSource("lib", "store.ts");

describe("required-name validation in item dialogs", () => {
  it("disables submission and shows inline feedback until a name is provided", () => {
    const dialogs: Array<[source: string, errorCopy: string]> = [
      [addItemDialog, "请填写物品名称后再加入清单。"],
      [editItemDialog, "请填写物品名称后再保存。"],
    ];

    for (const [source, errorCopy] of dialogs) {
      expect(source).toContain("disabled={!name.trim()");
      expect(source).toContain("onBlur={() => setNameTouched(true)}");
      expect(source).toContain("nameTouched && !name.trim()");
      expect(source).toContain("setNameTouched(true);");
      expect(source).toContain("aria-invalid={nameError}");
      expect(source).toContain('role="alert"');
      expect(source).toContain(errorCopy);
    }
  });
});

describe("add and edit dialog consistency", () => {
  it("shares one preparation option list between both dialogs", () => {
    expect(addItemDialog).toContain('from "@/lib/custom-item-options"');
    expect(editItemDialog).toContain('from "@/lib/custom-item-options"');
    expect(addItemDialog).toContain("CUSTOM_PREPARATION_OPTIONS.map");
    expect(editItemDialog).toContain("CUSTOM_PREPARATION_OPTIONS.map");
  });

  it("closes the add dialog after a same-name merge and reports it with a toast", () => {
    expect(addItemDialog).toContain("if (result.merged) {");
    expect(addItemDialog).toContain('已与现有物品合并');
    expect(addItemDialog).toContain("showAppToast({");
    expect(addItemDialog).toContain("setOpen(false);");
  });
});

describe("celebration overlay accessibility and copy", () => {
  it("is keyboard-dismissible through the shared dialog primitives", () => {
    expect(celebrationOverlay).toContain("<Dialog open={open}");
    expect(celebrationOverlay).toContain("<DialogClose asChild>");
    expect(celebrationOverlay).toContain("待产包已经准备完成！");
  });

  it("reminds about unpacked last-minute and car items only when any remain", () => {
    expect(celebrationOverlay).toContain("departureItemCount > 0");
    expect(celebrationOverlay).toContain(
      "别忘了临出门拿 {departureItemCount} 件。",
    );
  });
});

describe("deletion undo window", () => {
  it("announces deletions with a five-second undo toast before persisting them", () => {
    expect(store).toContain("REMOVE_UNDO_MS = 5_000");
    expect(store).toContain('actionLabel: "撤销"');
    expect(store).toContain("已删除，可撤销。");
    expect(store).toContain("onAction: () => get().undoRemoveItem(id)");
  });
});

describe("in-app confirmation dialogs", () => {
  it("keeps window.confirm out of every application source file", () => {
    const sources = [
      ...listSourceFiles("app"),
      ...listSourceFiles("components"),
      ...listSourceFiles("lib"),
    ];

    expect(sources.length).toBeGreaterThan(0);
    for (const file of sources) {
      expect(readFileSync(file, "utf8"), file).not.toContain("window.confirm");
    }
  });

  it("routes the former native confirms through the shared ConfirmDialog", () => {
    for (const source of [
      checklistItemDetailsDialog,
      itemPhotoField,
      backupSettingsPage,
    ]) {
      expect(source).toContain("ConfirmDialog");
      expect(source).toContain("@/components/ConfirmDialog");
    }

    expect(confirmDialog).toContain("@/components/ui/dialog");
    expect(confirmDialog).toContain("取消");
  });
});

describe("home due-date countdown and checkup reminder", () => {
  it("renders the growth hint inside the checklist hero", () => {
    expect(checklistWorkspace).toContain("<HomeGrowthHint />");
  });

  it("covers both due-date states and hides a completed reminder", () => {
    expect(homeGrowthHint).toContain("去填写预产期");
    expect(homeGrowthHint).toContain("距预产期约 ${daysUntilDue} 天");
    expect(homeGrowthHint).toContain("本周产检提醒待确认");
    expect(homeGrowthHint).toContain(
      "completedTaskIds.includes(currentWeek.checkupTaskId)",
    );
  });
});

describe("category card progress", () => {
  it("gives every card an aria-complete progress bar", () => {
    expect(checklistCategoryCard).toContain('role="progressbar"');
    expect(checklistCategoryCard).toContain("aria-valuenow={progressPercent}");
    expect(checklistCategoryCard).toContain("aria-valuemin={0}");
    expect(checklistCategoryCard).toContain("aria-valuemax={100}");
    expect(checklistCategoryCard).toContain(
      "aria-label={`${title} 已完成 ${progressPercent}%`}",
    );
  });
});

describe("checklist search", () => {
  it("normalizes case, width and surrounding whitespace", () => {
    expect(normalizeChecklistSearch(" ＢＯＴＴＬＥ ")).toBe("bottle");
    expect(normalizeChecklistSearch("  ")).toBe("");
  });

  it("matches Chinese and English keywords against names and notes", () => {
    const target = item({ note: "Hospital stay 备用" });

    expect(matchesChecklistSearch(target, "内裤")).toBe(true);
    expect(matchesChecklistSearch(target, "hospital")).toBe(true);
    expect(matchesChecklistSearch(target, "奶瓶")).toBe(false);
  });

  it("pins the search box, empty state and clear recovery in the workspace", () => {
    expect(checklistWorkspace).toContain('type="search"');
    expect(checklistWorkspace).toContain("搜索物品名称或备注");
    expect(checklistWorkspace).toContain('aria-label="清除搜索"');
    expect(checklistWorkspace).toContain("没有找到匹配物品");
    expect(checklistWorkspace).toContain("清除搜索后查看当前筛选中的全部物品");
    expect(checklistWorkspace).toContain("搜索会在当前「");
  });
});

describe("bulk packing", () => {
  it("offers a confirmed pack-all action driven by one store update", () => {
    expect(checklistWorkspace).toContain("本页全部标记装包");
    expect(checklistWorkspace).toContain("setBulkConfirmOpen(true)");
    expect(checklistWorkspace).toContain("确认批量装包？");
    expect(checklistWorkspace).toContain("markItemsPacked(bulkPackingIds)");
    expect(store).toContain("markItemsPacked: (ids) => {");
  });
});

describe("checklist text export", () => {
  it("copies readable text with a selectable fallback when clipboard fails", () => {
    expect(checklistWorkspace).toContain("复制清单为文本");
    expect(checklistWorkspace).toContain("navigator.clipboard.writeText(text)");
    expect(checklistWorkspace).toContain('id="checklist-copy-fallback"');
    expect(checklistWorkspace).toContain("readOnly");
  });
});

describe("not-needed recovery path", () => {
  it("links section empty states to the highlighted not-needed area", () => {
    expect(checklistSectionWorkspace).toContain("查看已标记不需要的物品");
    expect(checklistSectionWorkspace).toContain(
      'getChecklistHomeHref("highlight=not-needed")',
    );
    expect(checklistWorkspace).toContain('.get("highlight") === "not-needed"');
    expect(checklistWorkspace).toContain('id="not-needed-items"');
  });

  it("keeps EmptyState action wired without dead href params", () => {
    expect(emptyState).not.toContain("actionHref");
    expect(emptyState).not.toContain("actionLabel");
    expect(emptyState).toContain("action?: ReactNode");
    expect(emptyState).toContain("{action ? <div");
  });
});

describe("growth week navigation", () => {
  it("shows a back-to-current-week button only while browsing another week", () => {
    expect(growthWorkspace).toContain("current.week !== currentPregnancyWeek");
    expect(growthWorkspace).toContain(
      "回到本周（孕 {currentPregnancyWeek} 周）",
    );
    expect(growthWorkspace).toContain("selectWeek(currentPregnancyWeek, true)");
  });
});
