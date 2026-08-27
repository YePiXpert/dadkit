export const LEGACY_ITEM_PLANNING_STORAGE_KEY = "dadkit:v3:item-planning";
export const LEGACY_HOSPITAL_STORAGE_KEY = "dadkit:v3:hospital-profile";

// WebDAV 备份已下线；secret 是明文密码，启动时必须尽力清除。
export const RETIRED_WEBDAV_STORAGE_KEYS = [
  "dadkit:v3:webdav-config",
  "dadkit:v3:webdav-sync-state",
  "dadkit:v3:webdav-secret",
  "dadkit:v3:webdav-session-secret",
] as const;

export function purgeRetiredLocalData() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LEGACY_HOSPITAL_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_ITEM_PLANNING_STORAGE_KEY);
    for (const key of RETIRED_WEBDAV_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage?.removeItem("dadkit:v3:webdav-session-secret");
  } catch {
    // Retired data cleanup is best effort and must not block app startup.
  }
}
