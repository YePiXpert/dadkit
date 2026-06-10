"use client";

import { create } from "zustand";

import { generateChecklist, normalizeChecklistItem } from "@/lib/rules";
import {
  getProvidedIdForQuestion,
  mapHospitalAnswerStatusToPackStatus,
} from "@/lib/hospital/answers";
import { getQuickStatusOptionsForItem } from "@/lib/preparation";
import {
  applyImportData,
  createSnapshot,
  exportData,
  loadBirthPlan,
  loadChecklist,
  loadChecklistMode,
  loadContractions,
  loadCustomItems,
  loadHiddenTemplateItemIds,
  loadHospitalAnswers,
  loadHospitalOverrides,
  loadPostpartumTasks,
  loadTimelineTaskStatuses,
  loadUserProfile,
  resetAllData,
  saveBirthPlan as saveStoredBirthPlan,
  saveChecklist,
  saveChecklistMode,
  saveContractions,
  saveCustomItems,
  saveHiddenTemplateItemIds,
  saveHospitalAnswers,
  saveHospitalOverrides,
  savePostpartumTasks,
  saveUserProfile,
  updateTimelineTaskStatus as updateStoredTimelineTaskStatus,
  validateImportData,
  type DadKitExportData,
  type ImportResult,
} from "@/lib/storage";
import {
  createContractionRecord,
  mergeBirthPlan,
  mergePostpartumTasks,
  type BirthPlan,
  type ContractionRecord,
  type PostpartumTask,
} from "@/lib/rc";
import type { TimelineTaskStatus } from "@/lib/timeline";
import type {
  ChecklistCategory,
  ChecklistMode,
  ChecklistItem,
  HospitalAnswer,
  HospitalProfile,
  PackStatus,
  Priority,
  UserHospitalOverride,
  UserProfile,
} from "@/lib/types";

type FilterState = {
  category: ChecklistCategory | "all";
  status: PackStatus | "all";
  priority: Priority | "all";
};

type CreateProfileInput = Partial<UserProfile>;

type DadKitState = {
  hydrated: boolean;
  profile?: UserProfile;
  checklist: ChecklistItem[];
  checklistMode: ChecklistMode;
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  hospitalOverrides: UserHospitalOverride[];
  hospitalAnswers: HospitalAnswer[];
  timelineTaskStatuses: TimelineTaskStatus[];
  contractions: ContractionRecord[];
  birthPlan: BirthPlan;
  postpartumTasks: PostpartumTask[];
  filters: FilterState;
  hydrate: () => void;
  createProfile: (input?: CreateProfileInput) => UserProfile;
  saveProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setFilters: (patch: Partial<FilterState>) => void;
  setChecklistMode: (mode: ChecklistMode) => void;
  regenerateChecklist: () => void;
  resetChecklist: () => void;
  updateItem: (id: string, patch: Partial<ChecklistItem>) => void;
  cycleItemStatus: (id: string) => void;
  addCustomItem: (
    item: Pick<ChecklistItem, "name" | "category" | "priority"> &
      Partial<ChecklistItem>,
  ) => void;
  removeItem: (id: string) => void;
  updateHospitalOverride: (override: UserHospitalOverride) => void;
  updateHospitalAnswer: (answer: HospitalAnswer) => void;
  clearHospitalAnswer: (itemId: string) => void;
  updateTimelineTaskStatus: (
    taskId: string,
    status: TimelineTaskStatus["status"],
  ) => void;
  addContraction: (input: {
    startedAt: string;
    endedAt: string;
    note?: string;
  }) => void;
  deleteContraction: (id: string) => void;
  clearContractions: () => void;
  saveBirthPlan: (patch: Partial<BirthPlan>) => void;
  updatePostpartumTask: (
    id: string,
    patch: Partial<Pick<PostpartumTask, "status" | "note">>,
  ) => void;
  exportJson: () => string;
  importJson: (json: string) => ImportResult;
  clearAll: () => void;
};

export const STATUS_FLOW: PackStatus[] = ["todo", "bought", "washed", "packed"];

function nowIso() {
  return new Date().toISOString();
}

function itemId(prefix = "user-item") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultProfile(input: CreateProfileInput = {}): UserProfile {
  const timestamp = nowIso();

  return {
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input,
  };
}

function persistCoreState(state: Pick<
  DadKitState,
  | "profile"
  | "checklist"
  | "customItems"
  | "hiddenTemplateItemIds"
  | "hospitalOverrides"
  | "hospitalAnswers"
>) {
  saveUserProfile(state.profile);
  saveChecklist(state.checklist);
  saveCustomItems(state.customItems);
  saveHiddenTemplateItemIds(state.hiddenTemplateItemIds);
  saveHospitalOverrides(state.hospitalOverrides);
  saveHospitalAnswers(state.hospitalAnswers);
}

function buildChecklist(
  profile: UserProfile,
  state: Pick<
    DadKitState,
    "checklist" | "customItems" | "hiddenTemplateItemIds" | "hospitalOverrides"
  >,
) {
  return generateChecklist(profile, {
    currentItems: state.checklist,
    customItems: state.customItems,
    hiddenTemplateItemIds: state.hiddenTemplateItemIds,
    hospitalOverrides: state.hospitalOverrides,
  });
}

function snapshotBeforeChange(reason: string) {
  createSnapshot(reason);
}

const PROVIDED_ITEM_KEYWORDS: Record<string, string[]> = {
  "postpartum-pads": ["产褥垫", "产后卫生巾"],
  "baby-diapers": ["尿不湿", "宝宝尿不湿"],
  "baby-clothes": ["宝宝衣物", "宝宝出院衣物", "宝宝住院衣物"],
};

function sameStringArray(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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
    preparationKind: shouldReinferPreparation
      ? undefined
      : patch.preparationKind ?? item.preparationKind,
  });
}

function removeProvidedStatusForId(items: ChecklistItem[], providedId?: string) {
  if (!providedId) {
    return items;
  }

  const keywords = PROVIDED_ITEM_KEYWORDS[providedId] ?? [providedId];

  return items.map((item) => {
    if (
      item.status !== "hospital_provided" ||
      item.itemKind !== "item" ||
      !keywords.some((keyword) => item.name.includes(keyword))
    ) {
      return item;
    }

    return { ...item, status: "todo" as const };
  });
}

export const useDadKitStore = create<DadKitState>((set, get) => ({
  hydrated: false,
  profile: undefined,
  checklist: [],
  checklistMode: "lean",
  customItems: [],
  hiddenTemplateItemIds: [],
  hospitalOverrides: [],
  hospitalAnswers: [],
  timelineTaskStatuses: [],
  contractions: [],
  birthPlan: mergeBirthPlan(),
  postpartumTasks: mergePostpartumTasks(),
  filters: {
    category: "all",
    status: "all",
    priority: "all",
  },
  hydrate: () => {
    const profile = loadUserProfile();
    const checklist = loadChecklist();
    const customItems = loadCustomItems();
    const hiddenTemplateItemIds = loadHiddenTemplateItemIds();
    const hospitalOverrides = loadHospitalOverrides();
    const hospitalAnswers = loadHospitalAnswers();
    const timelineTaskStatuses = loadTimelineTaskStatuses();
    const contractions = loadContractions();
    const birthPlan = loadBirthPlan();
    const postpartumTasks = loadPostpartumTasks();
    const checklistMode = loadChecklistMode();
    const hydratedChecklist = profile
      ? generateChecklist(profile, {
          currentItems: checklist,
          customItems,
          hiddenTemplateItemIds,
          hospitalOverrides,
        })
      : checklist;

    set({
      hydrated: true,
      profile,
      checklist: hydratedChecklist,
      checklistMode,
      customItems,
      hiddenTemplateItemIds,
      hospitalOverrides,
      hospitalAnswers,
      timelineTaskStatuses,
      contractions,
      birthPlan,
      postpartumTasks,
    });

    if (profile) {
      saveChecklist(hydratedChecklist);
    }
  },
  createProfile: (input) => {
    snapshotBeforeChange("创建新清单前");

    const profile = createDefaultProfile(input);
    const state = get();
    const checklist = buildChecklist(profile, {
      ...state,
      checklist: [],
      customItems: state.customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
      hospitalOverrides: state.hospitalOverrides,
    });

    set({ profile, checklist });
    persistCoreState({ ...state, profile, checklist });

    return profile;
  },
  saveProfile: (profile) => {
    const updatedProfile = {
      ...profile,
      updatedAt: nowIso(),
    };
    const state = get();
    const checklist = buildChecklist(updatedProfile, state);

    set({ profile: updatedProfile, checklist });
    persistCoreState({ ...state, profile: updatedProfile, checklist });
  },
  updateProfile: (patch) => {
    const state = get();
    const profile = state.profile
      ? { ...state.profile, ...patch, updatedAt: nowIso() }
      : createDefaultProfile(patch);
    const checklist = buildChecklist(profile, state);

    set({ profile, checklist });
    persistCoreState({ ...state, profile, checklist });
  },
  setFilters: (patch) => {
    set((state) => ({ filters: { ...state.filters, ...patch } }));
  },
  setChecklistMode: (mode) => {
    set({ checklistMode: mode });
    saveChecklistMode(mode);
  },
  regenerateChecklist: () => {
    const state = get();

    if (!state.profile) {
      return;
    }

    const checklist = buildChecklist(state.profile, state);
    set({ checklist });
    saveChecklist(checklist);
  },
  resetChecklist: () => {
    const state = get();

    if (!state.profile) {
      return;
    }

    snapshotBeforeChange("重置清单前");

    const checklist = generateChecklist(state.profile, {
      customItems: [],
      hiddenTemplateItemIds: [],
      hospitalOverrides: state.hospitalOverrides,
    });

    set({ checklist, customItems: [], hiddenTemplateItemIds: [] });
    saveChecklist(checklist);
    saveCustomItems([]);
    saveHiddenTemplateItemIds([]);
  },
  updateItem: (id, patch) => {
    const state = get();
    const checklist = state.checklist.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );
    const customItems = state.customItems.map((item) =>
      item.id === id ? patchChecklistItem(item, patch) : item,
    );

    set({ checklist, customItems });
    saveChecklist(checklist);
    saveCustomItems(customItems);
  },
  cycleItemStatus: (id) => {
    const item = get().checklist.find((candidate) => candidate.id === id);

    if (!item) {
      return;
    }

    const normalizedItem = normalizeChecklistItem(item);
    const statusOptions = getQuickStatusOptionsForItem(normalizedItem);
    const currentIndex = statusOptions.indexOf(normalizedItem.status);
    const nextStatus =
      statusOptions[(currentIndex + 1) % statusOptions.length] ?? "todo";

    get().updateItem(id, { status: nextStatus });
  },
  addCustomItem: (item) => {
    const state = get();
    const customItem: ChecklistItem = normalizeChecklistItem({
      id: item.id ?? itemId(),
      name: item.name.trim(),
      category: item.category,
      priority: item.priority,
      quantity: item.quantity,
      note: item.note,
      status: item.status ?? "todo",
      source: "user",
      sourceLabel: "用户自定义",
      editable: true,
      removable: true,
      packTier: item.packTier ?? "core",
      itemKind: item.itemKind ?? "item",
      preparationKind: item.preparationKind,
      bag: item.bag,
      bulk: item.bulk,
      timing: item.timing ?? "pack_now",
    });

    const customItems = [...state.customItems, customItem];
    const checklist = state.profile
      ? generateChecklist(state.profile, {
          currentItems: state.checklist,
          customItems,
          hiddenTemplateItemIds: state.hiddenTemplateItemIds,
          hospitalOverrides: state.hospitalOverrides,
        })
      : [...state.checklist, customItem];

    set({ customItems, checklist });
    saveCustomItems(customItems);
    saveChecklist(checklist);
  },
  removeItem: (id) => {
    const state = get();
    const item = state.checklist.find((candidate) => candidate.id === id);

    if (!item) {
      return;
    }

    const customItems =
      item.source === "user"
        ? state.customItems.filter((customItem) => customItem.id !== id)
        : state.customItems;
    const hiddenTemplateItemIds =
      item.source === "user"
        ? state.hiddenTemplateItemIds
        : Array.from(new Set([...state.hiddenTemplateItemIds, id]));
    const checklist = state.checklist.filter((candidate) => candidate.id !== id);

    set({ checklist, customItems, hiddenTemplateItemIds });
    saveChecklist(checklist);
    saveCustomItems(customItems);
    saveHiddenTemplateItemIds(hiddenTemplateItemIds);
  },
  updateHospitalOverride: (override) => {
    const state = get();
    const hospitalOverrides = [
      ...state.hospitalOverrides.filter(
        (candidate) => candidate.hospitalId !== override.hospitalId,
      ),
      { ...override, updatedAt: nowIso() },
    ];
    const checklist = state.profile
      ? generateChecklist(state.profile, {
          currentItems: state.checklist,
          customItems: state.customItems,
          hiddenTemplateItemIds: state.hiddenTemplateItemIds,
          hospitalOverrides,
        })
      : state.checklist;

    set({ hospitalOverrides, checklist });
    saveHospitalOverrides(hospitalOverrides);
    saveChecklist(checklist);
  },
  updateHospitalAnswer: (answer) => {
    const state = get();
    const normalizedAnswer: HospitalAnswer = {
      ...answer,
      name: answer.name.trim(),
      note: answer.note?.trim() || undefined,
      updatedAt: answer.updatedAt || nowIso(),
    };
    const hospitalAnswers = [
      ...state.hospitalAnswers.filter(
        (candidate) => candidate.itemId !== normalizedAnswer.itemId,
      ),
      normalizedAnswer,
    ];
    const providedId = getProvidedIdForQuestion(
      normalizedAnswer.name,
      normalizedAnswer.itemId,
    );
    let profile = state.profile;
    let profileChanged = false;

    if (profile && providedId) {
      const currentProvidedIds = profile.hospitalProvidedItemIds;
      const nextProvidedIds = new Set(currentProvidedIds);

      const providedByHospital =
        normalizedAnswer.status === "provided" ||
        normalizedAnswer.status === "partial";

      if (providedByHospital) {
        nextProvidedIds.delete("unknown");
        nextProvidedIds.add(providedId);
      } else {
        nextProvidedIds.delete(providedId);
      }

      const nextHospitalProvidedItemIds = Array.from(nextProvidedIds);
      profileChanged = !sameStringArray(
        currentProvidedIds,
        nextHospitalProvidedItemIds,
      );

      if (profileChanged) {
        profile = {
          ...profile,
          hospitalProvidedItemIds: nextHospitalProvidedItemIds,
          updatedAt: nowIso(),
        };
      }
    }

    let checklist =
      profile && profileChanged
        ? buildChecklist(profile, state)
        : state.checklist;

    if (
      providedId &&
      normalizedAnswer.status !== "provided" &&
      normalizedAnswer.status !== "partial"
    ) {
      checklist = removeProvidedStatusForId(checklist, providedId);
    }

    checklist = checklist.map((item) =>
      item.id === normalizedAnswer.itemId
        ? {
            ...item,
            status: mapHospitalAnswerStatusToPackStatus(normalizedAnswer.status),
          }
        : item,
    );

    set({ profile, checklist, hospitalAnswers });
    saveHospitalAnswers(hospitalAnswers);
    saveChecklist(checklist);

    if (profileChanged) {
      saveUserProfile(profile);
    }
  },
  clearHospitalAnswer: (itemId) => {
    const state = get();
    const hospitalAnswers = state.hospitalAnswers.filter(
      (candidate) => candidate.itemId !== itemId,
    );
    const checklist = state.checklist.map((item) =>
      item.id === itemId ? { ...item, status: "todo" as const } : item,
    );

    set({ hospitalAnswers, checklist });
    saveHospitalAnswers(hospitalAnswers);
    saveChecklist(checklist);
  },
  updateTimelineTaskStatus: (taskId, status) => {
    const timelineTaskStatuses = updateStoredTimelineTaskStatus(taskId, status);

    set({ timelineTaskStatuses });
  },
  addContraction: (input) => {
    const state = get();
    const record = createContractionRecord(
      {
        id: itemId("contraction"),
        ...input,
      },
      state.contractions,
    );
    const contractions = [...state.contractions, record].sort(
      (left, right) =>
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
    );

    set({ contractions });
    saveContractions(contractions);
  },
  deleteContraction: (id) => {
    const contractions = get().contractions.filter((record) => record.id !== id);

    set({ contractions });
    saveContractions(contractions);
  },
  clearContractions: () => {
    set({ contractions: [] });
    saveContractions([]);
  },
  saveBirthPlan: (patch) => {
    const birthPlan = mergeBirthPlan({
      ...get().birthPlan,
      ...patch,
    });

    set({ birthPlan });
    saveStoredBirthPlan(birthPlan);
  },
  updatePostpartumTask: (id, patch) => {
    const postpartumTasks = mergePostpartumTasks(
      get().postpartumTasks.map((task) => {
        if (task.id !== id) {
          return task;
        }

        const nextTask = {
          ...task,
          ...patch,
        };

        if ("note" in patch) {
          nextTask.note = patch.note?.trim() || undefined;
        }

        return nextTask;
      }),
    );

    set({ postpartumTasks });
    savePostpartumTasks(postpartumTasks);
  },
  exportJson: () => JSON.stringify(exportData(), null, 2),
  importJson: (json) => {
    const validation = validateImportData(json);

    if (!validation.ok || !validation.data) {
      return { ok: validation.ok, message: validation.message };
    }

    snapshotBeforeChange("导入 JSON 前");

    const result = applyImportData(validation.data);

    if (result.ok) {
      get().hydrate();
    }

    return result;
  },
  clearAll: () => {
    snapshotBeforeChange("清空本地数据前");

    resetAllData();
    set({
      profile: undefined,
      checklist: [],
      customItems: [],
      hiddenTemplateItemIds: [],
      hospitalOverrides: [],
      hospitalAnswers: [],
      timelineTaskStatuses: [],
      contractions: [],
      birthPlan: mergeBirthPlan(),
      postpartumTasks: mergePostpartumTasks(),
      checklistMode: "lean",
      filters: {
        category: "all",
        status: "all",
        priority: "all",
      },
    });
  },
}));

export function buildExportSnapshot(): DadKitExportData {
  return exportData();
}

export function createCustomHospitalProfile(
  patch: Partial<HospitalProfile>,
): HospitalProfile {
  return {
    mode: "custom",
    hospitalId: patch.hospitalId ?? itemId("custom-hospital"),
    name: patch.name ?? "自定义医院",
    country: patch.country ?? "CN",
    province: patch.province,
    city: patch.city,
    district: patch.district,
    verificationStatus: "user_entered",
    requiredDocuments: patch.requiredDocuments ?? [],
    hospitalProvidedItems: patch.hospitalProvidedItems ?? [],
    recommendedItems: patch.recommendedItems ?? [],
    notAllowedItems: patch.notAllowedItems ?? [],
    admissionNotes: patch.admissionNotes,
    partnerPolicyNotes: patch.partnerPolicyNotes,
    wardNotes: patch.wardNotes,
    paymentNotes: patch.paymentNotes,
    parkingNotes: patch.parkingNotes,
    sourceNotes: patch.sourceNotes,
  };
}
