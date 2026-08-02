import type {
  ItemPlanningDraft,
  ItemPlanningPortableData,
  ItemPlanningRecord,
  ItemPlanningValues,
} from "@/lib/planning/types";

export function createEmptyItemPlanningRecord(
  updatedAt = 0,
): ItemPlanningRecord {
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
    assignee: "unassigned",
    dueDate: "",
    estimatedPriceFen: null,
    actualPriceFen: null,
    purchaseChannel: "",
    storageLocation: "",
  };
}

export function createEmptyItemPlanningDraft(): ItemPlanningDraft {
  return {
    assignee: "unassigned",
    dueDate: "",
    estimatedPrice: "",
    actualPrice: "",
    purchaseChannel: "",
    storageLocation: "",
  };
}

export function createEmptyItemPlanning(): ItemPlanningPortableData {
  return { version: 1, clearedAt: 0, items: {} };
}
