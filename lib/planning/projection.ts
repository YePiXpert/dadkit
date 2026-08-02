import {
  LEGACY_DAD_MEMBER_ID,
  LEGACY_FAMILY_MEMBER_ID,
  LEGACY_MOM_MEMBER_ID,
} from "@/lib/household/migration";
import type {
  ItemPlanningPortableData,
  ItemPlanningPortableDataV1,
  ItemPlanningRecordV1,
  PlanningAssignee,
} from "@/lib/planning/types";

export function projectPlanningV2ToV1(planning: ItemPlanningPortableData): ItemPlanningPortableDataV1 {
  return {
    version: 1,
    clearedAt: planning.clearedAt,
    items: Object.fromEntries(
      Object.entries(planning.items)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => [id, {
          assignee: {
            value: projectAssigneeIds(record.assigneeIds.value),
            updatedAt: record.assigneeIds.updatedAt,
          },
          dueDate: { ...record.dueDate },
          estimatedPriceFen: { ...record.estimatedPriceFen },
          actualPriceFen: { ...record.actualPriceFen },
          purchaseChannel: { ...record.purchaseChannel },
          storageLocation: { ...record.storageLocation },
        } satisfies ItemPlanningRecordV1]),
    ),
  };
}

export function projectAssigneeIds(ids: readonly string[]): PlanningAssignee {
  if (ids.length === 0) return "unassigned";
  if (ids.length === 1 && ids[0] === LEGACY_DAD_MEMBER_ID) return "dad";
  if (ids.length === 1 && ids[0] === LEGACY_MOM_MEMBER_ID) return "mom";
  if (
    ids.length === 2 &&
    ids.includes(LEGACY_DAD_MEMBER_ID) &&
    ids.includes(LEGACY_MOM_MEMBER_ID)
  ) return "shared";
  if (ids.length === 1 && ids[0] === LEGACY_FAMILY_MEMBER_ID) return "family";
  return "family";
}

export function clonePlanningV1(planning: ItemPlanningPortableDataV1): ItemPlanningPortableDataV1 {
  return {
    version: 1,
    clearedAt: planning.clearedAt,
    items: Object.fromEntries(Object.entries(planning.items).sort(([a], [b]) => a.localeCompare(b)).map(([id, record]) => [id, {
      assignee: { ...record.assignee },
      dueDate: { ...record.dueDate },
      estimatedPriceFen: { ...record.estimatedPriceFen },
      actualPriceFen: { ...record.actualPriceFen },
      purchaseChannel: { ...record.purchaseChannel },
      storageLocation: { ...record.storageLocation },
    }])),
  };
}
