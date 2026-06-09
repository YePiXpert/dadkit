"use client";

import { create } from "zustand";

import { generateChecklist } from "@/lib/rules";
import {
  applyImportData,
  createSnapshot,
  exportData,
  loadChecklist,
  loadChecklistMode,
  loadCustomItems,
  loadHiddenTemplateItemIds,
  loadHospitalOverrides,
  loadUserProfile,
  resetAllData,
  saveChecklist,
  saveChecklistMode,
  saveCustomItems,
  saveHiddenTemplateItemIds,
  saveHospitalOverrides,
  saveUserProfile,
  validateImportData,
  type DadKitExportData,
  type ImportResult,
} from "@/lib/storage";
import type {
  ChecklistCategory,
  ChecklistMode,
  ChecklistItem,
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

export const useDadKitStore = create<DadKitState>((set, get) => ({
  hydrated: false,
  profile: undefined,
  checklist: [],
  checklistMode: "lean",
  customItems: [],
  hiddenTemplateItemIds: [],
  hospitalOverrides: [],
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
    snapshotBeforeChange("修改个人资料前");

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
    snapshotBeforeChange("修改个人资料前");

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
      item.id === id ? { ...item, ...patch } : item,
    );
    const customItems = state.customItems.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
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

    if (item.itemKind === "question" || item.itemKind === "task") {
      get().updateItem(id, { status: item.status === "todo" ? "packed" : "todo" });
      return;
    }

    const currentIndex = STATUS_FLOW.indexOf(item.status);
    const nextStatus = STATUS_FLOW[(currentIndex + 1) % STATUS_FLOW.length];
    get().updateItem(id, { status: nextStatus });
  },
  addCustomItem: (item) => {
    const state = get();
    const customItem: ChecklistItem = {
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
      bag: item.bag,
      bulk: item.bulk,
      timing: item.timing ?? "pack_now",
    };

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
