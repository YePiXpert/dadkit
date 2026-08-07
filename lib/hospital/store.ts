"use client";

import { create } from "zustand";

import { createEmptyHospitalProfile } from "@/lib/hospital/defaults";
import {
  loadHospitalProfile,
  saveHospitalProfile,
} from "@/lib/hospital/repository";
import {
  clearHospitalProfile,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import {
  HOSPITAL_FIELD_KEYS,
  type HospitalProfilePortableData,
  type HospitalProfileValues,
  type HospitalValidationErrors,
} from "@/lib/hospital/types";
import { validateHospitalDraft } from "@/lib/hospital/validation";
import { getSyncAdjustedNow } from "@/lib/sync-clock";
import type { DataActionResult } from "@/lib/data/action-result";
import { mergeHospitalProfiles } from "@/lib/hospital/merge";

type HospitalSaveResult = DataActionResult<HospitalValidationErrors>;

type HospitalProfileState = {
  hydrated: boolean;
  profile: HospitalProfilePortableData;
  hydrate: () => void;
  saveDraft: (draft: HospitalProfileValues) => HospitalSaveResult;
  clearProfile: () => HospitalSaveResult;
};

function nextHospitalTimestamp(profile: HospitalProfilePortableData) {
  const latestFieldTimestamp = Math.max(
    0,
    ...HOSPITAL_FIELD_KEYS.map((key) => profile.fields[key].updatedAt),
  );

  return Math.max(getSyncAdjustedNow(), latestFieldTimestamp + 1);
}

export const useHospitalProfileStore = create<HospitalProfileState>(
  (set, get) => ({
    hydrated: false,
    profile: createEmptyHospitalProfile(),
    hydrate: () => {
      if (get().hydrated) return;

      set({ hydrated: true, profile: loadHospitalProfile() });
    },
    saveDraft: (draft) => {
      const validation = validateHospitalDraft(draft);

      if (!validation.ok) {
        return { ok: false, changed: false, errors: validation.errors };
      }

      const current = mergeHospitalProfiles(get().profile, loadHospitalProfile());
      const next = updateHospitalProfile(
        current,
        validation.values,
        nextHospitalTimestamp(current),
      );

      if (next.changed) {
        try {
          saveHospitalProfile(next.profile);
        } catch {
          return {
            ok: false,
            changed: false,
            message: "医院档案未能写入本机存储，请清理空间后重试。",
          };
        }
        set({ profile: next.profile });
      }

      return { ok: true, changed: next.changed };
    },
    clearProfile: () => {
      const current = mergeHospitalProfiles(get().profile, loadHospitalProfile());
      const next = clearHospitalProfile(
        current,
        nextHospitalTimestamp(current),
      );

      if (!next.changed) return { ok: true, changed: false };

      try {
        saveHospitalProfile(next.profile);
      } catch {
        return {
          ok: false,
          changed: false,
          message: "医院档案未能写入本机存储，请清理空间后重试。",
        };
      }
      set({ profile: next.profile });
      return { ok: true, changed: true };
    },
  }),
);
