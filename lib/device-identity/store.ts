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

type DeviceIdentityState = DeviceIdentityLocalData & {
  hydrated: boolean;
  hydrate(): void;
  setCurrentMemberId(memberId: string | null): void;
  setPreferredEntry(preferredEntry: PreferredEntry): void;
  completeOnboarding(timestamp?: number): void;
  resetOnboarding(): void;
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
      throw new Error("家庭成员标识无效。");
    }
    persist({ ...pickIdentity(get()), currentMemberId: memberId }, set);
  },
  setPreferredEntry: (preferredEntry) => {
    persist({ ...pickIdentity(get()), preferredEntry }, set);
  },
  completeOnboarding: (timestamp = Date.now()) => {
    persist({ ...pickIdentity(get()), onboardingCompletedAt: timestamp }, set);
  },
  resetOnboarding: () => {
    persist({ ...pickIdentity(get()), onboardingCompletedAt: null }, set);
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
  saveDeviceIdentity(identity);
  set({ ...identity, hydrated: true });
}
