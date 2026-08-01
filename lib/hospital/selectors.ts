import type { HospitalProfilePortableData } from "@/lib/hospital/types";

export function isHospitalProfileConfigured(
  profile: HospitalProfilePortableData,
) {
  return profile.fields.hospitalName.value.trim().length > 0;
}

export function getHospitalPrimaryPhone(profile: HospitalProfilePortableData) {
  return (
    profile.fields.maternityPhone.value ||
    profile.fields.emergencyPhone.value
  );
}

export function getHospitalDepartureSummary(
  profile: HospitalProfilePortableData,
) {
  const value =
    profile.fields.laborEntranceNote.value || profile.fields.parkingNote.value;

  return value.split(/\n\s*\n|\n/, 1)[0]?.trim() ?? "";
}
