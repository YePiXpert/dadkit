// Lightweight read surface for checklist persistence status (write failures,
// quota warnings, etc.). Intentionally free of storage / growth-store / webdav
// imports so layout-level components can subscribe without pulling the full
// storage module into every page's first-load bundle. The storage module
// writes through the mark/record/reset helpers below.

export type ChecklistPersistenceStatus = {
  dirtyRevision: number;
  persistedRevision: number;
  lastError?: string;
  storageWarning?: string;
};

export const CHECKLIST_PERSISTENCE_EVENT = "dadkit:persistence-status";

let checklistDirtyRevision = 0;
let checklistPersistedRevision = 0;
let checklistPersistenceError: string | undefined;
let storageWarning: string | undefined;

export function getChecklistPersistenceStatus(): ChecklistPersistenceStatus {
  return {
    dirtyRevision: checklistDirtyRevision,
    persistedRevision: checklistPersistedRevision,
    lastError: checklistPersistenceError,
    storageWarning,
  };
}

function notifyChecklistPersistenceStatus() {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent(CHECKLIST_PERSISTENCE_EVENT, {
        detail: getChecklistPersistenceStatus(),
      }),
    );
  }
}

export function markChecklistStateDirty(): number {
  return ++checklistDirtyRevision;
}

export function recordChecklistStatePersisted(revision: number) {
  checklistPersistedRevision = Math.max(checklistPersistedRevision, revision);
  checklistPersistenceError = undefined;
  notifyChecklistPersistenceStatus();
}

export function recordChecklistPersistenceError(message: string) {
  checklistPersistenceError = message;
  notifyChecklistPersistenceStatus();
}

export function recordStorageWarning(message: string) {
  storageWarning = message;
  notifyChecklistPersistenceStatus();
}

export function dismissStorageWarning() {
  storageWarning = undefined;
  notifyChecklistPersistenceStatus();
}

export async function checkStorageCapacity() {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return;
  }

  try {
    await navigator.storage.persist?.();
    const estimate = await navigator.storage.estimate?.();

    if (
      estimate?.usage !== undefined &&
      estimate.quota !== undefined &&
      estimate.quota > 0 &&
      estimate.usage / estimate.quota >= 0.8
    ) {
      recordStorageWarning("本机存储空间已接近上限，请先导出备份或清理不需要的照片。");
      return;
    }

    dismissStorageWarning();
  } catch {
    // Storage persistence is a best-effort browser capability.
  }
}

export function resetChecklistPersistenceStatus() {
  checklistDirtyRevision = 0;
  checklistPersistedRevision = 0;
  checklistPersistenceError = undefined;
  storageWarning = undefined;
}

type ChecklistStateSaveRetryHandler = () => boolean;

let checklistStateSaveRetryHandler: ChecklistStateSaveRetryHandler | undefined;

// Registered by lib/storage.ts at module load so subscribers can trigger a
// retry without importing the storage module themselves.
export function registerChecklistStateSaveRetryHandler(
  handler: ChecklistStateSaveRetryHandler,
) {
  checklistStateSaveRetryHandler = handler;
}

export function retryPendingChecklistStateSave() {
  return checklistStateSaveRetryHandler?.() ?? true;
}
