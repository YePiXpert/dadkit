"use client";

import type { DeviceIdentityLocalData } from "@/lib/device-identity/types";
import { publishDataChange } from "@/lib/data/change-bus";

export const DEVICE_IDENTITY_STORAGE_KEY = "dadkit:v4:device-identity";

export function createDefaultDeviceIdentity(): DeviceIdentityLocalData {
  return {
    version: 1,
    preferredEntry: "auto",
    onboardingCompletedAt: null,
  };
}

export function loadDeviceIdentity(): DeviceIdentityLocalData {
  if (typeof window === "undefined") return createDefaultDeviceIdentity();
  try {
    const raw = window.localStorage.getItem(DEVICE_IDENTITY_STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as unknown) : undefined;
    if (!isRecordLike(value)) return createDefaultDeviceIdentity();
    // 旧版本可能带有已下线的 currentMemberId 字段，读取时直接丢弃。
    const { currentMemberId: _legacy, ...rest } = value;
    void _legacy;
    return isDeviceIdentity(rest) ? { ...rest } : createDefaultDeviceIdentity();
  } catch {
    return createDefaultDeviceIdentity();
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function saveDeviceIdentity(identity: DeviceIdentityLocalData) {
  if (typeof window === "undefined") return;
  if (!isDeviceIdentity(identity)) throw new Error("当前设备使用者设置无效。");
  window.localStorage.setItem(DEVICE_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
  publishDataChange("device-identity");
  if (typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent("dadkit:device-identity-change"));
  }
}

function isDeviceIdentity(value: unknown): value is DeviceIdentityLocalData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const hasRequired =
    ["version", "preferredEntry", "onboardingCompletedAt"].every((key) => key in candidate);
  if (!hasRequired) return false;
  const extraKeys = Object.keys(candidate).filter(
    (key) => key !== "version" && key !== "preferredEntry" && key !== "onboardingCompletedAt",
  );
  return (
    extraKeys.length === 0 &&
    candidate.version === 1 &&
    (candidate.preferredEntry === "checklist" || candidate.preferredEntry === "baby" || candidate.preferredEntry === "auto") &&
    (candidate.onboardingCompletedAt === null ||
      (typeof candidate.onboardingCompletedAt === "number" &&
        Number.isFinite(candidate.onboardingCompletedAt) &&
        candidate.onboardingCompletedAt >= 0))
  );
}
