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
  exportGrowthData,
  useGrowthStore,
  validateGrowthPortableData,
  type GrowthPortableData,
} from "@/lib/growth-store";
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

export type DadKitExportDataV3 = {
  version: 3;
  exportedAt: string;
  checklistMode: ChecklistMode;
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
};

export type DadKitExportData = Omit<DadKitExportDataV3, "version"> & {
  version: 4;
  growth: GrowthPortableData;
};

export type DadKitImportData = DadKitExportDataV3 | DadKitExportData;

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

  window.localStorage.setItem(key, JSON.stringify(value));
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
      isOneOf<ItemBulk>(value.bulk, ["small", "medium", "large"]))
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

function isDadKitImportData(value: unknown): value is DadKitImportData {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version === 3) {
    return hasExactKeys(value, V3_EXPORT_KEYS) && hasValidPortableChecklistData(value);
  }

  return (
    value.version === 4 &&
    hasExactKeys(value, V4_EXPORT_KEYS) &&
    hasValidPortableChecklistData(value) &&
    validateGrowthPortableData(value.growth)
  );
}

export function loadChecklist() {
  const value = readJson<unknown>(STORAGE_KEYS.checklist, []);
  return Array.isArray(value) ? value.filter(isChecklistItem) : [];
}

export function saveChecklist(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.checklist, items);
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
}

type ChecklistStatePayload = {
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
};

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

  writeChecklistStateNow(payload);
}

const CHECKLIST_STATE_SAVE_DELAY_MS = 250;

let pendingChecklistStateSave: ChecklistStatePayload | undefined;
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
    return;
  }

  const payload = pendingChecklistStateSave;
  pendingChecklistStateSave = undefined;

  try {
    writeChecklistStateNow(payload);
  } catch {
    // 写入失败（如存储已满）时保留内存状态，下一次变更会再次尝试持久化。
  }
}

function cancelPendingChecklistStateSave() {
  if (pendingChecklistStateTimer !== undefined) {
    clearTimeout(pendingChecklistStateTimer);
    pendingChecklistStateTimer = undefined;
  }

  pendingChecklistStateSave = undefined;
}

// 高频点按路径使用：把整包 localStorage 序列化写入从每次点按
// 合并为至多每 250ms 一次，避免主线程被同步 I/O 卡住。
export function saveChecklistStateSoon(payload: ChecklistStatePayload) {
  if (!canUseLocalStorage()) {
    return;
  }

  pendingChecklistStateSave = payload;
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
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    checklistMode: loadChecklistMode(),
    checklist: loadChecklist(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
    growth: exportGrowthData(),
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

  if (parsed.version !== 3 && parsed.version !== 4) {
    return { ok: false, message: "不支持的备份版本，未修改本地数据。" };
  }

  const expectedKeys = parsed.version === 4 ? V4_EXPORT_KEYS : V3_EXPORT_KEYS;

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

  if (data.version === 4) {
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

  try {
    applyStorageMutations(mutations);
    if (data.version === 4) {
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
