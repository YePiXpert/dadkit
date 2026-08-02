import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { BABY_PROFILE_FIELD_KEYS, type BabyCarePortableData, type BabyPortableData, type BabyPortableDataV1, type BabyProfilePortableData, type BabyProfileValues, type CareEvent, type CareEventV1 } from "@/lib/baby/types";

export function cloneBabyProfile(profile: BabyProfilePortableData): BabyProfilePortableData {
  return { version: 1, clearedAt: profile.clearedAt, fields: { nickname: { ...profile.fields.nickname }, birthDate: { ...profile.fields.birthDate }, birthTime: { ...profile.fields.birthTime }, sex: { ...profile.fields.sex } } };
}

export function cloneCareEvent(event: CareEvent): CareEvent {
  return event.type === "breastfeeding"
    ? { ...event, segments: event.segments.map((segment) => ({ ...segment })) }
    : { ...event };
}

export function cloneCareEventV1(event: CareEventV1): CareEventV1 {
  return event.type === "breastfeeding"
    ? { ...event, segments: event.segments.map((segment) => ({ ...segment })) }
    : { ...event };
}

export function cloneBabyCare(care: BabyCarePortableData): BabyCarePortableData {
  return { version: 2, clearedAt: care.clearedAt, events: care.events.map(cloneCareEvent).sort((a, b) => a.id.localeCompare(b.id)) };
}

export function cloneBabyData(data: BabyPortableData): BabyPortableData {
  return { version: 2, profile: cloneBabyProfile(data.profile), care: cloneBabyCare(data.care) };
}

export function migrateBabyV1ToV2(data: BabyPortableDataV1): BabyPortableData {
  return {
    version: 2,
    profile: cloneBabyProfile(data.profile),
    care: {
      version: 2,
      clearedAt: data.care.clearedAt,
      events: data.care.events.map((event) => upgradeCareEvent(event)).sort((a, b) => a.id.localeCompare(b.id)),
    },
  };
}

export function cloneBabyDataV1(data: BabyPortableDataV1): BabyPortableDataV1 {
  return {
    version: 1,
    profile: cloneBabyProfile(data.profile),
    care: {
      version: 1,
      clearedAt: data.care.clearedAt,
      events: data.care.events.map(cloneCareEventV1).sort((a, b) => a.id.localeCompare(b.id)),
    },
  };
}

export function projectBabyV2ToV1(data: BabyPortableData): BabyPortableDataV1 {
  return {
    version: 1,
    profile: cloneBabyProfile(data.profile),
    care: {
      version: 1,
      clearedAt: data.care.clearedAt,
      events: data.care.events.map(({ recordedByMemberId: _recordedByMemberId, ...event }) => {
        void _recordedByMemberId;
        return event.type === "breastfeeding" ? { ...event, segments: event.segments.map((segment) => ({ ...segment })) } : { ...event };
      }).sort((a, b) => a.id.localeCompare(b.id)) as CareEventV1[],
    },
  };
}

export function upgradeCareEvent(event: CareEvent | CareEventV1): CareEvent {
  const next = "recordedByMemberId" in event ? event : { ...event, recordedByMemberId: null };
  return next.type === "breastfeeding"
    ? { ...next, segments: next.segments.map((segment) => ({ ...segment })) } as CareEvent
    : { ...next } as CareEvent;
}

export function updateBabyProfileValues(profile: BabyProfilePortableData, values: BabyProfileValues, timestamp: number) {
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

export function clearBabyProfile(_profile: BabyProfilePortableData, clearedAt: number) {
  return createEmptyBabyProfile(clearedAt);
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
