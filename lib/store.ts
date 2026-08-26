"use client";

import { create } from "zustand";

import { showAppToast } from "@/lib/app-toast";
import { clearItemPhotos, deleteItemPhoto } from "@/lib/item-photos";
import { generateChecklist, normalizeChecklistItem } from "@/lib/rules";
import { getSyncAdjustedNow } from "@/lib/sync-clock";
import { mergeChecklistDocuments } from "@/lib/sync/merge";
import {
  SnapshotPersistenceError,
  createSnapshotAsync,
} from "@/lib/data/backup";
import {
  getRetainedDataChange,
  isCurrentDataChangeSource,
} from "@/lib/data/change-bus";
import {
  getChecklistStateVersion,
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadDeletedCustomItems,
  loadHiddenTemplateItemIds,
  loadHiddenTemplateItemStamps,
  primeChecklistState,
  resetAllDataAsync,
  saveChecklist,
  saveChecklistMode,
  saveChecklistState,
  saveChecklistStateWithMetadata,
  saveChecklistStateSoon,
} from "@/lib/data/local-repository";
import type {
  ChecklistItem,
  ChecklistMode,
  PackStatus,
} from "@/lib/types";
import { registerChecklistRuntimeHandler } from "@/lib/checklist-runtime";

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
  changeOrigin: "hydrate" | "local" | "remote" | "cross-tab";
  changeRevision: number;
  checklist: ChecklistItem[];
  checklistMode: ChecklistMode;
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  pendingRemovalIds: string[];
  hydrate: () => void;
  setChecklistMode: (mode: ChecklistMode) => void;
  resetChecklist: () => Promise<void>;
  restoreMissingTemplateItems: () => number;
  updateItem: (id: string, patch: Partial<ChecklistItem>) => void;
  advanceItem: (id: string) => void;
  toggleItemSkipped: (id: string) => void;
  addCustomItem: (item: AddCustomItemInput) => AddCustomItemResult;
  markItemsPacked: (ids: string[]) => number;
  removeItem: (id: string) => void;
  undoRemoveItem: (id: string) => void;
  clearAll: () => Promise<void>;
};

type PendingRemoval = {
  checklistIndex: number;
  customItems: Array<{ index: number; item: ChecklistItem }>;
  id: string;
  item: ChecklistItem;
  timer?: ReturnType<typeof setTimeout>;
};

const pendingRemovals = new Map<string, PendingRemoval>();
const REMOVE_UNDO_MS = 5_000;
let pendingRemovalListenerTarget: Window | undefined;
let checklistStateVersionSeen = -1;
let checklistSignalSeen: string | undefined;

function itemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `user-item-${crypto.randomUUID()}`;
  }

  return `user-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function comparableItemName(name: string) {
  return name.trim().replace(/[\s，,。.!！?？、·\-]/g, "").toLowerCase();
}

export function nextChecklistTimestamp(...timestamps: Array<number | undefined>) {
  return (
    Math.max(
    getSyncAdjustedNow(),
    ...timestamps.map((timestamp) =>
      typeof timestamp === "number" && Number.isFinite(timestamp)
        ? timestamp
        : 0,
    ),
    ) + 1
  );
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

async function requireSnapshotBeforeChange(reason: string) {
  const snapshot = await createSnapshotAsync(reason);

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
    updatedAt: nextChecklistTimestamp(item.updatedAt),
    preparationKind: shouldReinferPreparation
      ? undefined
      : patch.preparationKind ?? item.preparationKind,
  });
}

function removePendingItemFromState(
  state: Pick<DadKitState, "checklist" | "customItems" | "hiddenTemplateItemIds">,
  pending: PendingRemoval,
) {
  const customIds = new Set(pending.customItems.map(({ item }) => item.id));

  return {
    checklist: state.checklist.filter(
      (candidate) =>
        candidate.id !== pending.id && !customIds.has(candidate.id),
    ),
    customItems: state.customItems.filter(
      (candidate) =>
        candidate.id !== pending.id && !customIds.has(candidate.id),
    ),
    hiddenTemplateItemIds:
      pending.item.source === "general"
        ? Array.from(
            new Set([...state.hiddenTemplateItemIds, pending.item.id]),
          )
        : state.hiddenTemplateItemIds,
  };
}

function clearPendingRemovalTimer(pending: PendingRemoval) {
  if (pending.timer !== undefined) {
    clearTimeout(pending.timer);
  }
}

function clearAllPendingRemovals() {
  pendingRemovals.forEach(clearPendingRemovalTimer);
  pendingRemovals.clear();
}

function dataChangeMessageId(message: {
  sourceId: string;
  version: number;
}) {
  return `${message.sourceId}:${message.version}`;
}

function rememberChecklistBaseline() {
  checklistStateVersionSeen = getChecklistStateVersion();
  const signal = getRetainedDataChange("checklist");
  checklistSignalSeen = signal ? dataChangeMessageId(signal) : undefined;
}

function checklistNeedsRebase() {
  if (getChecklistStateVersion() !== checklistStateVersionSeen) {
    return true;
  }

  const signal = getRetainedDataChange("checklist");
  const signalId = signal ? dataChangeMessageId(signal) : undefined;

  if (signalId === checklistSignalSeen) {
    return false;
  }

  if (!signal || isCurrentDataChangeSource(signal)) {
    checklistSignalSeen = signalId;
    return false;
  }

  return true;
}

function latestChecklistState(state: DadKitState) {
  if (!checklistNeedsRebase()) {
    return state;
  }

  const hiddenTemplateItemStamps = loadHiddenTemplateItemStamps();
  const deletedCustomItems = loadDeletedCustomItems();
  const merged = mergeChecklistDocuments(
    {
      checklist: state.checklist,
      customItems: state.customItems,
      hiddenTemplateItemStamps,
      deletedCustomItems,
    },
    {
      checklist: loadChecklist(),
      customItems: loadCustomItems(),
      hiddenTemplateItemStamps,
      deletedCustomItems,
    },
  );

  let latest = {
    ...state,
    checklist: merged.checklist,
    customItems: merged.customItems,
    hiddenTemplateItemIds: merged.hiddenTemplateItemIds,
  };

  // Pending removals intentionally have not reached storage yet. Reapply them
  // after rebasing so a subsequent local action cannot resurrect the item.
  for (const pending of pendingRemovals.values()) {
    latest = { ...latest, ...removePendingItemFromState(latest, pending) };
  }

  rememberChecklistBaseline();
  return latest;
}

// 状态推进链路每次点按只合并一次存储快照：advance/toggle 复用同一份
// latest 快照，不再经 updateItem 二次合并。同一同步执行内存储不可能变化。
function applyItemPatch(
  state: ReturnType<typeof latestChecklistState>,
  id: string,
  patch: Partial<ChecklistItem>,
) {
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
  rememberChecklistBaseline();
  useDadKitStore.setState((current) => ({
    checklist,
    customItems,
    changeOrigin: "local" as const,
    changeRevision: current.changeRevision + 1,
  }));
}

function commitPendingRemoval(id: string) {
  const active = pendingRemovals.get(id);

  if (!active) {
    return;
  }

  clearPendingRemovalTimer(active);
  const current = latestChecklistState(useDadKitStore.getState());
  const committed = removePendingItemFromState(current, active);

  try {
    // 删除要参与多端合并:模板条目写隐藏时间戳,自定义物品写删除墓碑。
    const previousStamps = loadHiddenTemplateItemStamps();
    const tombstones = { ...loadDeletedCustomItems() };
    const now = nextChecklistTimestamp(
      active.item.updatedAt,
      previousStamps[active.item.id]?.updatedAt,
      ...active.customItems.map(({ item }) => item.updatedAt),
      ...active.customItems.map(({ item }) => tombstones[item.id]),
    );
    const stamps = { ...previousStamps };
    if (active.item.source === "general") {
      stamps[active.item.id] = { hidden: true, updatedAt: now };
    }
    if (active.customItems.length > 0) {
      for (const removed of active.customItems) {
        tombstones[removed.item.id] = now;
      }
    }
    saveChecklistStateWithMetadata(committed, {
      hiddenTemplateItemStamps: stamps,
      deletedCustomItems: tombstones,
    });

    void deleteItemPhoto(active.item.id).catch(() => undefined);
    pendingRemovals.delete(id);
    useDadKitStore.setState({
      ...committed,
      pendingRemovalIds: current.pendingRemovalIds.filter(
        (candidate) => candidate !== id,
      ),
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    });
  } catch {
    useDadKitStore.getState().undoRemoveItem(id);
    showAppToast({
      message: "删除暂未保存，物品已恢复。",
      tone: "warning",
    });
  }
}

function flushPendingRemovals() {
  for (const id of Array.from(pendingRemovals.keys())) {
    commitPendingRemoval(id);
  }
}

function installPendingRemovalListeners() {
  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function" ||
    pendingRemovalListenerTarget === window
  ) {
    return;
  }

  pendingRemovalListenerTarget = window;
  window.addEventListener("pagehide", flushPendingRemovals);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushPendingRemovals();
      }
    });
  }
}

export const useDadKitStore = create<DadKitState>((set, get) => ({
  hydrated: false,
  changeOrigin: "hydrate",
  changeRevision: 0,
  checklist: [],
  checklistMode: "lean",
  customItems: [],
  hiddenTemplateItemIds: [],
  pendingRemovalIds: [],
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
    rememberChecklistBaseline();
    set({
      hydrated: true,
      changeOrigin: "hydrate",
      checklist,
      checklistMode,
      customItems,
      hiddenTemplateItemIds,
    });
  },
  setChecklistMode: (mode) => {
    saveChecklistMode(mode);
    set((state) => ({
      checklistMode: mode,
      changeOrigin: "local",
      changeRevision: state.changeRevision + 1,
    }));
  },
  resetChecklist: async () => {
    await requireSnapshotBeforeChange("重建清单前");

    const state = latestChecklistState(get());
    const checklist = generateChecklist();
    const stamps = { ...loadHiddenTemplateItemStamps() };
    const tombstones = { ...loadDeletedCustomItems() };
    // 重建 = 删除全部自定义物品 + 恢复全部隐藏条目;逐个打墓碑/时间戳,
    // 多端合并时这些删除会正确传播,而不是被远端旧数据“复活”。
    const now = nextChecklistTimestamp(
      ...state.checklist.map((item) => item.updatedAt),
      ...Object.values(stamps).map((stamp) => stamp.updatedAt),
      ...Object.values(tombstones),
    );
    for (const id of state.hiddenTemplateItemIds) {
      stamps[id] = { hidden: false, updatedAt: now };
    }
    for (const item of state.customItems) {
      tombstones[item.id] = now;
    }
    try {
      saveChecklistStateWithMetadata(
        { checklist, customItems: [], hiddenTemplateItemIds: [] },
        {
          hiddenTemplateItemStamps: stamps,
          deletedCustomItems: tombstones,
          resetMilestones: true,
        },
      );
    } catch {
      throw new Error("清单重建失败，原有清单已保留。");
    }
    clearAllPendingRemovals();
    set((current) => ({
      checklist,
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));
  },
  restoreMissingTemplateItems: () => {
    const state = latestChecklistState(get());
    const currentItemIds = new Set(state.checklist.map((item) => item.id));
    const checklist = generateChecklist({
      currentItems: state.checklist,
      customItems: state.customItems,
      hiddenTemplateItemIds: [],
    });
    const restoredCount = checklist.filter(
      (item) => item.source === "general" && !currentItemIds.has(item.id),
    ).length;

    // 批量恢复隐藏的模板条目:逐个写 hidden:false 墓碑,让另一端的隐藏状态可被合并覆盖。
    const stamps = { ...loadHiddenTemplateItemStamps() };
    const now = nextChecklistTimestamp(
      ...state.checklist.map((item) => item.updatedAt),
      ...Object.values(stamps).map((stamp) => stamp.updatedAt),
    );
    for (const id of state.hiddenTemplateItemIds) {
      stamps[id] = { hidden: false, updatedAt: now };
    }
    saveChecklistStateWithMetadata(
      {
        checklist,
        customItems: state.customItems,
        hiddenTemplateItemIds: [],
      },
      { hiddenTemplateItemStamps: stamps },
    );

    clearAllPendingRemovals();
    set((current) => ({
      checklist,
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));

    return restoredCount;
  },
  updateItem: (id, patch) => {
    applyItemPatch(latestChecklistState(get()), id, patch);
  },
  advanceItem: (id) => {
    const state = latestChecklistState(get());
    const item = state.checklist.find(
      (candidate) => candidate.id === id,
    );

    if (!item) return;

    const nextStatus: PackStatus =
      item.status === "packed" || item.status === "not_needed"
        ? "todo"
        : item.status === "bought" ||
            item.status === "washed" ||
            item.status === "last_minute"
          ? "packed"
          : "bought";

    applyItemPatch(state, id, { status: nextStatus });
  },
  toggleItemSkipped: (id) => {
    const state = latestChecklistState(get());
    const item = state.checklist.find(
      (candidate) => candidate.id === id,
    );

    if (!item) return;

    applyItemPatch(state, id, {
      status: item.status === "not_needed" ? "todo" : "not_needed",
    });
  },
  addCustomItem: (item) => {
    const state = latestChecklistState(get());
    const name = item.name.trim();

    if (!name) {
      throw new Error("物品名称不能为空。");
    }

    const normalizedName = comparableItemName(name);
    const existing = state.checklist.find(
      (candidate) =>
        candidate.category === item.category &&
        comparableItemName(candidate.name) === normalizedName,
    );
    const existingOverlay = state.customItems.find(
      (candidate) =>
        candidate.id === existing?.id ||
        (candidate.category === item.category &&
          comparableItemName(candidate.name) === normalizedName),
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
      updatedAt: nextChecklistTimestamp(
        existing?.updatedAt,
        existingOverlay?.updatedAt,
        loadDeletedCustomItems()[existingOverlay?.id ?? existing?.id ?? item.id ?? ""],
      ),
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
    set((current) => ({
      customItems,
      checklist,
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));

    return {
      itemId: existing?.id ?? customItem.id,
      merged: Boolean(existing),
    };
  },
  markItemsPacked: (ids) => {
    const state = latestChecklistState(get());
    const itemIds = new Set(ids);

    if (itemIds.size === 0) {
      return 0;
    }

    let changed = 0;
    const checklist = state.checklist.map((item) => {
      if (
        !itemIds.has(item.id) ||
        item.status === "packed" ||
        item.status === "not_needed"
      ) {
        return item;
      }

      changed += 1;
      return patchChecklistItem(item, { status: "packed" });
    });
    const customItems = state.customItems.map((item) =>
      itemIds.has(item.id) &&
      item.status !== "packed" &&
      item.status !== "not_needed"
        ? patchChecklistItem(item, { status: "packed" })
        : item,
    );

    if (changed === 0) {
      return 0;
    }

    saveChecklistState({
      checklist,
      customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
    });
    set((current) => ({
      checklist,
      customItems,
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));

    return changed;
  },
  removeItem: (id) => {
    const state = latestChecklistState(get());
    const item = state.checklist.find((candidate) => candidate.id === id);

    if (!item) return;

    const normalizedName = comparableItemName(item.name);
    const pending: PendingRemoval = {
      checklistIndex: state.checklist.findIndex((candidate) => candidate.id === id),
      id,
      item,
      customItems: state.customItems
        .map((customItem, index) => ({ customItem, index }))
        .filter(
          ({ customItem }) =>
            customItem.id === id ||
            (customItem.category === item.category &&
              comparableItemName(customItem.name) === normalizedName),
        )
        .map(({ customItem, index }) => ({ item: customItem, index })),
    };
    const next = removePendingItemFromState(state, pending);

    clearPendingRemovalTimer(pendingRemovals.get(id) ?? pending);
    pending.timer = setTimeout(() => commitPendingRemoval(id), REMOVE_UNDO_MS);

    pendingRemovals.set(id, pending);
    installPendingRemovalListeners();
    set((current) => ({
      ...next,
      pendingRemovalIds: [...state.pendingRemovalIds, id],
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));
    showAppToast({
      actionLabel: "撤销",
      duration: REMOVE_UNDO_MS,
      message: "已删除，可撤销。",
      onAction: () => get().undoRemoveItem(id),
    });
  },
  undoRemoveItem: (id) => {
    const pending = pendingRemovals.get(id);

    if (!pending) {
      return;
    }

    clearPendingRemovalTimer(pending);
    pendingRemovals.delete(id);

    const state = latestChecklistState(get());
    const customItems = [...state.customItems];
    for (const restored of pending.customItems) {
      const restoredName = comparableItemName(restored.item.name);
      if (
        !customItems.some(
          (item) =>
            item.id === restored.item.id ||
            (item.category === restored.item.category &&
              comparableItemName(item.name) === restoredName),
        )
      ) {
        customItems.splice(
          Math.min(restored.index, customItems.length),
          0,
          restored.item,
        );
      }
    }
    const hiddenTemplateItemIds = state.hiddenTemplateItemIds.filter(
      (candidate) => candidate !== pending.item.id,
    );
    const checklist = [...state.checklist];
    const pendingName = comparableItemName(pending.item.name);
    if (
      !checklist.some(
        (item) =>
          item.id === pending.item.id ||
          (item.category === pending.item.category &&
            comparableItemName(item.name) === pendingName),
      )
    ) {
      checklist.splice(
        Math.min(Math.max(pending.checklistIndex, 0), checklist.length),
        0,
        pending.item,
      );
    }

    const restored = {
      checklist,
      customItems,
      hiddenTemplateItemIds,
      pendingRemovalIds: state.pendingRemovalIds.filter(
        (candidate) => candidate !== id,
      ),
    };

    try {
      saveChecklistStateWithMetadata(restored, { retryOnFailure: true });
    } catch {
      showAppToast({
        message: "撤销结果尚未保存，将继续自动重试。",
        tone: "warning",
      });
    }

    set((current) => ({
      ...restored,
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));
  },
  clearAll: async () => {
    await requireSnapshotBeforeChange("清空本地数据前");

    const checklist = generateChecklist();
    let sessionSecretCleared = true;

    try {
      ({ sessionSecretCleared } = await resetAllDataAsync(checklist));
    } catch {
      throw new Error("本机数据清空失败，原有数据已保留。");
    }

    clearAllPendingRemovals();
    set((current) => ({
      hydrated: true,
      checklist,
      checklistMode: "lean",
      customItems: [],
      hiddenTemplateItemIds: [],
      pendingRemovalIds: [],
      changeOrigin: "local",
      changeRevision: current.changeRevision + 1,
    }));

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

registerChecklistRuntimeHandler((document, origin) => {
  clearAllPendingRemovals();
  const checklist = generateChecklist({
    currentItems: document.checklist,
    customItems: document.customItems,
    hiddenTemplateItemIds: document.hiddenTemplateItemIds,
  });
  useDadKitStore.setState((state) => ({
    hydrated: true,
    checklist,
    checklistMode: document.checklistMode,
    customItems: document.customItems,
    hiddenTemplateItemIds: document.hiddenTemplateItemIds,
    pendingRemovalIds: [],
    changeOrigin: origin,
    changeRevision: state.changeRevision + 1,
  }));
});
