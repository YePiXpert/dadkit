import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadSnapshots,
  saveChecklist,
  saveUserProfile,
  STORAGE_KEYS,
} from "@/lib/storage";
import {
  calculateContractionStats,
  generateBirthPlanShareText,
  mergeBirthPlan,
  mergePostpartumTasks,
} from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";
import type {
  ChecklistItem,
  HospitalAnswerStatus,
  UserProfile,
} from "@/lib/types";

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

function testQuestion(id = "question-1"): ChecklistItem {
  return {
    ...testItem(id),
    category: "hospital_questions",
    itemKind: "question",
    bag: "none",
    timing: "confirm_with_hospital",
  };
}

function testTask(id = "task-1"): ChecklistItem {
  return {
    ...testItem(id),
    category: "partner",
    itemKind: "task",
    bag: "none",
    timing: "prepare_now",
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

function resetStoreState() {
  useDadKitStore.setState({
    hydrated: false,
    profile: undefined,
    checklist: [],
    checklistMode: "lean",
    customItems: [],
    hiddenTemplateItemIds: [],
    hospitalOverrides: [],
    hospitalAnswers: [],
    timelineTaskStatuses: [],
    contractions: [],
    birthPlan: mergeBirthPlan(),
    postpartumTasks: mergePostpartumTasks(),
    filters: {
      category: "all",
      status: "all",
      priority: "all",
    },
  });
}

afterEach(() => {
  resetStoreState();
  vi.unstubAllGlobals();
});

describe("store snapshots", () => {
  it("creates a snapshot before importJson", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before-import")];

    saveUserProfile(profile);
    saveChecklist(checklist);

    const result = useDadKitStore.getState().importJson(
      JSON.stringify({
        version: 1,
        exportedAt: "2026-06-09T00:00:00.000Z",
        userProfile: testProfile("2026-08-01"),
        checklist: [testItem("after-import")],
        customItems: [],
        hiddenTemplateItemIds: [],
        hospitalOverrides: [],
        checklistMode: "full",
      }),
    );
    const snapshots = loadSnapshots();

    expect(result.ok).toBe(true);
    expect(snapshots[0]?.reason).toBe("导入 JSON 前");
    expect(snapshots[0]?.data.userProfile).toEqual(profile);
    expect(snapshots[0]?.data.checklist).toEqual(checklist);
  });

  it("does not create a snapshot when importJson validation fails", () => {
    installLocalStorage();

    saveUserProfile(testProfile());
    saveChecklist([testItem("before-invalid-import")]);

    const result = useDadKitStore.getState().importJson("{bad json");

    expect(result.ok).toBe(false);
    expect(loadSnapshots()).toEqual([]);
  });

  it("creates a snapshot before createProfile replaces existing data", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before-create")];

    saveUserProfile(profile);
    saveChecklist(checklist);

    useDadKitStore.getState().createProfile({
      dueDate: "2026-08-01",
      hospitalMode: "unknown",
      deliveryMode: "unknown",
    });

    const snapshots = loadSnapshots();

    expect(snapshots[0]?.reason).toBe("创建新清单前");
    expect(snapshots[0]?.data.userProfile).toEqual(profile);
    expect(snapshots[0]?.data.checklist).toEqual(checklist);
  });

  it("does not create a snapshot when updateProfile persists profile changes", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before-update")];

    saveUserProfile(profile);
    saveChecklist(checklist);
    useDadKitStore.setState({ profile, checklist });

    useDadKitStore.getState().updateProfile({ dueDate: "2026-08-01" });

    const snapshots = loadSnapshots();

    expect(snapshots).toEqual([]);
    expect(useDadKitStore.getState().profile?.dueDate).toBe("2026-08-01");
  });

  it("adds, deletes, and clears contraction records", () => {
    installLocalStorage();

    useDadKitStore.getState().addContraction({
      startedAt: "2026-06-10T11:10:00.000Z",
      endedAt: "2026-06-10T11:11:00.000Z",
    });
    useDadKitStore.getState().addContraction({
      startedAt: "2026-06-10T11:20:00.000Z",
      endedAt: "2026-06-10T11:22:00.000Z",
    });

    const records = useDadKitStore.getState().contractions;

    expect(records).toHaveLength(2);
    expect(calculateContractionStats(records, new Date("2026-06-10T11:30:00Z"))).toMatchObject({
      averageDurationSeconds: 90,
      averageIntervalSeconds: 600,
    });

    useDadKitStore.getState().deleteContraction(records[0].id);
    expect(useDadKitStore.getState().contractions).toHaveLength(1);

    useDadKitStore.getState().clearContractions();
    expect(useDadKitStore.getState().contractions).toEqual([]);
  });

  it("saves birth-plan fields and exports them without WebDAV secrets", () => {
    const store = installLocalStorage({
      [STORAGE_KEYS.webDavSecret]: "secret-password",
    });

    useDadKitStore.getState().saveBirthPlan({
      emergencyContact: "爸爸 13800000000",
      supportPerson: "爸爸",
    });

    const plan = useDadKitStore.getState().birthPlan;
    const exportedJson = useDadKitStore.getState().exportJson();

    expect(plan.emergencyContact).toBe("爸爸 13800000000");
    expect(generateBirthPlanShareText(plan)).toContain("DadKit 临出门沟通卡");
    expect(generateBirthPlanShareText(plan)).toContain("爸爸 13800000000");
    expect(JSON.parse(exportedJson).birthPlan.supportPerson).toBe("爸爸");
    expect(exportedJson).not.toContain("secret-password");
    expect(store.get(STORAGE_KEYS.webDavSecret)).toBe("secret-password");
  });

  it("saves postpartum task status and note", () => {
    installLocalStorage();
    const taskId = useDadKitStore.getState().postpartumTasks[0].id;

    useDadKitStore.getState().updatePostpartumTask(taskId, {
      status: "done",
      note: "电话确认",
    });

    expect(useDadKitStore.getState().postpartumTasks[0]).toMatchObject({
      id: taskId,
      status: "done",
      note: "电话确认",
    });

    useDadKitStore.getState().updatePostpartumTask(taskId, {
      status: "not_needed",
    });

    expect(useDadKitStore.getState().postpartumTasks[0]).toMatchObject({
      id: taskId,
      status: "not_needed",
      note: "电话确认",
    });
  });

  it("toggles question items between pending and confirmed", () => {
    installLocalStorage();
    const question = testQuestion();

    useDadKitStore.setState({ checklist: [question], customItems: [] });

    useDadKitStore.getState().cycleItemStatus(question.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("packed");

    useDadKitStore.getState().cycleItemStatus(question.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("todo");
  });

  it("toggles task items between pending and done", () => {
    installLocalStorage();
    const task = testTask();

    useDadKitStore.setState({ checklist: [task], customItems: [] });

    useDadKitStore.getState().cycleItemStatus(task.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("packed");

    useDadKitStore.getState().cycleItemStatus(task.id);
    expect(useDadKitStore.getState().checklist[0].status).toBe("todo");
  });

  it("adds hospital-provided id when a provided answer is saved", () => {
    installLocalStorage();
    const profile = testProfile();
    const question = {
      ...testQuestion("question-pad"),
      name: "医院是否提供产褥垫？",
    };

    useDadKitStore.setState({ profile, checklist: [question], hospitalAnswers: [] });

    useDadKitStore.getState().updateHospitalAnswer({
      itemId: question.id,
      name: question.name,
      status: "provided",
      updatedAt: "2026-06-09T00:00:00.000Z",
    });

    expect(
      useDadKitStore.getState().profile?.hospitalProvidedItemIds,
    ).toContain("postpartum-pads");
    expect(useDadKitStore.getState().hospitalAnswers[0]).toMatchObject({
      itemId: question.id,
      status: "provided",
    });
    expect(loadSnapshots()).toEqual([]);
  });

  it("adds hospital-provided id when a partial answer is saved", () => {
    installLocalStorage();
    const profile = testProfile();
    const question = {
      ...testQuestion("question-provided-postpartum-pads"),
      name: "医院是否提供产褥垫？",
    };

    useDadKitStore.setState({ profile, checklist: [question], hospitalAnswers: [] });

    useDadKitStore.getState().updateHospitalAnswer({
      itemId: question.id,
      name: question.name,
      status: "partial",
      updatedAt: "2026-06-09T00:00:00.000Z",
    });

    expect(
      useDadKitStore.getState().profile?.hospitalProvidedItemIds,
    ).toContain("postpartum-pads");
    expect(loadSnapshots()).toEqual([]);
  });

  it("removes hospital-provided id when a not_provided answer is saved", () => {
    installLocalStorage();
    const profile = testProfile();
    const question = {
      ...testQuestion("question-pad"),
      name: "医院是否提供产褥垫？",
    };

    useDadKitStore.setState({
      profile: {
        ...profile,
        hospitalProvidedItemIds: ["postpartum-pads"],
      },
      checklist: [question],
      hospitalAnswers: [],
    });

    useDadKitStore.getState().updateHospitalAnswer({
      itemId: question.id,
      name: question.name,
      status: "not_provided",
      updatedAt: "2026-06-09T00:00:00.000Z",
    });

    expect(
      useDadKitStore.getState().profile?.hospitalProvidedItemIds,
    ).not.toContain("postpartum-pads");
    expect(useDadKitStore.getState().hospitalAnswers[0]).toMatchObject({
      itemId: question.id,
      status: "not_provided",
    });
    expect(loadSnapshots()).toEqual([]);
  });

  it.each(["todo", "not_needed", "confirmed"] satisfies HospitalAnswerStatus[])(
    "removes hospital-provided id when a %s answer is saved",
    (status) => {
      installLocalStorage();
      const profile = testProfile();
      const question = {
        ...testQuestion("question-provided-postpartum-pads"),
        name: "医院是否提供产褥垫？",
      };

      useDadKitStore.setState({
        profile: {
          ...profile,
          hospitalProvidedItemIds: ["postpartum-pads"],
        },
        checklist: [question],
        hospitalAnswers: [],
      });

      useDadKitStore.getState().updateHospitalAnswer({
        itemId: question.id,
        name: question.name,
        status,
        updatedAt: "2026-06-09T00:00:00.000Z",
      });

      expect(
        useDadKitStore.getState().profile?.hospitalProvidedItemIds,
      ).not.toContain("postpartum-pads");
      expect(useDadKitStore.getState().hospitalAnswers[0]).toMatchObject({
        itemId: question.id,
        status,
      });
      expect(loadSnapshots()).toEqual([]);
    },
  );
});
