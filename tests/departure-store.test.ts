import { afterEach, describe, expect, it, vi } from "vitest";

import { getDepartureProgress } from "@/lib/departure";
import { exportData, STORAGE_KEYS } from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";

function testItem(
  id: string,
  status: ChecklistItem["status"] = "todo",
): ChecklistItem {
  return {
    id,
    name: `出发测试物品 ${id}`,
    category: "documents",
    priority: "must",
    status,
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "document",
    bag: "documents_folder",
    bulk: "small",
    timing: "confirm_beforehand",
  };
}

afterEach(() => {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
    pendingRemovalIds: [],
  });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("departure updates use the existing checklist store", () => {
  it("persists one batch and leaves completed or skipped items untouched", () => {
    const browserStorage = installBrowserStorage();
    const pending = testItem("pending");
    const task = {
      ...testItem("task"),
      itemKind: "task" as const,
      preparationKind: "task" as const,
    };
    const completed = testItem("completed", "packed");
    const skipped = testItem("skipped", "not_needed");
    const checklist = [pending, task, completed, skipped];

    useDadKitStore.setState({
      hydrated: true,
      checklist,
      customItems: checklist,
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
    });

    expect(
      useDadKitStore
        .getState()
        .markItemsPacked([pending.id, task.id, completed.id, skipped.id]),
    ).toBe(2);
    expect(useDadKitStore.getState().checklist.map((item) => item.status)).toEqual([
      "packed",
      "packed",
      "packed",
      "not_needed",
    ]);
    expect(
      browserStorage.writes.filter((key) => key === STORAGE_KEYS.checklist),
    ).toHaveLength(1);
    expect(
      browserStorage.writes.filter((key) => key === STORAGE_KEYS.customItems),
    ).toHaveLength(1);
    expect(
      browserStorage.writes.filter(
        (key) => key === STORAGE_KEYS.hiddenTemplateItems,
      ),
    ).toHaveLength(1);
  });

  it("exposes the same updated state to departure progress, v5 backup and sync export", () => {
    installBrowserStorage();
    const item = testItem("shared");

    useDadKitStore.setState({
      hydrated: true,
      checklist: [item],
      customItems: [item],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
    });
    useDadKitStore.getState().updateItem(item.id, { status: "packed" });

    const stateItem = useDadKitStore.getState().checklist[0];
    const portable = exportData();

    expect(stateItem?.status).toBe("packed");
    expect(getDepartureProgress(useDadKitStore.getState().checklist)).toEqual({
      completed: 1,
      percent: 100,
      remaining: 0,
      total: 1,
    });
    expect(portable.version).toBe(11);
    expect(portable.checklist[0]?.status).toBe("packed");
    expect(portable.customItems[0]?.status).toBe("packed");
  });
});
