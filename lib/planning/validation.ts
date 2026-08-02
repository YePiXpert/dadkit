import { isPlanningDate } from "@/lib/planning/date";
import { parsePlanningMoney } from "@/lib/planning/money";
import {
  LEGACY_PLANNING_ASSIGNEES,
  LEGACY_PLANNING_FIELD_KEYS,
  PLANNING_ASSIGNEE_LIMIT,
  PLANNING_FIELD_KEYS,
  PLANNING_ITEM_ID_LIMIT,
  PLANNING_ITEM_LIMIT,
  PLANNING_MAX_PRICE_FEN,
  PLANNING_TEXT_LIMIT,
  type ItemPlanningDraft,
  type ItemPlanningPortableData,
  type ItemPlanningPortableDataV1,
  type ItemPlanningRecord,
  type ItemPlanningRecordV1,
  type ItemPlanningValues,
  type PlanningAssignee,
  type PlanningValidationErrors,
} from "@/lib/planning/types";
import { isSafeHouseholdMemberId } from "@/lib/household/validation";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function normalizePlanningText(value: string) {
  return value.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

export function normalizeAssigneeIds(value: readonly string[]) {
  return [...new Set(value)].sort((left, right) => left.localeCompare(right));
}

export function isSafePlanningItemId(value: string) {
  return value.length > 0 && value.length <= PLANNING_ITEM_ID_LIMIT && !DANGEROUS_KEYS.has(value);
}

export function isValidAssigneeIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= PLANNING_ASSIGNEE_LIMIT &&
    value.every(isSafeHouseholdMemberId) &&
    new Set(value).size === value.length &&
    value.every((id, index) => index === 0 || value[index - 1].localeCompare(id) < 0)
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
  const assigneeIds = normalizeAssigneeIds(input.assigneeIds);

  if (!isValidAssigneeIds(assigneeIds)) errors.assigneeIds = "请选择有效的家庭成员。";
  if (!isPlanningDate(dueDate)) errors.dueDate = "请输入真实有效的日历日期。";
  if (!estimated.ok) errors.estimatedPrice = estimated.message;
  if (!actual.ok) errors.actualPrice = actual.message;
  if (purchaseChannel.length > PLANNING_TEXT_LIMIT) errors.purchaseChannel = `购买渠道不能超过 ${PLANNING_TEXT_LIMIT} 个字符。`;
  if (storageLocation.length > PLANNING_TEXT_LIMIT) errors.storageLocation = `存放位置不能超过 ${PLANNING_TEXT_LIMIT} 个字符。`;
  if (Object.keys(errors).length > 0 || !estimated.ok || !actual.ok) return { ok: false, errors };

  return {
    ok: true,
    errors,
    values: {
      assigneeIds,
      dueDate,
      estimatedPriceFen: estimated.value,
      actualPriceFen: actual.value,
      purchaseChannel,
      storageLocation,
    },
  };
}

export function isItemPlanningPortableData(value: unknown): value is ItemPlanningPortableData {
  return isPlanningPortable(value, 2, PLANNING_FIELD_KEYS, isItemPlanningRecord);
}

export function isItemPlanningPortableDataV1(value: unknown): value is ItemPlanningPortableDataV1 {
  return isPlanningPortable(value, 1, LEGACY_PLANNING_FIELD_KEYS, isItemPlanningRecordV1);
}

function isPlanningPortable(
  value: unknown,
  version: 1 | 2,
  _keys: readonly string[],
  validateRecord: (candidate: unknown) => boolean,
) {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["version", "clearedAt", "items"])) return false;
  if (value.version !== version || !isTimestamp(value.clearedAt) || !isPlainRecord(value.items)) return false;
  const entries = Object.entries(value.items);
  return entries.length <= PLANNING_ITEM_LIMIT && entries.every(([id, record]) => isSafePlanningItemId(id) && validateRecord(record));
}

export function isItemPlanningRecord(value: unknown): value is ItemPlanningRecord {
  if (!isPlainRecord(value) || !hasExactKeys(value, PLANNING_FIELD_KEYS)) return false;
  return (
    isStampedField(value.assigneeIds, isValidAssigneeIds) &&
    validateSharedPlanningFields(value)
  );
}

export function isItemPlanningRecordV1(value: unknown): value is ItemPlanningRecordV1 {
  if (!isPlainRecord(value) || !hasExactKeys(value, LEGACY_PLANNING_FIELD_KEYS)) return false;
  return (
    isStampedField(value.assignee, (candidate) => LEGACY_PLANNING_ASSIGNEES.includes(candidate as PlanningAssignee)) &&
    validateSharedPlanningFields(value)
  );
}

function validateSharedPlanningFields(value: Record<string, unknown>) {
  return (
    isStampedField(value.dueDate, (candidate) => typeof candidate === "string" && isPlanningDate(candidate)) &&
    isStampedField(value.estimatedPriceFen, isPlanningPrice) &&
    isStampedField(value.actualPriceFen, isPlanningPrice) &&
    isStampedField(value.purchaseChannel, (candidate) => isNormalizedPlanningText(candidate)) &&
    isStampedField(value.storageLocation, (candidate) => isNormalizedPlanningText(candidate))
  );
}

function isPlanningPrice(value: unknown) {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= PLANNING_MAX_PRICE_FEN);
}

function isNormalizedPlanningText(value: unknown): value is string {
  return typeof value === "string" && value.length <= PLANNING_TEXT_LIMIT && value === normalizePlanningText(value);
}

function isStampedField(value: unknown, validateValue: (candidate: unknown) => boolean) {
  return isPlainRecord(value) && hasExactKeys(value, ["value", "updatedAt"]) && validateValue(value.value) && isTimestamp(value.updatedAt);
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
