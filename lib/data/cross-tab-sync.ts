"use client";

import { useBabyStore } from "@/lib/baby/store";
import { notifyExternalItemPhotoChange } from "@/lib/item-photos";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { loadDeviceIdentity } from "@/lib/device-identity/repository";
import { reloadGrowthFromStorage } from "@/lib/growth-store";
import { mergeHousehold } from "@/lib/household/merge";
import { loadHousehold, saveHousehold } from "@/lib/household/repository";
import { useHouseholdStore } from "@/lib/household/store";
import { generateChecklist } from "@/lib/rules";
import { mergeChecklistDocuments } from "@/lib/sync/merge";
import { refreshSyncStatus } from "@/lib/sync/client";
import { useDadKitStore } from "@/lib/store";
import {
  getChecklistPersistenceStatus,
} from "@/lib/persistence-status";
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
import {
  SYNC_SETTINGS_CHANGE_EVENT,
  subscribeToDataChanges,
  type DataChangeMessage,
  type DataDomain,
} from "@/lib/data/change-bus";

let started = false;
let unsubscribe: (() => void) | undefined;
const pending = new Map<DataDomain, DataChangeMessage>();
let flushScheduled = false;
let checklistRetryTimer: ReturnType<typeof setTimeout> | undefined;

export function startCrossTabSync() {
  if (started || typeof window === "undefined") return () => undefined;
  started = true;
  unsubscribe = subscribeToDataChanges((message) => {
    pending.set(message.domain, message);
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(flushPendingChanges);
  });

  return () => {
    unsubscribe?.();
    unsubscribe = undefined;
    started = false;
    pending.clear();
    flushScheduled = false;
    if (checklistRetryTimer !== undefined) clearTimeout(checklistRetryTimer);
    checklistRetryTimer = undefined;
  };
}

function flushPendingChanges() {
  flushScheduled = false;
  const changes = [...pending.values()];
  pending.clear();

  for (const message of changes) {
    try {
      switch (message.domain) {
        case "checklist":
          reloadChecklistFromStorage();
          break;
        case "growth":
          reloadGrowthFromStorage();
          break;
        case "household": {
          const current = useHouseholdStore.getState().household;
          const merged = mergeHousehold(current, loadHousehold());
          saveHousehold(merged);
          useHouseholdStore.setState({ hydrated: true, household: merged });
          break;
        }
        case "device-identity":
          useDeviceIdentityStore.setState({ ...loadDeviceIdentity(), hydrated: true });
          break;
        case "baby":
          void useBabyStore.getState().reloadFromRepository();
          break;
        case "item-photo":
          notifyExternalItemPhotoChange(message.entityId);
          break;
        case "sync-settings":
          refreshSyncStatus();
          window.dispatchEvent(new Event(SYNC_SETTINGS_CHANGE_EVENT));
          break;
      }
    } catch {
      // A storage failure in one domain must not block the other notifications.
    }
  }
}

function reloadChecklistFromStorage() {
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
