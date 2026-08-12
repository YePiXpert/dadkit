"use client";

import { recordStorageWarning } from "@/lib/persistence-status";

export const CHECKLIST_MILESTONES_KEY = "dadkit:v3:checklist-milestones";

export type ChecklistMilestones = {
  reachedHalfway: boolean;
  clearedSectionIds: string[];
};

const DEFAULT_MILESTONES: ChecklistMilestones = {
  reachedHalfway: false,
  clearedSectionIds: [],
};

export function loadChecklistMilestones(): ChecklistMilestones {
  if (typeof window === "undefined") {
    return DEFAULT_MILESTONES;
  }

  try {
    const value = JSON.parse(
      window.localStorage.getItem(CHECKLIST_MILESTONES_KEY) ?? "null",
    ) as Partial<ChecklistMilestones> | null;

    return {
      reachedHalfway: value?.reachedHalfway === true,
      clearedSectionIds: Array.isArray(value?.clearedSectionIds)
        ? value.clearedSectionIds.filter((id): id is string => typeof id === "string")
        : [],
    };
  } catch {
    return DEFAULT_MILESTONES;
  }
}

export function saveChecklistMilestones(value: ChecklistMilestones) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CHECKLIST_MILESTONES_KEY, JSON.stringify(value));
  } catch (error) {
    recordStorageWarning(
      error instanceof Error && error.message
        ? `清单里程碑尚未保存：${error.message}`
        : "清单里程碑尚未保存。",
    );
  }
}

export function clearChecklistMilestones() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CHECKLIST_MILESTONES_KEY);
    } catch (error) {
      recordStorageWarning(
        error instanceof Error && error.message
          ? `清单里程碑尚未清除：${error.message}`
          : "清单里程碑尚未清除。",
      );
    }
  }
}

export function markHalfwayMilestone() {
  const current = loadChecklistMilestones();
  saveChecklistMilestones({ ...current, reachedHalfway: true });
}

export function markSectionClearedMilestone(sectionId: string) {
  markSectionClearedMilestones([sectionId]);
}

export function markSectionClearedMilestones(sectionIds: string[]) {
  const current = loadChecklistMilestones();
  const nextIds = sectionIds.filter(
    (sectionId) => !current.clearedSectionIds.includes(sectionId),
  );
  if (nextIds.length === 0) return;

  saveChecklistMilestones({
    ...current,
    clearedSectionIds: [...current.clearedSectionIds, ...nextIds],
  });
}
