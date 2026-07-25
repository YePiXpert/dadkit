import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSnapshot,
  exportData,
  importData,
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadHiddenTemplateItemIds,
  loadSnapshots,
  resetAllData,
  restoreSnapshot,
  saveChecklist,
  saveChecklistMode,
  saveCustomItems,
  saveHiddenTemplateItemIds,
  STORAGE_KEYS,
  type DadKitExportData,
} from "@/lib/storage";
import type { ChecklistItem } from "@/lib/types";

type StorageHarness = {
  localValues: Map<string, string>;
  sessionValues: Map<string, string>;
};

function installBrowserStorage(
  initial: Record<string, string> = {},
): StorageHarness {
  const localValues = new Map(Object.entries(initial));
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

function testItem(id = "item-1", patch: Partial<ChecklistItem> = {}): ChecklistItem {
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

function backupData(
  patch: Partial<DadKitExportData> = {},
): DadKitExportData {
  return {
    version: 3,
    exportedAt: "2026-07-25T00:00:00.000Z",
    checklistMode: "full",
    checklist: [testItem("backup-item")],
    customItems: [],
    hiddenTemplateItemIds: [],
    ...patch,
  };
}

function currentDataSnapshot() {
  return {
    checklist: loadChecklist(),
    checklistMode: loadChecklistMode(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("v3 storage namespace and export schema", () => {
  it("owns only dadkit:v3 storage keys", () => {
    expect(Object.values(STORAGE_KEYS).length).toBeGreaterThan(0);
    expect(
      Object.values(STORAGE_KEYS).every((key) => key.startsWith("dadkit:v3:")),
    ).toBe(true);
  });

  it("exports exactly the six portable checklist fields", () => {
    installBrowserStorage();
    const checklist = [testItem("saved")];
    const customItems = [testItem("custom")];

    saveChecklist(checklist);
    saveChecklistMode("lean");
    saveCustomItems(customItems);
    saveHiddenTemplateItemIds(["hidden-template"]);

    const exported = exportData();

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
    expect(exported).toMatchObject({
      version: 3,
      checklistMode: "lean",
      checklist,
      customItems,
      hiddenTemplateItemIds: ["hidden-template"],
    });
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
  });

  it("round-trips a complete v3 backup", () => {
    installBrowserStorage();
    const payload = backupData({
      checklistMode: "lean",
      checklist: [testItem("restored")],
      customItems: [testItem("restored-custom")],
      hiddenTemplateItemIds: ["hidden-template"],
    });

    const result = importData(JSON.stringify(payload));

    expect(result.ok).toBe(true);
    expect(currentDataSnapshot()).toEqual({
      checklist: payload.checklist,
      checklistMode: "lean",
      customItems: payload.customItems,
      hiddenTemplateItemIds: ["hidden-template"],
    });
  });
});

describe("strict v3 import boundary", () => {
  it.each([
    ["invalid JSON", "{bad json"],
    ["old version", JSON.stringify({ ...backupData(), version: 2 })],
    [
      "missing field",
      JSON.stringify(
        Object.fromEntries(
          Object.entries(backupData()).filter(
            ([key]) => key !== "hiddenTemplateItemIds",
          ),
        ),
      ),
    ],
    [
      "extra field",
      JSON.stringify({ ...backupData(), userProfile: null }),
    ],
    [
      "invalid exportedAt",
      JSON.stringify({ ...backupData(), exportedAt: "not-a-date" }),
    ],
    [
      "invalid checklist",
      JSON.stringify({ ...backupData(), checklist: [{}] }),
    ],
    [
      "invalid customItems",
      JSON.stringify({ ...backupData(), customItems: {} }),
    ],
    [
      "invalid hidden ids",
      JSON.stringify({ ...backupData(), hiddenTemplateItemIds: [123] }),
    ],
    [
      "invalid mode",
      JSON.stringify({ ...backupData(), checklistMode: "compact" }),
    ],
  ])("rejects %s without modifying current data", (_label, raw) => {
    installBrowserStorage();
    const current = [testItem("current", { status: "packed" })];

    saveChecklist(current);
    saveChecklistMode("lean");
    saveCustomItems([testItem("current-custom")]);
    saveHiddenTemplateItemIds(["current-hidden"]);
    const before = currentDataSnapshot();

    const result = importData(raw);

    expect(result.ok).toBe(false);
    expect(currentDataSnapshot()).toEqual(before);
  });

  it("rolls back every checklist field when a write fails", () => {
    installBrowserStorage();
    const original = backupData({
      checklist: [testItem("original")],
      customItems: [testItem("original-custom")],
      hiddenTemplateItemIds: ["original-hidden"],
    });

    expect(importData(JSON.stringify(original)).ok).toBe(true);
    const before = currentDataSnapshot();
    failNextStorageWrite(STORAGE_KEYS.customItems);

    const result = importData(
      JSON.stringify(
        backupData({
          checklist: [testItem("replacement")],
          customItems: [testItem("replacement-custom")],
          hiddenTemplateItemIds: ["replacement-hidden"],
        }),
      ),
    );

    expect(result.ok).toBe(false);
    expect(currentDataSnapshot()).toEqual(before);
  });
});

describe("local recovery snapshots", () => {
  it("keeps only the latest five snapshots", () => {
    installBrowserStorage();
    saveChecklist([testItem("existing")]);

    for (let index = 1; index <= 7; index += 1) {
      createSnapshot(`恢复点 ${index}`);
    }

    expect(loadSnapshots().map((snapshot) => snapshot.reason)).toEqual([
      "恢复点 7",
      "恢复点 6",
      "恢复点 5",
      "恢复点 4",
      "恢复点 3",
    ]);
  });

  it("stores only the exact v3 portable payload", () => {
    installBrowserStorage();
    saveChecklist([testItem("snapshot")]);

    const snapshot = createSnapshot("精简快照");

    expect(snapshot).toBeDefined();
    expect(Object.keys(snapshot!.data).sort()).toEqual(
      [
        "version",
        "exportedAt",
        "checklistMode",
        "checklist",
        "customItems",
        "hiddenTemplateItemIds",
      ].sort(),
    );
  });

  it("creates a rescue snapshot before restoring another snapshot", () => {
    installBrowserStorage();
    saveChecklist([testItem("target")]);
    const target = createSnapshot("目标恢复点");

    saveChecklist([testItem("current")]);
    const result = restoreSnapshot(target?.id ?? "");

    expect(result.ok).toBe(true);
    expect(loadChecklist()).toEqual([testItem("target")]);
    expect(loadSnapshots()[0]?.reason).toBe("恢复本地备份前");
    expect(loadSnapshots()[0]?.data.checklist).toEqual([testItem("current")]);
  });

  it("does not restore if the rescue snapshot cannot be saved", () => {
    installBrowserStorage();
    saveChecklist([testItem("target")]);
    const target = createSnapshot("目标恢复点");

    saveChecklist([testItem("current")]);
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    const result = restoreSnapshot(target?.id ?? "");

    expect(result.ok).toBe(false);
    expect(loadChecklist()).toEqual([testItem("current")]);
  });

  it("throws when a required recovery snapshot cannot be persisted", () => {
    installBrowserStorage();
    saveChecklist([testItem("current")]);
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    expect(() => createSnapshot("必须成功")).toThrow(
      "无法保存本地恢复快照，操作已中止。",
    );
    expect(loadSnapshots()).toEqual([]);
  });
});

describe("destructive storage scope", () => {
  it("clears owned v3 data but preserves snapshots, v2 data and unrelated keys", () => {
    const v2Sentinel = "dadkit:v2:checklist";
    const unrelated = "another-app:data";
    const { localValues, sessionValues } = installBrowserStorage({
      [v2Sentinel]: "v2-sentinel",
      [unrelated]: "unrelated-sentinel",
    });

    saveChecklist([testItem("current")]);
    createSnapshot("保留恢复点");
    localValues.set(STORAGE_KEYS.webDavSecret, "secret");
    sessionValues.set("dadkit:v3:webdav-session-secret", "session-secret");

    resetAllData();

    expect(loadChecklist()).toEqual([]);
    expect(loadSnapshots()).toHaveLength(1);
    expect(localValues.get(v2Sentinel)).toBe("v2-sentinel");
    expect(localValues.get(unrelated)).toBe("unrelated-sentinel");
    expect(localValues.has(STORAGE_KEYS.webDavSecret)).toBe(false);
    expect(sessionValues.has("dadkit:v3:webdav-session-secret")).toBe(false);
  });
});
