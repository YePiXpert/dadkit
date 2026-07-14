import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSnapshot,
  exportData,
  importData,
  loadBirthPlan,
  loadChecklist,
  loadChecklistMode,
  loadContractions,
  loadHospitalAnswers,
  loadPostpartumTasks,
  loadSnapshots,
  loadUserProfile,
  restoreSnapshot,
  saveBirthPlan,
  saveChecklist,
  saveChecklistMode,
  saveContractions,
  saveHospitalAnswers,
  savePostpartumTasks,
  saveUserProfile,
  STORAGE_KEYS,
} from "@/lib/storage";
import { DEFAULT_POSTPARTUM_TASKS, mergeBirthPlan } from "@/lib/rc";
import type { ChecklistItem, HospitalAnswer, UserProfile } from "@/lib/types";

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };

  vi.stubGlobal("window", { localStorage });

  return store;
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

function testItem(id = "item-1"): ChecklistItem {
  return {
    id,
    name: "测试物品",
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    sourceLabel: "测试",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
  };
}

function testProfile(dueDate = "2026-07-21"): UserProfile {
  return {
    dueDate,
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-09T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:00.000Z",
  };
}

function testHospitalAnswer(itemId = "question-1"): HospitalAnswer {
  return {
    itemId,
    name: "医院是否提供产褥垫？",
    status: "provided",
    note: "产检电话确认",
    updatedAt: "2026-06-09T00:00:00.000Z",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage import/export", () => {
  it("saves, loads, exports, and imports checklistMode", () => {
    installLocalStorage();

    saveChecklistMode("full");

    expect(loadChecklistMode()).toBe("full");
    expect(exportData().checklistMode).toBe("full");

    saveChecklistMode("lean");

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadChecklistMode()).toBe("full");
  });

  it("returns ok:false for invalid JSON without modifying localStorage", () => {
    const store = installLocalStorage();

    saveChecklist([testItem()]);
    const before = store.get(STORAGE_KEYS.checklist);
    const result = importData("{bad json");

    expect(result.ok).toBe(false);
    expect(result.message).toBe("JSON 格式不正确，未修改本地数据。");
    expect(store.get(STORAGE_KEYS.checklist)).toBe(before);
  });

  it("returns ok:false for unsupported versions", () => {
    installLocalStorage();

    const result = importData(
      JSON.stringify({
        version: 2,
        exportedAt: "2026-06-09T00:00:00.000Z",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toBe("不支持的备份版本，未修改本地数据。");
  });

  it("exports an absent profile explicitly and imports null by removing a profile", () => {
    installLocalStorage();

    const exported = exportData();

    expect(exported.userProfile).toBeNull();
    expect(JSON.parse(JSON.stringify(exported))).toHaveProperty(
      "userProfile",
      null,
    );

    saveUserProfile(testProfile());

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        userProfile: null,
      }),
    );

    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadUserProfile()).toBeUndefined();
  });

  it("keeps an existing profile when importing a legacy backup that omits it", () => {
    installLocalStorage();
    const profile = testProfile();

    saveUserProfile(profile);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadUserProfile()).toEqual(profile);
  });

  it("rejects malformed user profiles including nested fields", () => {
    installLocalStorage();
    const profile = testProfile();

    saveUserProfile(profile);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        userProfile: {
          ...testProfile("2026-08-01"),
          hospitalProvidedItemIds: [123],
        },
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain("userProfile 内容无效");
    expect(loadUserProfile()).toEqual(profile);
  });

  it.each([
    ["checklist", [{ ...testItem(), status: "invalid" }]],
    ["customItems", [{ ...testItem(), appliesTo: { deliveryMode: ["invalid"] } }]],
    ["hiddenTemplateItemIds", [123]],
    ["hospitalOverrides", [{}]],
    ["hospitalAnswers", [{ ...testHospitalAnswer(), hospitalId: 123 }]],
    ["timelineTaskStatuses", [{}]],
    ["contractions", [{}]],
    ["postpartumTasks", [{}]],
  ])("rejects invalid members in %s", (field, value) => {
    installLocalStorage();
    const existingChecklist = [testItem("existing")];

    saveChecklist(existingChecklist);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        [field]: value,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toContain(`${field} 包含无效数据`);
    expect(loadChecklist()).toEqual(existingChecklist);
  });

  it("rolls back every field when an import write fails", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before")];

    saveUserProfile(profile);
    saveChecklist(checklist);
    saveChecklistMode("lean");
    failNextStorageWrite(STORAGE_KEYS.checklist);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        userProfile: testProfile("2026-08-01"),
        checklist: [testItem("after")],
        checklistMode: "full",
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "导入失败，未修改本地数据。",
    });
    expect(loadUserProfile()).toEqual(profile);
    expect(loadChecklist()).toEqual(checklist);
    expect(loadChecklistMode()).toBe("lean");
  });

  it("does not clear existing arrays when import omits array fields", () => {
    installLocalStorage();
    const existingChecklist = [testItem()];

    saveChecklist(existingChecklist);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadChecklist()).toEqual(existingChecklist);
    expect(loadChecklistMode()).toBe("full");
  });

  it("saves, loads, exports, and imports hospitalAnswers", () => {
    installLocalStorage();
    const answers = [testHospitalAnswer()];

    saveHospitalAnswers(answers);

    expect(loadHospitalAnswers()).toEqual(answers);
    expect(exportData().hospitalAnswers).toEqual(answers);

    const nextAnswers = [
      { ...testHospitalAnswer("question-2"), status: "not_provided" as const },
    ];
    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        hospitalAnswers: nextAnswers,
      }),
    );

    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadHospitalAnswers()).toEqual(nextAnswers);
  });

  it("does not clear hospitalAnswers when import omits hospitalAnswers", () => {
    installLocalStorage();
    const answers = [testHospitalAnswer()];

    saveHospitalAnswers(answers);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadHospitalAnswers()).toEqual(answers);
  });

  it("saves, loads, exports, and imports v0.4 local data", () => {
    const store = installLocalStorage();
    const contractions = [
      {
        id: "contraction-1",
        startedAt: "2026-06-10T11:00:00.000Z",
        endedAt: "2026-06-10T11:01:00.000Z",
        durationSeconds: 60,
      },
    ];
    const birthPlan = mergeBirthPlan({
      emergencyContact: "爸爸 13800000000",
      hospitalPhone: "产科电话",
    });
    const postpartumTasks = [
      {
        ...DEFAULT_POSTPARTUM_TASKS[0],
        status: "done" as const,
        note: "电话确认",
      },
    ];

    saveContractions(contractions);
    saveBirthPlan(birthPlan);
    savePostpartumTasks(postpartumTasks);
    store.set(STORAGE_KEYS.webDavSecret, "should-not-export");

    const exported = exportData();

    expect(exported.contractions).toEqual(contractions);
    expect(exported.birthPlan).toEqual(birthPlan);
    expect(exported.postpartumTasks[0]).toMatchObject(postpartumTasks[0]);
    expect(JSON.stringify(exported)).not.toContain("should-not-export");

    const nextContractions = [
      {
        id: "contraction-2",
        startedAt: "2026-06-10T12:00:00.000Z",
        endedAt: "2026-06-10T12:02:00.000Z",
        durationSeconds: 120,
      },
    ];
    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-10T00:00:00.000Z",
        contractions: nextContractions,
        birthPlan: { supportPerson: "爸爸" },
        postpartumTasks,
      }),
    );

    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadContractions()).toEqual(nextContractions);
    expect(loadBirthPlan().supportPerson).toBe("爸爸");
    expect(loadPostpartumTasks()[0]).toMatchObject(postpartumTasks[0]);
  });

  it("preserves admission route details through birthPlan export and import", () => {
    installLocalStorage();
    const birthPlan = mergeBirthPlan({
      hospitalPhone: "010-12345678",
      hospitalAddress: "北京市朝阳区示例医院产科楼",
      hospitalRouteNotes: "走东门，到住院部 3 层产科",
      nightEntranceNotes: "夜间走急诊入口，先到分诊台",
      parkingNotes: "家属车停地下 B2，保留停车票",
    });

    saveBirthPlan(birthPlan);

    const exported = exportData();

    expect(exported.birthPlan).toMatchObject({
      hospitalPhone: "010-12345678",
      hospitalAddress: "北京市朝阳区示例医院产科楼",
      hospitalRouteNotes: "走东门，到住院部 3 层产科",
      nightEntranceNotes: "夜间走急诊入口，先到分诊台",
      parkingNotes: "家属车停地下 B2，保留停车票",
    });

    saveBirthPlan(mergeBirthPlan());

    const result = importData(JSON.stringify(exported));

    expect(result.ok).toBe(true);
    expect(loadBirthPlan()).toMatchObject({
      hospitalPhone: "010-12345678",
      hospitalAddress: "北京市朝阳区示例医院产科楼",
      hospitalRouteNotes: "走东门，到住院部 3 层产科",
      nightEntranceNotes: "夜间走急诊入口，先到分诊台",
      parkingNotes: "家属车停地下 B2，保留停车票",
    });
  });

  it("does not clear v0.4 local data when old JSON omits new fields", () => {
    installLocalStorage();
    const contractions = [
      {
        id: "contraction-1",
        startedAt: "2026-06-10T11:00:00.000Z",
        endedAt: "2026-06-10T11:01:00.000Z",
        durationSeconds: 60,
      },
    ];
    const birthPlan = mergeBirthPlan({ emergencyContact: "爸爸" });
    const postpartumTasks = [
      {
        ...DEFAULT_POSTPARTUM_TASKS[0],
        status: "done" as const,
        note: "已问",
      },
    ];

    saveContractions(contractions);
    saveBirthPlan(birthPlan);
    savePostpartumTasks(postpartumTasks);

    const result = importData(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-10T00:00:00.000Z",
        checklistMode: "full",
      }),
    );

    expect(result.ok).toBe(true);
    expect(loadContractions()).toEqual(contractions);
    expect(loadBirthPlan()).toEqual(birthPlan);
    expect(loadPostpartumTasks()[0]).toMatchObject(postpartumTasks[0]);
  });

  it("keeps only the latest 5 snapshots", () => {
    installLocalStorage();

    saveChecklist([testItem("existing")]);

    for (let index = 1; index <= 7; index += 1) {
      createSnapshot(`备份 ${index}`);
    }

    const snapshots = loadSnapshots();

    expect(snapshots).toHaveLength(5);
    expect(snapshots.map((snapshot) => snapshot.reason)).toEqual([
      "备份 7",
      "备份 6",
      "备份 5",
      "备份 4",
      "备份 3",
    ]);
  });

  it("throws when a recovery snapshot cannot be persisted", () => {
    installLocalStorage();

    saveChecklist([testItem("existing")]);
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    expect(() => createSnapshot("必须成功的备份")).toThrow(
      "无法保存本地恢复快照，操作已中止。",
    );
    expect(loadSnapshots()).toEqual([]);
  });

  it("restores userProfile, checklist, and checklistMode from a snapshot", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before")];

    saveUserProfile(profile);
    saveChecklist(checklist);
    saveChecklistMode("full");

    const snapshot = createSnapshot("恢复测试");

    saveUserProfile(testProfile("2026-08-01"));
    saveChecklist([testItem("after")]);
    saveChecklistMode("lean");

    const result = restoreSnapshot(snapshot?.id ?? "");

    expect(result).toEqual({ ok: true, message: "导入成功" });
    expect(loadUserProfile()).toEqual(profile);
    expect(loadChecklist()).toEqual(checklist);
    expect(loadChecklistMode()).toBe("full");
  });

  it("creates a snapshot before restoring a snapshot", () => {
    installLocalStorage();

    saveUserProfile(testProfile("2026-07-21"));
    saveChecklist([testItem("original")]);
    const snapshot = createSnapshot("要恢复的备份");

    saveUserProfile(testProfile("2026-08-01"));
    saveChecklist([testItem("current")]);

    const result = restoreSnapshot(snapshot?.id ?? "");
    const snapshots = loadSnapshots();

    expect(result.ok).toBe(true);
    expect(snapshots[0]?.reason).toBe("恢复本地备份前");
    expect(snapshots[0]?.data.checklist).toEqual([testItem("current")]);
  });

  it("keeps the recovery snapshot when restoring fails but the import rolls back", () => {
    installLocalStorage();

    saveUserProfile(testProfile("2026-07-21"));
    saveChecklist([testItem("snapshot")]);
    const snapshot = createSnapshot("目标备份");

    const currentProfile = testProfile("2026-08-01");
    const currentChecklist = [testItem("current")];
    saveUserProfile(currentProfile);
    saveChecklist(currentChecklist);
    failNextStorageWrite(STORAGE_KEYS.checklist);

    const result = restoreSnapshot(snapshot?.id ?? "");
    const recoverySnapshot = loadSnapshots()[0];

    expect(result).toEqual({
      ok: false,
      message: "导入失败，未修改本地数据。",
    });
    expect(loadUserProfile()).toEqual(currentProfile);
    expect(loadChecklist()).toEqual(currentChecklist);
    expect(recoverySnapshot?.reason).toBe("恢复本地备份前");
    expect(recoverySnapshot?.data.userProfile).toEqual(currentProfile);
    expect(recoverySnapshot?.data.checklist).toEqual(currentChecklist);
  });

  it("keeps the recovery snapshot when the failed import cannot fully roll back", () => {
    installLocalStorage();

    saveUserProfile(testProfile("2026-07-21"));
    saveChecklist([testItem("snapshot")]);
    const snapshot = createSnapshot("目标备份");

    const currentProfile = testProfile("2026-08-01");
    const currentChecklist = [testItem("current")];
    saveUserProfile(currentProfile);
    saveChecklist(currentChecklist);

    const setItem = window.localStorage.setItem.bind(window.localStorage);
    let profileWrites = 0;
    let checklistWrites = 0;

    vi.spyOn(window.localStorage, "setItem").mockImplementation(
      (candidateKey, value) => {
        if (candidateKey === STORAGE_KEYS.userProfile) {
          profileWrites += 1;

          if (profileWrites === 2) {
            throw new Error("simulated rollback failure");
          }
        }

        if (candidateKey === STORAGE_KEYS.checklist) {
          checklistWrites += 1;

          if (checklistWrites === 1) {
            throw new Error("simulated import failure");
          }
        }

        setItem(candidateKey, value);
      },
    );

    const result = restoreSnapshot(snapshot?.id ?? "");
    const recoverySnapshot = loadSnapshots()[0];

    expect(result).toEqual({
      ok: false,
      message: "导入失败，且本地数据无法完整回滚，请从备份恢复。",
    });
    expect(recoverySnapshot?.reason).toBe("恢复本地备份前");
    expect(recoverySnapshot?.data.userProfile).toEqual(currentProfile);
    expect(recoverySnapshot?.data.checklist).toEqual(currentChecklist);
  });

  it("does not restore when the pre-restore recovery snapshot cannot be saved", () => {
    installLocalStorage();

    saveUserProfile(testProfile("2026-07-21"));
    saveChecklist([testItem("snapshot")]);
    const snapshot = createSnapshot("目标备份");

    const currentProfile = testProfile("2026-08-01");
    const currentChecklist = [testItem("current")];
    saveUserProfile(currentProfile);
    saveChecklist(currentChecklist);
    failNextStorageWrite(STORAGE_KEYS.snapshots);

    const result = restoreSnapshot(snapshot?.id ?? "");

    expect(result).toEqual({
      ok: false,
      message: "恢复失败，未修改本地数据。",
    });
    expect(loadUserProfile()).toEqual(currentProfile);
    expect(loadChecklist()).toEqual(currentChecklist);
    expect(loadSnapshots().map((candidate) => candidate.reason)).toEqual([
      "目标备份",
    ]);
  });
});
