"use client";

import { create } from "zustand";

import {
  DEFAULT_GROWTH_WEEK,
  GROWTH_CHECKUP_TASK_IDS,
  clampGrowthWeek,
  isIsoCalendarDate,
} from "@/lib/growth";
import {
  isGrowthTaskId,
  normalizeNickname,
  validateGrowthPortableData,
  type GrowthPortableData,
  type GrowthProfileData,
  type GrowthProgressData,
} from "@/lib/growth-portable";
import {
  markPersistenceDirty,
  getPersistenceStatus,
  recordPersistenceError,
  recordPersistencePersisted,
  recordStorageWarning,
  registerPersistenceRetryHandler,
} from "@/lib/persistence-status";
import { getSyncAdjustedNow } from "@/lib/sync-clock";
import { publishDataChange } from "@/lib/data/change-bus";

export { validateGrowthPortableData } from "@/lib/growth-portable";
export type {
  GrowthPortableData,
  GrowthProfileData,
  GrowthProgressData,
} from "@/lib/growth-portable";

export const GROWTH_STORAGE_KEYS = {
  profile: "dadkit-growth-profile-v1",
  progress: "dadkit-growth-progress-v1",
  view: "dadkit-growth-view-v1",
} as const;

// 成长记数据最近一次本地修改时间(epoch ms),用于多端合并时整体取新。
// 放在 dadkit:v3 命名空间,随 resetAllData 一并清空。
export const GROWTH_UPDATED_AT_STORAGE_KEY = "dadkit:v3:growth-updated-at";

export type GrowthViewData = {
  lastViewedWeek: number;
};

type GrowthStore = GrowthProfileData &
  GrowthProgressData &
  GrowthViewData & {
    hydrated: boolean;
    hydrate: () => void;
    setNickname: (nickname: string) => void;
    setDueDate: (dueDate: string) => void;
    setLastViewedWeek: (week: number) => void;
    toggleCompletedTask: (taskId: string) => void;
  };

export const DEFAULT_GROWTH_PROFILE: Readonly<GrowthProfileData> = {
  nickname: "",
  dueDate: "",
};

export const DEFAULT_GROWTH_PROGRESS: Readonly<GrowthProgressData> = {
  completedTaskIds: [],
};

export const DEFAULT_GROWTH_VIEW: Readonly<GrowthViewData> = {
  lastViewedWeek: DEFAULT_GROWTH_WEEK,
};

export const useGrowthStore = create<GrowthStore>((set, get) => ({
  ...DEFAULT_GROWTH_PROFILE,
  ...DEFAULT_GROWTH_PROGRESS,
  ...DEFAULT_GROWTH_VIEW,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    set({
      ...readGrowthProfile(),
      ...readGrowthProgress(),
      ...readGrowthView(),
      hydrated: true,
    });
  },

  setNickname: (nickname) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    const nextProfile = {
      nickname: normalizeNickname(nickname),
      dueDate: readGrowthProfile().dueDate,
    };

    // 内存状态立即更新保证输入响应，落盘做防抖，避免每次按键都同步写 localStorage。
    set(nextProfile);
    scheduleProfileWrite();
  },

  setDueDate: (dueDate) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    const persistedProfile = readGrowthProfile();
    const nextProfile = {
      nickname: profileWritePending ? get().nickname : persistedProfile.nickname,
      dueDate: normalizeDueDate(dueDate),
    };

    try {
      writeStorage(GROWTH_STORAGE_KEYS.profile, nextProfile);
      markGrowthUpdated(nextGrowthUpdatedAt());
    } catch (error) {
      recordGrowthStorageFailure(error);
      throw error;
    }
    // 本次写入已包含最新昵称，取消防抖中的 profile 落盘。
    cancelPendingProfileWrite();
    set(nextProfile);
    recordGrowthProfilePersisted();
  },

  setLastViewedWeek: (week) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    const nextView = { lastViewedWeek: clampGrowthWeek(week) };

    try {
      writeStorage(GROWTH_STORAGE_KEYS.view, nextView);
      publishDataChange("growth");
    } catch (error) {
      recordGrowthStorageFailure(error);
      throw error;
    }
    set(nextView);
  },

  toggleCompletedTask: (taskId) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    if (!isGrowthTaskId(taskId)) {
      throw new Error("未知的成长记产检任务。");
    }

    const persistedTaskIds = readGrowthProgress().completedTaskIds;
    const completedTaskIds = persistedTaskIds.includes(taskId)
      ? persistedTaskIds.filter((candidate) => candidate !== taskId)
      : normalizeCompletedTaskIds([...persistedTaskIds, taskId]);
    const nextProgress = { completedTaskIds };

    try {
      writeStorage(GROWTH_STORAGE_KEYS.progress, nextProgress);
      markGrowthUpdated(nextGrowthUpdatedAt());
    } catch (error) {
      recordGrowthStorageFailure(error);
      throw error;
    }
    set(nextProgress);
  },
}));

export function exportGrowthData(): GrowthPortableData {
  // 导出前先把防抖中的昵称落盘，保证备份与同步读到最新值。
  flushPendingProfileWrite();

  const profile = readGrowthProfile();
  const progress = readGrowthProgress();

  return {
    version: 1,
    profile,
    progress,
  };
}

export function applyGrowthPortableData(data: GrowthPortableData): void {
  if (!validateGrowthPortableData(data)) {
    throw new Error("成长记备份格式无效，未导入任何数据。");
  }

  // 导入会覆盖本地 profile，取消防抖中的旧值落盘。
  cancelPendingProfileWrite();

  const profile: GrowthProfileData = {
    nickname: data.profile.nickname,
    dueDate: data.profile.dueDate,
  };
  const progress: GrowthProgressData = {
    completedTaskIds: [...data.progress.completedTaskIds],
  };

  persistPortableDataAtomically(profile, progress);
  useGrowthStore.setState({ ...profile, ...progress, hydrated: true });
  recordGrowthProfilePersisted();
  publishDataChange("growth");
}

export function resetGrowthData(): void {
  cancelPendingProfileWrite();

  if (hasBrowserStorage()) {
    window.localStorage.removeItem(GROWTH_STORAGE_KEYS.profile);
    window.localStorage.removeItem(GROWTH_STORAGE_KEYS.progress);
    window.localStorage.removeItem(GROWTH_STORAGE_KEYS.view);
  }

  useGrowthStore.setState({
    ...DEFAULT_GROWTH_PROFILE,
    ...DEFAULT_GROWTH_PROGRESS,
    ...DEFAULT_GROWTH_VIEW,
    hydrated: true,
  });
  recordGrowthProfilePersisted();
  publishDataChange("growth");
}

function readGrowthProfile(): GrowthProfileData {
  const value = readStorage(GROWTH_STORAGE_KEYS.profile);

  if (!isRecord(value)) {
    return { ...DEFAULT_GROWTH_PROFILE };
  }

  return {
    nickname:
      typeof value.nickname === "string"
        ? normalizeNickname(value.nickname)
        : DEFAULT_GROWTH_PROFILE.nickname,
    dueDate:
      typeof value.dueDate === "string"
        ? normalizeDueDate(value.dueDate)
        : DEFAULT_GROWTH_PROFILE.dueDate,
  };
}

function readGrowthProgress(): GrowthProgressData {
  const value = readStorage(GROWTH_STORAGE_KEYS.progress);

  return {
    completedTaskIds:
      isRecord(value) && Array.isArray(value.completedTaskIds)
        ? normalizeCompletedTaskIds(value.completedTaskIds)
        : [],
  };
}

function readGrowthView(): GrowthViewData {
  const value = readStorage(GROWTH_STORAGE_KEYS.view);

  return {
    lastViewedWeek:
      isRecord(value) && typeof value.lastViewedWeek === "number"
        ? clampGrowthWeek(value.lastViewedWeek)
        : DEFAULT_GROWTH_VIEW.lastViewedWeek,
  };
}

function persistPortableDataAtomically(
  profile: GrowthProfileData,
  progress: GrowthProgressData,
) {
  if (!hasBrowserStorage()) {
    return;
  }

  const previousProfile = window.localStorage.getItem(GROWTH_STORAGE_KEYS.profile);
  const previousProgress = window.localStorage.getItem(
    GROWTH_STORAGE_KEYS.progress,
  );

  try {
    writeStorage(GROWTH_STORAGE_KEYS.profile, profile);
    writeStorage(GROWTH_STORAGE_KEYS.progress, progress);
  } catch (error) {
    restoreStorageValue(GROWTH_STORAGE_KEYS.profile, previousProfile);
    restoreStorageValue(GROWTH_STORAGE_KEYS.progress, previousProgress);
    throw error;
  }
}

function restoreStorageValue(key: string, value: string | null) {
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
}

function readStorage(key: string): unknown {
  if (!hasBrowserStorage()) {
    return undefined;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, value: unknown) {
  if (!hasBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function markGrowthUpdated(timestamp = nextGrowthUpdatedAt()) {
  writeStorage(GROWTH_UPDATED_AT_STORAGE_KEY, timestamp);
  publishDataChange("growth");
}

function nextGrowthUpdatedAt() {
  const persisted = readStorage(GROWTH_UPDATED_AT_STORAGE_KEY);
  const persistedTimestamp =
    typeof persisted === "number" && Number.isFinite(persisted) ? persisted : 0;
  return Math.max(getSyncAdjustedNow(), persistedTimestamp + 1, profileWritePendingAt + 1);
}

// 昵称输入每次按键都会调用 setNickname：落盘做 400ms 防抖，
// 并在 pagehide/页面隐藏时立即冲刷，避免丢最后一次输入。
const PROFILE_WRITE_DEBOUNCE_MS = 400;

let profileWritePending = false;
let profileWritePendingAt = 0;
let profileWritePendingRevision = 0;
let profileWriteTimer: ReturnType<typeof setTimeout> | undefined;
let profileWriteListenersInstalled = false;

function installProfileWriteListeners() {
  if (profileWriteListenersInstalled) return;
  profileWriteListenersInstalled = true;

  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return;
  }

  window.addEventListener("pagehide", flushPendingProfileWriteSafely);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushPendingProfileWriteSafely();
      }
    });
  }
}

function scheduleProfileWrite() {
  if (!hasBrowserStorage()) {
    return;
  }

  profileWritePending = true;
  profileWritePendingAt = nextGrowthUpdatedAt();
  profileWritePendingRevision = markPersistenceDirty("growth");
  installProfileWriteListeners();

  if (profileWriteTimer !== undefined) {
    clearTimeout(profileWriteTimer);
  }

  profileWriteTimer = setTimeout(
    flushPendingProfileWriteSafely,
    PROFILE_WRITE_DEBOUNCE_MS,
  );
}

function cancelPendingProfileWrite() {
  if (profileWriteTimer !== undefined) {
    clearTimeout(profileWriteTimer);
    profileWriteTimer = undefined;
  }

  profileWritePending = false;
  profileWritePendingAt = 0;
  profileWritePendingRevision = 0;
}

export function flushPendingProfileWrite() {
  if (profileWriteTimer !== undefined) {
    clearTimeout(profileWriteTimer);
    profileWriteTimer = undefined;
  }

  if (!profileWritePending) {
    return;
  }

  profileWritePending = false;
  const pendingTimestamp = profileWritePendingAt || nextGrowthUpdatedAt();
  const pendingRevision =
    profileWritePendingRevision || markPersistenceDirty("growth");
  profileWritePendingAt = 0;
  profileWritePendingRevision = 0;

  const { nickname } = useGrowthStore.getState();
  const dueDate = readGrowthProfile().dueDate;

  try {
    writeStorage(GROWTH_STORAGE_KEYS.profile, { nickname, dueDate });
    markGrowthUpdated(pendingTimestamp);
    recordPersistencePersisted("growth", pendingRevision);
  } catch (error) {
    profileWritePending = true;
    profileWritePendingAt = pendingTimestamp;
    profileWritePendingRevision = pendingRevision;
    recordGrowthStorageFailure(error, true);
    throw error;
  }
}

export function flushPendingProfileWriteSafely() {
  try {
    flushPendingProfileWrite();
  } catch {
    // 页面生命周期事件不能恢复写入；保留 pending 状态供下次变更或导出重试。
  }
}

export function reloadGrowthFromStorage() {
  if (!hasBrowserStorage()) return;
  const persisted = readStorage(GROWTH_UPDATED_AT_STORAGE_KEY);
  const persistedTimestamp =
    typeof persisted === "number" && Number.isFinite(persisted) ? persisted : 0;

  if (profileWritePending && profileWritePendingAt > persistedTimestamp) {
    return;
  }

  cancelPendingProfileWrite();
  useGrowthStore.setState({
    ...readGrowthProfile(),
    ...readGrowthProgress(),
    ...readGrowthView(),
    hydrated: true,
  });
  recordGrowthProfilePersisted();
}

function recordGrowthProfilePersisted() {
  recordPersistencePersisted(
    "growth",
    getPersistenceStatus("growth").dirtyRevision,
  );
}

function recordGrowthStorageFailure(error: unknown, retryable = false) {
  const message =
    error instanceof Error && error.message
      ? `成长记尚未写入本机存储：${error.message}`
      : "成长记尚未写入本机存储，请清理空间后重试。";
  if (retryable) {
    recordPersistenceError("growth", message);
  } else {
    recordStorageWarning(message);
  }
}

registerPersistenceRetryHandler("growth", () => {
  try {
    flushPendingProfileWrite();
    return true;
  } catch {
    return false;
  }
});

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeDueDate(value: string) {
  if (value === "" || isIsoCalendarDate(value)) {
    return value;
  }

  return "";
}

function normalizeCompletedTaskIds(value: unknown[]) {
  return [...new Set(value.filter(isGrowthTaskId))].sort(
    (a, b) => GROWTH_CHECKUP_TASK_IDS.indexOf(a) - GROWTH_CHECKUP_TASK_IDS.indexOf(b),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
