import { afterEach, describe, expect, it, vi } from "vitest";

import {
  failNextStorageWrite,
  installBrowserStorage,
} from "@/tests/helpers/browser-storage";
import { generateChecklist } from "@/lib/rules";
import {
  loadChecklist,
  loadSnapshots,
  resetAllData,
  saveChecklist,
  STORAGE_KEYS,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";

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
    useDadKitStore.getState().hydrate();

    useDadKitStore.getState().resetChecklist();

    expect(loadSnapshots()[0]?.reason).toBe("重建清单前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual(before);
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

      vi.advanceTimersByTime(300);

      expect(
        loadChecklist().find((item) => item.id === first.id)?.status,
      ).toBe("packed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not clobber a structural save with a pending debounced write", () => {
    vi.useFakeTimers();

    try {
      installBrowserStorage();
      useDadKitStore.getState().hydrate();

      const [keep, drop] = useDadKitStore.getState().checklist;
      useDadKitStore.getState().updateItem(keep.id, { status: "packed" });
      useDadKitStore.getState().removeItem(drop.id);

      vi.advanceTimersByTime(1000);

      const stored = loadChecklist();
      expect(stored.find((item) => item.id === keep.id)?.status).toBe("packed");
      expect(stored.find((item) => item.id === drop.id)).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
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
