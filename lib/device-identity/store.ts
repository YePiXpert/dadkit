"use client";

import { create } from "zustand";

import {
  createDefaultDeviceIdentity,
  loadDeviceIdentity,
  saveDeviceIdentity,
} from "@/lib/device-identity/repository";
import type {
  DeviceIdentityLocalData,
  PreferredEntry,
} from "@/lib/device-identity/types";
import { isSafeHouseholdMemberId } from "@/lib/household/validation";
import type { DataActionResult } from "@/lib/data/action-result";

type DeviceIdentityState = DeviceIdentityLocalData & {
  hydrated: boolean;
  hydrate(): void;
  setCurrentMemberId(memberId: string | null): DataActionResult;
  setPreferredEntry(preferredEntry: PreferredEntry): DataActionResult;
  completeOnboarding(timestamp?: number): DataActionResult;
  resetOnboarding(): DataActionResult;
};

export const useDeviceIdentityStore = create<DeviceIdentityState>((set, get) => ({
  ...createDefaultDeviceIdentity(),
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...loadDeviceIdentity(), hydrated: true });
  },
  setCurrentMemberId: (memberId) => {
    if (memberId !== null && !isSafeHouseholdMemberId(memberId)) {
      return { ok: false, changed: false, message: "家庭成员标识无效。" };
    }
    return persist({ ...loadDeviceIdentity(), currentMemberId: memberId }, set);
  },
  setPreferredEntry: (preferredEntry) => {
    return persist({ ...loadDeviceIdentity(), preferredEntry }, set);
  },
  completeOnboarding: (timestamp = Date.now()) => {
    return persist({ ...loadDeviceIdentity(), onboardingCompletedAt: timestamp }, set);
  },
  resetOnboarding: () => {
    return persist({ ...loadDeviceIdentity(), onboardingCompletedAt: null }, set);
  },
}));

function pickIdentity(state: DeviceIdentityState): DeviceIdentityLocalData {
  return {
    version: 1,
    currentMemberId: state.currentMemberId,
    preferredEntry: state.preferredEntry,
    onboardingCompletedAt: state.onboardingCompletedAt,
  };
}

function persist(
  identity: DeviceIdentityLocalData,
  set: (partial: Partial<DeviceIdentityState>) => void,
) {
  const current = pickIdentity(useDeviceIdentityStore.getState());
  const changed = JSON.stringify(current) !== JSON.stringify(identity);
  if (JSON.stringify(loadDeviceIdentity()) === JSON.stringify(identity)) {
    if (changed) set({ ...identity, hydrated: true });
    return { ok: true, changed };
  }
  try {
    saveDeviceIdentity(identity);
  } catch {
    return {
      ok: false,
      changed: false,
      message: "设备设置未能写入本机存储，请清理空间后重试。",
    };
  }
  set({ ...identity, hydrated: true });
  return { ok: true, changed: true };
}
