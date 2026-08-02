import { createEmptyItemPlanningRecord } from "@/lib/planning/defaults";
import {
  cloneItemPlanningRecord,
  setPlanningField,
} from "@/lib/planning/portable";
import {
  PLANNING_FIELD_KEYS,
  type ItemPlanningPortableData,
  type ItemPlanningRecord,
} from "@/lib/planning/types";
import { isItemPlanningPortableData } from "@/lib/planning/validation";

export function mergeItemPlanning(
  local: ItemPlanningPortableData,
  remote: ItemPlanningPortableData,
): ItemPlanningPortableData {
  const clearedAt = Math.max(local.clearedAt, remote.clearedAt);
  const merged: ItemPlanningPortableData = { version: 2, clearedAt, items: {} };
  const ids = new Set([...Object.keys(local.items), ...Object.keys(remote.items)]);
  for (const id of [...ids].sort()) {
    const record = mergePlanningRecord(local.items[id], remote.items[id], clearedAt);
    if (record) merged.items[id] = record;
  }
  if (!isItemPlanningPortableData(merged)) throw new Error("家庭分工与采购合并结果无效。");
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
    const localEffective = Boolean(localField && localField.updatedAt > clearedAt);
    const remoteEffective = Boolean(remoteField && remoteField.updatedAt > clearedAt);
    if (!localEffective && !remoteEffective) continue;
    hasEffectiveField = true;
    const selected = remoteEffective && (!localEffective || remoteField!.updatedAt > localField!.updatedAt)
      ? remoteField!
      : localField!;
    setPlanningField(merged, key, selected);
  }
  return hasEffectiveField ? cloneItemPlanningRecord(merged) : undefined;
}
