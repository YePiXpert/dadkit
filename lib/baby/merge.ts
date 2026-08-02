import { cloneBabyCare, cloneBabyData, cloneCareEvent } from "@/lib/baby/portable";
import { mergeBabyProfiles } from "@/lib/baby/profile";
import type { BabyCarePortableData, BabyPortableData, CareEvent } from "@/lib/baby/types";
import { isBabyCarePortableData, isBabyPortableData } from "@/lib/baby/validation";

export function mergeBabyCare(
  local: BabyCarePortableData,
  remote: BabyCarePortableData,
): BabyCarePortableData {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const merged = new Map<string, CareEvent>();
  for (const event of local.events) {
    if (event.updatedAt > clearedAt) merged.set(event.id, cloneCareEvent(event));
  }
  for (const event of remote.events) {
    if (event.updatedAt <= clearedAt) continue;
    const current = merged.get(event.id);
    if (!current || event.updatedAt > current.updatedAt) merged.set(event.id, cloneCareEvent(event));
  }
  const result = cloneBabyCare({ version: 1, clearedAt, events: [...merged.values()] });
  if (!isBabyCarePortableData(result)) throw new Error("合并后的照护记录无效或超过数量上限。");
  return result;
}

export function mergeBabyData(local: BabyPortableData, remote: BabyPortableData): BabyPortableData {
  const result: BabyPortableData = {
    version: 1,
    profile: mergeBabyProfiles(local.profile, remote.profile),
    care: mergeBabyCare(local.care, remote.care),
  };
  if (!isBabyPortableData(result)) throw new Error("合并后的宝宝数据无效。");
  return cloneBabyData(result);
}
