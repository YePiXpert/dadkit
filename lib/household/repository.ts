"use client";

import { createEmptyHousehold } from "@/lib/household/defaults";
import { cloneHousehold } from "@/lib/household/portable";
import type { HouseholdPortableData } from "@/lib/household/types";
import { isHouseholdPortableData } from "@/lib/household/validation";

export const HOUSEHOLD_STORAGE_KEY = "dadkit:v4:household";

export function loadHousehold(): HouseholdPortableData {
  if (typeof window === "undefined") return createEmptyHousehold();
  try {
    const raw = window.localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : undefined;
    return isHouseholdPortableData(parsed)
      ? cloneHousehold(parsed)
      : createEmptyHousehold();
  } catch {
    return createEmptyHousehold();
  }
}

export function saveHousehold(household: HouseholdPortableData) {
  if (typeof window === "undefined") return;
  if (!isHouseholdPortableData(household)) {
    throw new Error("家庭档案数据无效，未保存。");
  }
  const serialized = JSON.stringify(cloneHousehold(household));
  if (window.localStorage.getItem(HOUSEHOLD_STORAGE_KEY) !== serialized) {
    window.localStorage.setItem(HOUSEHOLD_STORAGE_KEY, serialized);
  }
}
