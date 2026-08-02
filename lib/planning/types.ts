export const LEGACY_PLANNING_ASSIGNEES = [
  "unassigned",
  "dad",
  "mom",
  "shared",
  "family",
] as const;

export type PlanningAssignee = (typeof LEGACY_PLANNING_ASSIGNEES)[number];
/** @deprecated Only use at v7/v8 compatibility boundaries. */
export const PLANNING_ASSIGNEES = LEGACY_PLANNING_ASSIGNEES;

export const PLANNING_FIELD_KEYS = [
  "assigneeIds",
  "dueDate",
  "estimatedPriceFen",
  "actualPriceFen",
  "purchaseChannel",
  "storageLocation",
] as const;

export const LEGACY_PLANNING_FIELD_KEYS = [
  "assignee",
  "dueDate",
  "estimatedPriceFen",
  "actualPriceFen",
  "purchaseChannel",
  "storageLocation",
] as const;

export type PlanningFieldKey = (typeof PLANNING_FIELD_KEYS)[number];

export type StampedPlanningField<T> = {
  value: T;
  updatedAt: number;
};

export type ItemPlanningRecordV1 = {
  assignee: StampedPlanningField<PlanningAssignee>;
  dueDate: StampedPlanningField<string>;
  estimatedPriceFen: StampedPlanningField<number | null>;
  actualPriceFen: StampedPlanningField<number | null>;
  purchaseChannel: StampedPlanningField<string>;
  storageLocation: StampedPlanningField<string>;
};

export type ItemPlanningPortableDataV1 = {
  version: 1;
  clearedAt: number;
  items: Record<string, ItemPlanningRecordV1>;
};

export type ItemPlanningRecord = {
  assigneeIds: StampedPlanningField<string[]>;
  dueDate: StampedPlanningField<string>;
  estimatedPriceFen: StampedPlanningField<number | null>;
  actualPriceFen: StampedPlanningField<number | null>;
  purchaseChannel: StampedPlanningField<string>;
  storageLocation: StampedPlanningField<string>;
};

export type ItemPlanningPortableData = {
  version: 2;
  clearedAt: number;
  items: Record<string, ItemPlanningRecord>;
};

export type ItemPlanningValues = {
  assigneeIds: string[];
  dueDate: string;
  estimatedPriceFen: number | null;
  actualPriceFen: number | null;
  purchaseChannel: string;
  storageLocation: string;
};

export type ItemPlanningDraft = {
  assigneeIds: string[];
  dueDate: string;
  estimatedPrice: string;
  actualPrice: string;
  purchaseChannel: string;
  storageLocation: string;
};

export type PlanningDraftField = keyof ItemPlanningDraft;
export type PlanningValidationErrors = Partial<Record<PlanningDraftField, string>>;

export type BulkPlanningFieldUpdate<T> =
  | { mode: "keep" }
  | { mode: "set"; value: T }
  | { mode: "clear" };

export type PlanningBulkPatch = {
  assigneeIds?: BulkPlanningFieldUpdate<string[]>;
  dueDate?: BulkPlanningFieldUpdate<string>;
  storageLocation?: BulkPlanningFieldUpdate<string>;
};

export const PLANNING_ASSIGNEE_LABELS: Record<PlanningAssignee, string> = {
  unassigned: "未分工",
  dad: "爸爸",
  mom: "妈妈",
  shared: "共同负责",
  family: "其他家人",
};

export const PLANNING_TEXT_LIMIT = 80;
export const PLANNING_ITEM_ID_LIMIT = 160;
export const PLANNING_ITEM_LIMIT = 2_000;
export const PLANNING_MAX_PRICE_FEN = 99_999_999;
export const PLANNING_ASSIGNEE_LIMIT = 12;
