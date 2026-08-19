export const LEGACY_PLANNING_ASSIGNEES = [
  "unassigned",
  "dad",
  "mom",
  "shared",
  "family",
] as const;

type LegacyPlanningAssignee = (typeof LEGACY_PLANNING_ASSIGNEES)[number];

type StampedValue<T> = {
  value: T;
  updatedAt: number;
};

export type LegacyItemPlanningRecordV1 = {
  assignee: StampedValue<LegacyPlanningAssignee>;
  dueDate: StampedValue<string>;
  estimatedPriceFen: StampedValue<number | null>;
  actualPriceFen: StampedValue<number | null>;
  purchaseChannel: StampedValue<string>;
  storageLocation: StampedValue<string>;
};

export type LegacyItemPlanningDataV1 = {
  version: 1;
  clearedAt: number;
  items: Record<string, LegacyItemPlanningRecordV1>;
};

export type LegacyItemPlanningRecordV2 = {
  assigneeIds: StampedValue<string[]>;
  dueDate: StampedValue<string>;
  estimatedPriceFen: StampedValue<number | null>;
  actualPriceFen: StampedValue<number | null>;
  purchaseChannel: StampedValue<string>;
  storageLocation: StampedValue<string>;
};

export type LegacyItemPlanningDataV2 = {
  version: 2;
  clearedAt: number;
  items: Record<string, LegacyItemPlanningRecordV2>;
};

const V1_FIELD_KEYS = [
  "assignee",
  "dueDate",
  "estimatedPriceFen",
  "actualPriceFen",
  "purchaseChannel",
  "storageLocation",
] as const;

const V2_FIELD_KEYS = [
  "assigneeIds",
  "dueDate",
  "estimatedPriceFen",
  "actualPriceFen",
  "purchaseChannel",
  "storageLocation",
] as const;

const TEXT_LIMIT = 80;
const ITEM_ID_LIMIT = 160;
const ITEM_LIMIT = 2_000;
const ASSIGNEE_LIMIT = 12;
const MAX_PRICE_FEN = 99_999_999;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function createEmptyLegacyPlanningV1(): LegacyItemPlanningDataV1 {
  return { version: 1, clearedAt: 0, items: {} };
}

export function createEmptyLegacyPlanningV2(): LegacyItemPlanningDataV2 {
  return { version: 2, clearedAt: 0, items: {} };
}

export function createEmptyLegacyPlanningRecordV1(
  updatedAt = 0,
): LegacyItemPlanningRecordV1 {
  return {
    assignee: { value: "unassigned", updatedAt },
    dueDate: { value: "", updatedAt },
    estimatedPriceFen: { value: null, updatedAt },
    actualPriceFen: { value: null, updatedAt },
    purchaseChannel: { value: "", updatedAt },
    storageLocation: { value: "", updatedAt },
  };
}

export function cloneLegacyPlanningV1(
  planning: LegacyItemPlanningDataV1,
): LegacyItemPlanningDataV1 {
  return {
    version: 1,
    clearedAt: planning.clearedAt,
    items: Object.fromEntries(
      Object.entries(planning.items)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => [
          id,
          {
            assignee: { ...record.assignee },
            dueDate: { ...record.dueDate },
            estimatedPriceFen: { ...record.estimatedPriceFen },
            actualPriceFen: { ...record.actualPriceFen },
            purchaseChannel: { ...record.purchaseChannel },
            storageLocation: { ...record.storageLocation },
          },
        ]),
    ),
  };
}

export function cloneLegacyPlanningV2(
  planning: LegacyItemPlanningDataV2,
): LegacyItemPlanningDataV2 {
  return {
    version: 2,
    clearedAt: planning.clearedAt,
    items: Object.fromEntries(
      Object.entries(planning.items)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => [
          id,
          {
            assigneeIds: {
              ...record.assigneeIds,
              value: [...record.assigneeIds.value],
            },
            dueDate: { ...record.dueDate },
            estimatedPriceFen: { ...record.estimatedPriceFen },
            actualPriceFen: { ...record.actualPriceFen },
            purchaseChannel: { ...record.purchaseChannel },
            storageLocation: { ...record.storageLocation },
          },
        ]),
    ),
  };
}

export function isLegacyPlanningV1(
  value: unknown,
): value is LegacyItemPlanningDataV1 {
  return isPlanningData(value, 1, isLegacyPlanningRecordV1);
}

export function isLegacyPlanningV2(
  value: unknown,
): value is LegacyItemPlanningDataV2 {
  return isPlanningData(value, 2, isLegacyPlanningRecordV2);
}

function isPlanningData(
  value: unknown,
  version: 1 | 2,
  validateRecord: (candidate: unknown) => boolean,
) {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, ["version", "clearedAt", "items"]) ||
    value.version !== version ||
    !isTimestamp(value.clearedAt) ||
    !isPlainRecord(value.items)
  ) {
    return false;
  }

  const entries = Object.entries(value.items);
  return (
    entries.length <= ITEM_LIMIT &&
    entries.every(
      ([id, record]) =>
        id.length > 0 &&
        id.length <= ITEM_ID_LIMIT &&
        !DANGEROUS_KEYS.has(id) &&
        validateRecord(record),
    )
  );
}

function isLegacyPlanningRecordV1(value: unknown) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, V1_FIELD_KEYS) &&
    isStampedValue(value.assignee, (candidate) =>
      LEGACY_PLANNING_ASSIGNEES.includes(
        candidate as LegacyPlanningAssignee,
      ),
    ) &&
    hasValidSharedFields(value)
  );
}

function isLegacyPlanningRecordV2(value: unknown) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, V2_FIELD_KEYS) &&
    isStampedValue(value.assigneeIds, isValidAssigneeIds) &&
    hasValidSharedFields(value)
  );
}

function hasValidSharedFields(value: Record<string, unknown>) {
  return (
    isStampedValue(value.dueDate, isPlanningDate) &&
    isStampedValue(value.estimatedPriceFen, isPlanningPrice) &&
    isStampedValue(value.actualPriceFen, isPlanningPrice) &&
    isStampedValue(value.purchaseChannel, isNormalizedText) &&
    isStampedValue(value.storageLocation, isNormalizedText)
  );
}

function isValidAssigneeIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= ASSIGNEE_LIMIT &&
    value.every(
      (id) =>
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= 100 &&
        !DANGEROUS_KEYS.has(id),
    ) &&
    new Set(value).size === value.length &&
    value.every(
      (id, index) => index === 0 || value[index - 1].localeCompare(id) < 0,
    )
  );
}

function isPlanningDate(value: unknown) {
  if (value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return (
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function daysInMonth(year: number, month: number) {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isPlanningPrice(value: unknown) {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= MAX_PRICE_FEN)
  );
}

function isNormalizedText(value: unknown) {
  return (
    typeof value === "string" &&
    value.length <= TEXT_LIMIT &&
    value === value.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim()
  );
}

function isStampedValue(
  value: unknown,
  validateValue: (candidate: unknown) => boolean,
) {
  return (
    isPlainRecord(value) &&
    hasExactKeys(value, ["value", "updatedAt"]) &&
    validateValue(value.value) &&
    isTimestamp(value.updatedAt)
  );
}

function isTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
}
