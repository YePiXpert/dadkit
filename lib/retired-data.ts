export const LEGACY_ITEM_PLANNING_STORAGE_KEY = "dadkit:v3:item-planning";
export const LEGACY_HOSPITAL_STORAGE_KEY = "dadkit:v3:hospital-profile";

export function purgeRetiredLocalData() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LEGACY_HOSPITAL_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_ITEM_PLANNING_STORAGE_KEY);
  } catch {
    // Retired data cleanup is best effort and must not block app startup.
  }
}
