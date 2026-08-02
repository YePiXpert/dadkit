"use client";

import { create } from "zustand";

import { clearCurrentMemberIfUnavailable } from "@/lib/device-identity/repository";
import { useDeviceIdentityStore } from "@/lib/device-identity/store";
import { createEmptyHousehold } from "@/lib/household/defaults";
import {
  clearHouseholdPortable,
  cloneHousehold,
  latestHouseholdTimestamp,
} from "@/lib/household/portable";
import { loadHousehold, saveHousehold } from "@/lib/household/repository";
import { getActiveHouseholdMembers } from "@/lib/household/selectors";
import {
  HOUSEHOLD_ACTIVE_MEMBER_LIMIT,
  HOUSEHOLD_MEMBER_RECORD_LIMIT,
  type HouseholdMemberDraft,
  type HouseholdPortableData,
  type HouseholdValidationErrors,
} from "@/lib/household/types";
import {
  isSafeHouseholdMemberId,
  validateHouseholdMemberDraft,
  validateHouseholdName,
} from "@/lib/household/validation";
import { getSyncAdjustedNow } from "@/lib/sync-clock";

type HouseholdActionResult = {
  ok: boolean;
  changed: boolean;
  memberId?: string;
  message?: string;
  errors?: HouseholdValidationErrors;
};

type HouseholdState = {
  hydrated: boolean;
  household: HouseholdPortableData;
  hydrate(): void;
  replace(household: HouseholdPortableData): void;
  setHouseholdName(name: string): HouseholdActionResult;
  addMember(draft: HouseholdMemberDraft): HouseholdActionResult;
  updateMember(id: string, draft: HouseholdMemberDraft): HouseholdActionResult;
  removeMember(id: string): HouseholdActionResult;
  clearAll(): HouseholdActionResult;
};

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  hydrated: false,
  household: createEmptyHousehold(),
  hydrate: () => {
    if (get().hydrated) return;
    const household = loadHousehold();
    clearUnavailableDeviceMember(household);
    set({ hydrated: true, household });
  },
  replace: (household) => {
    const next = cloneHousehold(household);
    saveHousehold(next);
    clearUnavailableDeviceMember(next);
    set({ hydrated: true, household: next });
  },
  setHouseholdName: (name) => {
    const validation = validateHouseholdName(name);
    if (!validation.ok) {
      return { ok: false, changed: false, errors: { householdName: validation.message } };
    }
    const current = get().household;
    if (current.householdName.value === validation.value) {
      return { ok: true, changed: false };
    }
    const next = cloneHousehold(current);
    next.householdName = { value: validation.value, updatedAt: nextTimestamp(current) };
    persist(next, set);
    return { ok: true, changed: true };
  },
  addMember: (draft) => {
    const validation = validateHouseholdMemberDraft(draft);
    if (!validation.ok || !validation.values) {
      return { ok: false, changed: false, errors: validation.errors };
    }
    const current = get().household;
    if (getActiveHouseholdMembers(current).length >= HOUSEHOLD_ACTIVE_MEMBER_LIMIT) {
      return { ok: false, changed: false, message: "家庭成员最多 12 人。" };
    }
    if (Object.keys(current.members).length >= HOUSEHOLD_MEMBER_RECORD_LIMIT) {
      return { ok: false, changed: false, message: "家庭成员记录已达到 100 条，请先清空家庭档案。" };
    }
    let id: string;
    try {
      id = newHouseholdMemberId();
    } catch (error) {
      return {
        ok: false,
        changed: false,
        message: error instanceof Error ? error.message : "无法创建家庭成员。",
      };
    }
    const now = nextTimestamp(current);
    const next = cloneHousehold(current);
    next.members[id] = {
      id,
      createdAt: now,
      displayName: { value: validation.values.displayName, updatedAt: now },
      relationshipLabel: { value: validation.values.relationshipLabel, updatedAt: now },
      deleted: { value: false, updatedAt: now },
    };
    persist(next, set);
    return { ok: true, changed: true, memberId: id };
  },
  updateMember: (id, draft) => {
    const current = get().household;
    const member = current.members[id];
    if (!isSafeHouseholdMemberId(id) || !member) {
      return { ok: false, changed: false, message: "家庭成员不存在。" };
    }
    const validation = validateHouseholdMemberDraft(draft);
    if (!validation.ok || !validation.values) {
      return { ok: false, changed: false, errors: validation.errors };
    }
    const nameChanged = member.displayName.value !== validation.values.displayName;
    const relationshipChanged =
      member.relationshipLabel.value !== validation.values.relationshipLabel;
    if (!nameChanged && !relationshipChanged) return { ok: true, changed: false };
    const now = nextTimestamp(current);
    const next = cloneHousehold(current);
    if (nameChanged) next.members[id].displayName = { value: validation.values.displayName, updatedAt: now };
    if (relationshipChanged) next.members[id].relationshipLabel = { value: validation.values.relationshipLabel, updatedAt: now };
    persist(next, set);
    return { ok: true, changed: true };
  },
  removeMember: (id) => {
    const current = get().household;
    const member = current.members[id];
    if (!isSafeHouseholdMemberId(id) || !member || member.deleted.value) {
      return { ok: false, changed: false, message: "家庭成员不存在或已移除。" };
    }
    const next = cloneHousehold(current);
    next.members[id].deleted = { value: true, updatedAt: nextTimestamp(current) };
    persist(next, set);
    clearUnavailableDeviceMember(next);
    return { ok: true, changed: true };
  },
  clearAll: () => {
    const current = get().household;
    const next = clearHouseholdPortable(current, nextTimestamp(current));
    persist(next, set);
    clearUnavailableDeviceMember(next);
    return { ok: true, changed: true };
  },
}));

function persist(
  household: HouseholdPortableData,
  set: (partial: Partial<HouseholdState>) => void,
) {
  saveHousehold(household);
  set({ hydrated: true, household });
}

function nextTimestamp(household: HouseholdPortableData) {
  return Math.max(
    getSyncAdjustedNow(),
    household.clearedAt + 1,
    latestHouseholdTimestamp(household) + 1,
  );
}

function clearUnavailableDeviceMember(household: HouseholdPortableData) {
  if (clearCurrentMemberIfUnavailable(household)) {
    useDeviceIdentityStore.setState({ currentMemberId: null, hydrated: true });
  }
}

export function newHouseholdMemberId() {
  const secureCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (secureCrypto?.randomUUID) {
    return secureCrypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (secureCrypto?.getRandomValues) {
    secureCrypto.getRandomValues(bytes);
    return `member-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  throw new Error("当前环境缺少安全随机数能力，无法创建家庭成员。");
}
