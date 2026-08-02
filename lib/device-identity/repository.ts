"use client";

import type { DeviceIdentityLocalData } from "@/lib/device-identity/types";
import type { HouseholdPortableData } from "@/lib/household/types";
import { isSafeHouseholdMemberId } from "@/lib/household/validation";

export const DEVICE_IDENTITY_STORAGE_KEY = "dadkit:v4:device-identity";

export function createDefaultDeviceIdentity(): DeviceIdentityLocalData {
  return {
    version: 1,
    currentMemberId: null,
    preferredEntry: "auto",
    onboardingCompletedAt: null,
  };
}

export function loadDeviceIdentity(): DeviceIdentityLocalData {
  if (typeof window === "undefined") return createDefaultDeviceIdentity();
  try {
    const raw = window.localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as unknown) : undefined;
    return isDeviceIdentity(value) ? { ...value } : createDefaultDeviceIdentity();
  } catch {
    return createDefaultDeviceIdentity();
  }
}

export function saveDeviceIdentity(identity: DeviceIdentityLocalData) {
  if (typeof window === "undefined") return;
  if (!isDeviceIdentity(identity)) throw new Error("当前设备使用者设置无效。");
  window.localStorage.setItem(DEVICE_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("dadkit:device-identity-change"));
  }
}

export function clearCurrentMemberIfUnavailable(household: HouseholdPortableData) {
  if (typeof window === "undefined") return false;
  const identity = loadDeviceIdentity();
  if (!identity.currentMemberId) return false;
  const member = household.members[identity.currentMemberId];
  const active =
    member &&
    member.displayName.updatedAt > household.clearedAt &&
    member.deleted.updatedAt > household.clearedAt &&
    !member.deleted.value;
  if (active) return false;
  saveDeviceIdentity({ ...identity, currentMemberId: null });
  return true;
}

function isDeviceIdentity(value: unknown): value is DeviceIdentityLocalData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  return (
    keys.length === 4 &&
    ["version", "currentMemberId", "preferredEntry", "onboardingCompletedAt"].every((key) => key in candidate) &&
    candidate.version === 1 &&
    (candidate.currentMemberId === null || isSafeHouseholdMemberId(candidate.currentMemberId)) &&
    (candidate.preferredEntry === "checklist" || candidate.preferredEntry === "baby" || candidate.preferredEntry === "auto") &&
    (candidate.onboardingCompletedAt === null ||
      (typeof candidate.onboardingCompletedAt === "number" &&
        Number.isFinite(candidate.onboardingCompletedAt) &&
        candidate.onboardingCompletedAt >= 0))
  );
}
