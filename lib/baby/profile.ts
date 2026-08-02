import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { cloneBabyProfile } from "@/lib/baby/portable";
import { BABY_PROFILE_FIELD_KEYS, type BabyProfilePortableData } from "@/lib/baby/types";

export function mergeBabyProfiles(
  local: BabyProfilePortableData,
  remote: BabyProfilePortableData,
): BabyProfilePortableData {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const defaults = createEmptyBabyProfile(clearedAt);
  const merged = cloneBabyProfile(defaults);
  merged.clearedAt = clearedAt;

  for (const key of BABY_PROFILE_FIELD_KEYS) {
    const localField = local.fields[key];
    const remoteField = remote.fields[key];
    const winner = remoteField.updatedAt > localField.updatedAt ? remoteField : localField;
    if (winner.updatedAt > clearedAt) {
      (merged.fields[key] as typeof winner).value = winner.value;
      merged.fields[key].updatedAt = winner.updatedAt;
    }
  }
  return merged;
}
