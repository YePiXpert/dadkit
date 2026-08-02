import { afterEach, describe, expect, it, vi } from "vitest";

import {
  failNextStorageWrite,
  installBrowserStorage,
} from "@/tests/helpers/browser-storage";
import { generateChecklist } from "@/lib/rules";
import {
  loadChecklist,
  loadDeletedCustomItems,
  loadSnapshots,
  resetAllData,
  saveChecklist,
  STORAGE_KEYS,
  exportData,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { loadItemPlanning, saveItemPlanning } from "@/lib/planning/repository";
import { useItemPlanningStore } from "@/lib/planning/store";

function testItem(id: string, patch: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id,
    name: `测试物品 ${id}`,
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    preparationKind: "pack_existing",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
    ...patch,
  };
}

function resetStoreState() {
  useDadKitStore.setState({
    hydrated: false,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
  });
}

afterEach(() => {
  resetStoreState();
  // Retained dirty writes intentionally survive a storage failure. Reset the
  // module repository between isolated browser harnesses so a previous test's
  // in-memory retry cannot write into the next test's fresh localStorage.
  if (typeof window !== "undefined") {
    resetAllData();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("v3 checklist store", () => {
  it("hydrates an empty browser into the fixed generic checklist", () => {
    installBrowserStorage();

    useDadKitStore.getState().hydrate();

    const state = useDadKitStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.checklist).toEqual(generateChecklist());
    expect(loadChecklist()).toEqual(state.checklist);
  });

  it("restores only missing template items without losing progress or custom items", () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    const initial = useDadKitStore.getState().checklist;
    const preserved = initial[0];
    const removed = initial.find((item) => item.id !== preserved.id);

    expect(removed).toBeDefined();
    useDadKitStore.getState().updateItem(preserved.id, { status: "packed" });
    useDadKitStore.getState().removeItem(removed!.id);
    const custom = useDadKitStore.getState().addCustomItem({
      name: "自定义测试物品",
      category: "mom_labor",
      priority: "must",
    });

    const restoredCount =
      useDadKitStore.getState().restoreMissingTemplateItems();
    const state = useDadKitStore.getState();

    expect(restoredCount).toBe(1);
    expect(state.hiddenTemplateItemIds).toEqual([]);
    expect(state.checklist.find((item) => item.id === removed!.id)).toBeDefined();
    expect(state.checklist.find((item) => item.id === preserved.id)?.status).toBe(
      "packed",
    );
    expect(state.checklist.find((item) => item.id === custom.itemId)).toBeDefined();
    expect(state.customItems.find((item) => item.id === custom.itemId)).toBeDefined();
  });

  it("rebuilds the checklist only after saving a recovery snapshot", () => {
    installBrowserStorage();
    const before = generateChecklist().map((item, index) =>
      index === 0 ? { ...item, status: "packed" as const } : item,
    );
    saveChecklist(before);
    const planning = createEmptyItemPlanning();
    planning.items[before[0].id] = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "dad", updatedAt: 10 },
    };
    saveItemPlanning(planning);
    useItemPlanningStore.setState({ hydrated: true, planning });
    useDadKitStore.getState().hydrate();

    useDadKitStore.getState().resetChecklist();

    expect(loadSnapshots()[0]?.reason).toBe("重建清单前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual(before);
    expect(loadSnapshots()[0]?.data.version).toBe(7);
    expect(loadItemPlanning().items).toEqual({});
    expect(loadItemPlanning().clearedAt).toBeGreaterThan(10);
    expect(useDadKitStore.getState().checklist).toEqual(generateChecklist());
  });

  it("rolls back every checklist field when rebuilding cannot finish", () => {
    installBrowserStorage();
    const before = [testItem("before-failed-rebuild", { status: "packed" })];
    saveChecklist(before);
    useDadKitStore.setState({ hydrated: true, checklist: before });
    failNextStorageWrite(STORAGE_KEYS.customItems);

    expect(() => useDadKitStore.getState().resetChecklist()).toThrow(
      "清单重建失败，原有清单已保留。",
    );
    expect(useDadKitStore.getState().checklist).toEqual(before);
    expect(loadChecklist()).toEqual(before);
  });

  it("rolls back checklist and planning together when planning clear fails", () => {
    installBrowserStorage();
    const before = [testItem("before-planning-failure", { status: "packed" })];
    saveChecklist(before);
    const planning = createEmptyItemPlanning();
    planning.items[before[0].id] = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "mom", updatedAt: 20 },
    };
    saveItemPlanning(planning);
    useItemPlanningStore.setState({ hydrated: true, planning });
    useDadKitStore.setState({ hydrated: true, checklist: before });
    failNextStorageWrite(STORAGE_KEYS.planning);

    expect(() => useDadKitStore.getState().resetChecklist()).toThrow(
      "清单重建失败，原有清单已保留。",
    );
    expect(loadChecklist()).toEqual(before);
    expect(loadItemPlanning()).toEqual(planning);
  });

  it("aborts rebuild when the recovery snapshot cannot be persisted", () => {
    installBrowserStorage();
    const before = generateChecklist().map((item, index) =>
      index === 0 ? { ...item, status: "packed" as const } : item,
    );
    saveChecklist(before);
    useDadKitStore.getState().hydrate();
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    expect(() => useDadKitStore.getState().resetChecklist()).toThrow(
      "无法保存本地恢复快照，操作已中止。",
    );
    expect(useDadKitStore.getState().checklist).toEqual(before);
    expect(loadChecklist()).toEqual(before);
  });

  it("debounces checklist persistence after quick item updates", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      useDadKitStore.getState().hydrate();

      const first = useDadKitStore.getState().checklist[0];
      useDadKitStore.getState().updateItem(first.id, { status: "packed" });

      // 防抖窗口内尚未落盘，内存状态已更新
      expect(
        useDadKitStore.getState().checklist.find((item) => item.id === first.id)
          ?.status,
      ).toBe("packed");
      expect(
        loadChecklist().find((item) => item.id === first.id)?.status,
      ).not.toBe("packed");

      vi.advanceTimersByTime(1_100);

      expect(
        loadChecklist().find((item) => item.id === first.id)?.status,
      ).toBe("packed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("commits a pending deletion after its undo window without clobbering a debounced write", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      useDadKitStore.getState().hydrate();

      const [keep, drop] = useDadKitStore.getState().checklist;
      useDadKitStore.getState().updateItem(keep.id, { status: "packed" });
      useDadKitStore.getState().removeItem(drop.id);

      vi.advanceTimersByTime(1000);

      expect(loadChecklist().find((item) => item.id === drop.id)).toBeDefined();

      vi.advanceTimersByTime(4000);

      const stored = loadChecklist();
      expect(stored.find((item) => item.id === keep.id)?.status).toBe("packed");
      expect(stored.find((item) => item.id === drop.id)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("commits a pending deletion when the page is hidden", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      let pagehideListener: (() => void) | undefined;
      Object.assign(window, {
        addEventListener: vi.fn(
          (type: string, listener: EventListenerOrEventListenerObject) => {
            if (type === "pagehide" && typeof listener === "function") {
              pagehideListener = () => listener(new Event("pagehide"));
            }
          },
        ),
      });
      vi.stubGlobal("document", {
        visibilityState: "visible",
        addEventListener: vi.fn(),
      });

      const custom = testItem("pagehide-custom");
      saveChecklist([custom]);
      useDadKitStore.setState({
        hydrated: true,
        checklist: [custom],
        customItems: [custom],
        hiddenTemplateItemIds: [],
        pendingRemovalIds: [],
      });

      useDadKitStore.getState().removeItem(custom.id);
      expect(loadChecklist()).toEqual([custom]);

      expect(pagehideListener).toBeDefined();
      pagehideListener?.();

      expect(loadChecklist()).toEqual([]);
      expect(loadDeletedCustomItems()[custom.id]).toBeDefined();
      expect(useDadKitStore.getState().pendingRemovalIds).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a newly added item with the same name when the old deletion commits", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      const removed = testItem("same-name-old", {
        name: "同名删除回归物品",
      });
      saveChecklist([removed]);
      useDadKitStore.setState({
        hydrated: true,
        checklist: [removed],
        customItems: [removed],
        hiddenTemplateItemIds: [],
        pendingRemovalIds: [],
      });

      useDadKitStore.getState().removeItem(removed.id);
      const replacement = useDadKitStore.getState().addCustomItem({
        name: removed.name,
        category: removed.category,
        priority: removed.priority,
      });

      expect(replacement.itemId).not.toBe(removed.id);
      vi.advanceTimersByTime(5000);

      const state = useDadKitStore.getState();
      expect(state.checklist.some((item) => item.id === replacement.itemId)).toBe(
        true,
      );
      expect(state.checklist.some((item) => item.id === removed.id)).toBe(false);
      expect(loadChecklist().some((item) => item.id === replacement.itemId)).toBe(
        true,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores a pending custom-item deletion before it is persisted", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      const custom = testItem("undo-custom", {
        note: "保留自定义备注",
        quantity: "2 件",
      });
      saveChecklist([custom]);
      useDadKitStore.setState({
        hydrated: true,
        checklist: [custom],
        customItems: [custom],
        hiddenTemplateItemIds: [],
        pendingRemovalIds: [],
      });

      useDadKitStore.getState().removeItem(custom.id);
      expect(useDadKitStore.getState().checklist).toEqual([]);
      expect(useDadKitStore.getState().pendingRemovalIds).toEqual([custom.id]);

      useDadKitStore.getState().undoRemoveItem(custom.id);

      expect(useDadKitStore.getState().checklist).toEqual([custom]);
      expect(useDadKitStore.getState().customItems).toEqual([custom]);
      expect(useDadKitStore.getState().pendingRemovalIds).toEqual([]);
      expect(loadChecklist()).toEqual([custom]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("writes a tombstone only after the undo window expires", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      const custom = testItem("expired-custom");
      saveChecklist([custom]);
      useDadKitStore.setState({
        hydrated: true,
        checklist: [custom],
        customItems: [custom],
        hiddenTemplateItemIds: [],
        pendingRemovalIds: [],
      });

      useDadKitStore.getState().removeItem(custom.id);
      expect(loadDeletedCustomItems()).not.toHaveProperty(custom.id);

      vi.advanceTimersByTime(5000);

      expect(loadChecklist()).toEqual([]);
      expect(loadDeletedCustomItems()[custom.id]).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks a batch as packed in one persisted export state", () => {
    installBrowserStorage();
    const first = testItem("batch-first");
    const second = testItem("batch-second", { status: "bought" });
    const skipped = testItem("batch-skipped", { status: "not_needed" });
    saveChecklist([first, second, skipped]);
    useDadKitStore.setState({
      hydrated: true,
      checklist: [first, second, skipped],
      customItems: [first, second, skipped],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
    });

    expect(
      useDadKitStore
        .getState()
        .markItemsPacked([first.id, second.id, skipped.id]),
    ).toBe(2);
    expect(exportData().checklist.map((item) => item.status)).toEqual([
      "packed",
      "packed",
      "not_needed",
    ]);
    expect(exportData().customItems.map((item) => item.status)).toEqual([
      "packed",
      "packed",
      "not_needed",
    ]);
  });

  it("clears checklist data only after saving a recovery snapshot", async () => {
    installBrowserStorage();
    const custom = testItem("custom", { status: "packed" });
    saveChecklist([custom]);
    useDadKitStore.setState({
      hydrated: true,
      checklist: [custom],
      checklistMode: "lean",
      customItems: [custom],
      hiddenTemplateItemIds: ["general-baby-nail-clipper"],
    });

    await useDadKitStore.getState().clearAll();

    const state = useDadKitStore.getState();
    expect(loadSnapshots()[0]?.reason).toBe("清空本地数据前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual([custom]);
    expect(state.checklist).toEqual(generateChecklist());
    expect(state.checklistMode).toBe("lean");
    expect(state.customItems).toEqual([]);
    expect(state.hiddenTemplateItemIds).toEqual([]);
  });

  it("aborts clear when the recovery snapshot cannot be persisted", async () => {
    installBrowserStorage();
    const before = [testItem("before-clear", { status: "packed" })];
    saveChecklist(before);
    useDadKitStore.setState({ hydrated: true, checklist: before });
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    await expect(useDadKitStore.getState().clearAll()).rejects.toThrow(
      "无法保存本地恢复快照，操作已中止。",
    );
    expect(useDadKitStore.getState().checklist).toEqual(before);
    expect(loadChecklist()).toEqual(before);
  });

  it("rolls back a clear when the replacement checklist cannot be persisted", async () => {
    installBrowserStorage();
    const before = [testItem("before-failed-clear", { status: "packed" })];
    saveChecklist(before);
    useDadKitStore.setState({ hydrated: true, checklist: before });
    failNextStorageWrite(STORAGE_KEYS.checklistMode);

    await expect(useDadKitStore.getState().clearAll()).rejects.toThrow(
      "本机数据清空失败，原有数据已保留。",
    );
    expect(useDadKitStore.getState().checklist).toEqual(before);
    expect(loadChecklist()).toEqual(before);
  });
});
