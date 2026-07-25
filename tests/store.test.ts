import { afterEach, describe, expect, it, vi } from "vitest";

import { generateChecklist } from "@/lib/rules";
import {
  loadChecklist,
  loadSnapshots,
  saveChecklist,
  STORAGE_KEYS,
  type DadKitExportData,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";

function installBrowserStorage() {
  const localValues = new Map<string, string>();
  const sessionValues = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => localValues.get(key) ?? null,
      setItem: (key: string, value: string) => localValues.set(key, value),
      removeItem: (key: string) => localValues.delete(key),
      clear: () => localValues.clear(),
    },
    sessionStorage: {
      getItem: (key: string) => sessionValues.get(key) ?? null,
      setItem: (key: string, value: string) => sessionValues.set(key, value),
      removeItem: (key: string) => sessionValues.delete(key),
      clear: () => sessionValues.clear(),
    },
  });

  return { localValues, sessionValues };
}

function failNextStorageWrite(key: string) {
  const setItem = window.localStorage.setItem.bind(window.localStorage);
  let shouldFail = true;

  vi.spyOn(window.localStorage, "setItem").mockImplementation(
    (candidateKey, value) => {
      if (shouldFail && candidateKey === key) {
        shouldFail = false;
        throw new Error("simulated storage write failure");
      }

      setItem(candidateKey, value);
    },
  );
}

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

function backupData(patch: Partial<DadKitExportData> = {}): DadKitExportData {
  return {
    version: 3,
    exportedAt: "2026-07-25T00:00:00.000Z",
    checklistMode: "full",
    checklist: generateChecklist(),
    customItems: [],
    hiddenTemplateItemIds: [],
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

  it("exports exactly the portable v3 fields", () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    const exported = JSON.parse(useDadKitStore.getState().exportJson());

    expect(Object.keys(exported).sort()).toEqual(
      [
        "version",
        "exportedAt",
        "checklistMode",
        "checklist",
        "customItems",
        "hiddenTemplateItemIds",
      ].sort(),
    );
    expect(exported.version).toBe(3);
  });

  it("creates a recovery snapshot before importing valid JSON", () => {
    installBrowserStorage();
    const before = generateChecklist().map((item, index) =>
      index === 0 ? { ...item, status: "packed" as const } : item,
    );
    saveChecklist(before);
    useDadKitStore.getState().hydrate();

    const result = useDadKitStore
      .getState()
      .importJson(JSON.stringify(backupData()));

    expect(result.ok).toBe(true);
    expect(loadSnapshots()[0]?.reason).toBe("导入 JSON 前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual(before);
  });

  it("rejects invalid JSON without creating a snapshot", () => {
    installBrowserStorage();
    useDadKitStore.getState().hydrate();

    const result = useDadKitStore.getState().importJson("{bad json");

    expect(result.ok).toBe(false);
    expect(loadSnapshots()).toEqual([]);
  });

  it("aborts import when the recovery snapshot cannot be persisted", () => {
    installBrowserStorage();
    const before = generateChecklist();
    saveChecklist(before);
    useDadKitStore.getState().hydrate();
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    expect(() =>
      useDadKitStore.getState().importJson(
        JSON.stringify(
          backupData({ checklist: [testItem("replacement")] }),
        ),
      ),
    ).toThrow("无法保存本地恢复快照，操作已中止。");
    expect(loadChecklist()).toEqual(before);
  });

  it("clears checklist data only after saving a recovery snapshot", () => {
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

    useDadKitStore.getState().clearAll();

    const state = useDadKitStore.getState();
    expect(loadSnapshots()[0]?.reason).toBe("清空本地数据前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual([custom]);
    expect(state.checklist).toEqual(generateChecklist());
    expect(state.checklistMode).toBe("lean");
    expect(state.customItems).toEqual([]);
    expect(state.hiddenTemplateItemIds).toEqual([]);
  });

  it("aborts clear when the recovery snapshot cannot be persisted", () => {
    installBrowserStorage();
    const before = [testItem("before-clear", { status: "packed" })];
    saveChecklist(before);
    useDadKitStore.setState({ hydrated: true, checklist: before });
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    expect(() => useDadKitStore.getState().clearAll()).toThrow(
      "无法保存本地恢复快照，操作已中止。",
    );
    expect(useDadKitStore.getState().checklist).toEqual(before);
    expect(loadChecklist()).toEqual(before);
  });
});
