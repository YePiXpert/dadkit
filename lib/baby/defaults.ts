import type {
  BabyCarePortableData,
  BabyPortableData,
  BabyProfilePortableData,
  BabyProfileValues,
} from "@/lib/baby/types";

export function createEmptyBabyProfile(timestamp = 0): BabyProfilePortableData {
  return {
    version: 1,
    clearedAt: timestamp,
    fields: {
      nickname: { value: "", updatedAt: timestamp },
      birthDate: { value: "", updatedAt: timestamp },
      birthTime: { value: "", updatedAt: timestamp },
      sex: { value: "unspecified", updatedAt: timestamp },
    },
  };
}

export function createEmptyBabyCare(clearedAt = 0): BabyCarePortableData {
  return { version: 2, clearedAt, events: [] };
}

export function createEmptyBabyData(timestamp = 0): BabyPortableData {
  return {
    version: 2,
    profile: createEmptyBabyProfile(timestamp),
    care: createEmptyBabyCare(timestamp),
  };
}

export function babyProfileValues(profile: BabyProfilePortableData): BabyProfileValues {
  return {
    nickname: profile.fields.nickname.value,
    birthDate: profile.fields.birthDate.value,
    birthTime: profile.fields.birthTime.value,
    sex: profile.fields.sex.value,
  };
}
