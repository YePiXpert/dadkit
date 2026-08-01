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

type HospitalSaveResult = {
  changed: boolean;
  errors?: HospitalValidationErrors;
  ok: boolean;
};

type HospitalProfileState = {
  hydrated: boolean;
  profile: HospitalProfilePortableData;
  hydrate: () => void;
  saveDraft: (draft: HospitalProfileValues) => HospitalSaveResult;
  clearProfile: () => boolean;
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

      const next = updateHospitalProfile(
        get().profile,
        validation.values,
        nextHospitalTimestamp(get().profile),
      );

      if (next.changed) {
        saveHospitalProfile(next.profile);
        set({ profile: next.profile });
      }

      return { ok: true, changed: next.changed };
    },
    clearProfile: () => {
      const next = clearHospitalProfile(
        get().profile,
        nextHospitalTimestamp(get().profile),
      );

      if (!next.changed) return false;

      saveHospitalProfile(next.profile);
      set({ profile: next.profile });
      return true;
    },
  }),
);
