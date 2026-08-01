"use client";

import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import { cloneHospitalProfile } from "@/lib/hospital/portable";
import type { HospitalProfilePortableData } from "@/lib/hospital/types";
import { isHospitalProfilePortableData } from "@/lib/hospital/validation";

export const HOSPITAL_STORAGE_KEY = "dadkit:v3:hospital-profile";

export function loadHospitalProfile(): HospitalProfilePortableData {
  if (typeof window === "undefined") {
    return createEmptyHospitalProfile();
  }

  try {
    const raw = window.localStorage.getItem(HOSPITAL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;

    return isHospitalProfilePortableData(parsed)
      ? cloneHospitalProfile(parsed)
      : createEmptyHospitalProfile();
  } catch {
    return createEmptyHospitalProfile();
  }
}

export function saveHospitalProfile(profile: HospitalProfilePortableData) {
  if (typeof window === "undefined") {
    return;
  }

  if (!isHospitalProfilePortableData(profile)) {
    throw new Error("医院档案数据无效，未保存。");
  }

  const serialized = JSON.stringify(profile);

  if (window.localStorage.getItem(HOSPITAL_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(HOSPITAL_STORAGE_KEY, serialized);
  }
}
