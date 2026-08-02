import type {
  ItemPlanningDraft,
  ItemPlanningPortableData,
  ItemPlanningPortableDataV1,
  ItemPlanningRecord,
  ItemPlanningRecordV1,
  ItemPlanningValues,
} from "@/lib/planning/types";

export function createEmptyItemPlanningRecord(updatedAt = 0): ItemPlanningRecord {
  return {
    assigneeIds: { value: [], updatedAt },
    dueDate: { value: "", updatedAt },
    estimatedPriceFen: { value: null, updatedAt },
    actualPriceFen: { value: null, updatedAt },
    purchaseChannel: { value: "", updatedAt },
    storageLocation: { value: "", updatedAt },
  };
}

export function createEmptyItemPlanningRecordV1(updatedAt = 0): ItemPlanningRecordV1 {
  return {
    assignee: { value: "unassigned", updatedAt },
    dueDate: { value: "", updatedAt },
    estimatedPriceFen: { value: null, updatedAt },
    actualPriceFen: { value: null, updatedAt },
    purchaseChannel: { value: "", updatedAt },
    storageLocation: { value: "", updatedAt },
  };
}

export function createEmptyItemPlanningValues(): ItemPlanningValues {
  return {
    assigneeIds: [],
    dueDate: "",
    estimatedPriceFen: null,
    actualPriceFen: null,
    purchaseChannel: "",
    storageLocation: "",
  };
}

export function createEmptyItemPlanningDraft(): ItemPlanningDraft {
  return {
    assigneeIds: [],
    dueDate: "",
    estimatedPrice: "",
    actualPrice: "",
    purchaseChannel: "",
    storageLocation: "",
  };
}

export function createEmptyItemPlanning(): ItemPlanningPortableData {
  return { version: 2, clearedAt: 0, items: {} };
}

export function createEmptyItemPlanningV1(): ItemPlanningPortableDataV1 {
  return { version: 1, clearedAt: 0, items: {} };
}
