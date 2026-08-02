"use client";

import { createEmptyBabyCare, createEmptyBabyData, createEmptyBabyProfile } from "@/lib/baby/defaults";
import { cloneBabyData, cloneBabyProfile, cloneCareEvent, latestBabyTimestamp } from "@/lib/baby/portable";
import { careEventSortTime } from "@/lib/baby/time";
import type {
  BabyPortableData,
  BabyProfilePortableData,
  CareEvent,
} from "@/lib/baby/types";
import { BABY_EVENT_LIMIT } from "@/lib/baby/types";
import { isBabyPortableData, isBabyProfilePortableData, isCareEvent } from "@/lib/baby/validation";

export const BABY_DATABASE_NAME = "dadkit-baby";
export const BABY_DATABASE_VERSION = 1;

const META_STORE = "meta";
const EVENTS_STORE = "events";
const SNAPSHOTS_STORE = "snapshots";
const PROFILE_KEY = "babyProfile";
const CARE_META_KEY = "careMeta";
const SCHEMA_VERSION_KEY = "schemaVersion";

type MetaEntry = { key: string; value: unknown };

export type BabySnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  data: unknown;
};

export interface BabyRepository {
  openDatabase(): Promise<unknown>;
  loadBabyProfile(): Promise<BabyProfilePortableData>;
  saveBabyProfile(profile: BabyProfilePortableData): Promise<void>;
  getEvent(id: string): Promise<CareEvent | undefined>;
  getEventsByRange(start: number, end: number): Promise<CareEvent[]>;
  getRecentEvents(limit: number): Promise<CareEvent[]>;
  getActiveEvents(): Promise<CareEvent[]>;
  getAllEventsForPortableExport(): Promise<CareEvent[]>;
  getAllBabyData(): Promise<BabyPortableData>;
  getLatestTimestamp(): Promise<number>;
  putEvent(event: CareEvent): Promise<void>;
  putEvents(events: CareEvent[]): Promise<void>;
  deleteEventAsTombstone(id: string, timestamp: number): Promise<CareEvent | undefined>;
  replaceBabyDataTransaction(data: BabyPortableData): Promise<void>;
  clearCareData(clearedAt: number): Promise<void>;
  clearAllBabyData(clearedAt: number): Promise<void>;
  saveSnapshot(snapshot: BabySnapshot): Promise<void>;
  loadLatestSnapshot(): Promise<BabySnapshot | undefined>;
  loadSnapshots(): Promise<BabySnapshot[]>;
  clearSnapshots(): Promise<void>;
}

export class IndexedDbBabyRepository implements BabyRepository {
  private databasePromise?: Promise<IDBDatabase>;

  openDatabase() {
    if (this.databasePromise) return this.databasePromise;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("当前浏览器不支持 IndexedDB，宝宝记录无法安全保存。"));
    }

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(BABY_DATABASE_NAME, BABY_DATABASE_VERSION);
      request.onerror = () => reject(request.error ?? new Error("无法打开宝宝记录数据库。"));
      request.onblocked = () => reject(new Error("宝宝记录数据库正在被其他页面占用，请关闭其他 DadKit 页面后重试。"));
      request.onupgradeneeded = () => upgradeBabyDatabase(request.result, request.transaction);
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
    return this.databasePromise;
  }

  async loadBabyProfile() {
    const database = await this.openDatabase();
    const transaction = database.transaction(META_STORE, "readonly");
    const entry = await requestPromise<MetaEntry | undefined>(transaction.objectStore(META_STORE).get(PROFILE_KEY));
    return isBabyProfilePortableData(entry?.value) ? cloneBabyProfile(entry.value) : createEmptyBabyProfile();
  }

  async saveBabyProfile(profile: BabyProfilePortableData) {
    if (!isBabyProfilePortableData(profile)) throw new Error("宝宝资料格式无效。");
    const database = await this.openDatabase();
    const transaction = database.transaction(META_STORE, "readwrite");
    transaction.objectStore(META_STORE).put({ key: PROFILE_KEY, value: cloneBabyProfile(profile) });
    await transactionComplete(transaction);
  }

  async getEvent(id: string) {
    const database = await this.openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readonly");
    const value = await requestPromise<unknown>(transaction.objectStore(EVENTS_STORE).get(id));
    return isCareEvent(value) ? cloneCareEvent(value) : undefined;
  }

  async getEventsByRange(start: number, end: number) {
    const events = await this.readAllEvents();
    return events
      .filter((event) => {
        const time = careEventSortTime(event);
        return time >= start && time < end;
      })
      .sort((left, right) => careEventSortTime(right) - careEventSortTime(left) || left.id.localeCompare(right.id));
  }

  async getRecentEvents(limit: number) {
    const events = await this.readAllEvents();
    return events
      .filter((event) => event.deletedAt === null)
      .sort((left, right) => careEventSortTime(right) - careEventSortTime(left) || left.id.localeCompare(right.id))
      .slice(0, Math.max(0, limit));
  }

  async getActiveEvents() {
    const events = await this.readAllEvents();
    return events.filter(
      (event) =>
        event.deletedAt === null &&
        (event.type === "breastfeeding" || event.type === "pumping" || event.type === "sleep") &&
        event.endAt === null,
    );
  }

  async getAllEventsForPortableExport() {
    const events = await this.readAllEvents();
    return events.sort((left, right) => left.id.localeCompare(right.id));
  }

  async getAllBabyData() {
    const database = await this.openDatabase();
    const transaction = database.transaction([META_STORE, EVENTS_STORE], "readonly");
    const metaStore = transaction.objectStore(META_STORE);
    // Queue every request before yielding. Safari/WebKit may auto-commit an
    // IndexedDB transaction between sequential await continuations.
    const [profileEntry, careEntry, rawEvents] = await Promise.all([
      requestPromise<MetaEntry | undefined>(metaStore.get(PROFILE_KEY)),
      requestPromise<MetaEntry | undefined>(metaStore.get(CARE_META_KEY)),
      requestPromise<unknown[]>(transaction.objectStore(EVENTS_STORE).getAll()),
      transactionComplete(transaction),
    ]);

    if (profileEntry && !isBabyProfilePortableData(profileEntry.value)) {
      throw new Error("宝宝资料数据库内容损坏，未读取任何照护记录。");
    }
    if (rawEvents.some((event) => !isCareEvent(event))) {
      throw new Error("宝宝照护记录数据库内容损坏，未返回不完整数据。");
    }
    const profile = profileEntry
      ? cloneBabyProfile(profileEntry.value as BabyProfilePortableData)
      : createEmptyBabyProfile();
    const clearedAt = readCareClearedAt(careEntry?.value);
    const events = (rawEvents as CareEvent[]).map(cloneCareEvent).sort((left, right) => left.id.localeCompare(right.id));
    return { version: 1, profile, care: { version: 1, clearedAt, events } } satisfies BabyPortableData;
  }

  async getLatestTimestamp() {
    return latestBabyTimestamp(await this.getAllBabyData());
  }

  async putEvent(event: CareEvent) {
    await this.putEvents([event]);
  }

  async putEvents(events: CareEvent[]) {
    if (!events.every(isCareEvent)) throw new Error("照护记录格式无效。");
    const database = await this.openDatabase();
    const keyTransaction = database.transaction(EVENTS_STORE, "readonly");
    const existingKeys = await requestPromise<IDBValidKey[]>(keyTransaction.objectStore(EVENTS_STORE).getAllKeys());
    const existing = new Set(existingKeys.map(String));
    const additions = new Set(events.filter((event) => !existing.has(event.id)).map((event) => event.id));
    if (existing.size + additions.size > BABY_EVENT_LIMIT) {
      throw new Error(`宝宝照护记录不能超过 ${BABY_EVENT_LIMIT.toLocaleString("en-US")} 条。`);
    }
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);
    for (const event of events) store.put(cloneCareEvent(event));
    await transactionComplete(transaction);
  }

  async deleteEventAsTombstone(id: string, timestamp: number) {
    const database = await this.openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readwrite");
    const store = transaction.objectStore(EVENTS_STORE);
    const current = await requestPromise<unknown>(store.get(id));
    if (!isCareEvent(current)) {
      // A readwrite transaction with no writes may complete normally. Waiting
      // for it avoids leaving a late abort/error event detached from this call.
      await transactionComplete(transaction);
      return undefined;
    }
    const deleted = { ...cloneCareEvent(current), updatedAt: timestamp, deletedAt: timestamp } as CareEvent;
    if (!isCareEvent(deleted)) {
      transaction.abort();
      throw new Error("删除墓碑格式无效。");
    }
    store.put(deleted);
    await transactionComplete(transaction);
    return deleted;
  }

  async replaceBabyDataTransaction(data: BabyPortableData) {
    if (!isBabyPortableData(data)) throw new Error("宝宝数据格式无效。");
    const database = await this.openDatabase();
    const transaction = database.transaction([META_STORE, EVENTS_STORE], "readwrite");
    const meta = transaction.objectStore(META_STORE);
    const events = transaction.objectStore(EVENTS_STORE);
    meta.put({ key: PROFILE_KEY, value: cloneBabyProfile(data.profile) });
    meta.put({ key: CARE_META_KEY, value: { version: 1, clearedAt: data.care.clearedAt } });
    events.clear();
    for (const event of data.care.events) events.put(cloneCareEvent(event));
    await transactionComplete(transaction);
  }

  async clearCareData(clearedAt: number) {
    const database = await this.openDatabase();
    const transaction = database.transaction([META_STORE, EVENTS_STORE], "readwrite");
    transaction.objectStore(META_STORE).put({ key: CARE_META_KEY, value: { version: 1, clearedAt } });
    transaction.objectStore(EVENTS_STORE).clear();
    await transactionComplete(transaction);
  }

  async clearAllBabyData(clearedAt: number) {
    const database = await this.openDatabase();
    const transaction = database.transaction([META_STORE, EVENTS_STORE], "readwrite");
    const meta = transaction.objectStore(META_STORE);
    meta.put({ key: PROFILE_KEY, value: createEmptyBabyProfile(clearedAt) });
    meta.put({ key: CARE_META_KEY, value: { version: 1, clearedAt } });
    transaction.objectStore(EVENTS_STORE).clear();
    await transactionComplete(transaction);
  }

  async saveSnapshot(snapshot: BabySnapshot) {
    const database = await this.openDatabase();
    const transaction = database.transaction(SNAPSHOTS_STORE, "readwrite");
    const store = transaction.objectStore(SNAPSHOTS_STORE);
    store.put(structuredCloneSafe(snapshot));
    const existing = await requestPromise<BabySnapshot[]>(store.getAll());
    for (const stale of existing.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(2)) {
      store.delete(stale.id);
    }
    await transactionComplete(transaction);
  }

  async loadLatestSnapshot() {
    return (await this.loadSnapshots())[0];
  }

  async loadSnapshots() {
    const database = await this.openDatabase();
    const transaction = database.transaction(SNAPSHOTS_STORE, "readonly");
    const snapshots = await requestPromise<BabySnapshot[]>(transaction.objectStore(SNAPSHOTS_STORE).getAll());
    return snapshots
      .filter(isBabySnapshot)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, 2)
      .map(structuredCloneSafe);
  }

  async clearSnapshots() {
    const database = await this.openDatabase();
    const transaction = database.transaction(SNAPSHOTS_STORE, "readwrite");
    transaction.objectStore(SNAPSHOTS_STORE).clear();
    await transactionComplete(transaction);
  }

  private async readAllEvents() {
    const database = await this.openDatabase();
    const transaction = database.transaction(EVENTS_STORE, "readonly");
    const values = await requestPromise<unknown[]>(transaction.objectStore(EVENTS_STORE).getAll());
    return values.filter(isCareEvent).map(cloneCareEvent);
  }
}

export class MemoryBabyRepository implements BabyRepository {
  private data: BabyPortableData;
  private snapshots: BabySnapshot[] = [];
  failNextWrite = false;

  constructor(initial = createEmptyBabyData()) {
    if (!isBabyPortableData(initial)) throw new Error("测试宝宝数据无效。");
    this.data = cloneBabyData(initial);
  }

  async openDatabase() { return undefined; }
  async loadBabyProfile() { return cloneBabyProfile(this.data.profile); }
  async saveBabyProfile(profile: BabyProfilePortableData) { this.throwIfNeeded(); this.data.profile = cloneBabyProfile(profile); }
  async getEvent(id: string) { const event = this.data.care.events.find((candidate) => candidate.id === id); return event && cloneCareEvent(event); }
  async getEventsByRange(start: number, end: number) { return (await this.getAllEventsForPortableExport()).filter((event) => careEventSortTime(event) >= start && careEventSortTime(event) < end); }
  async getRecentEvents(limit: number) { return (await this.getAllEventsForPortableExport()).filter((event) => event.deletedAt === null).sort((a, b) => careEventSortTime(b) - careEventSortTime(a)).slice(0, limit); }
  async getActiveEvents() { return (await this.getAllEventsForPortableExport()).filter((event) => event.deletedAt === null && (event.type === "breastfeeding" || event.type === "pumping" || event.type === "sleep") && event.endAt === null); }
  async getAllEventsForPortableExport() { return this.data.care.events.map(cloneCareEvent).sort((a, b) => a.id.localeCompare(b.id)); }
  async getAllBabyData() { return cloneBabyData(this.data); }
  async getLatestTimestamp() { return latestBabyTimestamp(this.data); }
  async putEvent(event: CareEvent) { await this.putEvents([event]); }
  async putEvents(events: CareEvent[]) { this.throwIfNeeded(); const next = new Map(this.data.care.events.map((event) => [event.id, event])); for (const event of events) next.set(event.id, cloneCareEvent(event)); if (next.size > BABY_EVENT_LIMIT) throw new Error(`宝宝照护记录不能超过 ${BABY_EVENT_LIMIT.toLocaleString("en-US")} 条。`); this.data.care.events = [...next.values()].sort((a, b) => a.id.localeCompare(b.id)); }
  async deleteEventAsTombstone(id: string, timestamp: number) { this.throwIfNeeded(); const event = await this.getEvent(id); if (!event) return undefined; const deleted = { ...event, updatedAt: timestamp, deletedAt: timestamp } as CareEvent; await this.putEvent(deleted); return deleted; }
  async replaceBabyDataTransaction(data: BabyPortableData) { this.throwIfNeeded(); if (!isBabyPortableData(data)) throw new Error("宝宝数据格式无效。"); this.data = cloneBabyData(data); }
  async clearCareData(clearedAt: number) { this.throwIfNeeded(); this.data.care = createEmptyBabyCare(clearedAt); }
  async clearAllBabyData(clearedAt: number) { this.throwIfNeeded(); this.data = createEmptyBabyData(clearedAt); }
  async saveSnapshot(snapshot: BabySnapshot) { this.throwIfNeeded(); this.snapshots = [structuredCloneSafe(snapshot), ...this.snapshots.filter((item) => item.id !== snapshot.id)].slice(0, 2); }
  async loadLatestSnapshot() { const value = this.snapshots[0]; return value && structuredCloneSafe(value); }
  async loadSnapshots() { return this.snapshots.map(structuredCloneSafe); }
  async clearSnapshots() { this.throwIfNeeded(); this.snapshots = []; }

  private throwIfNeeded() {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new Error("Injected baby repository failure");
    }
  }
}

function defaultRepository(): BabyRepository {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test"
    ? new MemoryBabyRepository()
    : new IndexedDbBabyRepository();
}

let repository: BabyRepository = defaultRepository();

export function getBabyRepository() { return repository; }
export function setBabyRepositoryForTests(next: BabyRepository | undefined) {
  repository = next ?? defaultRepository();
}

function upgradeBabyDatabase(database: IDBDatabase, transaction: IDBTransaction | null) {
  if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE, { keyPath: "key" });
  if (!database.objectStoreNames.contains(EVENTS_STORE)) {
    const events = database.createObjectStore(EVENTS_STORE, { keyPath: "id" });
    events.createIndex("occurredAt", "occurredAt", { unique: false });
    events.createIndex("startAt", "startAt", { unique: false });
    events.createIndex("updatedAt", "updatedAt", { unique: false });
    events.createIndex("type", "type", { unique: false });
    events.createIndex("deletedAt", "deletedAt", { unique: false });
  }
  if (!database.objectStoreNames.contains(SNAPSHOTS_STORE)) {
    const snapshots = database.createObjectStore(SNAPSHOTS_STORE, { keyPath: "id" });
    snapshots.createIndex("createdAt", "createdAt", { unique: false });
  }
  transaction?.objectStore(META_STORE).put({ key: SCHEMA_VERSION_KEY, value: BABY_DATABASE_VERSION });
}

function readCareClearedAt(value: unknown) {
  if (typeof value !== "object" || value === null || !("clearedAt" in value)) return 0;
  const clearedAt = (value as { clearedAt?: unknown }).clearedAt;
  return typeof clearedAt === "number" && Number.isFinite(clearedAt) && clearedAt >= 0 ? clearedAt : 0;
}

function requestPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 请求失败。"));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction 已中止。"));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction 失败。"));
  });
}

function isBabySnapshot(value: unknown): value is BabySnapshot {
  return typeof value === "object" && value !== null && typeof (value as BabySnapshot).id === "string" && typeof (value as BabySnapshot).createdAt === "string" && typeof (value as BabySnapshot).reason === "string" && "data" in value;
}

function structuredCloneSafe<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
}
