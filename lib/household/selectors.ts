import type {
  HouseholdMemberPortable,
  HouseholdPortableData,
} from "@/lib/household/types";

export function getActiveHouseholdMembers(household: HouseholdPortableData) {
  return Object.values(household.members)
    .filter((member) => isEffectiveMember(member, household.clearedAt) && !member.deleted.value)
    .sort(compareMembers);
}

export function getRemovedHouseholdMembers(household: HouseholdPortableData) {
  return Object.values(household.members)
    .filter((member) => isEffectiveMember(member, household.clearedAt) && member.deleted.value)
    .sort(compareMembers);
}

export function resolveHouseholdMember(
  household: HouseholdPortableData,
  memberId: string | null,
) {
  if (!memberId) return undefined;
  const member = household.members[memberId];
  return member && isEffectiveMember(member, household.clearedAt) ? member : undefined;
}

export function householdMemberLabel(
  household: HouseholdPortableData,
  memberId: string | null,
) {
  if (!memberId) return "未标记记录人";
  const member = resolveHouseholdMember(household, memberId);
  if (!member) return "未知成员";
  return `${member.displayName.value}${member.deleted.value ? "（已移除）" : ""}`;
}

export function householdRecorderLabel(
  household: HouseholdPortableData,
  memberId: string | null,
) {
  if (!memberId) return "未标记记录人";
  const member = resolveHouseholdMember(household, memberId);
  if (!member) return "未知成员记录";
  return member.deleted.value
    ? `${member.displayName.value}记录（成员已移除）`
    : `${member.displayName.value}记录`;
}

function isEffectiveMember(member: HouseholdMemberPortable, clearedAt: number) {
  return (
    member.displayName.updatedAt > clearedAt &&
    member.deleted.updatedAt > clearedAt
  );
}

function compareMembers(left: HouseholdMemberPortable, right: HouseholdMemberPortable) {
  return left.createdAt - right.createdAt || left.id.localeCompare(right.id);
}
