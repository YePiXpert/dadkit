import type {
  ChecklistBag,
  ChecklistCategory,
  ChecklistItem,
  ChecklistMode,
  ChecklistTiming,
  ItemBulk,
  ItemKind,
  ItemSource,
  PackStatus,
  PackTier,
  PreparationKind,
  Priority,
} from "@/lib/types";
import {
  DEFAULT_GROWTH_PROFILE,
  DEFAULT_GROWTH_PROGRESS,
  DEFAULT_GROWTH_VIEW,
  GROWTH_STORAGE_KEYS,
  GROWTH_UPDATED_AT_STORAGE_KEY,
  exportGrowthData,
  useGrowthStore,
} from "@/lib/growth-store";
import {
  isDadKitImportData as isDadKitPortableData,
  projectExportDataForVersion,
  sanitizeDadKitImportData,
  V3_EXPORT_KEYS,
  V4_EXPORT_KEYS,
  V5_EXPORT_KEYS,
  V6_EXPORT_KEYS,
  V7_EXPORT_KEYS,
  V8_EXPORT_KEYS,
  V9_EXPORT_KEYS,
  V10_EXPORT_KEYS,
  V11_EXPORT_KEYS,
  type DadKitExportData,
  type DadKitImportData,
  type DeletedCustomItemStamps,
  type HiddenTemplateItemStamps,
} from "@/lib/data/format";
import { createEmptyBabyData } from "@/lib/baby/defaults";
import { cloneBabyData, latestBabyTimestamp, migrateBabyV1ToV2 } from "@/lib/baby/portable";
import { DEVICE_IDENTITY_STORAGE_KEY, loadDeviceIdentity, saveDeviceIdentity } from "@/lib/device-identity/repository";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { getBabyRepository } from "@/lib/baby/repository";
import { careEventsForLocalDay } from "@/lib/baby/selectors";
import { timelineEventsForRange, useBabyStore } from "@/lib/baby/store";
import { getSyncAdjustedNow } from "@/lib/sync-clock";
import { CHECKLIST_MILESTONES_KEY } from "@/lib/checklist-milestones";
import {
  DEFAULT_WEBDAV_CONFIG,
  type WebDavConfig,
  type WebDavSyncState,
} from "@/lib/webdav/types";
import {
  markChecklistStateDirty,
  recordChecklistPersistenceError,
  recordChecklistStatePersisted,
  recordStorageWarning,
  registerChecklistStateSaveRetryHandler,
  resetChecklistPersistenceStatus,
} from "@/lib/persistence-status";
import {
  publishDataChange,
  SYNC_SETTINGS_CHANGE_EVENT,
} from "@/lib/data/change-bus";
import { applyChecklistRuntimeDocument } from "@/lib/checklist-runtime";
import {
  LEGACY_HOSPITAL_STORAGE_KEY,
  LEGACY_ITEM_PLANNING_STORAGE_KEY,
} from "@/lib/retired-data";
import { SYNC_SESSION_STORAGE_KEY } from "@/lib/sync/session-storage-key";

export const STORAGE_KEYS = {
  checklist: "dadkit:v3:checklist",
  customItems: "dadkit:v3:custom-items",
  hiddenTemplateItems: "dadkit:v3:hidden-template-items",
  checklistMode: "dadkit:v3:checklist-mode",
  snapshots: "dadkit:v3:snapshots",
  webDavConfig: "dadkit:v3:webdav-config",
  webDavSyncState: "dadkit:v3:webdav-sync-state",
  webDavSecret: "dadkit:v3:webdav-secret",
  hiddenTemplateStamps: "dadkit:v3:hidden-template-stamps",
  deletedCustomItems: "dadkit:v3:deleted-custom-items",
  growthUpdatedAt: GROWTH_UPDATED_AT_STORAGE_KEY,
  syncSession: SYNC_SESSION_STORAGE_KEY,
  syncClientState: "dadkit:v3:sync-client-state",
  syncClockOffset: "dadkit:v3:sync-clock-offset-ms",
  syncClockTimelineInitialized: "dadkit:v3:sync-clock-timeline-initialized",
  household: "dadkit:v4:household", // 已下线的家庭成员功能，仅保留键名用于清理旧数据
  deviceIdentity: DEVICE_IDENTITY_STORAGE_KEY,
} as const;

export const WEBDAV_SESSION_SECRET_KEY = "dadkit:v3:webdav-session-secret";
export { purgeRetiredLocalData } from "@/lib/retired-data";

const DATA_STORAGE_KEYS = [
  STORAGE_KEYS.checklist,
  STORAGE_KEYS.customItems,
  STORAGE_KEYS.hiddenTemplateItems,
  STORAGE_KEYS.checklistMode,
  STORAGE_KEYS.webDavConfig,
  STORAGE_KEYS.webDavSyncState,
  STORAGE_KEYS.webDavSecret,
  STORAGE_KEYS.hiddenTemplateStamps,
  STORAGE_KEYS.deletedCustomItems,
  STORAGE_KEYS.growthUpdatedAt,
  STORAGE_KEYS.syncSession,
  STORAGE_KEYS.syncClientState,
  STORAGE_KEYS.syncClockOffset,
  STORAGE_KEYS.syncClockTimelineInitialized,
  LEGACY_HOSPITAL_STORAGE_KEY,
  LEGACY_ITEM_PLANNING_STORAGE_KEY,
  STORAGE_KEYS.household,
  STORAGE_KEYS.deviceIdentity,
  GROWTH_STORAGE_KEYS.profile,
  GROWTH_STORAGE_KEYS.progress,
  GROWTH_STORAGE_KEYS.view,
  CHECKLIST_MILESTONES_KEY,
] as const;

export type {
  DadKitExportData,
  DadKitExportDataV3,
  DadKitExportDataV4,
  DadKitExportDataV5,
  DadKitExportDataV6,
  DadKitExportDataV7,
  DadKitExportDataV8,
  DadKitImportData,
  DeletedCustomItemStamps,
  HiddenTemplateItemStamps,
} from "@/lib/data/format";

export type SyncSession = {
  version: 2;
  protocolVersion: 2;
  spaceId: string;
  displayName: string;
  sessionId: string;
  deviceName: string;
  role: "owner" | "member";
  joinedAt: string;
};

export type SyncClientState = {
  lastSyncAt?: string;
  lastError?: string;
  lastEtag?: string;
  lastSyncedChecksum?: string;
  initialDataMode?: "remote" | "merge";
  retryAt?: string;
  retryAttempt?: number;
};

export type ImportResult = {
  ok: boolean;
  message: string;
};

export type ImportValidationResult = ImportResult & {
  data?: DadKitImportData;
};

export type DadKitSnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  data: DadKitImportData;
};

export class SnapshotPersistenceError extends Error {
  constructor() {
    super("无法保存本地恢复快照，操作已中止。");
    this.name = "SnapshotPersistenceError";
  }
}

type StorageMutation = {
  key: string;
  value: string | null;
};

class StorageTransactionError extends Error {
  constructor(readonly rollbackSucceeded: boolean) {
    super("本地存储事务失败");
    this.name = "StorageTransactionError";
  }
}

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function canUseSessionStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

// readJson 热路径缓存：同一 key 的原始字符串没变就复用上次解析结果。
// 清单点按链路每次操作要读多次存储快照做跨端合并，64KB 的 JSON.parse 是
// 真正的开销，getItem + 字符串比较只是零头；跨标签页写入会改变原始串，
// 比较失败自然回落到重新解析。
const readJsonCache = new Map<string, { raw: string | null; value: unknown }>();
let checklistStateVersion = 0;

export function getChecklistStateVersion() {
  return checklistStateVersion;
}

function advanceChecklistStateVersion() {
  checklistStateVersion += 1;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }

  const cached = readJsonCache.get(key);
  if (cached !== undefined && cached.raw === raw) {
    return cached.value as T;
  }

  if (raw === null) {
    readJsonCache.set(key, { raw, value: fallback });
    return fallback;
  }

  try {
    const value = JSON.parse(raw) as T;
    readJsonCache.set(key, { raw, value });
    return value;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return false;
  }

  const serialized = JSON.stringify(value);

  if (window.localStorage.getItem(key) !== serialized) {
    window.localStorage.setItem(key, serialized);
    readJsonCache.delete(key);
    return true;
  }

  return false;
}

function deviceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `device-${crypto.randomUUID()}`;
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  return expected.every((key) => key in value);
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function hasOptionalString(value: Record<string, unknown>, key: string) {
  return !(key in value) || typeof value[key] === "string";
}

const REQUIRED_CHECKLIST_ITEM_KEYS = [
  "id",
  "name",
  "category",
  "priority",
  "status",
  "source",
  "editable",
  "removable",
  "timing",
] as const;

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!isRecord(value)) {
    return false;
  }

  if (!REQUIRED_CHECKLIST_ITEM_KEYS.every((key) => key in value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isOneOf<ChecklistCategory>(value.category, [
      "documents",
      "mom_labor",
      "mom_postpartum",
      "baby",
      "confinement_mom",
      "confinement_baby",
      "partner",
      "going_home",
      "last_minute",
    ]) &&
    isOneOf<Priority>(value.priority, ["must", "recommended", "optional"]) &&
    isOneOf<PackStatus>(value.status, [
      "todo",
      "bought",
      "washed",
      "packed",
      "last_minute",
      "not_needed",
    ]) &&
    isOneOf<ItemSource>(value.source, ["general", "user"]) &&
    typeof value.editable === "boolean" &&
    typeof value.removable === "boolean" &&
    isOneOf<ChecklistTiming>(value.timing, [
      "prepare_now",
      "wash_before_pack",
      "pack_now",
      "grab_before_leaving",
      "confirm_beforehand",
    ]) &&
    ["quantity", "note", "sourceLabel"].every((key) =>
      hasOptionalString(value, key),
    ) &&
    (!("packTier" in value) ||
      isOneOf<PackTier>(value.packTier, [
        "core",
        "confirm",
        "optional",
        "hidden",
      ])) &&
    (!("itemKind" in value) ||
      isOneOf<ItemKind>(value.itemKind, ["item", "task"])) &&
    (!("preparationKind" in value) ||
      isOneOf<PreparationKind>(value.preparationKind, [
        "buy_and_pack",
        "buy_for_home",
        "pack_existing",
        "wash_then_pack",
        "document",
        "last_minute",
        "task",
        "install_or_place",
      ])) &&
    (!("bag" in value) ||
      isOneOf<ChecklistBag>(value.bag, [
        "documents_folder",
        "mom_bag",
        "baby_bag",
        "dad_backpack",
        "car",
        "last_minute",
        "none",
      ])) &&
    (!("bulk" in value) ||
      isOneOf<ItemBulk>(value.bulk, ["small", "medium", "large"])) &&
    (!("updatedAt" in value) ||
      (typeof value.updatedAt === "number" &&
        Number.isFinite(value.updatedAt)))
  );
}

function isValidDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isHiddenTemplateItemStamps(
  value: unknown,
): value is HiddenTemplateItemStamps {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([id, stamp]) =>
      id.trim().length > 0 &&
      isRecord(stamp) &&
      hasExactKeys(stamp, ["hidden", "updatedAt"]) &&
      typeof stamp.hidden === "boolean" &&
      typeof stamp.updatedAt === "number" &&
      Number.isFinite(stamp.updatedAt),
  );
}

function isDeletedCustomItemStamps(
  value: unknown,
): value is DeletedCustomItemStamps {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([id, timestamp]) =>
      id.trim().length > 0 &&
      typeof timestamp === "number" &&
      Number.isFinite(timestamp),
  );
}

export function migrateHiddenStamps(
  ids: string[],
  updatedAt: number,
): HiddenTemplateItemStamps {
  return Object.fromEntries(
    ids.map((id) => [id, { hidden: true, updatedAt }]),
  );
}

export function isDadKitImportData(value: unknown): value is DadKitImportData {
  return isDadKitPortableData(value);
}

export function loadChecklist() {
  const value = readJson<unknown>(STORAGE_KEYS.checklist, []);
  return Array.isArray(value) ? value.filter(isChecklistItem) : [];
}

export function saveChecklist(items: ChecklistItem[]) {
  if (writeJson(STORAGE_KEYS.checklist, items)) {
    publishDataChange("checklist");
  }
  // This legacy, single-field helper is also used by import/repair tools and
  // tests.  It cannot safely reconstruct the rest of the in-memory document,
  // so make the next export/snapshot read the coherent persisted document.
  latestChecklistState = undefined;
  advanceChecklistStateVersion();
}

export function loadCustomItems() {
  const value = readJson<unknown>(STORAGE_KEYS.customItems, []);
  return Array.isArray(value)
    ? value.filter(
        (item): item is ChecklistItem =>
          isChecklistItem(item) && item.source === "user",
      )
    : [];
}

export function saveCustomItems(items: ChecklistItem[]) {
  if (writeJson(STORAGE_KEYS.customItems, items)) {
    publishDataChange("checklist");
  }
  latestChecklistState = undefined;
  advanceChecklistStateVersion();
}

export function loadHiddenTemplateItemIds() {
  const value = readJson<unknown>(STORAGE_KEYS.hiddenTemplateItems, []);

  return Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0,
          ),
        ),
      )
    : [];
}

export function saveHiddenTemplateItemIds(ids: string[]) {
  if (writeJson(STORAGE_KEYS.hiddenTemplateItems, Array.from(new Set(ids)))) {
    publishDataChange("checklist");
  }
  latestChecklistState = undefined;
  advanceChecklistStateVersion();
}

export function loadHiddenTemplateItemStamps(): HiddenTemplateItemStamps {
  const value = readJson<unknown>(
    STORAGE_KEYS.hiddenTemplateStamps,
    undefined,
  );

  if (value !== undefined) {
    return isHiddenTemplateItemStamps(value) ? value : {};
  }

  // 旧数据没有 stamps 记录:从现有隐藏列表迁移,时间戳取 0,
  // 任何一端的真实隐藏/恢复操作都会在合并时赢过它。
  return migrateHiddenStamps(loadHiddenTemplateItemIds(), 0);
}

export function saveHiddenTemplateItemStamps(stamps: HiddenTemplateItemStamps) {
  if (writeJson(STORAGE_KEYS.hiddenTemplateStamps, stamps)) {
    publishDataChange("checklist");
  }
  advanceChecklistStateVersion();
}

export function loadDeletedCustomItems(): DeletedCustomItemStamps {
  const value = readJson<unknown>(STORAGE_KEYS.deletedCustomItems, {});
  return isDeletedCustomItemStamps(value) ? value : {};
}

export function saveDeletedCustomItems(stamps: DeletedCustomItemStamps) {
  if (writeJson(STORAGE_KEYS.deletedCustomItems, stamps)) {
    publishDataChange("checklist");
  }
  advanceChecklistStateVersion();
}

export function loadGrowthUpdatedAt(): number {
  const value = readJson<unknown>(STORAGE_KEYS.growthUpdatedAt, 0);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function saveGrowthUpdatedAt(timestamp: number) {
  writeJson(STORAGE_KEYS.growthUpdatedAt, timestamp);
}

export function loadSyncSession(): SyncSession | undefined {
  const value = readJson<unknown>(STORAGE_KEYS.syncSession, undefined);

  if (
    isRecord(value) &&
    value.version === 2 &&
    value.protocolVersion === 2 &&
    typeof value.spaceId === "string" &&
    /^[0-9a-f]{64}$/.test(value.spaceId) &&
    typeof value.displayName === "string" &&
    value.displayName.length >= 1 &&
    value.displayName.length <= 40 &&
    typeof value.sessionId === "string" &&
    /^[0-9a-f]{64}$/.test(value.sessionId) &&
    typeof value.deviceName === "string" &&
    value.deviceName.length >= 1 &&
    value.deviceName.length <= 60 &&
    (value.role === "owner" || value.role === "member") &&
    typeof value.joinedAt === "string"
  ) {
    return {
      version: 2,
      protocolVersion: 2,
      spaceId: value.spaceId,
      displayName: value.displayName,
      sessionId: value.sessionId,
      deviceName: value.deviceName,
      role: value.role,
      joinedAt: value.joinedAt,
    };
  }

  return undefined;
}

export function saveSyncSession(session: SyncSession | undefined) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEYS.syncSession);
    publishDataChange("sync-settings");
    dispatchSyncSettingsChange();
    return;
  }

  if (writeJson(STORAGE_KEYS.syncSession, session)) {
    publishDataChange("sync-settings");
    dispatchSyncSettingsChange();
  }
}

function dispatchSyncSettingsChange() {
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(SYNC_SETTINGS_CHANGE_EVENT));
  }
}

export function loadSyncClientState(): SyncClientState {
  const value = readJson<unknown>(STORAGE_KEYS.syncClientState, {});

  if (!isRecord(value)) {
    return {};
  }

  return {
    lastSyncAt:
      typeof value.lastSyncAt === "string" ? value.lastSyncAt : undefined,
    lastError:
      typeof value.lastError === "string" ? value.lastError : undefined,
    lastEtag:
      typeof value.lastEtag === "string" ? value.lastEtag : undefined,
    lastSyncedChecksum:
      typeof value.lastSyncedChecksum === "string"
        ? value.lastSyncedChecksum
        : undefined,
    initialDataMode:
      value.initialDataMode === "remote" || value.initialDataMode === "merge"
        ? value.initialDataMode
        : undefined,
    retryAt: typeof value.retryAt === "string" ? value.retryAt : undefined,
    retryAttempt:
      typeof value.retryAttempt === "number" &&
      Number.isInteger(value.retryAttempt) &&
      value.retryAttempt >= 0
        ? value.retryAttempt
        : undefined,
  };
}

export function saveSyncClientState(state: SyncClientState) {
  writeJson(STORAGE_KEYS.syncClientState, state);
}

export type ChecklistStatePayload = {
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
};

export {
  CHECKLIST_PERSISTENCE_EVENT,
  getChecklistPersistenceStatus,
  retryPendingChecklistStateSave,
  type ChecklistPersistenceStatus,
} from "@/lib/persistence-status";

type PendingChecklistStateSave = {
  payload: ChecklistStatePayload;
  revision: number;
};

let latestChecklistState: ChecklistStatePayload | undefined;

function cloneChecklistState(
  payload: ChecklistStatePayload,
): ChecklistStatePayload {
  // Cache the same portable representation that reaches localStorage.  In
  // particular, generated template records can contain optional `undefined`
  // properties; keeping those in memory would make a later snapshot fail its
  // strict import validation even though the persisted JSON is valid.
  return JSON.parse(
    JSON.stringify({
      checklist: payload.checklist,
      customItems: payload.customItems,
      hiddenTemplateItemIds: Array.from(new Set(payload.hiddenTemplateItemIds)),
    }),
  ) as ChecklistStatePayload;
}

function captureChecklistState(
  payload: ChecklistStatePayload,
): ChecklistStatePayload {
  // Hot-path updates only need an immutable point-in-time view. Copy the
  // containers here and defer expensive JSON normalization until flush.
  return {
    checklist: [...payload.checklist],
    customItems: [...payload.customItems],
    hiddenTemplateItemIds: Array.from(
      new Set(payload.hiddenTemplateItemIds),
    ),
  };
}

export function primeChecklistState(payload: ChecklistStatePayload) {
  latestChecklistState = cloneChecklistState(payload);
  advanceChecklistStateVersion();
}

function writeChecklistStateNow({
  checklist,
  customItems,
  hiddenTemplateItemIds,
}: ChecklistStatePayload) {
  applyStorageMutations([
    { key: STORAGE_KEYS.checklist, value: JSON.stringify(checklist) },
    { key: STORAGE_KEYS.customItems, value: JSON.stringify(customItems) },
    {
      key: STORAGE_KEYS.hiddenTemplateItems,
      value: JSON.stringify(Array.from(new Set(hiddenTemplateItemIds))),
    },
  ]);
  publishDataChange("checklist");
}

export function saveChecklistState(payload: ChecklistStatePayload) {
  saveChecklistStateWithMetadata(payload);
}

export type ChecklistStateMetadata = {
  deletedCustomItems?: DeletedCustomItemStamps;
  hiddenTemplateItemStamps?: HiddenTemplateItemStamps;
  resetMilestones?: boolean;
  retryOnFailure?: boolean;
};

export function saveChecklistStateWithMetadata(
  payload: ChecklistStatePayload,
  metadata: ChecklistStateMetadata = {},
) {
  cancelPendingChecklistStateSave();

  if (!canUseLocalStorage()) {
    return;
  }

  const revision = markChecklistStateDirty();
  const next = cloneChecklistState(payload);
  const previousLatest = latestChecklistState;

  latestChecklistState = next;

  const mutations: StorageMutation[] = [
    { key: STORAGE_KEYS.checklist, value: JSON.stringify(next.checklist) },
    { key: STORAGE_KEYS.customItems, value: JSON.stringify(next.customItems) },
    {
      key: STORAGE_KEYS.hiddenTemplateItems,
      value: JSON.stringify(next.hiddenTemplateItemIds),
    },
  ];
  if (metadata.hiddenTemplateItemStamps) {
    mutations.push({
      key: STORAGE_KEYS.hiddenTemplateStamps,
      value: JSON.stringify(metadata.hiddenTemplateItemStamps),
    });
  }
  if (metadata.deletedCustomItems) {
    mutations.push({
      key: STORAGE_KEYS.deletedCustomItems,
      value: JSON.stringify(metadata.deletedCustomItems),
    });
  }
  if (metadata.resetMilestones) {
    mutations.push({ key: CHECKLIST_MILESTONES_KEY, value: null });
  }

  try {
    applyStorageMutations(mutations);
    recordChecklistStatePersisted(revision);
    publishDataChange("checklist");
    advanceChecklistStateVersion();
  } catch (error) {
    latestChecklistState = previousLatest;
    if (metadata.retryOnFailure) {
      pendingChecklistStateSave = { payload: next, revision };
      recordChecklistPersistenceError(
        error instanceof Error && error.message
          ? error.message
          : "本机存储写入失败。",
      );
    } else {
      recordStorageWarning(
        error instanceof Error && error.message
          ? `本机数据未保存：${error.message}`
          : "本机数据未保存，请清理空间后重试。",
      );
    }
    throw error;
  }
}

const CHECKLIST_STATE_SAVE_DELAY_MS = 1_000;

let pendingChecklistStateSave: PendingChecklistStateSave | undefined;
let pendingChecklistStateTimer: ReturnType<typeof setTimeout> | undefined;
let checklistStateSaveListenersInstalled = false;

function installChecklistStateSaveListeners() {
  if (checklistStateSaveListenersInstalled) return;
  checklistStateSaveListenersInstalled = true;

  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return;
  }

  window.addEventListener("pagehide", flushPendingChecklistStateSave);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushPendingChecklistStateSave();
      }
    });
  }
}

export function flushPendingChecklistStateSave() {
  if (pendingChecklistStateTimer !== undefined) {
    clearTimeout(pendingChecklistStateTimer);
    pendingChecklistStateTimer = undefined;
  }

  if (!pendingChecklistStateSave || !canUseLocalStorage()) {
    pendingChecklistStateSave = undefined;
    return true;
  }

  const pending = pendingChecklistStateSave;
  pendingChecklistStateSave = undefined;

  try {
    const normalized = cloneChecklistState(pending.payload);

    writeChecklistStateNow(normalized);
    latestChecklistState = normalized;
    recordChecklistStatePersisted(pending.revision);
    return true;
  } catch (error) {
    pendingChecklistStateSave = pending;
    recordChecklistPersistenceError(
      error instanceof Error && error.message
        ? error.message
        : "本机存储空间不足，修改尚未写入磁盘。",
    );
    // 写入失败（如存储已满）时保留内存状态，下一次变更会再次尝试持久化。
    return false;
  }
}

// Lets the lightweight persistence-status module trigger a retry without
// importing this storage module.
registerChecklistStateSaveRetryHandler(flushPendingChecklistStateSave);

function cancelPendingChecklistStateSave() {
  if (pendingChecklistStateTimer !== undefined) {
    clearTimeout(pendingChecklistStateTimer);
    pendingChecklistStateTimer = undefined;
  }

  pendingChecklistStateSave = undefined;
}

// 高频点按路径使用：只复制数组容器，避免每次点按深度序列化整份内置清单
// 清单；完整规范化与 localStorage 写入合并到空闲后的 1 秒窗口。
export function saveChecklistStateSoon(payload: ChecklistStatePayload) {
  if (!canUseLocalStorage()) {
    return;
  }

  const revision = markChecklistStateDirty();
  const next = captureChecklistState(payload);

  latestChecklistState = next;
  pendingChecklistStateSave = { payload: next, revision };
  advanceChecklistStateVersion();
  installChecklistStateSaveListeners();

  if (pendingChecklistStateTimer !== undefined) {
    return;
  }

  pendingChecklistStateTimer = setTimeout(
    flushPendingChecklistStateSave,
    CHECKLIST_STATE_SAVE_DELAY_MS,
  );
  (pendingChecklistStateTimer as { unref?: () => void }).unref?.();
}

export function loadChecklistMode(): ChecklistMode {
  const mode = readJson<unknown>(STORAGE_KEYS.checklistMode, "lean");
  return mode === "full" ? "full" : "lean";
}

export function saveChecklistMode(mode: ChecklistMode) {
  if (writeJson(STORAGE_KEYS.checklistMode, mode)) {
    publishDataChange("checklist");
  }
}

export function loadWebDavConfig(): WebDavConfig {
  const saved = readJson<Partial<WebDavConfig> | undefined>(
    STORAGE_KEYS.webDavConfig,
    undefined,
  );

  if (!saved || typeof saved !== "object") {
    return DEFAULT_WEBDAV_CONFIG;
  }

  return {
    enabled:
      typeof saved.enabled === "boolean"
        ? saved.enabled
        : DEFAULT_WEBDAV_CONFIG.enabled,
    endpoint:
      typeof saved.endpoint === "string"
        ? saved.endpoint
        : DEFAULT_WEBDAV_CONFIG.endpoint,
    username:
      typeof saved.username === "string"
        ? saved.username
        : DEFAULT_WEBDAV_CONFIG.username,
    remoteDir:
      typeof saved.remoteDir === "string" && saved.remoteDir.trim()
        ? saved.remoteDir
        : DEFAULT_WEBDAV_CONFIG.remoteDir,
    filename:
      typeof saved.filename === "string" && saved.filename.trim()
        ? saved.filename
        : DEFAULT_WEBDAV_CONFIG.filename,
    authMode:
      saved.authMode === "basic" || saved.authMode === "app_password"
        ? saved.authMode
        : DEFAULT_WEBDAV_CONFIG.authMode,
    rememberSecret:
      typeof saved.rememberSecret === "boolean"
        ? saved.rememberSecret
        : DEFAULT_WEBDAV_CONFIG.rememberSecret,
  };
}

export function saveWebDavConfig(config: WebDavConfig) {
  writeJson(STORAGE_KEYS.webDavConfig, config);
}

export function loadWebDavSyncState(): WebDavSyncState {
  const saved = readJson<Partial<WebDavSyncState> | undefined>(
    STORAGE_KEYS.webDavSyncState,
    undefined,
  );

  if (saved && typeof saved.deviceId === "string" && saved.deviceId) {
    return {
      deviceId: saved.deviceId,
      lastSyncAt:
        typeof saved.lastSyncAt === "string" ? saved.lastSyncAt : undefined,
      lastUploadAt:
        typeof saved.lastUploadAt === "string" ? saved.lastUploadAt : undefined,
      lastDownloadAt:
        typeof saved.lastDownloadAt === "string"
          ? saved.lastDownloadAt
          : undefined,
      lastRemoteUpdatedAt:
        typeof saved.lastRemoteUpdatedAt === "string"
          ? saved.lastRemoteUpdatedAt
          : undefined,
      lastError: typeof saved.lastError === "string" ? saved.lastError : undefined,
    };
  }

  return { deviceId: deviceId() };
}

export function saveWebDavSyncState(state: WebDavSyncState) {
  writeJson(STORAGE_KEYS.webDavSyncState, state);
}

export function loadWebDavSecret(
  rememberSecret = loadWebDavConfig().rememberSecret,
) {
  if (canUseSessionStorage()) {
    try {
      const sessionSecret = window.sessionStorage.getItem(
        WEBDAV_SESSION_SECRET_KEY,
      );

      if (sessionSecret) return sessionSecret;
    } catch {
      // Fall through to the optional local copy.
    }
  }

  if (!rememberSecret || !canUseLocalStorage()) {
    return "";
  }

  try {
    return window.localStorage.getItem(STORAGE_KEYS.webDavSecret) ?? "";
  } catch {
    return "";
  }
}

export function saveWebDavSecret(secret: string, rememberSecret: boolean) {
  if (canUseLocalStorage()) {
    if (rememberSecret && secret) {
      window.localStorage.setItem(STORAGE_KEYS.webDavSecret, secret);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.webDavSecret);
    }
  }

  if (canUseSessionStorage()) {
    if (!rememberSecret && secret) {
      window.sessionStorage.setItem(WEBDAV_SESSION_SECRET_KEY, secret);
    } else {
      window.sessionStorage.removeItem(WEBDAV_SESSION_SECRET_KEY);
    }
  }
}

export function clearWebDavSettings() {
  if (canUseLocalStorage()) {
    applyStorageMutations([
      { key: STORAGE_KEYS.webDavConfig, value: null },
      { key: STORAGE_KEYS.webDavSyncState, value: null },
      { key: STORAGE_KEYS.webDavSecret, value: null },
    ]);
  }

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(WEBDAV_SESSION_SECRET_KEY);
  }
}

export function resetAllData(initialChecklist?: ChecklistItem[]) {
  cancelPendingChecklistStateSave();

  if (canUseLocalStorage()) {
    applyStorageMutations(
      DATA_STORAGE_KEYS.map((key) => {
        if (initialChecklist && key === STORAGE_KEYS.checklist) {
          return { key, value: JSON.stringify(initialChecklist) };
        }

        if (initialChecklist && key === STORAGE_KEYS.checklistMode) {
          return { key, value: JSON.stringify("lean") };
        }

        return { key, value: null };
      }),
    );
    latestChecklistState = initialChecklist
      ? {
          checklist: initialChecklist,
          customItems: [],
          hiddenTemplateItemIds: [],
        }
      : undefined;
    resetChecklistPersistenceStatus();
    useGrowthStore.setState({
      ...DEFAULT_GROWTH_PROFILE,
      ...DEFAULT_GROWTH_PROGRESS,
      ...DEFAULT_GROWTH_VIEW,
      hydrated: true,
    });
  }

  let sessionSecretCleared = true;

  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.removeItem(WEBDAV_SESSION_SECRET_KEY);
    } catch {
      sessionSecretCleared = false;
    }
  }

  return { sessionSecretCleared };
}

export function exportData(): DadKitExportData {
  flushPendingChecklistStateSave();
  const latest = latestChecklistState;

  return {
    version: 11,
    exportedAt: new Date().toISOString(),
    checklistMode: loadChecklistMode(),
    checklist: latest?.checklist ?? loadChecklist(),
    customItems: latest?.customItems ?? loadCustomItems(),
    hiddenTemplateItemIds:
      latest?.hiddenTemplateItemIds ?? loadHiddenTemplateItemIds(),
    growth: exportGrowthData(),
    hiddenTemplateItemStamps: loadHiddenTemplateItemStamps(),
    deletedCustomItems: loadDeletedCustomItems(),
    growthUpdatedAt: loadGrowthUpdatedAt(),
    baby: createEmptyBabyData(),
  };
}

/** Builds the complete v11 document from localStorage plus IndexedDB baby data. */
export async function buildLatestPortableData(): Promise<DadKitExportData> {
  const baby = await getBabyRepository().getAllBabyData();
  // Read synchronous localStorage domains after the async IndexedDB read so a
  // checklist edit made while the baby repository is responding is included.
  const base = exportData();
  return { ...base, version: 11, baby: cloneBabyData(baby) };
}

export function validateImportData(rawJson: string): ImportValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, message: "备份格式不正确，未修改本地数据。" };
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: "内容不是 DadKit 备份，未修改本地数据。" };
  }

  if (
    parsed.version !== 3 &&
    parsed.version !== 4 &&
    parsed.version !== 5 &&
    parsed.version !== 6 &&
    parsed.version !== 7 &&
    parsed.version !== 8 &&
    parsed.version !== 9 &&
    parsed.version !== 10 &&
    parsed.version !== 11
  ) {
    return { ok: false, message: "不支持的备份版本，未修改本地数据。" };
  }

  const expectedKeys =
    parsed.version === 11
      ? V11_EXPORT_KEYS
      : parsed.version === 10
      ? V10_EXPORT_KEYS
      : parsed.version === 9
      ? V9_EXPORT_KEYS
      : parsed.version === 8
      ? V8_EXPORT_KEYS
      : parsed.version === 7
        ? V7_EXPORT_KEYS
      : parsed.version === 6
        ? V6_EXPORT_KEYS
      : parsed.version === 5
        ? V5_EXPORT_KEYS
      : parsed.version === 4
        ? V4_EXPORT_KEYS
        : V3_EXPORT_KEYS;

  if (!hasExactKeys(parsed, expectedKeys)) {
    return {
      ok: false,
      message: "备份字段不完整，未修改本地数据。",
    };
  }

  if (!isDadKitImportData(parsed)) {
    return { ok: false, message: "备份内容无效，未修改本地数据。" };
  }

  return {
    ok: true,
    message: "校验通过",
    data: sanitizeDadKitImportData(parsed as DadKitImportData),
  };
}

export function importData(rawJson: string): ImportResult {
  const validation = validateImportData(rawJson);

  if (!validation.ok || !validation.data) {
    return { ok: false, message: validation.message };
  }

  return applyImportData(validation.data);
}

export async function importDataAsync(rawJson: string): Promise<ImportResult> {
  const validation = validateImportData(rawJson);
  if (!validation.ok || !validation.data) {
    return { ok: false, message: validation.message };
  }
  try {
    await createSnapshotAsync("导入 JSON 备份前");
  } catch {
    return { ok: false, message: "无法创建导入前恢复点，本地数据未修改。" };
  }
  return applyImportDataAsync(validation.data);
}

export function applyImportData(data: DadKitImportData): ImportResult {
  if (!isDadKitImportData(data)) {
    return { ok: false, message: "备份内容无效，未修改本地数据。" };
  }

  data = sanitizeDadKitImportData(data) as DadKitImportData;

  if (!canUseLocalStorage()) {
    return { ok: false, message: "当前环境无法访问本地存储，未修改本地数据。" };
  }

  cancelPendingChecklistStateSave();

  const mutations: StorageMutation[] = [
    { key: STORAGE_KEYS.checklist, value: JSON.stringify(data.checklist) },
    { key: STORAGE_KEYS.customItems, value: JSON.stringify(data.customItems) },
    {
      key: STORAGE_KEYS.hiddenTemplateItems,
      value: JSON.stringify(data.hiddenTemplateItemIds),
    },
    {
      key: STORAGE_KEYS.checklistMode,
      value: JSON.stringify(data.checklistMode),
    },
    { key: LEGACY_HOSPITAL_STORAGE_KEY, value: null },
    { key: LEGACY_ITEM_PLANNING_STORAGE_KEY, value: null },
    { key: STORAGE_KEYS.household, value: null },
  ];

  if (data.version !== 3) {
    mutations.push(
      {
        key: GROWTH_STORAGE_KEYS.profile,
        value: JSON.stringify(data.growth.profile),
      },
      {
        key: GROWTH_STORAGE_KEYS.progress,
        value: JSON.stringify(data.growth.progress),
      },
    );
  }

  if (
    data.version === 5 ||
    data.version === 6 ||
    data.version === 7 ||
    data.version === 8 ||
    data.version === 9 ||
    data.version === 10 ||
    data.version === 11
  ) {
    mutations.push(
      {
        key: STORAGE_KEYS.hiddenTemplateStamps,
        value: JSON.stringify(data.hiddenTemplateItemStamps),
      },
      {
        key: STORAGE_KEYS.deletedCustomItems,
        value: JSON.stringify(data.deletedCustomItems),
      },
      {
        key: STORAGE_KEYS.growthUpdatedAt,
        value: JSON.stringify(data.growthUpdatedAt),
      },
    );
  } else {
    // v3/v4 备份没有合并元数据:隐藏记录迁移为 ts=0 的 stamps,墓碑清空。
    mutations.push(
      {
        key: STORAGE_KEYS.hiddenTemplateStamps,
        value: JSON.stringify(migrateHiddenStamps(data.hiddenTemplateItemIds, 0)),
      },
      { key: STORAGE_KEYS.deletedCustomItems, value: JSON.stringify({}) },
      { key: STORAGE_KEYS.growthUpdatedAt, value: JSON.stringify(0) },
    );
  }

  try {
    applyStorageMutations(mutations);
    primeChecklistState({
      checklist: data.checklist,
      customItems: data.customItems,
      hiddenTemplateItemIds: data.hiddenTemplateItemIds,
    });
    applyChecklistRuntimeDocument(
      {
        checklist: data.checklist,
        checklistMode: data.checklistMode,
        customItems: data.customItems,
        hiddenTemplateItemIds: data.hiddenTemplateItemIds,
      },
      "hydrate",
    );
    if (data.version !== 3) {
      useGrowthStore.setState({
        ...data.growth.profile,
        ...data.growth.progress,
        hydrated: true,
      });
    }
    return {
      ok: true,
      message:
        data.version === 11 || data.version === 10 || data.version === 9
          ? "导入成功"
          : data.version === 8
            ? "导入成功"
          : data.version === 7
            ? "导入成功（v7 备份不包含宝宝资料和照护记录）"
            : data.version === 6
            ? "导入成功（v6 备份不包含宝宝资料和照护记录）"
            : `导入成功（旧版 v${data.version} 备份不包含宝宝记录）`,
    };
  } catch (error) {
    if (error instanceof StorageTransactionError && !error.rollbackSucceeded) {
      return {
        ok: false,
        message: "导入失败，且本地数据无法完整回滚，请从备份恢复。",
      };
    }

    return { ok: false, message: "导入失败，未修改本地数据。" };
  }
}

export async function applyImportDataAsync(
  data: DadKitImportData,
): Promise<ImportResult> {
  if (!isDadKitImportData(data)) {
    return { ok: false, message: "备份内容无效，未修改本地数据。" };
  }

  const repository = getBabyRepository();
  let previousBaby;
  const previousIdentity = loadDeviceIdentity();

  try {
    previousBaby = await repository.getAllBabyData();
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "无法读取宝宝记录，未修改本地数据。",
    };
  }

  const previousLocal = exportData();
  const clean = sanitizeDadKitImportData(data);
  const targetBaby =
    clean.version === 9 || clean.version === 10 || clean.version === 11
      ? cloneBabyData(clean.baby)
      : clean.version === 8
        ? migrateBabyV1ToV2(clean.baby)
      : createEmptyBabyData(
          Math.max(getSyncAdjustedNow() + 1, latestBabyTimestamp(previousBaby) + 1),
        );
  const localResult = applyImportData(clean);

  if (!localResult.ok) {
    return localResult;
  }

  try {
    await repository.replaceBabyDataTransaction(targetBaby);
    publishDataChange("baby");
    useBabyStore.setState((state) => ({
      hydrated: true,
      profile: targetBaby.profile,
      careClearedAt: targetBaby.care.clearedAt,
      recentEvents: targetBaby.care.events
        .filter((event) => event.deletedAt === null)
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 200),
      todayEvents: careEventsForLocalDay(
        targetBaby.care.events,
        new Date(),
        Date.now(),
        targetBaby.care.clearedAt,
      ),
      activeEvents: targetBaby.care.events.filter(
        (event) =>
          event.deletedAt === null &&
          (event.type === "breastfeeding" ||
            event.type === "pumping" ||
            event.type === "sleep") &&
          event.endAt === null,
      ),
      timelineEvents: timelineEventsForRange(targetBaby, state.timelineRange),
      repositoryError: undefined,
      changeToken: state.changeToken + 1,
    }));
  } catch {
    const localRollback = applyImportData(previousLocal);
    let identityRollback = true;
    try {
      saveDeviceIdentity(previousIdentity);
      useDeviceIdentityStore.setState({ ...previousIdentity, hydrated: true });
    } catch {
      identityRollback = false;
    }
    let babyRollback = true;

    try {
      await repository.replaceBabyDataTransaction(previousBaby);
    } catch {
      babyRollback = false;
    }

    return localRollback.ok && babyRollback && identityRollback
      ? { ok: false, message: "导入失败，本地数据已回滚。" }
      : {
          ok: false,
          message: "导入失败，且本地数据无法完整回滚，请从备份恢复。",
        };
  }

  if (clean.version === 9 || clean.version === 10 || clean.version === 11) {
    return { ok: true, message: "导入成功" };
  }
  if (clean.version === 8) {
    return { ok: true, message: "导入成功。" };
  }
  if (clean.version === 7) {
    return {
      ok: true,
      message: "导入成功（v7 备份不包含宝宝资料和照护记录，相关数据已清空）",
    };
  }
  if (clean.version === 6) {
    return {
      ok: true,
      message:
        "导入成功（v6 备份不包含宝宝资料和照护记录，相关数据已按旧格式恢复）",
    };
  }
  return {
    ok: true,
    message: `导入成功（旧版 v${clean.version} 备份不包含宝宝记录，相关数据已按旧格式恢复）`,
  };
}

function applyStorageMutations(mutations: StorageMutation[]) {
  if (!canUseLocalStorage()) {
    throw new StorageTransactionError(true);
  }

  const previousValues = new Map<string, string | null>();

  for (const mutation of mutations) {
    if (!previousValues.has(mutation.key)) {
      previousValues.set(
        mutation.key,
        window.localStorage.getItem(mutation.key),
      );
    }
  }

  try {
    for (const mutation of mutations) {
      if (mutation.value === null) {
        window.localStorage.removeItem(mutation.key);
      } else {
        window.localStorage.setItem(mutation.key, mutation.value);
      }
      readJsonCache.delete(mutation.key);
    }
  } catch {
    let rollbackSucceeded = true;

    for (const [key, previousValue] of [...previousValues.entries()].reverse()) {
      try {
        if (previousValue === null) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, previousValue);
        }
      } catch {
        rollbackSucceeded = false;
      }
    }

    throw new StorageTransactionError(rollbackSucceeded);
  }
}

function snapshotId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `snapshot-${crypto.randomUUID()}`;
  }

  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasSnapshotData(data: DadKitExportData) {
  return (
    data.checklistMode !== "lean" ||
    data.checklist.length > 0 ||
    data.customItems.length > 0 ||
    data.hiddenTemplateItemIds.length > 0 ||
    data.growth.profile.nickname.length > 0 ||
    data.growth.profile.dueDate.length > 0 ||
    data.growth.progress.completedTaskIds.length > 0 ||
    data.baby.profile.fields.birthDate.value.length > 0 ||
    data.baby.profile.fields.nickname.value.length > 0 ||
    data.baby.care.events.length > 0 ||
    data.baby.care.clearedAt > 0
  );
}

function isSnapshot(value: unknown): value is DadKitSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    hasExactKeys(value, ["id", "createdAt", "reason", "data"]) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isValidDateString(value.createdAt) &&
    typeof value.reason === "string" &&
    value.reason.length > 0 &&
    isDadKitImportData(value.data)
  );
}

export function loadSnapshots(): DadKitSnapshot[] {
  const snapshots = readJson<unknown>(STORAGE_KEYS.snapshots, []);
  return Array.isArray(snapshots) ? snapshots.filter(isSnapshot).slice(0, 2) : [];
}

export function saveSnapshots(snapshots: DadKitSnapshot[]) {
  try {
    if (!canUseLocalStorage()) {
      return false;
    }

    const serialized = JSON.stringify(snapshots.filter(isSnapshot).slice(0, 2));
    window.localStorage.setItem(STORAGE_KEYS.snapshots, serialized);

    return window.localStorage.getItem(STORAGE_KEYS.snapshots) === serialized;
  } catch {
    return false;
  }
}

export function createSnapshot(reason: string): DadKitSnapshot | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const latest = exportData();

    if (!hasSnapshotData(latest)) {
      return undefined;
    }

    // Legacy localStorage snapshots remain readable as v6. Complete snapshots
    // (including baby events) are created by createSnapshotAsync()
    // and stored only in IndexedDB.
    const data = projectExportDataForVersion(latest, 6);

    const snapshot: DadKitSnapshot = {
      id: snapshotId(),
      createdAt: new Date().toISOString(),
      reason,
      data,
    };

    if (!saveSnapshots([snapshot, ...loadSnapshots()])) {
      throw new SnapshotPersistenceError();
    }

    return snapshot;
  } catch (error) {
    if (error instanceof SnapshotPersistenceError) {
      throw error;
    }

    throw new SnapshotPersistenceError();
  }
}

export function restoreSnapshot(
  id: string,
  options: { snapshotBeforeRestore?: boolean } = {},
): ImportResult {
  const snapshot = loadSnapshots().find((candidate) => candidate.id === id);

  if (!snapshot) {
    return { ok: false, message: "未找到这份本地备份，未修改本地数据。" };
  }

  try {
    if (options.snapshotBeforeRestore ?? true) {
      createSnapshot("恢复本地备份前");
    }

    return applyImportData(snapshot.data);
  } catch {
    return { ok: false, message: "恢复失败，未修改本地数据。" };
  }
}

export function clearSnapshots() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
  } catch {
    return;
  }
}

// 早期版本把恢复点全量存在 localStorage,是 QuotaExceeded 的主要来源。
// 读到时搬进 IndexedDB 并清掉旧 key;迁移失败则保留 localStorage 原件,下次再试。
async function migrateLegacySnapshotsToRepository() {
  const legacy = loadSnapshots();

  if (legacy.length === 0) {
    return;
  }

  const repository = getBabyRepository();

  for (const snapshot of legacy) {
    await repository.saveSnapshot(snapshot);
  }

  clearSnapshots();
}

export async function loadSnapshotsAsync(): Promise<DadKitSnapshot[]> {
  try {
    await migrateLegacySnapshotsToRepository();
  } catch {
    // 迁移失败不影响读取:下面的合并视图仍会包含 localStorage 里的恢复点。
  }
  const repositorySnapshots = await getBabyRepository().loadSnapshots();
  const combined = [
    ...repositorySnapshots.map((snapshot) => snapshot as DadKitSnapshot),
    ...loadSnapshots(),
  ].filter(isSnapshot);
  return [...new Map(combined.map((snapshot) => [snapshot.id, snapshot])).values()]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 2);
}

export async function createSnapshotAsync(
  reason: string,
): Promise<DadKitSnapshot | undefined> {
  try {
    const data = await buildLatestPortableData();
    if (!hasSnapshotData(data)) return undefined;
    const snapshot: DadKitSnapshot = {
      id: snapshotId(),
      createdAt: new Date().toISOString(),
      reason,
      data,
    };
    await getBabyRepository().saveSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    if (error instanceof SnapshotPersistenceError) throw error;
    throw new SnapshotPersistenceError();
  }
}

export async function restoreSnapshotAsync(
  id: string,
  options: { snapshotBeforeRestore?: boolean } = {},
): Promise<ImportResult> {
  const snapshot = (await loadSnapshotsAsync()).find((candidate) => candidate.id === id);
  if (!snapshot) {
    return { ok: false, message: "未找到这份本地备份，未修改本地数据。" };
  }
  try {
    if (options.snapshotBeforeRestore ?? true) {
      await createSnapshotAsync("恢复本地备份前");
    }
    return await applyImportDataAsync(snapshot.data);
  } catch {
    return { ok: false, message: "恢复失败，未修改本地数据。" };
  }
}

export async function clearSnapshotsAsync() {
  clearSnapshots();
  await getBabyRepository().clearSnapshots();
}

export async function resetAllDataAsync(initialChecklist?: ChecklistItem[]) {
  const previousBaby = await getBabyRepository().getAllBabyData();
  const clearedAt = Math.max(
    getSyncAdjustedNow() + 1,
    latestBabyTimestamp(previousBaby) + 1,
  );
  const result = resetAllData(initialChecklist);
  await getBabyRepository().clearAllBabyData(clearedAt);
  await clearSnapshotsAsync();
  useBabyStore.setState((state) => ({
    hydrated: true,
    profile: createEmptyBabyData(clearedAt).profile,
    careClearedAt: clearedAt,
    recentEvents: [],
    todayEvents: [],
    activeEvents: [],
    timelineEvents: [],
    repositoryError: undefined,
    changeToken: state.changeToken + 1,
  }));
  return result;
}
