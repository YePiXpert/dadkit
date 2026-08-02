import { isPlanningDate } from "@/lib/planning/date";
import { parsePlanningMoney } from "@/lib/planning/money";
import {
  PLANNING_ASSIGNEES,
  PLANNING_FIELD_KEYS,
  PLANNING_ITEM_ID_LIMIT,
  PLANNING_ITEM_LIMIT,
  PLANNING_MAX_PRICE_FEN,
  PLANNING_TEXT_LIMIT,
  type ItemPlanningDraft,
  type ItemPlanningPortableData,
  type ItemPlanningRecord,
  type ItemPlanningValues,
  type PlanningAssignee,
  type PlanningValidationErrors,
} from "@/lib/planning/types";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function normalizePlanningText(value: string) {
  return value.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

export function isSafePlanningItemId(value: string) {
  return (
    value.length > 0 &&
    value.length <= PLANNING_ITEM_ID_LIMIT &&
    !DANGEROUS_KEYS.has(value)
  );
}

export function validateItemPlanningDraft(input: ItemPlanningDraft): {
  ok: boolean;
  errors: PlanningValidationErrors;
  values?: ItemPlanningValues;
} {
  const errors: PlanningValidationErrors = {};
  const estimated = parsePlanningMoney(input.estimatedPrice);
  const actual = parsePlanningMoney(input.actualPrice);
  const purchaseChannel = normalizePlanningText(input.purchaseChannel);
  const storageLocation = normalizePlanningText(input.storageLocation);
  const dueDate = input.dueDate.trim();

  if (!PLANNING_ASSIGNEES.includes(input.assignee)) {
    errors.assignee = "请选择有效的负责人。";
  }
  if (!isPlanningDate(dueDate)) {
    errors.dueDate = "请输入真实有效的日历日期。";
  }
  if (!estimated.ok) errors.estimatedPrice = estimated.message;
  if (!actual.ok) errors.actualPrice = actual.message;
  if (purchaseChannel.length > PLANNING_TEXT_LIMIT) {
    errors.purchaseChannel = `购买渠道不能超过 ${PLANNING_TEXT_LIMIT} 个字符。`;
  }
  if (storageLocation.length > PLANNING_TEXT_LIMIT) {
    errors.storageLocation = `存放位置不能超过 ${PLANNING_TEXT_LIMIT} 个字符。`;
  }

  if (Object.keys(errors).length > 0 || !estimated.ok || !actual.ok) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors,
    values: {
      assignee: input.assignee,
      dueDate,
      estimatedPriceFen: estimated.value,
      actualPriceFen: actual.value,
      purchaseChannel,
      storageLocation,
    },
  };
}

export function isItemPlanningPortableData(
  value: unknown,
): value is ItemPlanningPortableData {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["version", "clearedAt", "items"])) {
    return false;
  }
  if (value.version !== 1 || !isTimestamp(value.clearedAt) || !isPlainRecord(value.items)) {
    return false;
  }

  const entries = Object.entries(value.items);
  return (
    entries.length <= PLANNING_ITEM_LIMIT &&
    entries.every(
      ([itemId, record]) =>
        isSafePlanningItemId(itemId) && isItemPlanningRecord(record),
    )
  );
}

export function isItemPlanningRecord(value: unknown): value is ItemPlanningRecord {
  if (!isPlainRecord(value) || !hasExactKeys(value, PLANNING_FIELD_KEYS)) {
    return false;
  }

  return (
    isStampedField(value.assignee, (fieldValue) =>
      PLANNING_ASSIGNEES.includes(fieldValue as PlanningAssignee),
    ) &&
    isStampedField(
      value.dueDate,
      (fieldValue) => typeof fieldValue === "string" && isPlanningDate(fieldValue),
    ) &&
    isStampedField(value.estimatedPriceFen, isPlanningPrice) &&
    isStampedField(value.actualPriceFen, isPlanningPrice) &&
    isStampedField(
      value.purchaseChannel,
      (fieldValue) => isNormalizedPlanningText(fieldValue),
    ) &&
    isStampedField(
      value.storageLocation,
      (fieldValue) => isNormalizedPlanningText(fieldValue),
    )
  );
}

function isPlanningPrice(value: unknown) {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0 &&
      value <= PLANNING_MAX_PRICE_FEN)
  );
}

function isNormalizedPlanningText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= PLANNING_TEXT_LIMIT &&
    value === normalizePlanningText(value)
  );
}

function isStampedField(
  value: unknown,
  validateValue: (fieldValue: unknown) => boolean,
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}
