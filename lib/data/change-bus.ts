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
const deliveredMessageIds = new Set<string>();
const deliveredMessageOrder: string[] = [];
const MAX_DELIVERED_MESSAGE_IDS = 128;

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
    } catch {
      // The storage-event transport below remains available.
    }
  }

  // WebKit can expose BroadcastChannel while intermittently dropping a
  // message under load. Publish the small signal through both transports;
  // receivers deduplicate the identical message before refreshing storage.
  try {
    window.localStorage.setItem(DATA_CHANGE_SIGNAL_KEY, JSON.stringify(message));
  } catch {
    // Cross-tab refresh is best effort and must never make a successful write fail.
  }
}

export function subscribeToDataChanges(listener: DataChangeListener) {
  // Register first so the retained-signal catch-up reaches this subscriber.
  // Without it, both the
  // BroadcastChannel message and the storage event are already gone by the
  // time a throttled background tab installs its listener.
  listeners.add(listener);
  try {
    ensureInitialized();
  } catch {
    // Keep the in-process subscription usable even without browser event APIs.
  }
  deliverRetainedSignal();
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

function deliverRetainedSignal() {
  if (typeof window === "undefined") return;
  // Storage events only fire for writes made after their listener exists. Read
  // the retained signal whenever a consumer subscribes so a late subscriber
  // still refreshes even if the bus itself was initialized earlier. A
  // concurrent storage event is harmless because deliver() deduplicates it.
  try {
    const retainedSignal = window.localStorage.getItem(DATA_CHANGE_SIGNAL_KEY);
    if (retainedSignal) deliver(JSON.parse(retainedSignal));
  } catch {
    // Missing/blocked storage leaves the live transports available.
  }
}

function deliver(value: unknown) {
  if (!isDataChangeMessage(value) || value.sourceId === sourceId) return;
  // A live transport can arrive after the bus is initialized but before the
  // application subscriber mounts. Leave that message unconsumed so the
  // retained-signal catch-up can deliver it when a listener is available.
  if (listeners.size === 0) return;
  const messageId = `${value.sourceId}:${value.version}`;
  if (deliveredMessageIds.has(messageId)) return;
  deliveredMessageIds.add(messageId);
  deliveredMessageOrder.push(messageId);
  if (deliveredMessageOrder.length > MAX_DELIVERED_MESSAGE_IDS) {
    const oldest = deliveredMessageOrder.shift();
    if (oldest) deliveredMessageIds.delete(oldest);
  }

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
