import { cloneHospitalProfile } from "@/lib/hospital/portable";
import {
  HOSPITAL_FIELD_KEYS,
  type HospitalProfilePortableData,
} from "@/lib/hospital/types";

export function mergeHospitalProfiles(
  local: HospitalProfilePortableData,
  remote: HospitalProfilePortableData,
): HospitalProfilePortableData {
  const merged = cloneHospitalProfile(local);

  for (const key of HOSPITAL_FIELD_KEYS) {
    if (remote.fields[key].updatedAt > local.fields[key].updatedAt) {
      merged.fields[key] = { ...remote.fields[key] };
    }
  }

  return merged;
}
