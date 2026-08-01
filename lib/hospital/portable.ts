import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  HOSPITAL_FIELD_KEYS,
  type HospitalProfilePortableData,
  type HospitalProfileValues,
} from "@/lib/hospital/types";

export function cloneHospitalProfile(
  profile: HospitalProfilePortableData,
): HospitalProfilePortableData {
  return {
    version: 1,
    fields: Object.fromEntries(
      HOSPITAL_FIELD_KEYS.map((key) => [key, { ...profile.fields[key] }]),
    ) as HospitalProfilePortableData["fields"],
  };
}

export function hospitalValuesFromPortable(
  profile: HospitalProfilePortableData,
): HospitalProfileValues {
  return Object.fromEntries(
    HOSPITAL_FIELD_KEYS.map((key) => [key, profile.fields[key].value]),
  ) as HospitalProfileValues;
}

export function updateHospitalProfile(
  current: HospitalProfilePortableData,
  values: HospitalProfileValues,
  now: number,
) {
  let changed = false;
  const next = cloneHospitalProfile(current);

  for (const key of HOSPITAL_FIELD_KEYS) {
    if (current.fields[key].value !== values[key]) {
      next.fields[key] = { value: values[key], updatedAt: now };
      changed = true;
    }
  }

  return { changed, profile: next };
}

export function clearHospitalProfile(
  current: HospitalProfilePortableData,
  now: number,
) {
  const empty = createEmptyHospitalProfile();
  const values = hospitalValuesFromPortable(empty);
  return updateHospitalProfile(current, values, now);
}
