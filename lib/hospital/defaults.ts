import {
  HOSPITAL_FIELD_KEYS,
  type HospitalProfilePortableData,
  type HospitalProfileValues,
} from "@/lib/hospital/types";

export function createEmptyHospitalValues(): HospitalProfileValues {
  return Object.fromEntries(
    HOSPITAL_FIELD_KEYS.map((key) => [key, ""]),
  ) as HospitalProfileValues;
}

export function createEmptyHospitalProfile(): HospitalProfilePortableData {
  return {
    version: 1,
    fields: Object.fromEntries(
      HOSPITAL_FIELD_KEYS.map((key) => [
        key,
        { value: "", updatedAt: 0 },
      ]),
    ) as HospitalProfilePortableData["fields"],
  };
}
