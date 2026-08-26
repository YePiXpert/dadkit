"use client";

import { getChecklistPersistenceStatus } from "@/lib/persistence-status";
import { generateChecklist } from "@/lib/rules";
import { mergeChecklistDocuments } from "@/lib/sync/merge";
import { useDadKitStore } from "@/lib/store";
import {
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadDeletedCustomItems,
  loadHiddenTemplateItemIds,
  loadHiddenTemplateItemStamps,
  primeChecklistState,
  saveChecklistStateSoon,
} from "@/lib/data/local-repository";

let checklistRetryTimer: ReturnType<typeof setTimeout> | undefined;

export function reloadChecklistFromStorage() {
  const current = useDadKitStore.getState();
  if (current.pendingRemovalIds.length > 0) {
    if (checklistRetryTimer === undefined) {
      checklistRetryTimer = setTimeout(() => {
        checklistRetryTimer = undefined;
        reloadChecklistFromStorage();
      }, 5_100);
    }
    return;
  }

  const external = {
    checklist: loadChecklist(),
    customItems: loadCustomItems(),
    hiddenTemplateItemStamps: loadHiddenTemplateItemStamps(),
    deletedCustomItems: loadDeletedCustomItems(),
  };
  const merged = mergeChecklistDocuments(
    {
      checklist: current.checklist,
      customItems: current.customItems,
      hiddenTemplateItemStamps: external.hiddenTemplateItemStamps,
      deletedCustomItems: external.deletedCustomItems,
    },
    external,
  );
  const checklist = generateChecklist({
    currentItems: merged.checklist,
    customItems: merged.customItems,
    hiddenTemplateItemIds: merged.hiddenTemplateItemIds,
  });
  const payload = {
    checklist,
    customItems: merged.customItems,
    hiddenTemplateItemIds: merged.hiddenTemplateItemIds,
  };
  const status = getChecklistPersistenceStatus();
  const mergedDiffersFromDisk =
    JSON.stringify(payload.checklist) !== JSON.stringify(external.checklist) ||
    JSON.stringify(payload.customItems) !== JSON.stringify(external.customItems) ||
    JSON.stringify(payload.hiddenTemplateItemIds) !==
      JSON.stringify(loadHiddenTemplateItemIds());

  if (mergedDiffersFromDisk || status.dirtyRevision > status.persistedRevision) {
    saveChecklistStateSoon(payload);
  } else {
    primeChecklistState(payload);
  }

  useDadKitStore.setState((state) => ({
    hydrated: true,
    ...payload,
    checklistMode: loadChecklistMode(),
    changeOrigin: "cross-tab",
    changeRevision: state.changeRevision + 1,
  }));
}
