import {
  HOUSEHOLD_ACTIVE_MEMBER_LIMIT,
  HOUSEHOLD_MEMBER_ID_LIMIT,
  HOUSEHOLD_MEMBER_NAME_LIMIT,
  HOUSEHOLD_MEMBER_RECORD_LIMIT,
  HOUSEHOLD_NAME_LIMIT,
  HOUSEHOLD_RELATIONSHIP_LIMIT,
  type HouseholdMemberDraft,
  type HouseholdMemberPortable,
  type HouseholdPortableData,
  type HouseholdValidationErrors,
} from "@/lib/household/types";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
const SAFE_MEMBER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function normalizeHouseholdText(value: string) {
  return value.replace(CONTROL_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

export function isSafeHouseholdMemberId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= HOUSEHOLD_MEMBER_ID_LIMIT &&
    SAFE_MEMBER_ID.test(value) &&
    !DANGEROUS_KEYS.has(value)
  );
}

export function validateHouseholdName(input: string) {
  const value = normalizeHouseholdText(input);
  return value.length <= HOUSEHOLD_NAME_LIMIT
    ? { ok: true as const, value }
    : {
        ok: false as const,
        message: `家庭名称不能超过 ${HOUSEHOLD_NAME_LIMIT} 个字符。`,
      };
}

export function validateHouseholdMemberDraft(input: HouseholdMemberDraft): {
  ok: boolean;
  errors: HouseholdValidationErrors;
  values?: HouseholdMemberDraft;
} {
  const displayName = normalizeHouseholdText(input.displayName);
  const relationshipLabel = normalizeHouseholdText(input.relationshipLabel);
  const errors: HouseholdValidationErrors = {};

  if (!displayName) errors.displayName = "请输入成员名称。";
  else if (displayName.length > HOUSEHOLD_MEMBER_NAME_LIMIT) {
    errors.displayName = `成员名称不能超过 ${HOUSEHOLD_MEMBER_NAME_LIMIT} 个字符。`;
  }
  if (relationshipLabel.length > HOUSEHOLD_RELATIONSHIP_LIMIT) {
    errors.relationshipLabel = `关系说明不能超过 ${HOUSEHOLD_RELATIONSHIP_LIMIT} 个字符。`;
  }

  return Object.keys(errors).length > 0
    ? { ok: false, errors }
    : { ok: true, errors, values: { displayName, relationshipLabel } };
}

export function isHouseholdPortableData(
  value: unknown,
): value is HouseholdPortableData {
  if (
    !isPlainRecord(value) ||
    !hasOnlyKeys(value, ["version", "clearedAt", "householdName", "members"]) ||
    value.version !== 1 ||
    !isTimestamp(value.clearedAt) ||
    !isStamped(value.householdName, (candidate) =>
      isNormalizedText(candidate, HOUSEHOLD_NAME_LIMIT, true),
    ) ||
    !isPlainRecord(value.members)
  ) {
    return false;
  }

  const entries = Object.entries(value.members);
  const clearedAt = value.clearedAt as number;
  if (entries.length > HOUSEHOLD_MEMBER_RECORD_LIMIT) return false;
  if (
    !entries.every(
      ([id, member]) => isSafeHouseholdMemberId(id) && isHouseholdMember(member, id),
    )
  ) {
    return false;
  }

  const activeCount = entries.filter(([, candidate]) => {
    const member = candidate as HouseholdMemberPortable;
    return (
      member.displayName.updatedAt > clearedAt &&
      member.deleted.updatedAt > clearedAt &&
      !member.deleted.value
    );
  }).length;
  return activeCount <= HOUSEHOLD_ACTIVE_MEMBER_LIMIT;
}

function isHouseholdMember(value: unknown, id: string) {
  return (
    isPlainRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "createdAt",
      "displayName",
      "relationshipLabel",
      "deleted",
    ]) &&
    value.id === id &&
    isTimestamp(value.createdAt) &&
    isStamped(value.displayName, (candidate) =>
      isNormalizedText(candidate, HOUSEHOLD_MEMBER_NAME_LIMIT, false),
    ) &&
    isStamped(value.relationshipLabel, (candidate) =>
      isNormalizedText(candidate, HOUSEHOLD_RELATIONSHIP_LIMIT, true),
    ) &&
    isStamped(value.deleted, (candidate) => typeof candidate === "boolean")
  );
}

function isNormalizedText(value: unknown, limit: number, allowEmpty: boolean) {
  return (
    typeof value === "string" &&
    (allowEmpty || value.length > 0) &&
    value.length <= limit &&
    value === normalizeHouseholdText(value)
  );
}

function isStamped(
  value: unknown,
  validateValue: (candidate: unknown) => boolean,
) {
  return (
    isPlainRecord(value) &&
    hasOnlyKeys(value, ["value", "updatedAt"]) &&
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

function hasOnlyKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}
