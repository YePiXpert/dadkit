import { createEmptyHousehold } from "@/lib/household/defaults";
import type {
  HouseholdMemberPortable,
  HouseholdPortableData,
} from "@/lib/household/types";

export function cloneHouseholdMember(
  member: HouseholdMemberPortable,
): HouseholdMemberPortable {
  return {
    id: member.id,
    createdAt: member.createdAt,
    displayName: { ...member.displayName },
    relationshipLabel: { ...member.relationshipLabel },
    deleted: { ...member.deleted },
  };
}

export function cloneHousehold(
  household: HouseholdPortableData,
): HouseholdPortableData {
  return {
    version: 1,
    clearedAt: household.clearedAt,
    householdName: { ...household.householdName },
    members: Object.fromEntries(
      Object.entries(household.members)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, member]) => [id, cloneHouseholdMember(member)]),
    ),
  };
}

export function latestHouseholdTimestamp(household: HouseholdPortableData) {
  let latest = Math.max(household.clearedAt, household.householdName.updatedAt);
  for (const member of Object.values(household.members)) {
    latest = Math.max(
      latest,
      member.createdAt,
      member.displayName.updatedAt,
      member.relationshipLabel.updatedAt,
      member.deleted.updatedAt,
    );
  }
  return latest;
}

export function clearHouseholdPortable(
  household: HouseholdPortableData,
  clearedAt: number,
) {
  const empty = createEmptyHousehold(clearedAt);
  empty.householdName = { value: "", updatedAt: clearedAt };
  return empty;
}
