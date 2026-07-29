import type {
  ChecklistItem,
  ChecklistMode,
  ChecklistCategory,
  ChecklistTiming,
  ChecklistBag,
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
  validateGrowthPortableData,
  type GrowthPortableData,
} from "@/lib/growth-portable";
import {
  DEFAULT_WEBDAV_CONFIG,
  type WebDavConfig,
  type WebDavSyncState,
} from "@/lib/webdav/types";

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
  syncSession: "dadkit:v3:sync-session",
  syncClientState: "dadkit:v3:sync-client-state",
} as const;

export const WEBDAV_SESSION_SECRET_KEY = "dadkit:v3:webdav-session-secret";

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
  GROWTH_STORAGE_KEYS.profile,
  GROWTH_STORAGE_KEYS.progress,
  GROWTH_STORAGE_KEYS.view,
] as const;

const V3_EXPORT_KEYS = [
  "version",
  "exportedAt",
  "checklistMode",
  "checklist",
  "customItems",
  "hiddenTemplateItemIds",
] as const;

const V4_EXPORT_KEYS = [...V3_EXPORT_KEYS, "growth"] as const;

const V5_EXPORT_KEYS = [
  ...V4_EXPORT_KEYS,
  "hiddenTemplateItemStamps",
  "deletedCustomItems",
  "growthUpdatedAt",
] as const;

// 模板条目隐藏/恢复的时间戳记录;hidden:false 是“恢复”墓碑,参与多端合并。
export type HiddenTemplateItemStamps = Record<
  string,
  { hidden: boolean; updatedAt: number }
>;

// 自定义物品删除墓碑:id → 删除时间(epoch ms)。
export type DeletedCustomItemStamps = Record<string, number>;

export type DadKitExportDataV3 = {
  version: 3;
  exportedAt: string;
  checklistMode: ChecklistMode;
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
};

export type DadKitExportDataV4 = Omit<DadKitExportDataV3, "version"> & {
  version: 4;
  growth: GrowthPortableData;
};

export type DadKitExportData = Omit<DadKitExportDataV4, "version"> & {
  version: 5;
  hiddenTemplateItemStamps: HiddenTemplateItemStamps;
  deletedCustomItems: DeletedCustomItemStamps;
  growthUpdatedAt: number;
};

export type DadKitImportData =
  | DadKitExportDataV3
  | DadKitExportDataV4
  | DadKitExportData;

export type SyncSession = {
  token: string;
  joinedAt: string;
  spaceName?: string;
};

export type SyncClientState = {
  lastSyncAt?: string;
  lastError?: string;
  lastEtag?: string;
  lastSyncedChecksum?: string;
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

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return;
  }

  const serialized = JSON.stringify(value);

  if (window.localStorage.getItem(key) !== serialized) {
    window.localStorage.setItem(key, serialized);
  }
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
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();

  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
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

const CHECKLIST_ITEM_KEYS = [
  "id",
  "name",
  "category",
  "priority",
  "quantity",
  "note",
  "status",
  "source",
  "sourceLabel",
  "editable",
  "removable",
  "packTier",
  "itemKind",
  "preparationKind",
  "bag",
  "bulk",
  "timing",
  "updatedAt",
] as const;

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

function hasOnlyKnownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasOnlyKnownKeys(value, CHECKLIST_ITEM_KEYS) ||
    !REQUIRED_CHECKLIST_ITEM_KEYS.every((key) => key in value)
  ) {
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

function hasValidPortableChecklistData(value: Record<string, unknown>) {
  const checklist = Array.isArray(value.checklist) ? value.checklist : [];
  const customItems = Array.isArray(value.customItems) ? value.customItems : [];
  const hiddenTemplateItemIds = Array.isArray(value.hiddenTemplateItemIds)
    ? value.hiddenTemplateItemIds
    : [];

  return (
    isValidDateString(value.exportedAt) &&
    isOneOf<ChecklistMode>(value.checklistMode, ["lean", "full"]) &&
    Array.isArray(value.checklist) &&
    value.checklist.every(isChecklistItem) &&
    new Set(checklist.map((item) => (item as ChecklistItem).id)).size ===
      checklist.length &&
    Array.isArray(value.customItems) &&
    value.customItems.every(
      (item) => isChecklistItem(item) && item.source === "user",
    ) &&
    new Set(customItems.map((item) => (item as ChecklistItem).id)).size ===
      customItems.length &&
    Array.isArray(value.hiddenTemplateItemIds) &&
    value.hiddenTemplateItemIds.every(
      (id) => typeof id === "string" && id.trim().length > 0,
    ) &&
    new Set(hiddenTemplateItemIds).size === hiddenTemplateItemIds.length
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
  if (!isRecord(value)) {
    return false;
  }

  if (value.version === 3) {
    return hasExactKeys(value, V3_EXPORT_KEYS) && hasValidPortableChecklistData(value);
  }

  if (value.version === 4) {
    return (
      hasExactKeys(value, V4_EXPORT_KEYS) &&
      hasValidPortableChecklistData(value) &&
      validateGrowthPortableData(value.growth)
    );
  }

  return (
    value.version === 5 &&
    hasExactKeys(value, V5_EXPORT_KEYS) &&
    hasValidPortableChecklistData(value) &&
    validateGrowthPortableData(value.growth) &&
    isHiddenTemplateItemStamps(value.hiddenTemplateItemStamps) &&
    isDeletedCustomItemStamps(value.deletedCustomItems) &&
    typeof value.growthUpdatedAt === "number" &&
    Number.isFinite(value.growthUpdatedAt)
  );
}

export function loadChecklist() {
  const value = readJson<unknown>(STORAGE_KEYS.checklist, []);
  return Array.isArray(value) ? value.filter(isChecklistItem) : [];
}

export function saveChecklist(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.checklist, items);
  // This legacy, single-field helper is also used by import/repair tools and
  // tests.  It cannot safely reconstruct the rest of the in-memory document,
  // so make the next export/snapshot read the coherent persisted document.
  latestChecklistState = undefined;
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
  writeJson(STORAGE_KEYS.customItems, items);
  latestChecklistState = undefined;
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
  writeJson(STORAGE_KEYS.hiddenTemplateItems, Array.from(new Set(ids)));
  latestChecklistState = undefined;
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
  writeJson(STORAGE_KEYS.hiddenTemplateStamps, stamps);
}

export function loadDeletedCustomItems(): DeletedCustomItemStamps {
  const value = readJson<unknown>(STORAGE_KEYS.deletedCustomItems, {});
  return isDeletedCustomItemStamps(value) ? value : {};
}

export function saveDeletedCustomItems(stamps: DeletedCustomItemStamps) {
  writeJson(STORAGE_KEYS.deletedCustomItems, stamps);
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
    typeof value.token === "string" &&
    value.token.length > 0 &&
    typeof value.joinedAt === "string"
  ) {
    const spaceName =
      typeof value.spaceName === "string" &&
      value.spaceName.length >= 2 &&
      value.spaceName.length <= 32
        ? value.spaceName
        : undefined;

    return {
      token: value.token,
      joinedAt: value.joinedAt,
      ...(spaceName ? { spaceName } : {}),
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
    return;
  }

  writeJson(STORAGE_KEYS.syncSession, session);
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

export type ChecklistPersistenceStatus = {
  dirtyRevision: number;
  persistedRevision: number;
  lastError?: string;
};

type PendingChecklistStateSave = {
  payload: ChecklistStatePayload;
  revision: number;
};

export const CHECKLIST_PERSISTENCE_EVENT = "dadkit:persistence-status";

let latestChecklistState: ChecklistStatePayload | undefined;
let checklistDirtyRevision = 0;
let checklistPersistedRevision = 0;
let checklistPersistenceError: string | undefined;

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

export function getChecklistPersistenceStatus(): ChecklistPersistenceStatus {
  return {
    dirtyRevision: checklistDirtyRevision,
    persistedRevision: checklistPersistedRevision,
    lastError: checklistPersistenceError,
  };
}

export function primeChecklistState(payload: ChecklistStatePayload) {
  latestChecklistState = cloneChecklistState(payload);
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
}

export function saveChecklistState(payload: ChecklistStatePayload) {
  cancelPendingChecklistStateSave();

  if (!canUseLocalStorage()) {
    return;
  }

  const revision = ++checklistDirtyRevision;
  const next = cloneChecklistState(payload);

  latestChecklistState = next;

  try {
    writeChecklistStateNow(next);
    checklistPersistedRevision = revision;
    checklistPersistenceError = undefined;
    notifyChecklistPersistenceStatus();
  } catch (error) {
    pendingChecklistStateSave = { payload: next, revision };
    checklistPersistenceError =
      error instanceof Error && error.message
        ? error.message
        : "本机存储写入失败。";
    notifyChecklistPersistenceStatus();
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
    checklistPersistedRevision = Math.max(
      checklistPersistedRevision,
      pending.revision,
    );
    checklistPersistenceError = undefined;
    notifyChecklistPersistenceStatus();
    return true;
  } catch (error) {
    pendingChecklistStateSave = pending;
    checklistPersistenceError =
      error instanceof Error && error.message
        ? error.message
        : "本机存储空间不足，修改尚未写入磁盘。";
    notifyChecklistPersistenceStatus();
    // 写入失败（如存储已满）时保留内存状态，下一次变更会再次尝试持久化。
    return false;
  }
}

export function retryPendingChecklistStateSave() {
  return flushPendingChecklistStateSave();
}

function cancelPendingChecklistStateSave() {
  if (pendingChecklistStateTimer !== undefined) {
    clearTimeout(pendingChecklistStateTimer);
    pendingChecklistStateTimer = undefined;
  }

  pendingChecklistStateSave = undefined;
}

// 高频点按路径使用：只复制数组容器，避免每次点按深度序列化 141 条
// 清单；完整规范化与 localStorage 写入合并到空闲后的 1 秒窗口。
export function saveChecklistStateSoon(payload: ChecklistStatePayload) {
  if (!canUseLocalStorage()) {
    return;
  }

  const revision = ++checklistDirtyRevision;
  const next = captureChecklistState(payload);

  latestChecklistState = next;
  pendingChecklistStateSave = { payload: next, revision };
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
  writeJson(STORAGE_KEYS.checklistMode, mode);
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
    checklistDirtyRevision = 0;
    checklistPersistedRevision = 0;
    checklistPersistenceError = undefined;
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
    version: 5,
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
  };
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

  if (parsed.version !== 3 && parsed.version !== 4 && parsed.version !== 5) {
    return { ok: false, message: "不支持的备份版本，未修改本地数据。" };
  }

  const expectedKeys =
    parsed.version === 5
      ? V5_EXPORT_KEYS
      : parsed.version === 4
        ? V4_EXPORT_KEYS
        : V3_EXPORT_KEYS;

  if (!hasExactKeys(parsed, expectedKeys)) {
    return {
      ok: false,
      message: "备份字段不完整或包含未知字段，未修改本地数据。",
    };
  }

  if (!isDadKitImportData(parsed)) {
    return { ok: false, message: "备份内容无效，未修改本地数据。" };
  }

  return {
    ok: true,
    message: "校验通过",
    data: parsed as DadKitImportData,
  };
}

export function importData(rawJson: string): ImportResult {
  const validation = validateImportData(rawJson);

  if (!validation.ok || !validation.data) {
    return { ok: false, message: validation.message };
  }

  return applyImportData(validation.data);
}

export function applyImportData(data: DadKitImportData): ImportResult {
  if (!isDadKitImportData(data)) {
    return { ok: false, message: "备份内容无效，未修改本地数据。" };
  }

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
  ];

  if (data.version === 4 || data.version === 5) {
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

  if (data.version === 5) {
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
    if (data.version === 4 || data.version === 5) {
      useGrowthStore.setState({
        ...data.growth.profile,
        ...data.growth.progress,
        hydrated: true,
      });
    }
    return { ok: true, message: "导入成功" };
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
    data.growth.progress.completedTaskIds.length > 0
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
  return Array.isArray(snapshots) ? snapshots.filter(isSnapshot).slice(0, 5) : [];
}

export function saveSnapshots(snapshots: DadKitSnapshot[]) {
  try {
    if (!canUseLocalStorage()) {
      return false;
    }

    const serialized = JSON.stringify(snapshots.filter(isSnapshot).slice(0, 5));
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
    const data = exportData();

    if (!hasSnapshotData(data)) {
      return undefined;
    }

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
