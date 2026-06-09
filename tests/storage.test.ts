import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSnapshot,
  exportData,
  importData,
  loadChecklist,
  loadChecklistMode,
  loadSnapshots,
  loadUserProfile,
  restoreSnapshot,
  saveChecklist,
  saveChecklistMode,
  saveUserProfile,
  STORAGE_KEYS,
} from "@/lib/storage";
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
