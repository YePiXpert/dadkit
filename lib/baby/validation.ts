import { isLocalCalendarDate, isLocalClockTime, localDateString } from "@/lib/baby/date";
import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { isIsoUtcTimestamp } from "@/lib/baby/time";
import {
  BABY_EVENT_ID_LIMIT,
  BABY_EVENT_LIMIT,
  BABY_EVENT_NOTE_LIMIT,
  BABY_MILK_AMOUNT_MAX_ML,
  BABY_NICKNAME_LIMIT,
  BABY_PROFILE_FIELD_KEYS,
  BREASTFEEDING_SEGMENT_LIMIT,
  type BabyCarePortableData,
  type BabyPortableData,
  type BabyProfileDraft,
  type BabyProfilePortableData,
  type BabyProfileValidationErrors,
  type BabyProfileValues,
  type CareEvent,
} from "@/lib/baby/types";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SAFE_EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function normalizeBabyText(value: string, multiline = false) {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .trim();
  return multiline ? normalized.replace(/\n{3,}/g, "\n\n") : normalized.replace(/\s+/g, " ");
}

export function validateBabyProfileDraft(
  draft: BabyProfileDraft,
  options: { requireBirthDate?: boolean; today?: string } = {},
) {
  const values: BabyProfileValues = {
    nickname: normalizeBabyText(draft.nickname),
    birthDate: draft.birthDate.trim(),
    birthTime: draft.birthTime.trim(),
    sex: draft.sex,
  };
  const errors: BabyProfileValidationErrors = {};
  const requireBirthDate = options.requireBirthDate ?? true;
  const today = options.today ?? localDateString();

  if (values.nickname.length > BABY_NICKNAME_LIMIT) {
    errors.nickname = `宝宝昵称不能超过 ${BABY_NICKNAME_LIMIT} 个字符。`;
  }
  if (requireBirthDate && !values.birthDate) {
    errors.birthDate = "请填写宝宝出生日期。";
  } else if (values.birthDate && !isLocalCalendarDate(values.birthDate)) {
    errors.birthDate = "出生日期无效。";
  } else if (values.birthDate && values.birthDate > today) {
    errors.birthDate = "出生日期不能晚于今天。";
  }
  if (values.birthTime && !isLocalClockTime(values.birthTime)) {
    errors.birthTime = "出生时间无效。";
  }
  if (!(["unspecified", "boy", "girl"] as const).includes(values.sex)) {
    errors.sex = "性别选项无效。";
  }

  return { ok: Object.keys(errors).length === 0, errors, values };
}

export function isBabyProfilePortableData(value: unknown): value is BabyProfilePortableData {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["version", "clearedAt", "fields"])) return false;
  if (value.version !== 1 || !isSafeTimestamp(value.clearedAt) || !isPlainRecord(value.fields)) return false;
  const fields = value.fields;
  if (!hasOnlyKeys(fields, BABY_PROFILE_FIELD_KEYS)) return false;
  const defaults = createEmptyBabyProfile();

  return BABY_PROFILE_FIELD_KEYS.every((key) => {
    const field = fields[key];
    if (!isPlainRecord(field) || !hasOnlyKeys(field, ["value", "updatedAt"]) || !isSafeTimestamp(field.updatedAt)) {
      return false;
    }
    if (key === "sex") return (["unspecified", "boy", "girl"] as const).includes(field.value as never);
    if (typeof field.value !== "string") return false;
    if (key === "nickname") return field.value === normalizeBabyText(field.value) && field.value.length <= BABY_NICKNAME_LIMIT;
    if (key === "birthDate") return field.value === defaults.fields.birthDate.value || isLocalCalendarDate(field.value);
    return field.value === "" || isLocalClockTime(field.value);
  });
}

export function isSafeCareEventId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= BABY_EVENT_ID_LIMIT &&
    SAFE_EVENT_ID.test(value) &&
    !DANGEROUS_KEYS.has(value.toLowerCase())
  );
}

export function isCareEvent(value: unknown): value is CareEvent {
  if (!isPlainRecord(value) || !isCareEventBase(value)) return false;

  if (value.type === "breastfeeding") {
    if (!hasOnlyKeys(value, [...BASE_KEYS, "startAt", "endAt", "segments"])) return false;
    if (!isIsoUtcTimestamp(value.startAt) || !isNullableIso(value.endAt) || !Array.isArray(value.segments)) return false;
    if (value.segments.length < 1 || value.segments.length > BREASTFEEDING_SEGMENT_LIMIT) return false;
    let previousEnd = -Infinity;
    for (let index = 0; index < value.segments.length; index += 1) {
      const segment = value.segments[index];
      if (!isPlainRecord(segment) || !hasOnlyKeys(segment, ["side", "startAt", "endAt"])) return false;
      if (segment.side !== "left" && segment.side !== "right") return false;
      if (!isIsoUtcTimestamp(segment.startAt) || !isNullableIso(segment.endAt)) return false;
      const start = Date.parse(segment.startAt);
      const end = segment.endAt === null ? null : Date.parse(segment.endAt);
      if (start < previousEnd || (end !== null && end < start)) return false;
      if (segment.endAt === null && index !== value.segments.length - 1) return false;
      previousEnd = end ?? start;
    }
    const first = value.segments[0]!;
    const last = value.segments[value.segments.length - 1]!;
    return value.startAt === first.startAt && value.endAt === last.endAt;
  }

  if (value.type === "bottle") {
    return (
      hasOnlyKeys(value, [...BASE_KEYS, "occurredAt", "milkType", "amountMl"]) &&
      isIsoUtcTimestamp(value.occurredAt) &&
      (value.milkType === "breastmilk" || value.milkType === "formula") &&
      isIntegerInRange(value.amountMl, 1, BABY_MILK_AMOUNT_MAX_ML)
    );
  }

  if (value.type === "pumping") {
    return (
      hasOnlyKeys(value, [...BASE_KEYS, "startAt", "endAt", "side", "amountMl"]) &&
      isTimedEvent(value.startAt, value.endAt) &&
      (value.side === "left" || value.side === "right" || value.side === "both") &&
      (value.amountMl === null || isIntegerInRange(value.amountMl, 0, BABY_MILK_AMOUNT_MAX_ML))
    );
  }

  if (value.type === "diaper") {
    return (
      hasOnlyKeys(value, [...BASE_KEYS, "occurredAt", "kind"]) &&
      isIsoUtcTimestamp(value.occurredAt) &&
      (value.kind === "wet" || value.kind === "dirty" || value.kind === "both")
    );
  }

  return (
    value.type === "sleep" &&
    hasOnlyKeys(value, [...BASE_KEYS, "startAt", "endAt"]) &&
    isTimedEvent(value.startAt, value.endAt)
  );
}

export function isBabyCarePortableData(value: unknown): value is BabyCarePortableData {
  if (!isPlainRecord(value) || !hasOnlyKeys(value, ["version", "clearedAt", "events"])) return false;
  if (value.version !== 1 || !isSafeTimestamp(value.clearedAt) || !Array.isArray(value.events)) return false;
  if (value.events.length > BABY_EVENT_LIMIT || !value.events.every(isCareEvent)) return false;
  const ids = value.events.map((event) => (event as CareEvent).id);
  return new Set(ids).size === ids.length;
}

export function isBabyPortableData(value: unknown): value is BabyPortableData {
  return (
    isPlainRecord(value) &&
    hasOnlyKeys(value, ["version", "profile", "care"]) &&
    value.version === 1 &&
    isBabyProfilePortableData(value.profile) &&
    isBabyCarePortableData(value.care)
  );
}

export function assertBabyPortableData(value: unknown): BabyPortableData {
  if (!isBabyPortableData(value)) throw new Error("宝宝资料或照护记录格式无效。");
  return value;
}

const BASE_KEYS = ["id", "type", "note", "createdAt", "updatedAt", "deletedAt"] as const;

function isCareEventBase(value: Record<string, unknown>) {
  return (
    isSafeCareEventId(value.id) &&
    (["breastfeeding", "bottle", "pumping", "diaper", "sleep"] as const).includes(value.type as never) &&
    typeof value.note === "string" &&
    value.note.length <= BABY_EVENT_NOTE_LIMIT &&
    value.note === normalizeBabyText(value.note, true) &&
    isSafeTimestamp(value.createdAt) &&
    isSafeTimestamp(value.updatedAt) &&
    value.updatedAt >= value.createdAt &&
    (value.deletedAt === null || (isSafeTimestamp(value.deletedAt) && value.deletedAt === value.updatedAt))
  );
}

function isTimedEvent(startAt: unknown, endAt: unknown) {
  return (
    isIsoUtcTimestamp(startAt) &&
    isNullableIso(endAt) &&
    (endAt === null || Date.parse(endAt) >= Date.parse(startAt))
  );
}

function isNullableIso(value: unknown): value is string | null {
  return value === null || isIsoUtcTimestamp(value);
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
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
