import type {
  HospitalAnswer,
  ChecklistMode,
  ChecklistItem,
  HospitalProfile,
  UserHospitalOverride,
  UserProfile,
} from "@/lib/types";
import {
  DEFAULT_BIRTH_PLAN,
  DEFAULT_POSTPARTUM_TASKS,
  mergeBirthPlan,
  mergePostpartumTasks,
  type BirthPlan,
  type ContractionRecord,
  type PostpartumTask,
} from "@/lib/rc";
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
  contractions: "dadkit:contractions",
  birthPlan: "dadkit:birth-plan",
  postpartumTasks: "dadkit:postpartum-tasks",
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
  STORAGE_KEYS.contractions,
  STORAGE_KEYS.birthPlan,
  STORAGE_KEYS.postpartumTasks,
  STORAGE_KEYS.checklistMode,
  STORAGE_KEYS.webDavConfig,
  STORAGE_KEYS.webDavSyncState,
  STORAGE_KEYS.webDavSecret,
];

export type DadKitExportData = {
  version: 1;
  exportedAt: string;
  userProfile: UserProfile | null;
  checklistMode: ChecklistMode;
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemIds: string[];
  hospitalOverrides: UserHospitalOverride[];
  hospitalAnswers: HospitalAnswer[];
  timelineTaskStatuses: TimelineTaskStatus[];
  contractions: ContractionRecord[];
  birthPlan: BirthPlan;
  postpartumTasks: PostpartumTask[];
};

export type DadKitImportData = Partial<DadKitExportData> &
  Record<string, unknown>;

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
  data: DadKitExportData;
};

export class SnapshotPersistenceError extends Error {
  constructor() {
    super("无法保存本地恢复快照，操作已中止。");
    this.name = "SnapshotPersistenceError";
  }
}

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

export function loadContractions() {
  const records = readJson<ContractionRecord[]>(STORAGE_KEYS.contractions, []);

  return Array.isArray(records) ? records : [];
}

export function saveContractions(records: ContractionRecord[]) {
  writeJson(STORAGE_KEYS.contractions, records);
}

export function loadBirthPlan() {
  const saved = readJson<Partial<BirthPlan> | undefined>(
    STORAGE_KEYS.birthPlan,
    undefined,
  );

  return mergeBirthPlan(saved);
}

export function saveBirthPlan(plan: BirthPlan) {
  writeJson(STORAGE_KEYS.birthPlan, mergeBirthPlan(plan));
}

export function loadPostpartumTasks() {
  const tasks = readJson<PostpartumTask[]>(STORAGE_KEYS.postpartumTasks, []);

  return mergePostpartumTasks(Array.isArray(tasks) ? tasks : []);
}

export function savePostpartumTasks(tasks: PostpartumTask[]) {
  writeJson(STORAGE_KEYS.postpartumTasks, mergePostpartumTasks(tasks));
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
    userProfile: loadUserProfile() ?? null,
    checklistMode: loadChecklistMode(),
    checklist: loadChecklist(),
    customItems: loadCustomItems(),
    hiddenTemplateItemIds: loadHiddenTemplateItemIds(),
    hospitalOverrides: loadHospitalOverrides(),
    hospitalAnswers: loadHospitalAnswers(),
    timelineTaskStatuses: loadTimelineTaskStatuses(),
    contractions: loadContractions(),
    birthPlan: loadBirthPlan(),
    postpartumTasks: loadPostpartumTasks(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function hasOptionalString(value: Record<string, unknown>, key: string) {
  return !(key in value) || value[key] === undefined || typeof value[key] === "string";
}

function hasOptionalBoolean(value: Record<string, unknown>, key: string) {
  return !(key in value) || value[key] === undefined || typeof value[key] === "boolean";
}

function isHospitalProfile(value: unknown): value is HospitalProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOneOf(value.mode, ["preset", "custom", "unknown"]) &&
    typeof value.country === "string" &&
    isOneOf(value.verificationStatus, [
      "official",
      "user_entered",
      "community",
      "unverified",
    ]) &&
    isStringArray(value.requiredDocuments) &&
    isStringArray(value.hospitalProvidedItems) &&
    isStringArray(value.recommendedItems) &&
    isStringArray(value.notAllowedItems) &&
    (!("aliases" in value) ||
      value.aliases === undefined ||
      isStringArray(value.aliases)) &&
    (!("sourceNotes" in value) ||
      value.sourceNotes === undefined ||
      isStringArray(value.sourceNotes)) &&
    [
      "hospitalId",
      "name",
      "province",
      "city",
      "district",
      "lastVerifiedAt",
      "admissionNotes",
      "partnerPolicyNotes",
      "wardNotes",
      "paymentNotes",
      "parkingNotes",
    ].every((key) => hasOptionalString(value, key))
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.regionId === "string" &&
    isOneOf(value.hospitalMode, ["preset", "custom", "unknown"]) &&
    isOneOf(value.deliveryMode, ["vaginal", "c_section", "unknown"]) &&
    isFiniteNumber(value.expectedStayDays) &&
    typeof value.breastfeeding === "boolean" &&
    typeof value.partnerPresent === "boolean" &&
    typeof value.coldWeather === "boolean" &&
    isStringArray(value.hospitalProvidedItemIds) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    hasOptionalString(value, "dueDate") &&
    hasOptionalString(value, "hospitalId") &&
    hasOptionalString(value, "hospitalNotes") &&
    (!("babySex" in value) ||
      value.babySex === undefined ||
      isOneOf(value.babySex, ["girl", "boy", "unknown"])) &&
    (!("customHospital" in value) ||
      value.customHospital === undefined ||
      isHospitalProfile(value.customHospital))
  );
}

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (!isRecord(value)) {
    return false;
  }

  const appliesTo = value.appliesTo;
  const validAppliesTo =
    appliesTo === undefined ||
    (isRecord(appliesTo) &&
      (!("deliveryMode" in appliesTo) ||
        appliesTo.deliveryMode === undefined ||
        (Array.isArray(appliesTo.deliveryMode) &&
          appliesTo.deliveryMode.every((mode) =>
            isOneOf(mode, ["vaginal", "c_section", "unknown"]),
          ))) &&
      ["breastfeeding", "partnerPresent", "coldWeather"].every((key) =>
        hasOptionalBoolean(appliesTo, key),
      ));

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOneOf(value.category, [
      "documents",
      "mom_labor",
      "mom_postpartum",
      "baby",
      "partner",
      "going_home",
      "hospital_questions",
      "last_minute",
    ]) &&
    isOneOf(value.priority, ["must", "recommended", "optional"]) &&
    isOneOf(value.status, [
      "todo",
      "bought",
      "washed",
      "packed",
      "last_minute",
      "hospital_provided",
      "not_needed",
    ]) &&
    isOneOf(value.source, ["general", "region", "hospital", "user"]) &&
    typeof value.editable === "boolean" &&
    typeof value.removable === "boolean" &&
    hasOptionalBoolean(value, "hospitalProvidedByRule") &&
    isOneOf(value.timing, [
      "prepare_now",
      "wash_before_pack",
      "pack_now",
      "grab_before_leaving",
      "confirm_with_hospital",
    ]) &&
    ["quantity", "note", "sourceLabel"].every((key) =>
      hasOptionalString(value, key),
    ) &&
    (!("packTier" in value) ||
      value.packTier === undefined ||
      isOneOf(value.packTier, ["core", "confirm", "optional", "hidden"])) &&
    (!("itemKind" in value) ||
      value.itemKind === undefined ||
      isOneOf(value.itemKind, ["item", "task", "question"])) &&
    (!("preparationKind" in value) ||
      value.preparationKind === undefined ||
      isOneOf(value.preparationKind, [
        "buy_and_pack",
        "pack_existing",
        "wash_then_pack",
        "document",
        "last_minute",
        "question",
        "task",
        "install_or_place",
      ])) &&
    (!("bag" in value) ||
      value.bag === undefined ||
      isOneOf(value.bag, [
        "documents_folder",
        "mom_bag",
        "baby_bag",
        "dad_backpack",
        "car",
        "last_minute",
        "none",
      ])) &&
    (!("bulk" in value) ||
      value.bulk === undefined ||
      isOneOf(value.bulk, ["small", "medium", "large"])) &&
    validAppliesTo
  );
}

function isHospitalOverride(value: unknown): value is UserHospitalOverride {
  return (
    isRecord(value) &&
    typeof value.updatedAt === "string" &&
    hasOptionalString(value, "hospitalId") &&
    hasOptionalString(value, "notesOverride") &&
    (!("providedItemsOverride" in value) ||
      value.providedItemsOverride === undefined ||
      isStringArray(value.providedItemsOverride)) &&
    (!("selectedProvidedItemIds" in value) ||
      value.selectedProvidedItemIds === undefined ||
      isStringArray(value.selectedProvidedItemIds)) &&
    (!("requiredDocumentsOverride" in value) ||
      value.requiredDocumentsOverride === undefined ||
      isStringArray(value.requiredDocumentsOverride))
  );
}

function isHospitalAnswer(value: unknown): value is HospitalAnswer {
  return (
    isRecord(value) &&
    hasOptionalString(value, "hospitalId") &&
    typeof value.itemId === "string" &&
    typeof value.name === "string" &&
    isOneOf(value.status, [
      "todo",
      "confirmed",
      "provided",
      "not_provided",
      "partial",
      "not_needed",
    ]) &&
    hasOptionalString(value, "note") &&
    typeof value.updatedAt === "string"
  );
}

function isTimelineTaskStatus(value: unknown): value is TimelineTaskStatus {
  return (
    isRecord(value) &&
    typeof value.taskId === "string" &&
    isOneOf(value.status, ["todo", "done", "not_needed"]) &&
    typeof value.updatedAt === "string"
  );
}

function isContractionRecord(value: unknown): value is ContractionRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    isFiniteNumber(value.durationSeconds) &&
    (!("intervalSeconds" in value) ||
      value.intervalSeconds === undefined ||
      isFiniteNumber(value.intervalSeconds)) &&
    hasOptionalString(value, "note")
  );
}

function isPostpartumTask(value: unknown): value is PostpartumTask {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isOneOf(value.group, [
      "birth_certificate",
      "discharge_billing",
      "insurance",
      "household",
      "postpartum_check",
      "newborn_check",
    ]) &&
    typeof value.title === "string" &&
    isOneOf(value.status, ["todo", "done", "not_needed"]) &&
    hasOptionalString(value, "note")
  );
}

function isBirthPlanPatch(value: unknown): value is Partial<BirthPlan> {
  return (
    isRecord(value) &&
    Object.keys(DEFAULT_BIRTH_PLAN).every(
      (key) => !(key in value) || typeof value[key] === "string",
    )
  );
}

type ArrayImportField =
  | "checklist"
  | "customItems"
  | "hiddenTemplateItemIds"
  | "hospitalOverrides"
  | "hospitalAnswers"
  | "timelineTaskStatuses"
  | "contractions"
  | "postpartumTasks";

const ARRAY_FIELD_VALIDATORS: Array<[
  ArrayImportField,
  (value: unknown) => boolean,
]> = [
  ["checklist", isChecklistItem],
  ["customItems", isChecklistItem],
  ["hiddenTemplateItemIds", (value) => typeof value === "string"],
  ["hospitalOverrides", isHospitalOverride],
  ["hospitalAnswers", isHospitalAnswer],
  ["timelineTaskStatuses", isTimelineTaskStatus],
  ["contractions", isContractionRecord],
  ["postpartumTasks", isPostpartumTask],
];

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

  const data = parsed as DadKitImportData;

  if (data.version !== 1) {
    return { ok: false, message: "不支持的备份版本，未修改本地数据。" };
  }

  if (
    "exportedAt" in data &&
    data.exportedAt !== undefined &&
    typeof data.exportedAt !== "string"
  ) {
    return { ok: false, message: "exportedAt 必须是字符串，未修改本地数据。" };
  }

  if (
    "userProfile" in data &&
    data.userProfile !== undefined &&
    data.userProfile !== null &&
    !isUserProfile(data.userProfile)
  ) {
    return { ok: false, message: "userProfile 内容无效，未修改本地数据。" };
  }

  for (const [field, isValidMember] of ARRAY_FIELD_VALIDATORS) {
    const value = data[field];

    if (
      field in data &&
      value !== undefined &&
      (!Array.isArray(value) || !value.every(isValidMember))
    ) {
      return {
        ok: false,
        message: `${field} 包含无效数据，未修改本地数据。`,
      };
    }
  }

  if (
    "birthPlan" in data &&
    data.birthPlan !== undefined &&
    !isBirthPlanPatch(data.birthPlan)
  ) {
    return {
      ok: false,
      message: "birthPlan 内容无效，未修改本地数据。",
    };
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
  data: DadKitImportData,
): ImportResult {
  if (!canUseLocalStorage()) {
    return { ok: false, message: "当前环境无法访问本地存储，未修改本地数据。" };
  }

  const mutations: StorageMutation[] = [];

  if ("userProfile" in data && data.userProfile !== undefined) {
    mutations.push({
      key: STORAGE_KEYS.userProfile,
      value: data.userProfile === null ? null : JSON.stringify(data.userProfile),
    });
  }

  addJsonMutation(mutations, STORAGE_KEYS.checklist, data.checklist);
  addJsonMutation(mutations, STORAGE_KEYS.customItems, data.customItems);
  addJsonMutation(
    mutations,
    STORAGE_KEYS.hiddenTemplateItems,
    data.hiddenTemplateItemIds,
  );
  addJsonMutation(mutations, STORAGE_KEYS.hospitalOverrides, data.hospitalOverrides);
  addJsonMutation(mutations, STORAGE_KEYS.hospitalAnswers, data.hospitalAnswers);
  addJsonMutation(
    mutations,
    STORAGE_KEYS.timelineTaskStatuses,
    data.timelineTaskStatuses,
  );
  addJsonMutation(mutations, STORAGE_KEYS.contractions, data.contractions);

  if (data.birthPlan !== undefined) {
    addJsonMutation(
      mutations,
      STORAGE_KEYS.birthPlan,
      mergeBirthPlan(data.birthPlan),
    );
  }

  if (data.postpartumTasks !== undefined) {
    addJsonMutation(
      mutations,
      STORAGE_KEYS.postpartumTasks,
      mergePostpartumTasks(data.postpartumTasks),
    );
  }

  addJsonMutation(mutations, STORAGE_KEYS.checklistMode, data.checklistMode);

  try {
    applyStorageMutations(mutations);
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

function addJsonMutation(
  mutations: StorageMutation[],
  key: string,
  value: unknown,
) {
  if (value !== undefined) {
    mutations.push({ key, value: JSON.stringify(value) });
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
  return Boolean(
    data.userProfile ||
      data.checklist.length > 0 ||
      data.customItems.length > 0 ||
      data.hiddenTemplateItemIds.length > 0 ||
      data.hospitalOverrides.length > 0 ||
      data.hospitalAnswers.length > 0 ||
      data.timelineTaskStatuses.length > 0 ||
      data.contractions.length > 0 ||
      hasBirthPlanData(data.birthPlan) ||
      hasPostpartumData(data.postpartumTasks),
  );
}

function hasBirthPlanData(plan: BirthPlan) {
  return Object.entries(DEFAULT_BIRTH_PLAN).some(
    ([key, value]) => plan[key as keyof BirthPlan] !== value,
  );
}

function hasPostpartumData(tasks: PostpartumTask[]) {
  const defaultsById = new Map(DEFAULT_POSTPARTUM_TASKS.map((task) => [task.id, task]));

  return tasks.some((task) => {
    const defaultTask = defaultsById.get(task.id);

    if (!defaultTask) {
      return true;
    }

    return task.status !== defaultTask.status || (task.note ?? "") !== (defaultTask.note ?? "");
  });
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
  const snapshotBeforeRestore = options.snapshotBeforeRestore ?? true;
  const snapshotsBeforeRestore = loadSnapshots();
  const snapshot = snapshotsBeforeRestore.find((candidate) => candidate.id === id);

  if (!snapshot) {
    return { ok: false, message: "未找到这份本地备份，未修改本地数据。" };
  }

  try {
    if (snapshotBeforeRestore) {
      // Keep this rescue point even when the import or its rollback fails.
      createSnapshot("恢复本地备份前");
    }

    return importData(JSON.stringify(snapshot.data));
  } catch {
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
