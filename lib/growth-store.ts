"use client";

import { create } from "zustand";

import {
  DEFAULT_GROWTH_WEEK,
  GROWTH_CHECKUP_TASK_IDS,
  clampGrowthWeek,
  isIsoCalendarDate,
} from "@/lib/growth";

export const GROWTH_STORAGE_KEYS = {
  profile: "dadkit-growth-profile-v1",
  progress: "dadkit-growth-progress-v1",
  view: "dadkit-growth-view-v1",
} as const;

// 成长记数据最近一次本地修改时间(epoch ms),用于多端合并时整体取新。
// 放在 dadkit:v3 命名空间,随 resetAllData 一并清空。
export const GROWTH_UPDATED_AT_STORAGE_KEY = "dadkit:v3:growth-updated-at";

export type GrowthProfileData = {
  nickname: string;
  dueDate: string;
};

export type GrowthProgressData = {
  completedTaskIds: string[];
};

export type GrowthViewData = {
  lastViewedWeek: number;
};

export type GrowthPortableData = {
  version: 1;
  profile: GrowthProfileData;
  progress: GrowthProgressData;
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
      dueDate: get().dueDate,
    };

    writeStorage(GROWTH_STORAGE_KEYS.profile, nextProfile);
    markGrowthUpdated();
    set(nextProfile);
  },

  setDueDate: (dueDate) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    const nextProfile = {
      nickname: get().nickname,
      dueDate: normalizeDueDate(dueDate),
    };

    writeStorage(GROWTH_STORAGE_KEYS.profile, nextProfile);
    markGrowthUpdated();
    set(nextProfile);
  },

  setLastViewedWeek: (week) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    const nextView = { lastViewedWeek: clampGrowthWeek(week) };

    writeStorage(GROWTH_STORAGE_KEYS.view, nextView);
    set(nextView);
  },

  toggleCompletedTask: (taskId) => {
    if (!get().hydrated) {
      get().hydrate();
    }

    if (!isGrowthTaskId(taskId)) {
      throw new Error("未知的成长记产检任务。");
    }

    const completedTaskIds = get().completedTaskIds.includes(taskId)
      ? get().completedTaskIds.filter((candidate) => candidate !== taskId)
      : normalizeCompletedTaskIds([...get().completedTaskIds, taskId]);
    const nextProgress = { completedTaskIds };

    writeStorage(GROWTH_STORAGE_KEYS.progress, nextProgress);
    markGrowthUpdated();
    set(nextProgress);
  },
}));

export function exportGrowthData(): GrowthPortableData {
  const profile = readGrowthProfile();
  const progress = readGrowthProgress();

  return {
    version: 1,
    profile,
    progress,
  };
}

export function validateGrowthPortableData(
  value: unknown,
): value is GrowthPortableData {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["version", "profile", "progress"]) ||
    value.version !== 1
  ) {
    return false;
  }

  if (
    !isRecord(value.profile) ||
    !hasExactKeys(value.profile, ["nickname", "dueDate"]) ||
    !isRecord(value.progress) ||
    !hasExactKeys(value.progress, ["completedTaskIds"])
  ) {
    return false;
  }

  const { nickname, dueDate } = value.profile;
  const { completedTaskIds } = value.progress;

  return (
    typeof nickname === "string" &&
    nickname === normalizeNickname(nickname) &&
    typeof dueDate === "string" &&
    (dueDate === "" || isIsoCalendarDate(dueDate)) &&
    Array.isArray(completedTaskIds) &&
    completedTaskIds.every(isGrowthTaskId) &&
    new Set(completedTaskIds).size === completedTaskIds.length &&
    completedTaskIds.every(
      (taskId, index) =>
        index === 0 ||
        GROWTH_CHECKUP_TASK_IDS.indexOf(completedTaskIds[index - 1]) <
          GROWTH_CHECKUP_TASK_IDS.indexOf(taskId),
    )
  );
}

export function applyGrowthPortableData(data: GrowthPortableData): void {
  if (!validateGrowthPortableData(data)) {
    throw new Error("成长记备份格式无效，未导入任何数据。");
  }

  const profile: GrowthProfileData = {
    nickname: data.profile.nickname,
    dueDate: data.profile.dueDate,
  };
  const progress: GrowthProgressData = {
    completedTaskIds: [...data.progress.completedTaskIds],
  };

  persistPortableDataAtomically(profile, progress);
  useGrowthStore.setState({ ...profile, ...progress, hydrated: true });
}

export function resetGrowthData(): void {
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

function markGrowthUpdated() {
  writeStorage(GROWTH_UPDATED_AT_STORAGE_KEY, Date.now());
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeNickname(value: string) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 20);
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

function isGrowthTaskId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    GROWTH_CHECKUP_TASK_IDS.includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}
