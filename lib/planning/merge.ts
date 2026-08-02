import { createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import { cloneItemPlanningRecord } from "@/lib/planning/portable";
import {
  PLANNING_FIELD_KEYS,
  type ItemPlanningPortableData,
  type ItemPlanningRecord,
  type PlanningFieldKey,
} from "@/lib/planning/types";
import { isItemPlanningPortableData } from "@/lib/planning/validation";

export function mergeItemPlanning(
  local: ItemPlanningPortableData,
  remote: ItemPlanningPortableData,
): ItemPlanningPortableData {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const merged: ItemPlanningPortableData = { version: 1, clearedAt, items: {} };
  const itemIds = new Set([...Object.keys(local.items), ...Object.keys(remote.items)]);

  for (const itemId of itemIds) {
    const record = mergePlanningRecord(
      local.items[itemId],
      remote.items[itemId],
      clearedAt,
    );
    if (record) merged.items[itemId] = record;
  }

  if (!isItemPlanningPortableData(merged)) {
    throw new Error("家庭分工与采购合并结果无效。");
  }

  return merged;
}

function mergePlanningRecord(
  local: ItemPlanningRecord | undefined,
  remote: ItemPlanningRecord | undefined,
  clearedAt: number,
) {
  const merged = createEmptyItemPlanningRecord(clearedAt);
  let hasEffectiveField = false;

  for (const key of PLANNING_FIELD_KEYS) {
    const localField = local?.[key];
    const remoteField = remote?.[key];
    const localEffective = localField && localField.updatedAt > clearedAt;
    const remoteEffective = remoteField && remoteField.updatedAt > clearedAt;

    if (!localEffective && !remoteEffective) continue;

    hasEffectiveField = true;
    const selected =
      remoteEffective &&
      (!localEffective || remoteField.updatedAt > localField.updatedAt)
        ? remoteField
        : localField;
    setPlanningField(merged, key, selected!);
  }

  return hasEffectiveField ? cloneItemPlanningRecord(merged) : undefined;
}

function setPlanningField(
  record: ItemPlanningRecord,
  key: PlanningFieldKey,
  field: ItemPlanningRecord[PlanningFieldKey],
) {
  if (key === "assignee") record.assignee = { ...field } as ItemPlanningRecord["assignee"];
  else if (key === "dueDate") record.dueDate = { ...field } as ItemPlanningRecord["dueDate"];
  else if (key === "estimatedPriceFen") record.estimatedPriceFen = { ...field } as ItemPlanningRecord["estimatedPriceFen"];
  else if (key === "actualPriceFen") record.actualPriceFen = { ...field } as ItemPlanningRecord["actualPriceFen"];
  else if (key === "purchaseChannel") record.purchaseChannel = { ...field } as ItemPlanningRecord["purchaseChannel"];
  else record.storageLocation = { ...field } as ItemPlanningRecord["storageLocation"];
}
