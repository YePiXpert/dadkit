import { createEmptyHospitalValues } from "@/lib/hospital/defaults";
import {
  HOSPITAL_FIELD_KEYS,
  HOSPITAL_FIELD_LABELS,
  HOSPITAL_FIELD_LIMITS,
  HOSPITAL_PHONE_FIELDS,
  type HospitalFieldKey,
  type HospitalProfilePortableData,
  type HospitalProfileValues,
  type HospitalValidationErrors,
} from "@/lib/hospital/types";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const PHONE_CHARACTERS = /^[0-9+()\-\s]*$/;

export type HospitalDraftValidation = {
  errors: HospitalValidationErrors;
  ok: boolean;
  values: HospitalProfileValues;
};

export function normalizeHospitalText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeHospitalValues(
  input: Partial<Record<HospitalFieldKey, string>>,
): HospitalProfileValues {
  const values = createEmptyHospitalValues();

  for (const key of HOSPITAL_FIELD_KEYS) {
    values[key] = normalizeHospitalText(input[key] ?? "");
  }

  return values;
}

export function validateHospitalDraft(
  input: Partial<Record<HospitalFieldKey, string>>,
): HospitalDraftValidation {
  const values = normalizeHospitalValues(input);
  const errors: HospitalValidationErrors = {};

  if (!values.hospitalName) {
    errors.hospitalName = "请填写医院名称。";
  }

  for (const key of HOSPITAL_FIELD_KEYS) {
    if (values[key].length > HOSPITAL_FIELD_LIMITS[key]) {
      errors[key] = `${HOSPITAL_FIELD_LABELS[key]}不能超过 ${HOSPITAL_FIELD_LIMITS[key]} 个字符。`;
    }
  }

  for (const key of HOSPITAL_PHONE_FIELDS) {
    if (values[key] && !isSafeHospitalPhone(values[key])) {
      errors[key] = `${HOSPITAL_FIELD_LABELS[key]}只能包含数字、空格、+、- 和圆括号。`;
    }
  }

  return { values, errors, ok: Object.keys(errors).length === 0 };
}

export function isSafeHospitalPhone(value: string) {
  if (!PHONE_CHARACTERS.test(value)) {
    return false;
  }

  const compact = value.replace(/[\s()\-]/g, "");
  return /^\+?\d+$/.test(compact);
}

export function hospitalTelHref(value: string) {
  if (!isSafeHospitalPhone(value)) {
    return undefined;
  }

  return `tel:${value.replace(/[\s()\-]/g, "")}`;
}

export function isHospitalProfilePortableData(
  value: unknown,
): value is HospitalProfilePortableData {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["version", "fields"])) {
    return false;
  }

  const fields = value.fields;

  if (value.version !== 1 || !isPlainRecord(fields)) {
    return false;
  }

  if (!hasExactKeys(fields, HOSPITAL_FIELD_KEYS)) {
    return false;
  }

  return HOSPITAL_FIELD_KEYS.every((key) => {
    const field = fields[key];

    return (
      isPlainRecord(field) &&
      hasExactKeys(field, ["value", "updatedAt"]) &&
      typeof field.value === "string" &&
      field.value.length <= HOSPITAL_FIELD_LIMITS[key] &&
      field.value === normalizeHospitalText(field.value) &&
      typeof field.updatedAt === "number" &&
      Number.isFinite(field.updatedAt) &&
      field.updatedAt >= 0
    );
  });
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
