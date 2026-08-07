"use client";

export type DataDomain =
  | "checklist"
  | "growth"
  | "hospital"
  | "planning"
  | "household"
  | "device-identity"
  | "baby"
  | "item-photo"
  | "sync-settings";

export type DataChangeMessage = {
  domain: DataDomain;
  entityId?: string;
  sourceId: string;
  version: number;
};

type DataChangeListener = (message: DataChangeMessage) => void;

export const DATA_CHANGE_SIGNAL_KEY = "dadkit:v3:data-change-signal";
export const SYNC_SETTINGS_CHANGE_EVENT = "dadkit:sync-settings-change";
const DATA_CHANGE_CHANNEL = "dadkit:data-change:v1";

const listeners = new Set<DataChangeListener>();
const sourceId = createSourceId();
let sequence = 0;
let channel: BroadcastChannel | undefined;
let initialized = false;

export function publishDataChange(domain: DataDomain, entityId?: string) {
  if (typeof window === "undefined") return;
  // Some unit/SSR harnesses expose storage without browser event delivery.
  // Writing a signal there cannot reach another tab and must not pollute data.
  if (typeof window.addEventListener !== "function") return;
  try {
    ensureInitialized();
  } catch {
    // Notifications are best effort and may run against a partial browser mock.
  }

  const message: DataChangeMessage = {
    domain,
    ...(entityId ? { entityId } : {}),
    sourceId,
    version: Date.now() * 1_000 + sequence++,
  };

  if (channel) {
    try {
      channel.postMessage(message);
      return;
    } catch {
      // Fall through to the storage-event transport.
    }
  }

  try {
    window.localStorage.setItem(DATA_CHANGE_SIGNAL_KEY, JSON.stringify(message));
  } catch {
    // Cross-tab refresh is best effort and must never make a successful write fail.
  }
}

export function subscribeToDataChanges(listener: DataChangeListener) {
  try {
    ensureInitialized();
  } catch {
    // Keep the in-process subscription usable even without browser event APIs.
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  if (typeof window.addEventListener !== "function") return;
  initialized = true;

  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(DATA_CHANGE_CHANNEL);
      channel.addEventListener("message", (event: MessageEvent<unknown>) => {
        deliver(event.data);
      });
    } catch {
      channel = undefined;
    }
  }

  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key !== DATA_CHANGE_SIGNAL_KEY || !event.newValue) return;
    try {
      deliver(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed signals. Business data is read from its repository.
    }
  });
}

function deliver(value: unknown) {
  if (!isDataChangeMessage(value) || value.sourceId === sourceId) return;
  for (const listener of listeners) {
    try {
      listener(value);
    } catch {
      // A stale subscriber must not stop other domains from refreshing.
    }
  }
}

function isDataChangeMessage(value: unknown): value is DataChangeMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<DataChangeMessage>;
  return (
    DATA_DOMAINS.has(candidate.domain as DataDomain) &&
    typeof candidate.sourceId === "string" &&
    typeof candidate.version === "number" &&
    Number.isFinite(candidate.version) &&
    (candidate.entityId === undefined || typeof candidate.entityId === "string")
  );
}

const DATA_DOMAINS = new Set<DataDomain>([
  "checklist",
  "growth",
  "hospital",
  "planning",
  "household",
  "device-identity",
  "baby",
  "item-photo",
  "sync-settings",
]);

function createSourceId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
