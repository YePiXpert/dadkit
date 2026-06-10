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
});
