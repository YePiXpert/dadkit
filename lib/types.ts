export type PackStatus =
  | "todo"
  | "bought"
  | "washed"
  | "packed"
  | "last_minute"
  | "not_needed";

export type ChecklistCategory =
  | "documents"
  | "mom_labor"
  | "mom_postpartum"
  | "baby"
  | "confinement_mom"
  | "confinement_baby"
  | "partner"
  | "going_home"
  | "last_minute";

export type Priority = "must" | "recommended" | "optional";

export type ItemSource = "general" | "user";

export type ChecklistTiming =
  | "prepare_now"
  | "wash_before_pack"
  | "pack_now"
  | "grab_before_leaving"
  | "confirm_beforehand";

export type PackTier = "core" | "confirm" | "optional" | "hidden";

export type ItemKind = "item" | "task";

export type ChecklistBag =
  | "documents_folder"
  | "mom_bag"
  | "baby_bag"
  | "dad_backpack"
  | "car"
  | "last_minute"
  | "none";

export type ItemBulk = "small" | "medium" | "large";

export type ChecklistMode = "lean" | "full";

export type PreparationKind =
  | "buy_and_pack"
  | "buy_for_home"
  | "pack_existing"
  | "wash_then_pack"
  | "document"
  | "last_minute"
  | "task"
  | "install_or_place";

export type ChecklistItem = {
  id: string;
  name: string;
  category: ChecklistCategory;
  priority: Priority;
  quantity?: string;
  note?: string;
  status: PackStatus;
  source: ItemSource;
  sourceLabel?: string;
  editable: boolean;
  removable: boolean;
  packTier?: PackTier;
  itemKind?: ItemKind;
  preparationKind?: PreparationKind;
  bag?: ChecklistBag;
  bulk?: ItemBulk;
  timing: ChecklistTiming;
  updatedAt?: number;
};

export type TemplateChecklistItem = Omit<ChecklistItem, "status"> & {
  status?: PackStatus;
};

export type ChecklistPersistence = {
  currentItems?: ChecklistItem[];
  customItems?: ChecklistItem[];
  hiddenTemplateItemIds?: string[];
};

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documents: "证件包",
  mom_labor: "妈妈包",
  mom_postpartum: "妈妈包",
  baby: "宝宝包",
  confinement_mom: "月子妈妈包",
  confinement_baby: "宝宝家中囤货",
  partner: "爸爸协作",
  going_home: "出院返家",
  last_minute: "临出门拿",
};

export const CATEGORY_ORDER: ChecklistCategory[] = [
  "documents",
  "mom_labor",
  "mom_postpartum",
  "baby",
  "confinement_mom",
  "confinement_baby",
  "partner",
  "going_home",
  "last_minute",
];
