export type SyncSessionStatus = {
  expired: boolean;
  message?: string;
};

export const SYNC_SESSION_STATUS_EVENT = "dadkit:sync-session-status";

let status: SyncSessionStatus = { expired: false };

export function getSyncSessionStatus() {
  return status;
}

function notify() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent(SYNC_SESSION_STATUS_EVENT, { detail: status }),
    );
  }
}

export function markSyncSessionExpired(message?: string) {
  status = { expired: true, message };
  notify();
}

export function clearSyncSessionExpired() {
  if (!status.expired && !status.message) {
    return;
  }

  status = { expired: false };
  notify();
}
