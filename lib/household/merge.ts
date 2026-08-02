import { cloneHousehold, cloneHouseholdMember } from "@/lib/household/portable";
import type {
  HouseholdMemberPortable,
  HouseholdPortableData,
  StampedHouseholdValue,
} from "@/lib/household/types";
import { isHouseholdPortableData } from "@/lib/household/validation";

export function mergeHousehold(
  local: HouseholdPortableData,
  remote: HouseholdPortableData,
): HouseholdPortableData {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const householdName = mergeStamped(local.householdName, remote.householdName);
  const members: Record<string, HouseholdMemberPortable> = {};
  const memberIds = new Set([
    ...Object.keys(local.members),
    ...Object.keys(remote.members),
  ]);

  for (const id of [...memberIds].sort()) {
    const left = local.members[id];
    const right = remote.members[id];
    const member = left && right
      ? {
          id,
          createdAt: Math.min(left.createdAt, right.createdAt),
          displayName: mergeStamped(left.displayName, right.displayName),
          relationshipLabel: mergeStamped(
            left.relationshipLabel,
            right.relationshipLabel,
          ),
          deleted: mergeStamped(left.deleted, right.deleted),
        }
      : cloneHouseholdMember((left ?? right)!);

    if (
      Math.max(
        member.displayName.updatedAt,
        member.relationshipLabel.updatedAt,
        member.deleted.updatedAt,
      ) > clearedAt
    ) {
      members[id] = member;
    }
  }

  const merged = cloneHousehold({
    version: 1,
    clearedAt,
    householdName:
      householdName.updatedAt > clearedAt
        ? householdName
        : { value: "", updatedAt: clearedAt },
    members,
  });
  if (!isHouseholdPortableData(merged)) {
    throw new Error("家庭档案合并结果无效。");
  }
  return merged;
}

function mergeStamped<T>(
  local: StampedHouseholdValue<T>,
  remote: StampedHouseholdValue<T>,
) {
  return {
    ...(remote.updatedAt > local.updatedAt ? remote : local),
  } as StampedHouseholdValue<T>;
}
