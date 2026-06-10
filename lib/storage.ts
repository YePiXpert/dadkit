import type {
  HospitalAnswer,
  ChecklistMode,
  ChecklistItem,
  UserHospitalOverride,
  UserProfile,
} from "@/lib/types";
import type { TimelineTaskStatus } from "@/lib/timeline";
import {
  DEFAULT_WEBDAV_CONFIG,
  type WebDavConfig,
  type WebDavSyncState,
} from "@/lib/webdav/types";

export const STORAGE_KEYS = {
  userProfile: "dadkit:user-profile",
  checklist: "dadkit:checklist",
  customItems: "dadkit:custom-items",
  hiddenTemplateItems: "dadkit:hidden-template-items",
  hospitalOverrides: "dadkit:hospital-overrides",
  hospitalAnswers: "dadkit:hospital-answers",
  timelineTaskStatuses: "dadkit:timeline-task-statuses",
  checklistMode: "dadkit:checklist-mode",
  snapshots: "dadkit:snapshots",
  webDavConfig: "dadkit:webdav-config",
  webDavSyncState: "dadkit:webdav-sync-state",
  webDavSecret: "dadkit:webdav-secret",
} as const;

export const WEBDAV_SESSION_SECRET_KEY = "dadkit:webdav-session-secret";

const DATA_STORAGE_KEYS = [
  STORAGE_KEYS.userProfile,
  STORAGE_KEYS.checklist,
  STORAGE_KEYS.customItems,
  STORAGE_KEYS.hiddenTemplateItems,
  STORAGE_KEYS.hospitalOverrides,
  STORAGE_KEYS.hospitalAnswers,
  STORAGE_KEYS.timelineTaskStatuses,
  STORAGE_KEYS.checklistMode,
  STORAGE_KEYS.webDavConfig,
  STORAGE_KEYS.webDavSyncState,
  STORAGE_KEYS.webDavSecret,
];

export type DadKitExportData = {
  version: 1;
  exportedAt: string;
  userProfile?: UserProfile;
  checklistMode: ChecklistMode;
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  hospitalOverrides: UserHospitalOverride[];
  hospitalAnswers: HospitalAnswer[];
  timelineTaskStatuses: TimelineTaskStatus[];
};

export type ImportResult = {
  ok: boolean;
  message: string;
};

export type ImportValidationResult = ImportResult & {
  data?: Partial<DadKitExportData> & Record<string, unknown>;
};

export type DadKitSnapshot = {
  id: string;
  createdAt: string;
  reason: string;
  data: DadKitExportData;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseSessionStorage() {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
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

export function loadUserProfile() {
  return readJson<UserProfile | undefined>(STORAGE_KEYS.userProfile, undefined);
}

export function saveUserProfile(profile?: UserProfile) {
  if (!canUseLocalStorage()) {
    return;
  }

  if (!profile) {
    window.localStorage.removeItem(STORAGE_KEYS.userProfile);
    return;
  }

  writeJson(STORAGE_KEYS.userProfile, profile);
}

export function loadChecklist() {
  return readJson<ChecklistItem[]>(STORAGE_KEYS.checklist, []);
}

export function saveChecklist(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.checklist, items);
}

export function loadCustomItems() {
  return readJson<ChecklistItem[]>(STORAGE_KEYS.customItems, []);
}

export function saveCustomItems(items: ChecklistItem[]) {
  writeJson(STORAGE_KEYS.customItems, items);
}

export function loadHiddenTemplateItemIds() {
  return readJson<string[]>(STORAGE_KEYS.hiddenTemplateItems, []);
}

export function saveHiddenTemplateItemIds(ids: string[]) {
  writeJson(STORAGE_KEYS.hiddenTemplateItems, ids);
}

export function loadHospitalOverrides() {
  return readJson<UserHospitalOverride[]>(STORAGE_KEYS.hospitalOverrides, []);
}

export function saveHospitalOverrides(overrides: UserHospitalOverride[]) {
  writeJson(STORAGE_KEYS.hospitalOverrides, overrides);
}

export function loadHospitalAnswers() {
  return readJson<HospitalAnswer[]>(STORAGE_KEYS.hospitalAnswers, []);
}

export function saveHospitalAnswers(answers: HospitalAnswer[]) {
  writeJson(STORAGE_KEYS.hospitalAnswers, answers);
}

export function loadTimelineTaskStatuses() {
  const statuses = readJson<TimelineTaskStatus[]>(
    STORAGE_KEYS.timelineTaskStatuses,
    [],
  );

  return Array.isArray(statuses) ? statuses : [];
}

export function saveTimelineTaskStatuses(statuses: TimelineTaskStatus[]) {
  writeJson(STORAGE_KEYS.timelineTaskStatuses, statuses);
}

export function updateTimelineTaskStatus(
  taskId: string,
  status: TimelineTaskStatus["status"],
) {
  const nextStatus: TimelineTaskStatus = {
    taskId,
    status,
    updatedAt: new Date().toISOString(),
  };
  const statuses = [
    ...loadTimelineTaskStatuses().filter((candidate) => candidate.taskId !== taskId),
    nextStatus,
  ];

  saveTimelineTaskStatuses(statuses);

  return statuses;
}

export function loadChecklistMode(): ChecklistMode {
  const mode = readJson<ChecklistMode>(STORAGE_KEYS.checklistMode, "lean");

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

export function loadWebDavSecret(rememberSecret = loadWebDavConfig().rememberSecret) {
  if (canUseSessionStorage()) {
    const sessionSecret = window.sessionStorage.getItem(WEBDAV_SESSION_SECRET_KEY);

    if (sessionSecret) {
      return sessionSecret;
    }
  }

  if (!rememberSecret || !canUseLocalStorage()) {
    return "";
  }

  return window.localStorage.getItem(STORAGE_KEYS.webDavSecret) ?? "";
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
    window.localStorage.removeItem(STORAGE_KEYS.webDavConfig);
    window.localStorage.removeItem(STORAGE_KEYS.webDavSyncState);
    window.localStorage.removeItem(STORAGE_KEYS.webDavSecret);
  }

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(WEBDAV_SESSION_SECRET_KEY);
  }
}

export function resetAllData() {
  if (canUseLocalStorage()) {
    DATA_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  }

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(WEBDAV_SESSION_SECRET_KEY);
  }
}

export function exportData(): DadKitExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile: loadUserProfile(),
    checklistMode: loadChecklistMode(),
    checklist: loadChecklist(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
    hospitalOverrides: loadHospitalOverrides(),
    hospitalAnswers: loadHospitalAnswers(),
    timelineTaskStatuses: loadTimelineTaskStatuses(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function importData(rawJson: string): ImportResult {
  const validation = validateImportData(rawJson);

  if (!validation.ok || !validation.data) {
    return { ok: validation.ok, message: validation.message };
  }

  return applyImportData(validation.data);
}

export function validateImportData(rawJson: string): ImportValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, message: "JSON 格式不正确，未修改本地数据。" };
  }

  if (!isRecord(parsed)) {
    return { ok: false, message: "JSON 内容不是 DadKit 备份，未修改本地数据。" };
  }

  const data = parsed as Partial<DadKitExportData> & Record<string, unknown>;

  if (data.version !== 1) {
    return { ok: false, message: "不支持的备份版本，未修改本地数据。" };
  }

  const arrayFields: Array<[
    | "checklist"
    | "customItems"
    | "hiddenTemplateItemIds"
    | "hospitalOverrides"
    | "hospitalAnswers"
    | "timelineTaskStatuses",
    string,
  ]> = [
    ["checklist", "checklist 必须是数组"],
    ["customItems", "customItems 必须是数组"],
    ["hiddenTemplateItemIds", "hiddenTemplateItemIds 必须是数组"],
    ["hospitalOverrides", "hospitalOverrides 必须是数组"],
    ["hospitalAnswers", "hospitalAnswers 必须是数组"],
    ["timelineTaskStatuses", "timelineTaskStatuses 必须是数组"],
  ];

  for (const [field, message] of arrayFields) {
    if (field in data && data[field] !== undefined && !Array.isArray(data[field])) {
      return { ok: false, message: `${message}，未修改本地数据。` };
    }
  }

  if (
    "checklistMode" in data &&
    data.checklistMode !== undefined &&
    data.checklistMode !== "lean" &&
    data.checklistMode !== "full"
  ) {
    return {
      ok: false,
      message: "checklistMode 只能是 lean 或 full，未修改本地数据。",
    };
  }

  return { ok: true, message: "校验通过", data };
}

export function applyImportData(
  data: Partial<DadKitExportData> & Record<string, unknown>,
): ImportResult {
  if (data.userProfile) {
    saveUserProfile(data.userProfile);
  }

  if (Array.isArray(data.checklist)) {
    saveChecklist(data.checklist);
  }

  if (Array.isArray(data.customItems)) {
    saveCustomItems(data.customItems);
  }

  if (Array.isArray(data.hiddenTemplateItemIds)) {
    saveHiddenTemplateItemIds(data.hiddenTemplateItemIds);
  }

  if (Array.isArray(data.hospitalOverrides)) {
    saveHospitalOverrides(data.hospitalOverrides);
  }

  if (Array.isArray(data.hospitalAnswers)) {
    saveHospitalAnswers(data.hospitalAnswers);
  }

  if (Array.isArray(data.timelineTaskStatuses)) {
    saveTimelineTaskStatuses(data.timelineTaskStatuses);
  }

  if (data.checklistMode === "lean" || data.checklistMode === "full") {
    saveChecklistMode(data.checklistMode);
  }

  return { ok: true, message: "导入成功" };
}

function snapshotId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `snapshot-${crypto.randomUUID()}`;
  }

  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hasSnapshotData(data: DadKitExportData) {
  return Boolean(
    data.userProfile ||
      data.checklist.length > 0 ||
      data.customItems.length > 0 ||
      data.hiddenTemplateItemIds.length > 0 ||
      data.hospitalOverrides.length > 0 ||
      data.hospitalAnswers.length > 0 ||
      data.timelineTaskStatuses.length > 0,
  );
}

function isSnapshot(value: unknown): value is DadKitSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.reason === "string" &&
    isRecord(value.data) &&
    value.data.version === 1
  );
}

export function loadSnapshots(): DadKitSnapshot[] {
  try {
    const snapshots = readJson<DadKitSnapshot[]>(STORAGE_KEYS.snapshots, []);

    if (!Array.isArray(snapshots)) {
      return [];
    }

    return snapshots.filter(isSnapshot).slice(0, 5);
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: DadKitSnapshot[]) {
  try {
    if (!canUseLocalStorage()) {
      return;
    }

    writeJson(STORAGE_KEYS.snapshots, snapshots.filter(isSnapshot).slice(0, 5));
  } catch {
    return;
  }
}

export function createSnapshot(reason: string): DadKitSnapshot | undefined {
  try {
    if (!canUseLocalStorage()) {
      return undefined;
    }

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

    saveSnapshots([snapshot, ...loadSnapshots()]);

    return snapshot;
  } catch {
    return undefined;
  }
}

export function restoreSnapshot(
  id: string,
  options: { snapshotBeforeRestore?: boolean } = {},
): ImportResult {
  const snapshotBeforeRestore = options.snapshotBeforeRestore ?? true;
  const snapshotsBeforeRestore = loadSnapshots();
  const snapshot = snapshotsBeforeRestore.find((candidate) => candidate.id === id);

  if (!snapshot) {
    return { ok: false, message: "未找到这份本地备份，未修改本地数据。" };
  }

  try {
    if (snapshotBeforeRestore) {
      createSnapshot("恢复本地备份前");
    }

    const result = importData(JSON.stringify(snapshot.data));

    if (!result.ok) {
      saveSnapshots(snapshotsBeforeRestore);
    }

    return result;
  } catch {
    saveSnapshots(snapshotsBeforeRestore);
    return { ok: false, message: "恢复失败，未修改本地数据。" };
  }
}

export function clearSnapshots() {
  try {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEYS.snapshots);
  } catch {
    return;
  }
}
