"use client";

import { useGrowthStore } from "@/lib/growth-store";
import { useHospitalProfileStore } from "@/lib/hospital/store";
import { useItemPlanningStore } from "@/lib/planning/store";
import { useDadKitStore } from "@/lib/store";
import {
  isApplyingRemote,
  refreshSyncStatus,
  syncNow,
} from "@/lib/sync/client";

const SYNC_DEBOUNCE_MS = 3_000;
const SYNC_POLL_INTERVAL_MS = 30_000;

let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSync() {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    if (useDadKitStore.getState().pendingRemovalIds.length === 0) {
      void syncNow();
    }
  }, SYNC_DEBOUNCE_MS);
}

// 自动同步:本地变更后 3s 防抖推送;页面可见时每 30s 拉一次;
// 回到前台/网络恢复时立即同步。未加入同步空间时 syncNow 直接返回,开销为零。
export function startAutoSync() {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;
  refreshSyncStatus();

  useDadKitStore.subscribe((state, previous) => {
    if (isApplyingRemote() || !state.hydrated) {
      return;
    }

    const pendingRemovalSettled =
      previous.pendingRemovalIds.length > 0 &&
      state.pendingRemovalIds.length === 0;
    const dataChanged =
      state.checklist !== previous.checklist ||
      state.customItems !== previous.customItems ||
      state.hiddenTemplateItemIds !== previous.hiddenTemplateItemIds;

    if (
      pendingRemovalSettled ||
      (state.pendingRemovalIds.length === 0 && dataChanged)
    ) {
      scheduleSync();
    }
  });

  useGrowthStore.subscribe((state, previous) => {
    if (isApplyingRemote() || !state.hydrated) {
      return;
    }

    if (
      state.nickname !== previous.nickname ||
      state.dueDate !== previous.dueDate ||
      state.completedTaskIds !== previous.completedTaskIds
    ) {
      scheduleSync();
    }
  });

  useHospitalProfileStore.subscribe((state, previous) => {
    if (isApplyingRemote() || !state.hydrated) {
      return;
    }

    if (state.profile !== previous.profile) {
      scheduleSync();
    }
  });

  useItemPlanningStore.subscribe((state, previous) => {
    if (isApplyingRemote() || !state.hydrated) {
      return;
    }

    if (state.planning !== previous.planning) {
      scheduleSync();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void syncNow();
    }
  });
  window.addEventListener("online", () => void syncNow());
  window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void syncNow();
    }
  }, SYNC_POLL_INTERVAL_MS);

  void syncNow();
}
