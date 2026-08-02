import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import {
  BABY_PROFILE_FIELD_KEYS,
  type BabyCarePortableData,
  type BabyPortableData,
  type BabyProfilePortableData,
  type BabyProfileValues,
  type CareEvent,
} from "@/lib/baby/types";

export function cloneBabyProfile(profile: BabyProfilePortableData): BabyProfilePortableData {
  return {
    version: 1,
    clearedAt: profile.clearedAt,
    fields: {
      nickname: { ...profile.fields.nickname },
      birthDate: { ...profile.fields.birthDate },
      birthTime: { ...profile.fields.birthTime },
      sex: { ...profile.fields.sex },
    },
  };
}

export function cloneCareEvent(event: CareEvent): CareEvent {
  if (event.type === "breastfeeding") {
    return { ...event, segments: event.segments.map((segment) => ({ ...segment })) };
  }
  return { ...event };
}

export function cloneBabyCare(care: BabyCarePortableData): BabyCarePortableData {
  return {
    version: 1,
    clearedAt: care.clearedAt,
    events: care.events.map(cloneCareEvent).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function cloneBabyData(data: BabyPortableData): BabyPortableData {
  return { version: 1, profile: cloneBabyProfile(data.profile), care: cloneBabyCare(data.care) };
}

export function updateBabyProfileValues(
  profile: BabyProfilePortableData,
  values: BabyProfileValues,
  timestamp: number,
) {
  const next = cloneBabyProfile(profile);
  let changed = false;
  for (const key of BABY_PROFILE_FIELD_KEYS) {
    if (next.fields[key].value !== values[key]) {
      (next.fields[key] as { value: BabyProfileValues[typeof key]; updatedAt: number }).value = values[key];
      next.fields[key].updatedAt = timestamp;
      changed = true;
    }
  }
  return { profile: next, changed };
}

export function clearBabyProfile(profile: BabyProfilePortableData, clearedAt: number) {
  const next = createEmptyBabyProfile(clearedAt);
  next.clearedAt = clearedAt;
  return next;
}

export function latestBabyTimestamp(data: BabyPortableData) {
  let latest = Math.max(data.profile.clearedAt, data.care.clearedAt);
  for (const key of BABY_PROFILE_FIELD_KEYS) latest = Math.max(latest, data.profile.fields[key].updatedAt);
  for (const event of data.care.events) latest = Math.max(latest, event.createdAt, event.updatedAt, event.deletedAt ?? 0);
  return latest;
}

export function hasBabyMode(profile: BabyProfilePortableData) {
  return Boolean(profile.fields.birthDate.value);
}
