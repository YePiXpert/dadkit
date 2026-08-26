export const SYNC_SESSION_STORAGE_KEY = "dadkit:v3:sync-session";

export function hasStoredSyncSession() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(SYNC_SESSION_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}
