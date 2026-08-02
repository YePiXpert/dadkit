"use client";

import { create } from "zustand";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { isPlanningDate } from "@/lib/planning/date";
import {
  clearAllItemPlanning,
  clearItemPlanningValues,
  cloneItemPlanning,
  getEffectiveItemPlanningRecord,
  latestItemPlanningTimestamp,
  updateItemPlanningValues,
} from "@/lib/planning/portable";
import { loadItemPlanning, saveItemPlanning } from "@/lib/planning/repository";
import {
  PLANNING_ASSIGNEES,
  PLANNING_TEXT_LIMIT,
  type ItemPlanningDraft,
  type ItemPlanningPortableData,
  type PlanningBulkPatch,
  type PlanningValidationErrors,
} from "@/lib/planning/types";
import {
  isSafePlanningItemId,
  normalizePlanningText,
  validateItemPlanningDraft,
} from "@/lib/planning/validation";
import { getSyncAdjustedNow } from "@/lib/sync-clock";

type PlanningActionResult = {
  ok: boolean;
  changed: boolean;
  errors?: PlanningValidationErrors;
  message?: string;
};

type ItemPlanningState = {
  hydrated: boolean;
  planning: ItemPlanningPortableData;
  hydrate: () => void;
  saveItemDraft: (itemId: string, draft: ItemPlanningDraft) => PlanningActionResult;
  clearItem: (itemId: string) => PlanningActionResult;
  bulkUpdate: (itemIds: string[], patch: PlanningBulkPatch) => PlanningActionResult;
  clearAll: () => PlanningActionResult;
};

function nextPlanningTimestamp(
  planning: ItemPlanningPortableData,
  itemIds?: readonly string[],
) {
  return Math.max(
    getSyncAdjustedNow(),
    planning.clearedAt + 1,
    latestItemPlanningTimestamp(planning, itemIds) + 1,
  );
}

export const useItemPlanningStore = create<ItemPlanningState>((set, get) => ({
  hydrated: false,
  planning: createEmptyItemPlanning(),
  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, planning: loadItemPlanning() });
  },
  saveItemDraft: (itemId, draft) => {
    if (!isSafePlanningItemId(itemId)) {
      return { ok: false, changed: false, message: "物品标识无效。" };
    }
    const validation = validateItemPlanningDraft(draft);
    if (!validation.ok || !validation.values) {
      return { ok: false, changed: false, errors: validation.errors };
    }

    const current = get().planning;
    const next = updateItemPlanningValues(
      current,
      itemId,
      validation.values,
      nextPlanningTimestamp(current, [itemId]),
    );
    if (next.changed) {
      saveItemPlanning(next.planning);
      set({ planning: next.planning });
    }
    return { ok: true, changed: next.changed };
  },
  clearItem: (itemId) => {
    if (!isSafePlanningItemId(itemId)) {
      return { ok: false, changed: false, message: "物品标识无效。" };
    }
    const current = get().planning;
    const next = clearItemPlanningValues(
      current,
      itemId,
      nextPlanningTimestamp(current, [itemId]),
    );
    saveItemPlanning(next);
    set({ planning: next });
    return { ok: true, changed: true };
  },
  bulkUpdate: (itemIds, patch) => {
    const ids = [...new Set(itemIds)].filter(isSafePlanningItemId);
    if (ids.length === 0) {
      return { ok: false, changed: false, message: "请至少选择一个物品。" };
    }
    const normalized = normalizeBulkPatch(patch);
    if (!normalized.ok) return normalized;
    if (!normalized.patch) {
      return { ok: true, changed: false, message: "没有需要修改的字段。" };
    }

    const current = get().planning;
    const next = cloneItemPlanning(current);
    const now = nextPlanningTimestamp(current, ids);
    let changed = false;

    for (const itemId of ids) {
      const effective = getEffectiveItemPlanningRecord(current, itemId);
      const record = current.items[itemId]
        ? { ...current.items[itemId],
            assignee: { ...current.items[itemId].assignee },
            dueDate: { ...current.items[itemId].dueDate },
            estimatedPriceFen: { ...current.items[itemId].estimatedPriceFen },
            actualPriceFen: { ...current.items[itemId].actualPriceFen },
            purchaseChannel: { ...current.items[itemId].purchaseChannel },
            storageLocation: { ...current.items[itemId].storageLocation } }
        : createEmptyItemPlanningRecord(current.clearedAt);
      let itemChanged = false;

      if (normalized.patch.assignee) {
        const update = normalized.patch.assignee;
        const value = update.mode === "clear" ? "unassigned" : update.value;
        if (update.mode === "clear" || effective.assignee.value !== value) {
          record.assignee = { value, updatedAt: now };
          itemChanged = true;
        }
      }
      if (normalized.patch.dueDate) {
        const update = normalized.patch.dueDate;
        const value = update.mode === "clear" ? "" : update.value;
        if (update.mode === "clear" || effective.dueDate.value !== value) {
          record.dueDate = { value, updatedAt: now };
          itemChanged = true;
        }
      }
      if (normalized.patch.storageLocation) {
        const update = normalized.patch.storageLocation;
        const value = update.mode === "clear" ? "" : update.value;
        if (update.mode === "clear" || effective.storageLocation.value !== value) {
          record.storageLocation = { value, updatedAt: now };
          itemChanged = true;
        }
      }

      if (itemChanged) {
        next.items[itemId] = record;
        changed = true;
      }
    }

    if (changed) {
      saveItemPlanning(next);
      set({ planning: next });
    }
    return { ok: true, changed };
  },
  clearAll: () => {
    const current = get().planning;
    const next = clearAllItemPlanning(
      current,
      nextPlanningTimestamp(current),
    );
    saveItemPlanning(next);
    set({ planning: next });
    return { ok: true, changed: true };
  },
}));

function normalizeBulkPatch(patch: PlanningBulkPatch):
  | { ok: true; changed: false; patch?: never }
  | { ok: true; changed: false; patch: ExcludeKeepPatch }
  | { ok: false; changed: false; message: string } {
  const result: ExcludeKeepPatch = {};

  if (patch.assignee && patch.assignee.mode !== "keep") {
    if (
      patch.assignee.mode === "set" &&
      !PLANNING_ASSIGNEES.includes(patch.assignee.value)
    ) {
      return { ok: false, changed: false, message: "负责人无效。" };
    }
    result.assignee = patch.assignee;
  }
  if (patch.dueDate && patch.dueDate.mode !== "keep") {
    if (patch.dueDate.mode === "set" && !isPlanningDate(patch.dueDate.value)) {
      return { ok: false, changed: false, message: "完成期限无效。" };
    }
    result.dueDate = patch.dueDate;
  }
  if (patch.storageLocation && patch.storageLocation.mode !== "keep") {
    if (patch.storageLocation.mode === "set") {
      const value = normalizePlanningText(patch.storageLocation.value);
      if (value.length > PLANNING_TEXT_LIMIT) {
        return { ok: false, changed: false, message: "存放位置过长。" };
      }
      result.storageLocation = { mode: "set", value };
    } else {
      result.storageLocation = patch.storageLocation;
    }
  }

  return Object.keys(result).length > 0
    ? { ok: true, changed: false, patch: result }
    : { ok: true, changed: false };
}

type ExcludeKeepPatch = {
  assignee?: Exclude<NonNullable<PlanningBulkPatch["assignee"]>, { mode: "keep" }>;
  dueDate?: Exclude<NonNullable<PlanningBulkPatch["dueDate"]>, { mode: "keep" }>;
  storageLocation?: Exclude<NonNullable<PlanningBulkPatch["storageLocation"]>, { mode: "keep" }>;
};
