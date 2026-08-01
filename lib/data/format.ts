import {
  validateGrowthPortableData,
  type GrowthPortableData,
} from "@/lib/growth-portable";
import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { cloneHospitalProfile } from "@/lib/hospital/portable";
import type { HospitalProfilePortableData } from "@/lib/hospital/types";
import { isHospitalProfilePortableData } from "@/lib/hospital/validation";
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

export type HiddenTemplateItemStamps = Record<
  string,
  { hidden: boolean; updatedAt: number }
>;

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

export type DadKitExportDataV5 = Omit<DadKitExportDataV4, "version"> & {
  version: 5;
  hiddenTemplateItemStamps: HiddenTemplateItemStamps;
  deletedCustomItems: DeletedCustomItemStamps;
  growthUpdatedAt: number;
};

export type DadKitExportData = Omit<DadKitExportDataV5, "version"> & {
  version: 6;
  hospital: HospitalProfilePortableData;
};

export type DadKitImportData =
  | DadKitExportDataV3
  | DadKitExportDataV4
  | DadKitExportDataV5
  | DadKitExportData;

export type DadKitSyncDataVersion = 5 | 6;

export const LATEST_DATA_VERSION = 6 as const;

export const V3_EXPORT_KEYS = [
  "version",
  "exportedAt",
  "checklistMode",
  "checklist",
  "customItems",
  "hiddenTemplateItemIds",
] as const;

export const V4_EXPORT_KEYS = [...V3_EXPORT_KEYS, "growth"] as const;

export const V5_EXPORT_KEYS = [
  ...V4_EXPORT_KEYS,
  "hiddenTemplateItemStamps",
  "deletedCustomItems",
  "growthUpdatedAt",
] as const;

export const V6_EXPORT_KEYS = [...V5_EXPORT_KEYS, "hospital"] as const;

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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  return expected.every((key) => key in value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

export function isChecklistItem(value: unknown): value is ChecklistItem {
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

function copyChecklistItem(item: ChecklistItem): ChecklistItem {
  return Object.fromEntries(
    CHECKLIST_ITEM_KEYS.filter((key) => key in item).map((key) => [
      key,
      item[key],
    ]),
  ) as ChecklistItem;
}

/** Drops fields a newer client may add before data enters this runtime. */
export function sanitizeDadKitImportData(
  data: DadKitImportData,
): DadKitImportData {
  const base = {
    exportedAt: data.exportedAt,
    checklistMode: data.checklistMode,
    checklist: data.checklist.map(copyChecklistItem),
    customItems: data.customItems.map(copyChecklistItem),
    hiddenTemplateItemIds: [...data.hiddenTemplateItemIds],
  };

  if (data.version === 3) {
    return { ...base, version: 3 };
  }

  const growth = {
    version: 1 as const,
    profile: {
      nickname: data.growth.profile.nickname,
      dueDate: data.growth.profile.dueDate,
    },
    progress: { completedTaskIds: [...data.growth.progress.completedTaskIds] },
  };

  if (data.version === 4) {
    return { ...base, version: 4, growth };
  }

  const v5 = {
    ...base,
    growth,
    hiddenTemplateItemStamps: Object.fromEntries(
      Object.entries(data.hiddenTemplateItemStamps).map(([id, stamp]) => [
        id,
        { hidden: stamp.hidden, updatedAt: stamp.updatedAt },
      ]),
    ),
    deletedCustomItems: { ...data.deletedCustomItems },
    growthUpdatedAt: data.growthUpdatedAt,
  };

  if (data.version === 5) {
    return { ...v5, version: 5 };
  }

  return {
    ...v5,
    version: 6,
    hospital: cloneHospitalProfile(data.hospital),
  };
}

export function upgradeExportDataToLatest(
  data: DadKitImportData,
): DadKitExportData {
  const clean = sanitizeDadKitImportData(data);
  const growth =
    clean.version === 3
      ? {
          version: 1 as const,
          profile: { nickname: "", dueDate: "" },
          progress: { completedTaskIds: [] },
        }
      : clean.growth;
  const hiddenTemplateItemStamps =
    clean.version === 3 || clean.version === 4
      ? migrateHiddenStamps(clean.hiddenTemplateItemIds, 0)
      : clean.hiddenTemplateItemStamps;
  const deletedCustomItems =
    clean.version === 3 || clean.version === 4
      ? {}
      : clean.deletedCustomItems;
  const growthUpdatedAt =
    clean.version === 5 || clean.version === 6
      ? clean.growthUpdatedAt
      : 0;

  return {
    version: 6,
    exportedAt: clean.exportedAt,
    checklistMode: clean.checklistMode,
    checklist: clean.checklist.map(copyChecklistItem),
    customItems: clean.customItems.map(copyChecklistItem),
    hiddenTemplateItemIds: [...clean.hiddenTemplateItemIds],
    growth: {
      version: 1,
      profile: { ...growth.profile },
      progress: {
        completedTaskIds: [...growth.progress.completedTaskIds],
      },
    },
    hiddenTemplateItemStamps: Object.fromEntries(
      Object.entries(hiddenTemplateItemStamps).map(([id, stamp]) => [
        id,
        { ...stamp },
      ]),
    ),
    deletedCustomItems: { ...deletedCustomItems },
    growthUpdatedAt,
    hospital:
      clean.version === 6
        ? cloneHospitalProfile(clean.hospital)
        : createEmptyHospitalProfile(),
  };
}

export function projectExportDataForVersion(
  data: DadKitExportData,
  targetVersion: DadKitSyncDataVersion,
): DadKitExportData | DadKitExportDataV5 {
  const latest = upgradeExportDataToLatest(data);

  if (targetVersion === 6) {
    return latest;
  }

  const { hospital: _hospital, ...v5 } = latest;
  void _hospital;
  return { ...v5, version: 5 };
}

export function isValidDateString(value: unknown): value is string {
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

export function isHiddenTemplateItemStamps(
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

export function isDeletedCustomItemStamps(
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
    return (
      hasExactKeys(value, V3_EXPORT_KEYS) &&
      hasValidPortableChecklistData(value)
    );
  }

  if (value.version === 4) {
    return (
      hasExactKeys(value, V4_EXPORT_KEYS) &&
      hasValidPortableChecklistData(value) &&
      validateGrowthPortableData(value.growth)
    );
  }

  if (value.version === 5) {
    return (
      hasExactKeys(value, V5_EXPORT_KEYS) &&
      hasValidPortableChecklistData(value) &&
      validateGrowthPortableData(value.growth) &&
      isHiddenTemplateItemStamps(value.hiddenTemplateItemStamps) &&
      isDeletedCustomItemStamps(value.deletedCustomItems) &&
      typeof value.growthUpdatedAt === "number" &&
      Number.isFinite(value.growthUpdatedAt)
    );
  }

  return (
    value.version === 6 &&
    isPlainRecord(value) &&
    hasOnlyKeys(value, V6_EXPORT_KEYS) &&
    hasValidPortableChecklistData(value) &&
    validateGrowthPortableData(value.growth) &&
    isHiddenTemplateItemStamps(value.hiddenTemplateItemStamps) &&
    isDeletedCustomItemStamps(value.deletedCustomItems) &&
    typeof value.growthUpdatedAt === "number" &&
    Number.isFinite(value.growthUpdatedAt) &&
    isHospitalProfilePortableData(value.hospital)
  );
}
