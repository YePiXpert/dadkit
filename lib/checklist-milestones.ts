"use client";

const CHECKLIST_MILESTONES_KEY = "dadkit:v3:checklist-milestones";

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

  window.localStorage.setItem(CHECKLIST_MILESTONES_KEY, JSON.stringify(value));
}

export function clearChecklistMilestones() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(CHECKLIST_MILESTONES_KEY);
  }
}

export function markHalfwayMilestone() {
  const current = loadChecklistMilestones();
  saveChecklistMilestones({ ...current, reachedHalfway: true });
}

export function markSectionClearedMilestone(sectionId: string) {
  const current = loadChecklistMilestones();

  if (current.clearedSectionIds.includes(sectionId)) {
    return;
  }

  saveChecklistMilestones({
    ...current,
    clearedSectionIds: [...current.clearedSectionIds, sectionId],
  });
}
