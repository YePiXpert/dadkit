"use client";

import { create } from "zustand";

import { clearItemPhotos, deleteItemPhoto } from "@/lib/item-photos";
import { generateChecklist, normalizeChecklistItem } from "@/lib/rules";
import {
  applyImportData,
  createSnapshot,
  exportData,
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadHiddenTemplateItemIds,
  resetAllData,
  saveChecklist,
  saveChecklistMode,
  saveCustomItems,
  saveHiddenTemplateItemIds,
  validateImportData,
  type ImportResult,
} from "@/lib/storage";
import type {
  ChecklistItem,
  ChecklistMode,
  PackStatus,
} from "@/lib/types";

export type AddCustomItemInput = Pick<
  ChecklistItem,
  "name" | "category" | "priority"
> &
  Partial<Omit<ChecklistItem, "name" | "category" | "priority">>;

export type AddCustomItemResult = {
  itemId: string;
  merged: boolean;
};

export type DadKitState = {
  hydrated: boolean;
  checklist: ChecklistItem[];
  checklistMode: ChecklistMode;
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  hydrate: () => void;
  setChecklistMode: (mode: ChecklistMode) => void;
  resetChecklist: () => void;
  updateItem: (id: string, patch: Partial<ChecklistItem>) => void;
  advanceItem: (id: string) => void;
  toggleItemSkipped: (id: string) => void;
  addCustomItem: (item: AddCustomItemInput) => AddCustomItemResult;
  removeItem: (id: string) => void;
  exportJson: () => string;
  importJson: (json: string) => ImportResult;
  clearAll: () => void;
};

function itemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `user-item-${crypto.randomUUID()}`;
  }

  return `user-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function comparableItemName(name: string) {
  return name.trim().replace(/[\s，,。.!！?？、·\-]/g, "").toLowerCase();
}

export function mergeChecklistQuantity(current?: string, added?: string) {
  const left = current?.trim();
  const right = added?.trim();

  if (!right) return left;
  if (!left) return right;
  if (left === right) return left;

  const leftExact = left.match(/^(\d+)\s*([^\d].*)$/);
  const rightExact = right.match(/^(\d+)\s*([^\d].*)$/);

  if (
    leftExact &&
    rightExact &&
    leftExact[2].trim() === rightExact[2].trim()
  ) {
    return `${Number(leftExact[1]) + Number(rightExact[1])} ${leftExact[2].trim()}`;
  }

  return `${left}；另加 ${right}`;
}

function snapshotBeforeChange(reason: string) {
  createSnapshot(reason);
}

function patchChecklistItem(
  item: ChecklistItem,
  patch: Partial<ChecklistItem>,
) {
  const shouldReinferPreparation =
    !("preparationKind" in patch) &&
    (["name", "category", "itemKind", "timing", "bag"] as const).some(
      (key) => key in patch,
    );

  return normalizeChecklistItem({
    ...item,
    ...patch,
    id: item.id,
    source: item.source,
    preparationKind: shouldReinferPreparation
      ? undefined
      : patch.preparationKind ?? item.preparationKind,
  });
}

export const useDadKitStore = create<DadKitState>((set, get) => ({
  hydrated: false,
  checklist: [],
  checklistMode: "lean",
  customItems: [],
  hiddenTemplateItemIds: [],
  hydrate: () => {
    const storedChecklist = loadChecklist();
    const customItems = loadCustomItems();
    const hiddenTemplateItemIds = loadHiddenTemplateItemIds();
    const checklistMode = loadChecklistMode();
    const checklist = generateChecklist({
      currentItems: storedChecklist,
      customItems,
      hiddenTemplateItemIds,
    });

    saveChecklist(checklist);
    set({
      hydrated: true,
      checklist,
      checklistMode,
      customItems,
      hiddenTemplateItemIds,
    });
  },
  setChecklistMode: (mode) => {
    saveChecklistMode(mode);
    set({ checklistMode: mode });
  },
  resetChecklist: () => {
    snapshotBeforeChange("重置清单前");

    const checklist = generateChecklist();
    saveChecklist(checklist);
    saveCustomItems([]);
    saveHiddenTemplateItemIds([]);
    set({ checklist, customItems: [], hiddenTemplateItemIds: [] });
  },
  updateItem: (id, patch) => {
    const state = get();
    const checklist = state.checklist.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );
    const customItems = state.customItems.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );

    saveChecklist(checklist);
    saveCustomItems(customItems);
    set({ checklist, customItems });
  },
  advanceItem: (id) => {
    const item = get().checklist.find((candidate) => candidate.id === id);

    if (!item) return;

    const nextStatus: PackStatus =
      item.status === "packed" || item.status === "not_needed"
        ? "todo"
        : item.status === "bought" ||
            item.status === "washed" ||
            item.status === "last_minute"
          ? "packed"
          : "bought";

    get().updateItem(id, { status: nextStatus });
  },
  toggleItemSkipped: (id) => {
    const item = get().checklist.find((candidate) => candidate.id === id);

    if (!item) return;

    get().updateItem(id, {
      status: item.status === "not_needed" ? "todo" : "not_needed",
    });
  },
  addCustomItem: (item) => {
    const state = get();
    const name = item.name.trim();

    if (!name) {
      throw new Error("物品名称不能为空。");
    }

    const normalizedName = comparableItemName(name);
    const existing = state.checklist.find(
      (candidate) => comparableItemName(candidate.name) === normalizedName,
    );
    const existingOverlay = state.customItems.find(
      (candidate) =>
        candidate.id === existing?.id ||
        comparableItemName(candidate.name) === normalizedName,
    );
    const customItem = normalizeChecklistItem({
      id: existingOverlay?.id ?? existing?.id ?? item.id ?? itemId(),
      name: existing?.name ?? name,
      category: existing?.category ?? item.category,
      priority: item.priority,
      quantity: existing
        ? mergeChecklistQuantity(existing.quantity, item.quantity)
        : item.quantity?.trim() || undefined,
      note: item.note?.trim() || existingOverlay?.note,
      status: existing?.status ?? item.status ?? "todo",
      source: "user",
      sourceLabel: "用户自定义",
      editable: true,
      removable: true,
      packTier: item.packTier ?? existing?.packTier ?? "core",
      itemKind: item.itemKind ?? existing?.itemKind ?? "item",
      preparationKind:
        existing?.preparationKind ?? item.preparationKind,
      bag: existing?.bag ?? item.bag,
      bulk: existing?.bulk ?? item.bulk,
      timing: existing?.timing ?? item.timing ?? "pack_now",
    });
    const customItems = existingOverlay
      ? state.customItems.map((candidate) =>
          candidate.id === existingOverlay.id ? customItem : candidate,
        )
      : [...state.customItems, customItem];
    const checklist = generateChecklist({
      currentItems: state.checklist,
      customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
    });

    saveCustomItems(customItems);
    saveChecklist(checklist);
    set({ customItems, checklist });

    return {
      itemId: existing?.id ?? customItem.id,
      merged: Boolean(existing),
    };
  },
  removeItem: (id) => {
    const state = get();
    const item = state.checklist.find((candidate) => candidate.id === id);

    if (!item) return;

    const normalizedName = comparableItemName(item.name);
    const customItems = state.customItems.filter(
      (customItem) =>
        customItem.id !== id &&
        comparableItemName(customItem.name) !== normalizedName,
    );
    const hiddenTemplateItemIds =
      item.source === "general"
        ? Array.from(new Set([...state.hiddenTemplateItemIds, id]))
        : state.hiddenTemplateItemIds;
    const checklist = state.checklist.filter((candidate) => candidate.id !== id);

    void deleteItemPhoto(id).catch(() => undefined);
    saveChecklist(checklist);
    saveCustomItems(customItems);
    saveHiddenTemplateItemIds(hiddenTemplateItemIds);
    set({ checklist, customItems, hiddenTemplateItemIds });
  },
  exportJson: () => JSON.stringify(exportData(), null, 2),
  importJson: (json) => {
    const validation = validateImportData(json);

    if (!validation.ok || !validation.data) {
      return { ok: false, message: validation.message };
    }

    snapshotBeforeChange("导入 JSON 前");
    const result = applyImportData(validation.data);

    if (result.ok) {
      get().hydrate();
    }

    return result;
  },
  clearAll: () => {
    snapshotBeforeChange("清空本地数据前");

    resetAllData();
    void clearItemPhotos().catch(() => undefined);

    const checklist = generateChecklist();
    saveChecklist(checklist);
    set({
      hydrated: true,
      checklist,
      checklistMode: "lean",
      customItems: [],
      hiddenTemplateItemIds: [],
    });
  },
}));
