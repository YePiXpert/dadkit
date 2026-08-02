import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { ITEM_PLANNING_STORAGE_KEY } from "@/lib/planning/repository";
import { useItemPlanningStore } from "@/lib/planning/store";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";

const emptyDraft = {
  assignee: "unassigned" as const,
  dueDate: "",
  estimatedPrice: "",
  actualPrice: "",
  purchaseChannel: "",
  storageLocation: "",
};

beforeEach(() => {
  useItemPlanningStore.setState({ hydrated: false, planning: createEmptyItemPlanning() });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T08:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("item planning store", () => {
  it("hydrates only once", () => {
    const storage = installBrowserStorage();
    useItemPlanningStore.getState().hydrate();
    useItemPlanningStore.getState().hydrate();
    expect(storage.reads.filter((key) => key === ITEM_PLANNING_STORAGE_KEY)).toHaveLength(1);
  });

  it("saves once and timestamps only changed fields", () => {
    const storage = installBrowserStorage();
    useItemPlanningStore.setState({ hydrated: true });
    const result = useItemPlanningStore.getState().saveItemDraft("bag", {
      ...emptyDraft,
      assignee: "dad",
      actualPrice: "12.30",
    });
    const record = useItemPlanningStore.getState().planning.items.bag;
    expect(result).toEqual({ ok: true, changed: true });
    expect(storage.writes).toEqual([ITEM_PLANNING_STORAGE_KEY]);
    expect(record.assignee.updatedAt).toBe(Date.now());
    expect(record.actualPriceFen.updatedAt).toBe(Date.now());
    expect(record.dueDate.updatedAt).toBe(0);

    useItemPlanningStore.getState().saveItemDraft("bag", {
      ...emptyDraft,
      assignee: "dad",
      actualPrice: "",
    });
    expect(useItemPlanningStore.getState().planning.items.bag.actualPriceFen).toEqual({
      value: null,
      updatedAt: Date.now() + 1,
    });
  });

  it("clears one item with a shared newer tombstone", () => {
    installBrowserStorage();
    const planning = createEmptyItemPlanning();
    planning.items.bag = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "mom", updatedAt: Date.now() + 10_000 },
    };
    useItemPlanningStore.setState({ hydrated: true, planning });
    useItemPlanningStore.getState().clearItem("bag");
    const record = useItemPlanningStore.getState().planning.items.bag;
    expect(new Set(Object.values(record).map((field) => field.updatedAt))).toEqual(
      new Set([Date.now() + 10_001]),
    );
  });

  it("bulk-updates once, keeps untouched fields and records explicit clears", () => {
    const storage = installBrowserStorage();
    const planning = createEmptyItemPlanning();
    planning.items.a = {
      ...createEmptyItemPlanningRecord(),
      dueDate: { value: "2026-08-02", updatedAt: 10 },
      actualPriceFen: { value: 500, updatedAt: 20 },
    };
    useItemPlanningStore.setState({ hydrated: true, planning });
    const result = useItemPlanningStore.getState().bulkUpdate(["a", "b"], {
      assignee: { mode: "set", value: "shared" },
      dueDate: { mode: "clear" },
      storageLocation: { mode: "keep" },
    });
    const next = useItemPlanningStore.getState().planning;
    expect(result.ok).toBe(true);
    expect(storage.writes).toEqual([ITEM_PLANNING_STORAGE_KEY]);
    expect(next.items.a.actualPriceFen).toEqual({ value: 500, updatedAt: 20 });
    expect(next.items.a.dueDate.value).toBe("");
    expect(next.items.a.dueDate.updatedAt).toBe(next.items.b.dueDate.updatedAt);
  });

  it("globally clears with a timestamp newer than future data", () => {
    installBrowserStorage();
    const planning = createEmptyItemPlanning();
    planning.items.a = {
      ...createEmptyItemPlanningRecord(),
      assignee: { value: "dad", updatedAt: Date.now() + 20_000 },
    };
    useItemPlanningStore.setState({ hydrated: true, planning });
    useItemPlanningStore.getState().clearAll();
    expect(useItemPlanningStore.getState().planning).toEqual({
      version: 1,
      clearedAt: Date.now() + 20_001,
      items: {},
    });
  });
});
