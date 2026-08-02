import type { HouseholdPortableData } from "@/lib/household/types";

export function createEmptyHousehold(clearedAt = 0): HouseholdPortableData {
  return {
    version: 1,
    clearedAt,
    householdName: { value: "", updatedAt: clearedAt },
    members: {},
  };
}
