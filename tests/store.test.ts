import { afterEach, describe, expect, it, vi } from "vitest";

import {
  loadSnapshots,
  saveChecklist,
  saveUserProfile,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem, UserProfile } from "@/lib/types";

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

  it("creates a snapshot before updateProfile persists profile changes", () => {
    installLocalStorage();
    const profile = testProfile();
    const checklist = [testItem("before-update")];

    saveUserProfile(profile);
    saveChecklist(checklist);
    useDadKitStore.setState({ profile, checklist });

    useDadKitStore.getState().updateProfile({ dueDate: "2026-08-01" });

    const snapshots = loadSnapshots();

    expect(snapshots[0]?.reason).toBe("修改个人资料前");
    expect(snapshots[0]?.data.userProfile).toEqual(profile);
    expect(snapshots[0]?.data.checklist).toEqual(checklist);
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
});
