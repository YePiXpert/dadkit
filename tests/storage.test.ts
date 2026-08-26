import { afterEach, describe, expect, it, vi } from "vitest";

import {
  failNextStorageWrite,
  installBrowserStorage,
} from "@/tests/helpers/browser-storage";
import {
  createSnapshot,
  exportData,
  importData,
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadDeletedCustomItems,
  loadGrowthUpdatedAt,
  loadHiddenTemplateItemIds,
  loadHiddenTemplateItemStamps,
  loadSnapshots,
  resetAllData,
  restoreSnapshot,
  saveChecklist,
  saveChecklistMode,
  saveCustomItems,
  saveHiddenTemplateItemIds,
  saveSnapshots,
  STORAGE_KEYS,
  type DadKitExportData,
  type DadKitExportDataV3,
  type DadKitExportDataV6,
} from "@/lib/storage";
import {
  GROWTH_STORAGE_KEYS,
  exportGrowthData,
} from "@/lib/growth-store";
import type { ChecklistItem } from "@/lib/types";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { portableV8 } from "@/tests/helpers/portable-data";
import {
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import { useDadKitStore } from "@/lib/store";

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
    version: 11,
    exportedAt: "2026-07-25T00:00:00.000Z",
    checklistMode: "full",
    checklist: [testItem("backup-item")],
    customItems: [],
    hiddenTemplateItemIds: [],
    growth: {
      version: 1,
      profile: { nickname: "小满", dueDate: "2026-08-20" },
      progress: { completedTaskIds: ["first-prenatal-contact"] },
    },
    hiddenTemplateItemStamps: {},
    deletedCustomItems: {},
    growthUpdatedAt: 0,
    baby: createEmptyBabyData(),
    household: createEmptyHousehold(),
    ...patch,
  };
}

function backupDataV4(patch: Record<string, unknown> = {}) {
  const current = backupData();

  return {
    version: 4,
    exportedAt: current.exportedAt,
    checklistMode: current.checklistMode,
    checklist: current.checklist,
    customItems: current.customItems,
    hiddenTemplateItemIds: current.hiddenTemplateItemIds,
    growth: current.growth,
    ...patch,
  };
}

function backupDataV5(patch: Record<string, unknown> = {}) {
  const {
    baby: _baby,
    household: _household,
    ...current
  } = backupData();
  void _baby;
  void _household;

  return { ...current, version: 5 as const, ...patch };
}

function hospitalProfile(
  patch: Partial<Record<"hospitalName" | "address" | "maternityPhone", string>>,
  updatedAt = 100,
) {
  const profile = createEmptyHospitalProfile();
  const values = hospitalValuesFromPortable(profile);

  Object.assign(values, patch);
  return updateHospitalProfile(profile, values, updatedAt).profile;
}

function backupDataV3(
  patch: Partial<DadKitExportDataV3> = {},
): DadKitExportDataV3 {
  const current = backupData();

  return {
    version: 3,
    exportedAt: current.exportedAt,
    checklistMode: current.checklistMode,
    checklist: current.checklist,
    customItems: current.customItems,
    hiddenTemplateItemIds: current.hiddenTemplateItemIds,
    ...patch,
  };
}

function currentDataSnapshot() {
  return {
    checklist: loadChecklist(),
    checklistMode: loadChecklistMode(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
    growth: exportGrowthData(),
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

describe("v6 portable backup with the existing local namespace", () => {
  it("owns only dadkit:v3 and device-local v4 storage keys", () => {
    expect(Object.values(STORAGE_KEYS).length).toBeGreaterThan(0);
    expect(
      Object.values(STORAGE_KEYS).every((key) => key.startsWith("dadkit:v3:") || key.startsWith("dadkit:v4:")),
    ).toBe(true);
  });

  it("exports checklist and growth data without connection settings", () => {
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
        "growth",
        "hiddenTemplateItemStamps",
        "deletedCustomItems",
        "growthUpdatedAt",
        "baby",
        "household",
      ].sort(),
    );
    expect(exported).toMatchObject({
      version: 11,
      checklistMode: "lean",
      checklist,
      customItems,
      hiddenTemplateItemIds: ["hidden-template"],
      hiddenTemplateItemStamps: {
        "hidden-template": { hidden: true, updatedAt: 0 },
      },
      deletedCustomItems: {},
      growthUpdatedAt: 0,
      growth: {
        version: 1,
        profile: { nickname: "", dueDate: "" },
        progress: { completedTaskIds: [] },
      },
    });
    expect(exported).not.toHaveProperty("hospital");
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
  });

  it("round-trips a complete v11 backup without hospital data", () => {
    installBrowserStorage();
    const payload = backupData({
      checklistMode: "lean",
      checklist: [testItem("restored")],
      customItems: [testItem("restored-custom")],
      hiddenTemplateItemIds: ["hidden-template"],
      hiddenTemplateItemStamps: {
        "hidden-template": { hidden: true, updatedAt: 123 },
      },
      deletedCustomItems: { "gone-custom": 456 },
      growthUpdatedAt: 789,
    });

    const result = importData(JSON.stringify(payload));

    expect(result.ok).toBe(true);
    expect(currentDataSnapshot()).toEqual({
      checklist: payload.checklist,
      checklistMode: "lean",
      customItems: payload.customItems,
      hiddenTemplateItemIds: ["hidden-template"],
      growth: payload.growth,
    });
    expect(loadHiddenTemplateItemStamps()).toEqual({
      "hidden-template": { hidden: true, updatedAt: 123 },
    });
    expect(loadDeletedCustomItems()).toEqual({ "gone-custom": 456 });
    expect(loadGrowthUpdatedAt()).toBe(789);
    expect(exportData().version).toBe(11);
    expect(exportData()).not.toHaveProperty("hospital");
  });

  it("refreshes an already hydrated checklist store after import", () => {
    installBrowserStorage();
    useDadKitStore.setState({
      hydrated: true,
      checklist: [testItem("stale")],
      checklistMode: "lean",
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
    });
    const imported = testItem("imported", { updatedAt: 100 });

    expect(
      importData(
        JSON.stringify(
          backupData({ checklist: [imported], customItems: [imported] }),
        ),
      ).ok,
    ).toBe(true);
    expect(useDadKitStore.getState()).toMatchObject({
      hydrated: true,
      checklistMode: "full",
      changeOrigin: "hydrate",
    });
    expect(
      useDadKitStore.getState().checklist.some((item) => item.id === imported.id),
    ).toBe(true);
  });

  it("imports a v6 backup while discarding retired hospital data", () => {
    installBrowserStorage();
    const latest = backupData();
    const { baby: _baby, household: _household, ...withoutBaby } = latest;
    void _baby;
    void _household;
    const v6 = {
      ...withoutBaby,
      version: 6 as const,
      hospital: hospitalProfile({ hospitalName: "v6 医院" }),
    };

    const result = importData(JSON.stringify(v6));

    expect(result).toEqual({
      ok: true,
      message: "导入成功（v6 备份不包含宝宝资料和照护记录）",
    });
    expect(window.localStorage.getItem("dadkit:v3:hospital-profile")).toBeNull();
  });

  it("rolls back the full old import when resetting device identity fails", () => {
    installBrowserStorage();
    saveChecklist([testItem("before-identity-failure")]);
    const identity = { version: 1 as const, currentMemberId: "member-a", preferredEntry: "baby" as const, onboardingCompletedAt: 10 };
    saveDeviceIdentity(identity);
    failNextStorageWrite(STORAGE_KEYS.deviceIdentity);

    const result = importData(JSON.stringify(portableV8({ checklist: [testItem("after-identity-failure")] })));

    expect(result.ok).toBe(false);
    expect(loadChecklist().map((item) => item.id)).toEqual(["before-identity-failure"]);
    expect(loadDeviceIdentity()).toEqual(identity);
  });

  it.each([
    ["v3", () => backupDataV3()],
    ["v4", () => backupDataV4()],
    ["v5", () => backupDataV5()],
  ])("treats a manual %s import as a full restore and clears retired data", (
    label,
    createLegacy,
  ) => {
    installBrowserStorage();
    window.localStorage.setItem("dadkit:v3:hospital-profile", "legacy");

    const result = importData(JSON.stringify(createLegacy()));

    expect(result.ok).toBe(true);
    expect(result.message).toContain(`旧版 ${label}`);
    expect(window.localStorage.getItem("dadkit:v3:hospital-profile")).toBeNull();
  });

  it("migrates merge metadata when importing a v4 backup", () => {
    installBrowserStorage();

    const result = importData(
      JSON.stringify(backupDataV4({ hiddenTemplateItemIds: ["hidden-template"] })),
    );

    expect(result.ok).toBe(true);
    expect(loadHiddenTemplateItemStamps()).toEqual({
      "hidden-template": { hidden: true, updatedAt: 0 },
    });
    expect(loadDeletedCustomItems()).toEqual({});
    expect(loadGrowthUpdatedAt()).toBe(0);
  });

  it("restores a v3 checklist backup without clearing current growth data", () => {
    installBrowserStorage({
      [GROWTH_STORAGE_KEYS.profile]: JSON.stringify({
        nickname: "旧昵称",
        dueDate: "2026-09-01",
      }),
    });

    const result = importData(JSON.stringify(backupDataV3()));

    expect(result.ok).toBe(true);
    expect(exportGrowthData()).toEqual({
      version: 1,
      profile: { nickname: "旧昵称", dueDate: "2026-09-01" },
      progress: { completedTaskIds: [] },
    });
  });
});

describe("strict v3, v4, v5 and v6 import boundary", () => {
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
    [
      "invalid growth payload",
      JSON.stringify({
        ...backupData(),
        growth: { version: 1, profile: {}, progress: {} },
      }),
    ],
    [
      "duplicate checklist ids",
      JSON.stringify({
        ...backupData(),
        checklist: [testItem("duplicate"), testItem("duplicate")],
      }),
    ],
    [
      "duplicate hidden ids",
      JSON.stringify({
        ...backupData(),
        hiddenTemplateItemIds: ["same-id", "same-id"],
      }),
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

  it("accepts future fields on legacy v5 data but strips them before saving", () => {
    installBrowserStorage();
    const legacy = backupDataV5({
      checklist: [
        {
          ...testItem("future-item"),
          futureField: "discard me",
        } as ChecklistItem,
      ],
    });
    const raw = JSON.stringify({
      ...legacy,
      futureBackupField: { supportedBy: "a newer DadKit" },
    });

    expect(importData(raw)).toEqual({
      ok: true,
      message: "导入成功（旧版 v5 备份不包含宝宝记录）",
    });
    expect(loadChecklist()[0]).not.toHaveProperty("futureField");
    expect(exportData()).not.toHaveProperty("futureBackupField");
  });

  it("accepts future top-level fields on a backup but strips them before saving", () => {
    installBrowserStorage();

    const result = importData(
      JSON.stringify({
        ...backupData(),
        __protoPollutionAttempt: { polluted: true },
      }),
    );

    expect(result.ok).toBe(true);
    expect(exportData()).not.toHaveProperty("__protoPollutionAttempt");
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

  it("rolls back checklist and growth together when a growth write fails", () => {
    installBrowserStorage();
    const original = backupData({
      checklist: [testItem("original")],
      growth: {
        version: 1,
        profile: { nickname: "原昵称", dueDate: "2026-08-20" },
        progress: { completedTaskIds: ["first-prenatal-contact"] },
      },
    });

    expect(importData(JSON.stringify(original)).ok).toBe(true);
    const before = currentDataSnapshot();
    failNextStorageWrite(GROWTH_STORAGE_KEYS.profile);

    const result = importData(
      JSON.stringify(
        backupData({
          checklist: [testItem("replacement")],
          growth: {
            version: 1,
            profile: { nickname: "新昵称", dueDate: "2026-09-10" },
            progress: { completedTaskIds: ["dating-ultrasound"] },
          },
        }),
      ),
    );

    expect(result.ok).toBe(false);
    expect(currentDataSnapshot()).toEqual(before);
  });
});

describe("local recovery snapshots", () => {
  it("keeps only the latest two snapshots", () => {
    installBrowserStorage();
    saveChecklist([testItem("existing")]);

    for (let index = 1; index <= 7; index += 1) {
      createSnapshot(`恢复点 ${index}`);
    }

    expect(loadSnapshots().map((snapshot) => snapshot.reason)).toEqual([
      "恢复点 7",
      "恢复点 6",
    ]);
  });

  it("stores only the exact v6 portable payload", () => {
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
        "growth",
        "hiddenTemplateItemStamps",
        "deletedCustomItems",
        "growthUpdatedAt",
        "hospital",
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

  it("restores a legacy v6 snapshot while discarding hospital data", () => {
    installBrowserStorage();
    const latest = backupData();
    const { baby: _baby, household: _household, ...withoutBaby } = latest;
    void _baby;
    void _household;
    const v6: DadKitExportDataV6 = {
      ...withoutBaby,
      version: 6,
      hospital: hospitalProfile({ hospitalName: "快照医院" }),
    };
    saveSnapshots([
      {
        id: "legacy-v6-snapshot",
        createdAt: "2026-08-01T00:00:00.000Z",
        reason: "旧版 v6",
        data: v6,
      },
    ]);

    const result = restoreSnapshot("legacy-v6-snapshot", {
      snapshotBeforeRestore: false,
    });
    expect(result.ok).toBe(true);
    expect(window.localStorage.getItem("dadkit:v3:hospital-profile")).toBeNull();
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
    localValues.set(
      GROWTH_STORAGE_KEYS.profile,
      JSON.stringify({ nickname: "小满", dueDate: "2026-08-20" }),
    );
    localValues.set(
      GROWTH_STORAGE_KEYS.progress,
      JSON.stringify({ completedTaskIds: ["first-prenatal-contact"] }),
    );
    sessionValues.set("dadkit:v3:webdav-session-secret", "session-secret");

    resetAllData();

    expect(loadChecklist()).toEqual([]);
    expect(loadSnapshots()).toHaveLength(1);
    expect(localValues.get(v2Sentinel)).toBe("v2-sentinel");
    expect(localValues.get(unrelated)).toBe("unrelated-sentinel");
    expect(localValues.has(STORAGE_KEYS.webDavSecret)).toBe(false);
    expect(localValues.has(GROWTH_STORAGE_KEYS.profile)).toBe(false);
    expect(localValues.has(GROWTH_STORAGE_KEYS.progress)).toBe(false);
    expect(sessionValues.has("dadkit:v3:webdav-session-secret")).toBe(false);
  });
});

describe("readJson 热路径缓存", () => {
  it("存储未变时重复读取不再重新解析", () => {
    installBrowserStorage();
    saveChecklist([testItem("cached")]);
    loadChecklist();

    const parseSpy = vi.spyOn(JSON, "parse");
    try {
      loadChecklist();
      loadChecklist();
      expect(parseSpy).not.toHaveBeenCalled();
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("存储被外部改写后（如另一个标签页）读取自动失效", () => {
    installBrowserStorage();
    saveChecklist([testItem("before")]);
    expect(loadChecklist().map((item) => item.id)).toEqual(["before"]);

    window.localStorage.setItem(
      STORAGE_KEYS.checklist,
      JSON.stringify([testItem("after")]),
    );

    expect(loadChecklist().map((item) => item.id)).toEqual(["after"]);
  });
});