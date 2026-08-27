"use client";

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
  };
}

function flushPendingChanges() {
  flushScheduled = false;
  const changes = [...pending.values()];
  pending.clear();

  for (const message of changes) {
    void refreshDomain(message).catch(() => undefined);
  }
}

async function refreshDomain(message: DataChangeMessage) {
  switch (message.domain) {
    case "checklist": {
      const { reloadChecklistFromStorage } = await import(
        "@/lib/data/cross-tab-checklist"
      );
      reloadChecklistFromStorage();
      return;
    }
    case "growth": {
      const { reloadGrowthFromStorage } = await import("@/lib/growth-store");
      reloadGrowthFromStorage();
      return;
    }
    case "device-identity": {
      const [{ useDeviceIdentityStore }, { loadDeviceIdentity }] =
        await Promise.all([
          import("@/lib/device-identity/store"),
          import("@/lib/device-identity/repository"),
        ]);
      useDeviceIdentityStore.setState({
        ...loadDeviceIdentity(),
        hydrated: true,
      });
      return;
    }
    case "baby": {
      const { useBabyStore } = await import("@/lib/baby/store");
      await useBabyStore.getState().reloadFromRepository();
      return;
    }
    case "sync-settings": {
      const { refreshSyncStatus } = await import("@/lib/sync/client");
      refreshSyncStatus();
      window.dispatchEvent(new Event(SYNC_SETTINGS_CHANGE_EVENT));
    }
  }
}
