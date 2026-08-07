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

export type PersistenceDomain =
  | "checklist"
  | "growth"
  | "hospital"
  | "planning"
  | "household"
  | "device-identity"
  | "baby"
  | "item-photo";

export type DomainPersistenceStatus = {
  domain: PersistenceDomain;
  dirtyRevision: number;
  persistedRevision: number;
  lastError?: string;
};

export type PersistenceOverview = {
  failure?: DomainPersistenceStatus;
  storageWarning?: string;
};

export const CHECKLIST_PERSISTENCE_EVENT = "dadkit:persistence-status";

const domainStatuses = new Map<PersistenceDomain, DomainPersistenceStatus>();
let storageWarning: string | undefined;

export function getChecklistPersistenceStatus(): ChecklistPersistenceStatus {
  const status = getPersistenceStatus("checklist");
  return {
    dirtyRevision: status.dirtyRevision,
    persistedRevision: status.persistedRevision,
    lastError: status.lastError,
    storageWarning,
  };
}

export function getPersistenceStatus(
  domain: PersistenceDomain,
): DomainPersistenceStatus {
  const status = domainStatuses.get(domain);
  return status
    ? { ...status }
    : { domain, dirtyRevision: 0, persistedRevision: 0 };
}

export function getPersistenceOverview(): PersistenceOverview {
  const failure = [...domainStatuses.values()].find(
    (status) => Boolean(status.lastError),
  );
  return {
    ...(failure ? { failure: { ...failure } } : {}),
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
        detail: getPersistenceOverview(),
      }),
    );
  }
}

export function markChecklistStateDirty(): number {
  return markPersistenceDirty("checklist");
}

export function recordChecklistStatePersisted(revision: number) {
  recordPersistencePersisted("checklist", revision);
}

export function recordChecklistPersistenceError(message: string) {
  recordPersistenceError("checklist", message);
}

export function markPersistenceDirty(domain: PersistenceDomain): number {
  const current = getPersistenceStatus(domain);
  const revision = current.dirtyRevision + 1;
  domainStatuses.set(domain, { ...current, dirtyRevision: revision });
  return revision;
}

export function recordPersistencePersisted(
  domain: PersistenceDomain,
  revision: number,
) {
  const current = getPersistenceStatus(domain);
  domainStatuses.set(domain, {
    ...current,
    persistedRevision: Math.max(current.persistedRevision, revision),
    lastError: undefined,
  });
  notifyChecklistPersistenceStatus();
}

export function recordPersistenceError(
  domain: PersistenceDomain,
  message: string,
) {
  const current = getPersistenceStatus(domain);
  domainStatuses.set(domain, { ...current, lastError: message });
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
  domainStatuses.clear();
  storageWarning = undefined;
}

type PersistenceRetryHandler = () => boolean;

const persistenceRetryHandlers = new Map<
  PersistenceDomain,
  PersistenceRetryHandler
>();

// Registered by lib/storage.ts at module load so subscribers can trigger a
// retry without importing the storage module themselves.
export function registerChecklistStateSaveRetryHandler(
  handler: PersistenceRetryHandler,
) {
  registerPersistenceRetryHandler("checklist", handler);
}

export function retryPendingChecklistStateSave() {
  return retryPendingPersistence("checklist");
}

export function registerPersistenceRetryHandler(
  domain: PersistenceDomain,
  handler: PersistenceRetryHandler,
) {
  persistenceRetryHandlers.set(domain, handler);
}

export function retryPendingPersistence(domain: PersistenceDomain) {
  return persistenceRetryHandlers.get(domain)?.() ?? true;
}
