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
import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { createEmptyHousehold } from "@/lib/household/defaults";
import { loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { portableV8 } from "@/tests/helpers/portable-data";
import {
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import {
  loadHospitalProfile,
  saveHospitalProfile,
} from "@/lib/hospital/repository";
import {
  loadItemPlanning,
  saveItemPlanning,
} from "@/lib/planning/repository";

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
    version: 9,
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
    hospital: createEmptyHospitalProfile(),
    planning: createEmptyItemPlanning(),
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
    hospital: _hospital,
    planning: _planning,
    baby: _baby,
    household: _household,
    ...current
  } = backupData();
  void _hospital;
  void _planning;
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
    saveHospitalProfile(
      hospitalProfile({
        hospitalName: "市妇幼保健院",
        address: "健康路 1 号",
      }),
    );

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
        "hospital",
        "planning",
        "baby",
        "household",
      ].sort(),
    );
    expect(exported).toMatchObject({
      version: 9,
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
      hospital: {
        fields: {
          hospitalName: { value: "市妇幼保健院", updatedAt: 100 },
          address: { value: "健康路 1 号", updatedAt: 100 },
        },
      },
      planning: createEmptyItemPlanning(),
    });
    expect(Number.isNaN(Date.parse(exported.exportedAt))).toBe(false);
  });

  it("round-trips a complete v7 backup including hospital and planning data", () => {
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
      hospital: hospitalProfile({
        hospitalName: "中心医院",
        maternityPhone: "+86 (010) 1234-5678",
      }),
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
    expect(loadHospitalProfile()).toEqual(payload.hospital);
    expect(exportData().version).toBe(9);
  });

  it("keeps hospital but safely clears planning on a manual v6 restore", () => {
    installBrowserStorage();
    const currentPlanning = createEmptyItemPlanning();
    const futureTimestamp = Date.now() + 10_000;
    currentPlanning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assigneeIds: { value: ["legacy-dad-v1"], updatedAt: futureTimestamp },
    };
    saveItemPlanning(currentPlanning);
    const latest = backupData({
      hospital: hospitalProfile({ hospitalName: "v6 医院" }),
    });
    const { planning: _planning, baby: _baby, household: _household, ...withoutPlanning } = latest;
    void _planning;
    void _baby;
    void _household;
    const v6 = { ...withoutPlanning, version: 6 as const };

    const result = importData(JSON.stringify(v6));

    expect(result).toEqual({
      ok: true,
      message: "导入成功（v6 备份不包含家庭分工与采购信息，相关信息已清空）",
    });
    expect(loadHospitalProfile().fields.hospitalName.value).toBe("v6 医院");
    expect(loadItemPlanning().items).toEqual({});
    expect(loadItemPlanning().clearedAt).toBeGreaterThan(futureTimestamp);
  });

  it("fully restores planning timestamps from a manual v7 backup", () => {
    installBrowserStorage();
    const planning = createEmptyItemPlanning();
    planning.clearedAt = 50;
    planning.items.bag = {
      ...createEmptyItemPlanningRecord(50),
      assigneeIds: { value: ["legacy-dad-v1", "legacy-mom-v1"], updatedAt: 60 },
      actualPriceFen: { value: 999, updatedAt: 70 },
    };
    const result = importData(JSON.stringify(backupData({ planning })));
    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadItemPlanning()).toEqual(planning);
  });

  it("rolls back every storage key if planning persistence fails", () => {
    const storage = installBrowserStorage();
    saveChecklist([testItem("before")]);
    const before = new Map(storage.localValues);
    failNextStorageWrite(STORAGE_KEYS.planning);

    const result = importData(JSON.stringify(backupData({ checklist: [testItem("after")] })));

    expect(result.ok).toBe(false);
    expect(storage.localValues).toEqual(before);
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
  ])("treats a manual %s import as a full restore and clears hospital data", (
    label,
    createLegacy,
  ) => {
    installBrowserStorage();
    saveHospitalProfile(
      hospitalProfile({
        hospitalName: "导入前医院",
        address: "导入前地址",
      }),
    );

    const result = importData(JSON.stringify(createLegacy()));

    expect(result.ok).toBe(true);
    expect(result.message).toContain(`旧版 ${label}`);
    expect(result.message).toContain("医院档案已清空");
    expect(loadHospitalProfile()).toEqual(createEmptyHospitalProfile());
    expect(loadItemPlanning().items).toEqual({});
    expect(loadItemPlanning().clearedAt).toBeGreaterThan(0);
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
      message: "导入成功（旧版 v5 备份不包含医院档案，医院档案已清空；不包含家庭分工与采购信息，相关信息已清空）",
    });
    expect(loadChecklist()[0]).not.toHaveProperty("futureField");
    expect(exportData()).not.toHaveProperty("futureBackupField");
  });

  it("rejects unknown top-level structures in a v6 backup", () => {
    installBrowserStorage();

    const result = importData(
      JSON.stringify({
        ...backupData(),
        __protoPollutionAttempt: { polluted: true },
      }),
    );

    expect(result.ok).toBe(false);
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

  it("stores only the exact v7 portable payload", () => {
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
        "planning",
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

  it("creates a snapshot when planning is the only meaningful data", () => {
    installBrowserStorage();
    const planning = createEmptyItemPlanning();
    planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      storageLocation: { value: "车内", updatedAt: 10 },
    };
    saveItemPlanning(planning);

    const snapshot = createSnapshot("只有 planning");
    expect(snapshot?.data.version).toBe(7);
    if (snapshot?.data.version !== 7) throw new Error("缺少 v7 planning 快照");
    expect(snapshot.data.planning.version).toBe(1);
    expect(snapshot.data.planning.items.bag.storageLocation.value).toBe("车内");
  });

  it("restores hospital and planning data from a v7 local snapshot", () => {
    installBrowserStorage();
    saveChecklist([testItem("snapshot-hospital")]);
    const targetHospital = hospitalProfile(
      { hospitalName: "目标医院", address: "目标地址" },
      200,
    );
    saveHospitalProfile(targetHospital);
    const target = createSnapshot("医院档案恢复点");

    saveHospitalProfile(
      hospitalProfile({ hospitalName: "当前医院", address: "当前地址" }, 300),
    );
    const result = restoreSnapshot(target?.id ?? "");

    expect(result.ok).toBe(true);
    expect(loadHospitalProfile()).toEqual(targetHospital);
  });

  it("restores a legacy v6 snapshot with hospital and a planning clear tombstone", () => {
    installBrowserStorage();
    const planning = createEmptyItemPlanning();
    const futureTimestamp = Date.now() + 20_000;
    planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assigneeIds: { value: ["legacy-family-v1"], updatedAt: futureTimestamp },
    };
    saveItemPlanning(planning);
    const latest = backupData({
      hospital: hospitalProfile({ hospitalName: "快照医院" }),
    });
    const { planning: _planning, baby: _baby, household: _household, ...withoutPlanning } = latest;
    void _planning;
    void _baby;
    void _household;
    const v6: DadKitExportDataV6 = { ...withoutPlanning, version: 6 };
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
    expect(loadHospitalProfile().fields.hospitalName.value).toBe("快照医院");
    expect(loadItemPlanning().items).toEqual({});
    expect(loadItemPlanning().clearedAt).toBeGreaterThan(futureTimestamp);
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
