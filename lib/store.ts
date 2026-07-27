"use client";

import { create } from "zustand";

import { clearItemPhotos, deleteItemPhoto } from "@/lib/item-photos";
import { generateChecklist, normalizeChecklistItem } from "@/lib/rules";
import {
  SnapshotPersistenceError,
  createSnapshot,
} from "@/lib/data/backup";
import {
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadDeletedCustomItems,
  loadHiddenTemplateItemIds,
  loadHiddenTemplateItemStamps,
  primeChecklistState,
  resetAllData,
  saveChecklist,
  saveChecklistMode,
  saveChecklistState,
  saveChecklistStateSoon,
  saveDeletedCustomItems,
  saveHiddenTemplateItemStamps,
} from "@/lib/data/local-repository";
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
  restoreMissingTemplateItems: () => number;
  updateItem: (id: string, patch: Partial<ChecklistItem>) => void;
  advanceItem: (id: string) => void;
  toggleItemSkipped: (id: string) => void;
  addCustomItem: (item: AddCustomItemInput) => AddCustomItemResult;
  removeItem: (id: string) => void;
  clearAll: () => Promise<void>;
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

function requireSnapshotBeforeChange(reason: string) {
  const snapshot = createSnapshot(reason);

  if (!snapshot) {
    throw new SnapshotPersistenceError();
  }
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
    updatedAt: Date.now(),
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
    if (get().hydrated) {
      return;
    }

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
    primeChecklistState({
      checklist,
      customItems,
      hiddenTemplateItemIds,
    });
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
    requireSnapshotBeforeChange("重建清单前");

    const state = get();
    const checklist = generateChecklist();
    try {
      saveChecklistState({
        checklist,
        customItems: [],
        hiddenTemplateItemIds: [],
      });
    } catch {
      throw new Error("清单重建失败，原有清单已保留。");
    }

    // 重建 = 删除全部自定义物品 + 恢复全部隐藏条目;逐个打墓碑/时间戳,
    // 多端合并时这些删除会正确传播,而不是被远端旧数据“复活”。
    const now = Date.now();
    const stamps = { ...loadHiddenTemplateItemStamps() };
    for (const id of state.hiddenTemplateItemIds) {
      stamps[id] = { hidden: false, updatedAt: now };
    }
    saveHiddenTemplateItemStamps(stamps);
    const tombstones = { ...loadDeletedCustomItems() };
    for (const item of state.customItems) {
      tombstones[item.id] = now;
    }
    saveDeletedCustomItems(tombstones);

    set({ checklist, customItems: [], hiddenTemplateItemIds: [] });
  },
  restoreMissingTemplateItems: () => {
    const state = get();
    const currentItemIds = new Set(state.checklist.map((item) => item.id));
    const checklist = generateChecklist({
      currentItems: state.checklist,
      customItems: state.customItems,
      hiddenTemplateItemIds: [],
    });
    const restoredCount = checklist.filter(
      (item) => item.source === "general" && !currentItemIds.has(item.id),
    ).length;

    saveChecklistState({
      checklist,
      customItems: state.customItems,
      hiddenTemplateItemIds: [],
    });

    // 批量恢复隐藏的模板条目:逐个写 hidden:false 墓碑,让另一端的隐藏状态可被合并覆盖。
    const now = Date.now();
    const stamps = { ...loadHiddenTemplateItemStamps() };
    for (const id of state.hiddenTemplateItemIds) {
      stamps[id] = { hidden: false, updatedAt: now };
    }
    saveHiddenTemplateItemStamps(stamps);

    set({ checklist, hiddenTemplateItemIds: [] });

    return restoredCount;
  },
  updateItem: (id, patch) => {
    const state = get();
    const checklist = state.checklist.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );
    const customItems = state.customItems.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );

    saveChecklistStateSoon({
      checklist,
      customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
    });
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
      updatedAt: Date.now(),
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

    saveChecklistState({
      checklist,
      customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
    });
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
    const removedCustomItems = state.customItems.filter(
      (customItem) =>
        customItem.id === id ||
        comparableItemName(customItem.name) === normalizedName,
    );
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
    saveChecklistState({ checklist, customItems, hiddenTemplateItemIds });

    // 删除要参与多端合并:模板条目写隐藏时间戳,自定义物品写删除墓碑。
    const now = Date.now();
    if (item.source === "general") {
      saveHiddenTemplateItemStamps({
        ...loadHiddenTemplateItemStamps(),
        [id]: { hidden: true, updatedAt: now },
      });
    }
    if (removedCustomItems.length > 0) {
      const tombstones = { ...loadDeletedCustomItems() };
      for (const removed of removedCustomItems) {
        tombstones[removed.id] = now;
      }
      saveDeletedCustomItems(tombstones);
    }

    set({ checklist, customItems, hiddenTemplateItemIds });
  },
  clearAll: async () => {
    requireSnapshotBeforeChange("清空本地数据前");

    const checklist = generateChecklist();
    let sessionSecretCleared = true;

    try {
      ({ sessionSecretCleared } = resetAllData(checklist));
    } catch {
      throw new Error("本机数据清空失败，原有数据已保留。");
    }

    set({
      hydrated: true,
      checklist,
      checklistMode: "lean",
      customItems: [],
      hiddenTemplateItemIds: [],
    });

    let photosCleared = true;

    try {
      await clearItemPhotos();
    } catch {
      photosCleared = false;
    }

    if (!photosCleared || !sessionSecretCleared) {
      const remaining = [
        !photosCleared ? "物品照片" : "",
        !sessionSecretCleared ? "当前会话中的 WebDAV 密码" : "",
      ].filter(Boolean);

      throw new Error(
        `清单与成长数据已清空，但${remaining.join("和")}未能清理，请关闭其他 DadKit 页面后重试。`,
      );
    }
  },
}));
