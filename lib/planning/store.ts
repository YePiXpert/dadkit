"use client";

import { create } from "zustand";

import { createEmptyItemPlanning, createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { isPlanningDate } from "@/lib/planning/date";
import {
  clearAllItemPlanning,
  clearItemPlanningValues,
  cloneItemPlanning,
  cloneItemPlanningRecord,
  getEffectiveItemPlanningRecord,
  latestItemPlanningTimestamp,
  sameIds,
  updateItemPlanningValues,
} from "@/lib/planning/portable";
import { loadItemPlanning, saveItemPlanning } from "@/lib/planning/repository";
import { PLANNING_TEXT_LIMIT, type ItemPlanningDraft, type ItemPlanningPortableData, type PlanningBulkPatch, type PlanningValidationErrors } from "@/lib/planning/types";
import { isSafePlanningItemId, isValidAssigneeIds, normalizeAssigneeIds, normalizePlanningText, validateItemPlanningDraft } from "@/lib/planning/validation";
import { getSyncAdjustedNow } from "@/lib/sync-clock";
import { mergeItemPlanning } from "@/lib/planning/merge";
import type { DataActionResult } from "@/lib/data/action-result";

type PlanningActionResult = DataActionResult<PlanningValidationErrors>;
const PLANNING_PERSISTENCE_ERROR = "家庭分工未能写入本机存储，请清理空间后重试。";
type ItemPlanningState = {
  hydrated: boolean;
  planning: ItemPlanningPortableData;
  hydrate(): void;
  replace(planning: ItemPlanningPortableData): void;
  saveItemDraft(itemId: string, draft: ItemPlanningDraft): PlanningActionResult;
  clearItem(itemId: string): PlanningActionResult;
  bulkUpdate(itemIds: string[], patch: PlanningBulkPatch): PlanningActionResult;
  clearAll(): PlanningActionResult;
};

function nextPlanningTimestamp(planning: ItemPlanningPortableData, itemIds?: readonly string[]) {
  return Math.max(getSyncAdjustedNow(), planning.clearedAt + 1, latestItemPlanningTimestamp(planning, itemIds) + 1);
}

export const useItemPlanningStore = create<ItemPlanningState>((set, get) => ({
  hydrated: false,
  planning: createEmptyItemPlanning(),
  hydrate: () => { if (!get().hydrated) set({ hydrated: true, planning: loadItemPlanning() }); },
  replace: (planning) => { saveItemPlanning(planning); set({ hydrated: true, planning: cloneItemPlanning(planning) }); },
  saveItemDraft: (itemId, draft) => {
    if (!isSafePlanningItemId(itemId)) return { ok: false, changed: false, message: "物品标识无效。" };
    const validation = validateItemPlanningDraft(draft);
    if (!validation.ok || !validation.values) return { ok: false, changed: false, errors: validation.errors };
    const current = mergeItemPlanning(get().planning, loadItemPlanning());
    const next = updateItemPlanningValues(current, itemId, validation.values, nextPlanningTimestamp(current, [itemId]));
    if (next.changed) {
      try {
        saveItemPlanning(next.planning);
      } catch {
        return { ok: false, changed: false, message: PLANNING_PERSISTENCE_ERROR };
      }
      set({ planning: next.planning });
    }
    return { ok: true, changed: next.changed };
  },
  clearItem: (itemId) => {
    if (!isSafePlanningItemId(itemId)) return { ok: false, changed: false, message: "物品标识无效。" };
    const current = mergeItemPlanning(get().planning, loadItemPlanning());
    const next = clearItemPlanningValues(current, itemId, nextPlanningTimestamp(current, [itemId]));
    try { saveItemPlanning(next); } catch {
      return { ok: false, changed: false, message: PLANNING_PERSISTENCE_ERROR };
    }
    set({ planning: next }); return { ok: true, changed: true };
  },
  bulkUpdate: (itemIds, patch) => {
    const ids = [...new Set(itemIds)].filter(isSafePlanningItemId);
    if (ids.length === 0) return { ok: false, changed: false, message: "请至少选择一个物品。" };
    const normalized = normalizeBulkPatch(patch);
    if (!normalized.ok || !normalized.patch) return normalized;
    const current = mergeItemPlanning(get().planning, loadItemPlanning());
    const next = cloneItemPlanning(current);
    const now = nextPlanningTimestamp(current, ids);
    let changed = false;
    for (const itemId of ids) {
      const effective = getEffectiveItemPlanningRecord(current, itemId);
      const record = current.items[itemId] ? cloneItemPlanningRecord(current.items[itemId]) : createEmptyItemPlanningRecord(current.clearedAt);
      let itemChanged = false;
      if (normalized.patch.assigneeIds) {
        const update = normalized.patch.assigneeIds;
        const value = update.mode === "clear" ? [] : normalizeAssigneeIds(update.value);
        if (!sameIds(effective.assigneeIds.value, value)) { record.assigneeIds = { value, updatedAt: now }; itemChanged = true; }
      }
      if (normalized.patch.dueDate) {
        const update = normalized.patch.dueDate;
        const value = update.mode === "clear" ? "" : update.value;
        if (effective.dueDate.value !== value) { record.dueDate = { value, updatedAt: now }; itemChanged = true; }
      }
      if (normalized.patch.storageLocation) {
        const update = normalized.patch.storageLocation;
        const value = update.mode === "clear" ? "" : update.value;
        if (effective.storageLocation.value !== value) { record.storageLocation = { value, updatedAt: now }; itemChanged = true; }
      }
      if (itemChanged) { next.items[itemId] = record; changed = true; }
    }
    if (changed) {
      try { saveItemPlanning(next); } catch {
        return { ok: false, changed: false, message: PLANNING_PERSISTENCE_ERROR };
      }
      set({ planning: next });
    }
    return { ok: true, changed };
  },
  clearAll: () => {
    const current = mergeItemPlanning(get().planning, loadItemPlanning());
    const next = clearAllItemPlanning(current, nextPlanningTimestamp(current));
    try { saveItemPlanning(next); } catch {
      return { ok: false, changed: false, message: PLANNING_PERSISTENCE_ERROR };
    }
    set({ planning: next }); return { ok: true, changed: true };
  },
}));

function normalizeBulkPatch(patch: PlanningBulkPatch):
  | { ok: true; changed: false; patch?: ExcludeKeepPatch }
  | { ok: false; changed: false; message: string } {
  const result: ExcludeKeepPatch = {};
  if (patch.assigneeIds && patch.assigneeIds.mode !== "keep") {
    if (patch.assigneeIds.mode === "set") {
      const value = normalizeAssigneeIds(patch.assigneeIds.value);
      if (!isValidAssigneeIds(value)) return { ok: false, changed: false, message: "负责人无效。" };
      result.assigneeIds = { mode: "set", value };
    } else result.assigneeIds = patch.assigneeIds;
  }
  if (patch.dueDate && patch.dueDate.mode !== "keep") {
    if (patch.dueDate.mode === "set" && !isPlanningDate(patch.dueDate.value)) return { ok: false, changed: false, message: "完成期限无效。" };
    result.dueDate = patch.dueDate;
  }
  if (patch.storageLocation && patch.storageLocation.mode !== "keep") {
    if (patch.storageLocation.mode === "set") {
      const value = normalizePlanningText(patch.storageLocation.value);
      if (value.length > PLANNING_TEXT_LIMIT) return { ok: false, changed: false, message: "存放位置过长。" };
      result.storageLocation = { mode: "set", value };
    } else result.storageLocation = patch.storageLocation;
  }
  return Object.keys(result).length > 0 ? { ok: true, changed: false, patch: result } : { ok: true, changed: false };
}

type ExcludeKeepPatch = {
  assigneeIds?: Exclude<NonNullable<PlanningBulkPatch["assigneeIds"]>, { mode: "keep" }>;
  dueDate?: Exclude<NonNullable<PlanningBulkPatch["dueDate"]>, { mode: "keep" }>;
  storageLocation?: Exclude<NonNullable<PlanningBulkPatch["storageLocation"]>, { mode: "keep" }>;
};
