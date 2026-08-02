import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyItemPlanning, createEmptyItemPlanningDraft, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { ITEM_PLANNING_STORAGE_KEY } from "@/lib/planning/repository";
import { useItemPlanningStore } from "@/lib/planning/store";
import { installBrowserStorage } from "@/tests/helpers/browser-storage";

beforeEach(() => {
  installBrowserStorage();
  useItemPlanningStore.setState({ hydrated: false, planning: createEmptyItemPlanning() });
});

describe("planning v2 store", () => {
  it("saves one or multiple assignees", () => {
    useItemPlanningStore.getState().hydrate();
    const result = useItemPlanningStore.getState().saveItemDraft("bag", { ...createEmptyItemPlanningDraft(), assigneeIds: ["member-b", "member-a"] });
    expect(result.ok).toBe(true);
    expect(useItemPlanningStore.getState().planning.items.bag.assigneeIds.value).toEqual(["member-a", "member-b"]);
  });

  it("bulk replaces or clears only assignees", () => {
    const storage = installBrowserStorage();
    const initial = createEmptyItemPlanning();
    initial.items.a = {
      ...createEmptyItemPlanningRecord(),
      dueDate: { value: "2026-09-01", updatedAt: 50 },
      storageLocation: { value: "柜子", updatedAt: 60 },
    };
    useItemPlanningStore.setState({ hydrated: true, planning: initial });
    window.localStorage.setItem(ITEM_PLANNING_STORAGE_KEY, JSON.stringify(initial));
    const beforeWrites = storage.writes.length;
    useItemPlanningStore.getState().bulkUpdate(["a", "b"], { assigneeIds: { mode: "set", value: ["member-a"] } });
    expect(useItemPlanningStore.getState().planning.items.a.assigneeIds.value).toEqual(["member-a"]);
    expect(useItemPlanningStore.getState().planning.items.a.dueDate).toEqual({ value: "2026-09-01", updatedAt: 50 });
    expect(useItemPlanningStore.getState().planning.items.a.storageLocation).toEqual({ value: "柜子", updatedAt: 60 });
    expect(storage.writes.slice(beforeWrites).filter((key) => key === ITEM_PLANNING_STORAGE_KEY)).toHaveLength(1);
    useItemPlanningStore.getState().bulkUpdate(["a"], { assigneeIds: { mode: "clear" } });
    expect(useItemPlanningStore.getState().planning.items.a.assigneeIds.value).toEqual([]);
    expect(window.localStorage.getItem(ITEM_PLANNING_STORAGE_KEY)).toContain('"version":2');
  });
});
