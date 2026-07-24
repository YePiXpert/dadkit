"use client";

import { create } from "zustand";

import {
  generateChecklist,
  getHospitalAnswerScopeId,
  normalizeChecklistItem,
} from "@/lib/rules";
import {
  getProvidedIdForQuestion,
  mapHospitalAnswerStatusToPackStatus,
} from "@/lib/hospital/answers";
import { clearItemPhotos, deleteItemPhoto } from "@/lib/item-photos";
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

export type AddCustomItemResult = {
  itemId: string;
  merged: boolean;
};

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
  advanceItem: (id: string) => void;
  toggleItemSkipped: (id: string) => void;
  addCustomItem: (
    item: Pick<ChecklistItem, "name" | "category" | "priority"> &
      Partial<ChecklistItem>,
  ) => AddCustomItemResult;
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

function comparableItemName(name: string) {
  return name.trim().replace(/[\s，,。.!！?？、·\-]/g, "").toLowerCase();
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

export function createDefaultProfile(input: CreateProfileInput = {}): UserProfile {
  const timestamp = nowIso();

  return {
    babySex: "unknown",
    regionId: "other",
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
>) {
  saveUserProfile(state.profile);
  saveChecklist(state.checklist);
  saveCustomItems(state.customItems);
  saveHiddenTemplateItemIds(state.hiddenTemplateItemIds);
  saveHospitalOverrides(state.hospitalOverrides);
}

function buildChecklist(
  profile: UserProfile,
  state: Pick<
    DadKitState,
    | "profile"
    | "checklist"
    | "customItems"
    | "hiddenTemplateItemIds"
    | "hospitalOverrides"
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

type ScopedHospitalAnswer = HospitalAnswer & { hospitalId: string };

function normalizeHospitalAnswers(
  answers: HospitalAnswer[],
  fallbackHospitalId: string,
) {
  const answersByScopeAndItem = new Map<string, ScopedHospitalAnswer>();

  for (const answer of answers) {
    const normalizedAnswer: ScopedHospitalAnswer = {
      ...answer,
      hospitalId: answer.hospitalId || fallbackHospitalId,
    };

    answersByScopeAndItem.set(
      `${normalizedAnswer.hospitalId}\u0000${normalizedAnswer.itemId}`,
      normalizedAnswer,
    );
  }

  return Array.from(answersByScopeAndItem.values());
}

function mergeStoredHospitalAnswers(
  state: Pick<DadKitState, "profile" | "hospitalAnswers">,
) {
  const activeHospitalId = getHospitalAnswerScopeId(state.profile);
  const storedAnswers = normalizeHospitalAnswers(
    loadHospitalAnswers(),
    activeHospitalId,
  );
  const activeAnswers = normalizeHospitalAnswers(
    state.hospitalAnswers.map((answer) => ({
      ...answer,
      hospitalId: activeHospitalId,
    })),
    activeHospitalId,
  );

  return [
    ...storedAnswers.filter(
      (answer) => answer.hospitalId !== activeHospitalId,
    ),
    ...activeAnswers,
  ];
}

function answersForHospital(
  answers: ScopedHospitalAnswer[],
  profile?: UserProfile,
) {
  const hospitalId = getHospitalAnswerScopeId(profile);
  return answers.filter((answer) => answer.hospitalId === hospitalId);
}

function providedIdsFromAnswers(answers: HospitalAnswer[]) {
  return Array.from(
    new Set(
      answers.flatMap((answer) => {
        if (answer.status !== "provided" && answer.status !== "partial") {
          return [];
        }

        const providedId = getProvidedIdForQuestion(answer.name, answer.itemId);
        return providedId ? [providedId] : [];
      }),
    ),
  );
}

function transitionHospitalAnswers(
  state: Pick<DadKitState, "profile" | "hospitalAnswers">,
  nextProfile: UserProfile,
) {
  const previousHospitalId = getHospitalAnswerScopeId(state.profile);
  const nextHospitalId = getHospitalAnswerScopeId(nextProfile);

  if (previousHospitalId === nextHospitalId) {
    return state.hospitalAnswers;
  }

  const allAnswers = mergeStoredHospitalAnswers(state);
  saveHospitalAnswers(allAnswers);
  return answersForHospital(allAnswers, nextProfile);
}

function transitionHospitalProvidedSelections(
  state: Pick<DadKitState, "profile" | "hospitalOverrides">,
  nextProfile: UserProfile,
) {
  const previousHospitalId = getHospitalAnswerScopeId(state.profile);
  const nextHospitalId = getHospitalAnswerScopeId(nextProfile);

  if (previousHospitalId === nextHospitalId) {
    return {
      hospitalOverrides: state.hospitalOverrides,
      selectedProvidedItemIds: nextProfile.hospitalProvidedItemIds,
    };
  }

  let hospitalOverrides = state.hospitalOverrides;

  if (state.profile) {
    const previousOverride = hospitalOverrides.find(
      (override) => override.hospitalId === previousHospitalId,
    );
    hospitalOverrides = [
      ...hospitalOverrides.filter(
        (override) => override.hospitalId !== previousHospitalId,
      ),
      {
        ...previousOverride,
        hospitalId: previousHospitalId,
        selectedProvidedItemIds: state.profile.hospitalProvidedItemIds,
        updatedAt: nowIso(),
      },
    ];
    saveHospitalOverrides(hospitalOverrides);
  }

  return {
    hospitalOverrides,
    selectedProvidedItemIds:
      hospitalOverrides.find(
        (override) => override.hospitalId === nextHospitalId,
      )?.selectedProvidedItemIds ?? [],
  };
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
    hospitalProvidedByRule:
      "status" in patch ? false : item.hospitalProvidedByRule,
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
      item.hospitalProvidedByRule !== true ||
      item.itemKind !== "item" ||
      !keywords.some((keyword) => item.name.includes(keyword))
    ) {
      return item;
    }

    return {
      ...item,
      status: "todo" as const,
      hospitalProvidedByRule: undefined,
      note:
        item.note ===
        "用户标记为已向医院确认提供，仍建议确认具体规格、数量和是否需要少量备用。"
          ? undefined
          : item.note,
    };
  });
}

export const useDadKitStore = create<DadKitState>((set, get) => ({
  hydrated: false,
  profile: undefined,
  checklist: [],
  checklistMode: "full",
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
    const generationProfile = profile ?? createDefaultProfile();
    const checklist = loadChecklist();
    const customItems = loadCustomItems();
    const hiddenTemplateItemIds = loadHiddenTemplateItemIds();
    const hospitalOverrides = loadHospitalOverrides();
    const storedHospitalAnswers = loadHospitalAnswers();
    const fallbackHospitalId = getHospitalAnswerScopeId(profile);
    const allHospitalAnswers = normalizeHospitalAnswers(
      storedHospitalAnswers,
      fallbackHospitalId,
    );
    const hospitalAnswers = answersForHospital(allHospitalAnswers, profile);
    const timelineTaskStatuses = loadTimelineTaskStatuses();
    const contractions = loadContractions();
    const birthPlan = loadBirthPlan();
    const postpartumTasks = loadPostpartumTasks();
    const checklistMode = loadChecklistMode();
    const hydratedChecklist = generateChecklist(generationProfile, {
      currentItems: checklist,
      customItems,
      hiddenTemplateItemIds,
      hospitalOverrides,
    });

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

    saveChecklist(hydratedChecklist);

    if (storedHospitalAnswers.some((answer) => !answer.hospitalId)) {
      saveHospitalAnswers(allHospitalAnswers);
    }
  },
  createProfile: (input) => {
    snapshotBeforeChange("创建新清单前");

    const profile = createDefaultProfile(input);
    const state = get();
    const checklist = buildChecklist(profile, {
      ...state,
      checklist: state.checklist,
      customItems: state.customItems,
      hiddenTemplateItemIds: state.hiddenTemplateItemIds,
      hospitalOverrides: state.hospitalOverrides,
    });

    set({ profile, checklist });
    persistCoreState({ ...state, profile, checklist });

    return profile;
  },
  saveProfile: (profile) => {
    const state = get();
    const hospitalAnswers = transitionHospitalAnswers(state, profile);
    const hospitalProvidedTransition = transitionHospitalProvidedSelections(
      state,
      profile,
    );
    const hospitalChanged =
      getHospitalAnswerScopeId(state.profile) !==
      getHospitalAnswerScopeId(profile);
    const updatedProfile = {
      ...profile,
      hospitalProvidedItemIds: hospitalChanged
        ? Array.from(
            new Set([
              ...hospitalProvidedTransition.selectedProvidedItemIds,
              ...profile.hospitalProvidedItemIds,
              ...providedIdsFromAnswers(hospitalAnswers),
            ]),
          )
        : profile.hospitalProvidedItemIds,
      updatedAt: nowIso(),
    };
    const nextState = {
      ...state,
      hospitalOverrides: hospitalProvidedTransition.hospitalOverrides,
    };
    const checklist = buildChecklist(updatedProfile, nextState);

    set({
      profile: updatedProfile,
      checklist,
      hospitalAnswers,
      hospitalOverrides: hospitalProvidedTransition.hospitalOverrides,
    });
    persistCoreState({ ...nextState, profile: updatedProfile, checklist });
  },
  updateProfile: (patch) => {
    const state = get();
    let profile = state.profile
      ? { ...state.profile, ...patch, updatedAt: nowIso() }
      : createDefaultProfile(patch);
    const hospitalAnswers = transitionHospitalAnswers(state, profile);
    const hospitalProvidedTransition = transitionHospitalProvidedSelections(
      state,
      profile,
    );
    const hospitalChanged =
      getHospitalAnswerScopeId(state.profile) !==
      getHospitalAnswerScopeId(profile);

    if (hospitalChanged) {
      const answerProvidedIds = providedIdsFromAnswers(hospitalAnswers);
      profile = {
        ...profile,
        hospitalProvidedItemIds:
          "hospitalProvidedItemIds" in patch
            ? Array.from(
                new Set([
                  ...hospitalProvidedTransition.selectedProvidedItemIds,
                  ...profile.hospitalProvidedItemIds,
                  ...answerProvidedIds,
                ]),
              )
            : Array.from(
                new Set([
                  ...hospitalProvidedTransition.selectedProvidedItemIds,
                  ...answerProvidedIds,
                ]),
              ),
      };
    }

    const nextState = {
      ...state,
      hospitalOverrides: hospitalProvidedTransition.hospitalOverrides,
    };
    const checklist = buildChecklist(profile, nextState);

    set({
      profile,
      checklist,
      hospitalAnswers,
      hospitalOverrides: hospitalProvidedTransition.hospitalOverrides,
    });
    persistCoreState({ ...nextState, profile, checklist });
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
    const profile = state.profile ?? createDefaultProfile();
    const checklist = buildChecklist(profile, state);
    set({ checklist });
    saveChecklist(checklist);
  },
  resetChecklist: () => {
    const state = get();
    const profile = state.profile ?? createDefaultProfile();

    snapshotBeforeChange("重置清单前");

    const checklist = generateChecklist(profile, {
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
  advanceItem: (id) => {
    const item = get().checklist.find((candidate) => candidate.id === id);

    if (!item) {
      return;
    }

    const nextStatus =
      item.status === "packed" ||
      item.status === "hospital_provided" ||
      item.status === "not_needed"
        ? "todo"
        : item.status === "bought" || item.status === "washed"
          ? "packed"
          : "bought";

    get().updateItem(id, { status: nextStatus });
  },
  toggleItemSkipped: (id) => {
    const item = get().checklist.find((candidate) => candidate.id === id);

    if (!item) {
      return;
    }

    get().updateItem(id, {
      status: item.status === "not_needed" ? "todo" : "not_needed",
    });
  },
  addCustomItem: (item) => {
    const state = get();
    const normalizedName = comparableItemName(item.name);
    const existing = state.checklist.find(
      (candidate) =>
        candidate.itemKind !== "question" &&
        comparableItemName(candidate.name) === normalizedName,
    );
    const existingOverlay = existing
      ? state.customItems.find(
          (candidate) =>
            candidate.category === existing.category &&
            comparableItemName(candidate.name) === normalizedName,
        )
      : undefined;
    const customItem: ChecklistItem = normalizeChecklistItem({
      id: existingOverlay?.id ?? item.id ?? itemId(),
      name: existing?.name ?? item.name.trim(),
      category: existing?.category ?? item.category,
      priority: item.priority,
      quantity: existing
        ? mergeChecklistQuantity(existing.quantity, item.quantity)
        : item.quantity,
      note: item.note?.trim() || existingOverlay?.note,
      status: existing?.status ?? item.status ?? "todo",
      source: "user",
      sourceLabel: "用户自定义",
      editable: true,
      removable: true,
      packTier: item.packTier ?? "core",
      itemKind: item.itemKind ?? "item",
      preparationKind: existing?.preparationKind ?? item.preparationKind,
      bag: existing?.bag ?? item.bag,
      bulk: existing?.bulk ?? item.bulk,
      timing: existing?.timing ?? item.timing ?? "pack_now",
    });

    const customItems = existingOverlay
      ? state.customItems.map((candidate) =>
          candidate.id === existingOverlay.id ? customItem : candidate,
        )
      : [...state.customItems, customItem];
    const checklist = generateChecklist(
      state.profile ?? createDefaultProfile(),
      {
        currentItems: state.checklist,
        customItems,
        hiddenTemplateItemIds: state.hiddenTemplateItemIds,
        hospitalOverrides: state.hospitalOverrides,
      },
    );

    set({ customItems, checklist });
    saveCustomItems(customItems);
    saveChecklist(checklist);

    return {
      itemId: existing?.id ?? customItem.id,
      merged: Boolean(existing),
    };
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

    void deleteItemPhoto(id).catch(() => undefined);
    set({ checklist, customItems, hiddenTemplateItemIds });
    saveChecklist(checklist);
    saveCustomItems(customItems);
    saveHiddenTemplateItemIds(hiddenTemplateItemIds);
  },
  updateHospitalOverride: (override) => {
    const state = get();
    const previousOverride = state.hospitalOverrides.find(
      (candidate) => candidate.hospitalId === override.hospitalId,
    );
    const hospitalOverrides = [
      ...state.hospitalOverrides.filter(
        (candidate) => candidate.hospitalId !== override.hospitalId,
      ),
      { ...previousOverride, ...override, updatedAt: nowIso() },
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
    const activeHospitalId = getHospitalAnswerScopeId(state.profile);
    const normalizedAnswer: HospitalAnswer = {
      ...answer,
      hospitalId: activeHospitalId,
      name: answer.name.trim(),
      note: answer.note?.trim() || undefined,
      updatedAt: answer.updatedAt || nowIso(),
    };
    const allHospitalAnswers = [
      ...mergeStoredHospitalAnswers(state).filter(
        (candidate) =>
          candidate.hospitalId !== activeHospitalId ||
          candidate.itemId !== normalizedAnswer.itemId,
      ),
      normalizedAnswer as ScopedHospitalAnswer,
    ];
    const hospitalAnswers = answersForHospital(
      allHospitalAnswers,
      state.profile,
    );
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
    saveHospitalAnswers(allHospitalAnswers);
    saveChecklist(checklist);

    if (profileChanged) {
      saveUserProfile(profile);
    }
  },
  clearHospitalAnswer: (itemId) => {
    const state = get();
    const activeHospitalId = getHospitalAnswerScopeId(state.profile);
    const removedAnswer = state.hospitalAnswers.find(
      (candidate) => candidate.itemId === itemId,
    );
    const allHospitalAnswers = mergeStoredHospitalAnswers(state).filter(
      (candidate) =>
        candidate.hospitalId !== activeHospitalId || candidate.itemId !== itemId,
    );
    const hospitalAnswers = answersForHospital(
      allHospitalAnswers,
      state.profile,
    );
    const providedId = removedAnswer
      ? getProvidedIdForQuestion(removedAnswer.name, removedAnswer.itemId)
      : undefined;
    let profile = state.profile;

    if (profile && providedId) {
      profile = {
        ...profile,
        hospitalProvidedItemIds: profile.hospitalProvidedItemIds.filter(
          (candidate) => candidate !== providedId,
        ),
        updatedAt: nowIso(),
      };
    }

    let checklist = profile && providedId
      ? buildChecklist(profile, state)
      : state.checklist;
    checklist = removeProvidedStatusForId(checklist, providedId).map((item) =>
      item.id === itemId ? { ...item, status: "todo" as const } : item,
    );

    set({ profile, hospitalAnswers, checklist });
    saveHospitalAnswers(allHospitalAnswers);
    saveChecklist(checklist);

    if (profile !== state.profile) {
      saveUserProfile(profile);
    }
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
    void clearItemPhotos().catch(() => undefined);
    const checklist = generateChecklist(createDefaultProfile());

    saveChecklist(checklist);
    set({
      profile: undefined,
      checklist,
      customItems: [],
      hiddenTemplateItemIds: [],
      hospitalOverrides: [],
      hospitalAnswers: [],
      timelineTaskStatuses: [],
      contractions: [],
      birthPlan: mergeBirthPlan(),
      postpartumTasks: mergePostpartumTasks(),
      checklistMode: "full",
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
    sourceNotes: patch.sourceNotes,
  };
}
