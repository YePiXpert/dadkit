import {
  createEmptyItemPlanningDraft,
  createEmptyItemPlanningRecord,
  createEmptyItemPlanningValues,
} from "@/lib/planning/defaults";
import { planningMoneyInputValue } from "@/lib/planning/money";
import {
  PLANNING_FIELD_KEYS,
  type ItemPlanningDraft,
  type ItemPlanningPortableData,
  type ItemPlanningRecord,
  type ItemPlanningValues,
  type PlanningFieldKey,
} from "@/lib/planning/types";
import { normalizeAssigneeIds } from "@/lib/planning/validation";

export function cloneItemPlanning(planning: ItemPlanningPortableData): ItemPlanningPortableData {
  return {
    version: 2,
    clearedAt: planning.clearedAt,
    items: Object.fromEntries(
      Object.entries(planning.items)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, record]) => [id, cloneItemPlanningRecord(record)]),
    ),
  };
}

export function cloneItemPlanningRecord(record: ItemPlanningRecord): ItemPlanningRecord {
  return {
    assigneeIds: { ...record.assigneeIds, value: [...record.assigneeIds.value] },
    dueDate: { ...record.dueDate },
    estimatedPriceFen: { ...record.estimatedPriceFen },
    actualPriceFen: { ...record.actualPriceFen },
    purchaseChannel: { ...record.purchaseChannel },
    storageLocation: { ...record.storageLocation },
  };
}

export function getEffectiveItemPlanningRecord(planning: ItemPlanningPortableData, itemId: string) {
  const current = planning.items[itemId];
  const effective = createEmptyItemPlanningRecord(planning.clearedAt);
  if (!current) return effective;
  for (const key of PLANNING_FIELD_KEYS) {
    if (current[key].updatedAt > planning.clearedAt) setPlanningField(effective, key, current[key]);
  }
  return effective;
}

export function itemPlanningValuesFromPortable(planning: ItemPlanningPortableData, itemId: string): ItemPlanningValues {
  const record = getEffectiveItemPlanningRecord(planning, itemId);
  return {
    assigneeIds: [...record.assigneeIds.value],
    dueDate: record.dueDate.value,
    estimatedPriceFen: record.estimatedPriceFen.value,
    actualPriceFen: record.actualPriceFen.value,
    purchaseChannel: record.purchaseChannel.value,
    storageLocation: record.storageLocation.value,
  };
}

export function itemPlanningDraftFromPortable(planning: ItemPlanningPortableData, itemId: string): ItemPlanningDraft {
  const values = itemPlanningValuesFromPortable(planning, itemId);
  return {
    ...createEmptyItemPlanningDraft(),
    assigneeIds: [...values.assigneeIds],
    dueDate: values.dueDate,
    estimatedPrice: planningMoneyInputValue(values.estimatedPriceFen),
    actualPrice: planningMoneyInputValue(values.actualPriceFen),
    purchaseChannel: values.purchaseChannel,
    storageLocation: values.storageLocation,
  };
}

export function updateItemPlanningValues(
  planning: ItemPlanningPortableData,
  itemId: string,
  values: ItemPlanningValues,
  now: number,
) {
  const currentValues = itemPlanningValuesFromPortable(planning, itemId);
  const next = cloneItemPlanning(planning);
  const record = planning.items[itemId]
    ? cloneItemPlanningRecord(planning.items[itemId])
    : createEmptyItemPlanningRecord(planning.clearedAt);
  let changed = false;
  const assigneeIds = normalizeAssigneeIds(values.assigneeIds);

  if (!sameIds(currentValues.assigneeIds, assigneeIds)) {
    record.assigneeIds = { value: assigneeIds, updatedAt: now };
    changed = true;
  }
  if (currentValues.dueDate !== values.dueDate) {
    record.dueDate = { value: values.dueDate, updatedAt: now };
    changed = true;
  }
  if (currentValues.estimatedPriceFen !== values.estimatedPriceFen) {
    record.estimatedPriceFen = { value: values.estimatedPriceFen, updatedAt: now };
    changed = true;
  }
  if (currentValues.actualPriceFen !== values.actualPriceFen) {
    record.actualPriceFen = { value: values.actualPriceFen, updatedAt: now };
    changed = true;
  }
  if (currentValues.purchaseChannel !== values.purchaseChannel) {
    record.purchaseChannel = { value: values.purchaseChannel, updatedAt: now };
    changed = true;
  }
  if (currentValues.storageLocation !== values.storageLocation) {
    record.storageLocation = { value: values.storageLocation, updatedAt: now };
    changed = true;
  }
  if (changed) next.items[itemId] = record;
  return { changed, planning: next };
}

export function clearItemPlanningValues(planning: ItemPlanningPortableData, itemId: string, now: number) {
  const next = cloneItemPlanning(planning);
  next.items[itemId] = createEmptyItemPlanningRecord(now);
  return next;
}

export function clearAllItemPlanning(_planning: ItemPlanningPortableData, now: number) {
  return { version: 2, clearedAt: now, items: {} } satisfies ItemPlanningPortableData;
}

export function latestItemPlanningTimestamp(planning: ItemPlanningPortableData, itemIds?: readonly string[]) {
  const ids = itemIds ?? Object.keys(planning.items);
  let latest = planning.clearedAt;
  for (const id of ids) {
    const record = planning.items[id];
    if (!record) continue;
    for (const key of PLANNING_FIELD_KEYS) latest = Math.max(latest, record[key].updatedAt);
  }
  return latest;
}

export function isEmptyItemPlanningValues(values: ItemPlanningValues) {
  const empty = createEmptyItemPlanningValues();
  return values.assigneeIds.length === 0 && PLANNING_FIELD_KEYS.filter((key) => key !== "assigneeIds").every((key) => values[key] === empty[key]);
}

export function sameIds(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function setPlanningField(
  record: ItemPlanningRecord,
  key: PlanningFieldKey,
  field: ItemPlanningRecord[PlanningFieldKey],
) {
  if (key === "assigneeIds") record.assigneeIds = { ...(field as ItemPlanningRecord["assigneeIds"]), value: [...(field as ItemPlanningRecord["assigneeIds"]).value] };
  else if (key === "dueDate") record.dueDate = { ...field } as ItemPlanningRecord["dueDate"];
  else if (key === "estimatedPriceFen") record.estimatedPriceFen = { ...field } as ItemPlanningRecord["estimatedPriceFen"];
  else if (key === "actualPriceFen") record.actualPriceFen = { ...field } as ItemPlanningRecord["actualPriceFen"];
  else if (key === "purchaseChannel") record.purchaseChannel = { ...field } as ItemPlanningRecord["purchaseChannel"];
  else record.storageLocation = { ...field } as ItemPlanningRecord["storageLocation"];
}
