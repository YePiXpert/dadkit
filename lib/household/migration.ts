import { createEmptyHousehold } from "@/lib/household/defaults";
import { cloneHousehold } from "@/lib/household/portable";
import type { HouseholdPortableData } from "@/lib/household/types";
import {
  type ItemPlanningPortableData,
  type ItemPlanningPortableDataV1,
  type ItemPlanningRecord,
  type PlanningAssignee,
} from "@/lib/planning/types";
import { clonePlanningV1 } from "@/lib/planning/projection";

export const LEGACY_DAD_MEMBER_ID = "legacy-dad-v1";
export const LEGACY_MOM_MEMBER_ID = "legacy-mom-v1";
export const LEGACY_FAMILY_MEMBER_ID = "legacy-family-v1";

const LEGACY_MEMBER_DETAILS = {
  [LEGACY_DAD_MEMBER_ID]: { displayName: "爸爸", relationshipLabel: "爸爸" },
  [LEGACY_MOM_MEMBER_ID]: { displayName: "妈妈", relationshipLabel: "妈妈" },
  [LEGACY_FAMILY_MEMBER_ID]: { displayName: "其他家人", relationshipLabel: "家人" },
} as const;

export function legacyAssigneeIds(assignee: PlanningAssignee) {
  if (assignee === "dad") return [LEGACY_DAD_MEMBER_ID];
  if (assignee === "mom") return [LEGACY_MOM_MEMBER_ID];
  if (assignee === "shared") return [LEGACY_DAD_MEMBER_ID, LEGACY_MOM_MEMBER_ID].sort();
  if (assignee === "family") return [LEGACY_FAMILY_MEMBER_ID];
  return [];
}

export function migratePlanningV1ToV2(
  planning: ItemPlanningPortableDataV1,
  household: HouseholdPortableData = createEmptyHousehold(),
) {
  const nextHousehold = cloneHousehold(household);
  const items: Record<string, ItemPlanningRecord> = {};
  const requiredMembers = new Map<string, number>();

  for (const [itemId, record] of Object.entries(clonePlanningV1(planning).items)) {
    const assigneeIds = legacyAssigneeIds(record.assignee.value);
    for (const id of assigneeIds) {
      requiredMembers.set(id, Math.max(requiredMembers.get(id) ?? 0, record.assignee.updatedAt));
    }
    items[itemId] = {
      assigneeIds: { value: assigneeIds, updatedAt: record.assignee.updatedAt },
      dueDate: { ...record.dueDate },
      estimatedPriceFen: { ...record.estimatedPriceFen },
      actualPriceFen: { ...record.actualPriceFen },
      purchaseChannel: { ...record.purchaseChannel },
      storageLocation: { ...record.storageLocation },
    };
  }

  for (const [id, timestamp] of requiredMembers) {
    if (nextHousehold.members[id]) continue;
    const createdAt = Math.max(timestamp, nextHousehold.clearedAt + 1);
    const details = LEGACY_MEMBER_DETAILS[id as keyof typeof LEGACY_MEMBER_DETAILS];
    nextHousehold.members[id] = {
      id,
      createdAt,
      displayName: { value: details.displayName, updatedAt: createdAt },
      relationshipLabel: { value: details.relationshipLabel, updatedAt: createdAt },
      deleted: { value: false, updatedAt: createdAt },
    };
  }

  return {
    planning: { version: 2, clearedAt: planning.clearedAt, items } satisfies ItemPlanningPortableData,
    household: nextHousehold,
  };
}
