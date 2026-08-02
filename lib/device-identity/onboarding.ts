"use client";

import { getBabyRepository } from "@/lib/baby/repository";
import { hasBabyMode } from "@/lib/baby/portable";
import { loadHospitalProfile } from "@/lib/hospital/repository";
import { isHospitalProfileConfigured } from "@/lib/hospital/selectors";
import { loadItemPlanning } from "@/lib/planning/repository";
import { hasAnyEffectiveItemPlanning } from "@/lib/planning/selectors";

export async function hasExistingDadKitData() {
  if (typeof window === "undefined") return true;
  try {
    const checklist = readArray("dadkit:v3:checklist");
    const customItems = readArray("dadkit:v3:custom-items");
    const hidden = readArray("dadkit:v3:hidden-template-items");
    const growth = readRecord("dadkit-growth-profile-v1");
    const localExisting =
      checklist.some((item) => typeof item === "object" && item !== null && ((item as { status?: unknown }).status !== "todo" || Number((item as { updatedAt?: unknown }).updatedAt ?? 0) > 0)) ||
      customItems.length > 0 || hidden.length > 0 ||
      Boolean(growth.nickname || growth.dueDate) ||
      isHospitalProfileConfigured(loadHospitalProfile()) ||
      hasAnyEffectiveItemPlanning(loadItemPlanning()) ||
      Boolean(window.localStorage.getItem("dadkit:v3:sync-session")) ||
      Boolean(window.localStorage.getItem("dadkit:v3:webdav-config"));
    if (localExisting) return true;
    const baby = await getBabyRepository().getAllBabyData();
    return hasBabyMode(baby.profile) || baby.care.events.length > 0 || baby.care.clearedAt > 0;
  } catch {
    return true;
  }
}

function readArray(key: string): unknown[] {
  try { const value = JSON.parse(window.localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}

function readRecord(key: string): Record<string, unknown> {
  try { const value = JSON.parse(window.localStorage.getItem(key) ?? "{}"); return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}; } catch { return {}; }
}
