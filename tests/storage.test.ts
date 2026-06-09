import { afterEach, describe, expect, it, vi } from "vitest";

import {
  exportData,
  importData,
  loadChecklist,
  loadChecklistMode,
  saveChecklist,
  saveChecklistMode,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { ChecklistItem } from "@/lib/types";

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
});
