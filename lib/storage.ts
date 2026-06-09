import type {
  ChecklistItem,
  UserHospitalOverride,
  UserProfile,
} from "@/lib/types";

export const STORAGE_KEYS = {
  userProfile: "dadkit:user-profile",
  checklist: "dadkit:checklist",
  customItems: "dadkit:custom-items",
  hiddenTemplateItems: "dadkit:hidden-template-items",
  hospitalOverrides: "dadkit:hospital-overrides",
} as const;

export type DadKitExportData = {
  version: 1;
  exportedAt: string;
  userProfile?: UserProfile;
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  hospitalOverrides: UserHospitalOverride[];
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadUserProfile() {
  return readJson<UserProfile | undefined>(STORAGE_KEYS.userProfile, undefined);
}

export function saveUserProfile(profile?: UserProfile) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (!profile) {
    window.localStorage.removeItem(STORAGE_KEYS.userProfile);
    return;
  }

  writeJson(STORAGE_KEYS.userProfile, profile);
}

export function loadChecklist() {
  return readJson<ChecklistItem[]>(STORAGE_KEYS.checklist, []);
}

export function saveChecklist(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.checklist, items);
}

export function loadCustomItems() {
  return readJson<ChecklistItem[]>(STORAGE_KEYS.customItems, []);
}

export function saveCustomItems(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.customItems, items);
}

export function loadHiddenTemplateItemIds() {
  return readJson<string[]>(STORAGE_KEYS.hiddenTemplateItems, []);
}

export function saveHiddenTemplateItemIds(ids: string[]) {
  writeJson(STORAGE_KEYS.hiddenTemplateItems, ids);
}

export function loadHospitalOverrides() {
  return readJson<UserHospitalOverride[]>(STORAGE_KEYS.hospitalOverrides, []);
}

export function saveHospitalOverrides(overrides: UserHospitalOverride[]) {
  writeJson(STORAGE_KEYS.hospitalOverrides, overrides);
}

export function resetAllData() {
  if (!canUseLocalStorage()) {
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}

export function exportData(): DadKitExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile: loadUserProfile(),
    checklist: loadChecklist(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
    hospitalOverrides: loadHospitalOverrides(),
  };
}

export function importData(rawJson: string) {
  const data = JSON.parse(rawJson) as Partial<DadKitExportData>;

  if (data.userProfile) {
    saveUserProfile(data.userProfile);
  }

  saveChecklist(Array.isArray(data.checklist) ? data.checklist : []);
  saveCustomItems(Array.isArray(data.customItems) ? data.customItems : []);
  saveHiddenTemplateItemIds(
    Array.isArray(data.hiddenTemplateItemIds) ? data.hiddenTemplateItemIds : [],
  );
  saveHospitalOverrides(
    Array.isArray(data.hospitalOverrides) ? data.hospitalOverrides : [],
  );
}
