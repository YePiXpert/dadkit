export const PLANNING_ASSIGNEES = [
  "unassigned",
  "dad",
  "mom",
  "shared",
  "family",
] as const;

export type PlanningAssignee = (typeof PLANNING_ASSIGNEES)[number];

export const PLANNING_FIELD_KEYS = [
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

export type ItemPlanningRecord = {
  assignee: StampedPlanningField<PlanningAssignee>;
  dueDate: StampedPlanningField<string>;
  estimatedPriceFen: StampedPlanningField<number | null>;
  actualPriceFen: StampedPlanningField<number | null>;
  purchaseChannel: StampedPlanningField<string>;
  storageLocation: StampedPlanningField<string>;
};

export type ItemPlanningPortableData = {
  version: 1;
  clearedAt: number;
  items: Record<string, ItemPlanningRecord>;
};

export type ItemPlanningValues = {
  assignee: PlanningAssignee;
  dueDate: string;
  estimatedPriceFen: number | null;
  actualPriceFen: number | null;
  purchaseChannel: string;
  storageLocation: string;
};

export type ItemPlanningDraft = {
  assignee: PlanningAssignee;
  dueDate: string;
  estimatedPrice: string;
  actualPrice: string;
  purchaseChannel: string;
  storageLocation: string;
};

export type PlanningDraftField = keyof ItemPlanningDraft;
export type PlanningValidationErrors = Partial<
  Record<PlanningDraftField, string>
>;

export type BulkPlanningFieldUpdate<T> =
  | { mode: "keep" }
  | { mode: "set"; value: T }
  | { mode: "clear" };

export type PlanningBulkPatch = {
  assignee?: BulkPlanningFieldUpdate<PlanningAssignee>;
  dueDate?: BulkPlanningFieldUpdate<string>;
  storageLocation?: BulkPlanningFieldUpdate<string>;
};

export const PLANNING_ASSIGNEE_LABELS: Record<PlanningAssignee, string> = {
  unassigned: "未分配",
  dad: "爸爸",
  mom: "妈妈",
  shared: "共同负责",
  family: "其他家人",
};

export const PLANNING_TEXT_LIMIT = 80;
export const PLANNING_ITEM_ID_LIMIT = 160;
export const PLANNING_ITEM_LIMIT = 2_000;
export const PLANNING_MAX_PRICE_FEN = 99_999_999;
