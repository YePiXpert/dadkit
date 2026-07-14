export type DeliveryMode = "vaginal" | "c_section" | "unknown";

export type PackStatus =
  | "todo"
  | "bought"
  | "washed"
  | "packed"
  | "last_minute"
  | "hospital_provided"
  | "not_needed";

export type ChecklistCategory =
  | "documents"
  | "mom_labor"
  | "mom_postpartum"
  | "baby"
  | "partner"
  | "going_home"
  | "hospital_questions"
  | "last_minute";

export type Priority = "must" | "recommended" | "optional";

export type ItemSource = "general" | "region" | "hospital" | "user";

export type HospitalMode = "preset" | "custom" | "unknown";

export type VerificationStatus =
  | "official"
  | "user_entered"
  | "community"
  | "unverified";

export type ChecklistTiming =
  | "prepare_now"
  | "wash_before_pack"
  | "pack_now"
  | "grab_before_leaving"
  | "confirm_with_hospital";

export type PackTier = "core" | "confirm" | "optional" | "hidden";

export type ItemKind = "item" | "task" | "question";

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

export type BabySex = "girl" | "boy" | "unknown";

export type ChecklistFilterValue = "all";

export type PreparationKind =
  | "buy_and_pack"
  | "pack_existing"
  | "wash_then_pack"
  | "document"
  | "last_minute"
  | "question"
  | "task"
  | "install_or_place";

export type HospitalAnswerStatus =
  | "todo"
  | "confirmed"
  | "provided"
  | "not_provided"
  | "partial"
  | "not_needed";

export type HospitalAnswer = {
  /**
   * Optional only while reading legacy backups and component drafts. The store
   * assigns the active hospital scope before persisting an answer.
   */
  hospitalId?: string;
  itemId: string;
  name: string;
  status: HospitalAnswerStatus;
  note?: string;
  updatedAt: string;
};

export type UserProfile = {
  dueDate?: string;
  babySex?: BabySex;
  regionId: string;
  hospitalMode: HospitalMode;
  hospitalId?: string;
  customHospital?: HospitalProfile;
  deliveryMode: DeliveryMode;
  expectedStayDays: number;
  breastfeeding: boolean;
  partnerPresent: boolean;
  coldWeather: boolean;
  hospitalProvidedItemIds: string[];
  hospitalNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChecklistItem = {
  id: string;
  name: string;
  category: ChecklistCategory;
  priority: Priority;
  quantity?: string;
  note?: string;
  status: PackStatus;
  /** True only when the current status was assigned by a hospital rule. */
  hospitalProvidedByRule?: boolean;
  source: ItemSource;
  sourceLabel?: string;
  editable: boolean;
  removable: boolean;
  packTier?: PackTier;
  itemKind?: ItemKind;
  preparationKind?: PreparationKind;
  bag?: ChecklistBag;
  bulk?: ItemBulk;
  appliesTo?: {
    deliveryMode?: DeliveryMode[];
    breastfeeding?: boolean;
    partnerPresent?: boolean;
    coldWeather?: boolean;
  };
  timing: ChecklistTiming;
};

export type HospitalProfile = {
  mode: HospitalMode;
  hospitalId?: string;
  name?: string;
  aliases?: string[];
  country: string;
  province?: string;
  city?: string;
  district?: string;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: string;
  requiredDocuments: string[];
  hospitalProvidedItems: string[];
  recommendedItems: string[];
  notAllowedItems: string[];
  admissionNotes?: string;
  partnerPolicyNotes?: string;
  wardNotes?: string;
  paymentNotes?: string;
  parkingNotes?: string;
  sourceNotes?: string[];
};

export type RegionTemplate = {
  id: string;
  name: string;
  requiredDocuments: string[];
  recommendedItems: string[];
  notes: string[];
};

export type UserHospitalOverride = {
  hospitalId?: string;
  providedItemsOverride?: string[];
  requiredDocumentsOverride?: string[];
  selectedProvidedItemIds?: string[];
  notesOverride?: string;
  updatedAt: string;
};

export type TemplateChecklistItem = Omit<ChecklistItem, "status"> & {
  status?: PackStatus;
};

export type ChecklistPersistence = {
  currentItems?: ChecklistItem[];
  customItems?: ChecklistItem[];
  hiddenTemplateItemIds?: string[];
  hospitalOverrides?: UserHospitalOverride[];
};

export const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  documents: "证件包",
  mom_labor: "妈妈包",
  mom_postpartum: "妈妈包",
  baby: "宝宝包",
  partner: "爸爸协作",
  going_home: "出院返家",
  hospital_questions: "到下次产检时问清楚",
  last_minute: "临出门拿",
};

export const CATEGORY_ORDER: ChecklistCategory[] = [
  "documents",
  "mom_labor",
  "mom_postpartum",
  "baby",
  "partner",
  "going_home",
  "hospital_questions",
  "last_minute",
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  must: "必备",
  recommended: "推荐",
  optional: "可选",
};

export const STATUS_LABELS: Record<PackStatus, string> = {
  todo: "待购买",
  bought: "已购买",
  washed: "已清洗",
  packed: "已打包",
  last_minute: "临出门拿",
  hospital_provided: "医院提供",
  not_needed: "不需要",
};

export const HOSPITAL_ANSWER_LABELS: Record<HospitalAnswerStatus, string> = {
  todo: "待问",
  confirmed: "已确认",
  provided: "医院提供",
  not_provided: "需自备",
  partial: "部分提供",
  not_needed: "不适用",
};

export const SOURCE_LABELS: Record<ItemSource, string> = {
  general: "通用模板",
  region: "地区模板",
  hospital: "医院模板",
  user: "用户自定义",
};

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  vaginal: "自然产",
  c_section: "剖腹产",
  unknown: "还不确定",
};

export const HOSPITAL_MODE_LABELS: Record<HospitalMode, string> = {
  preset: "已收录医院",
  custom: "自定义医院",
  unknown: "暂未确定医院",
};

export const BABY_SEX_LABELS: Record<BabySex, string> = {
  girl: "女宝",
  boy: "男宝",
  unknown: "宝宝",
};

export const TIMING_LABELS: Record<ChecklistTiming, string> = {
  prepare_now: "现在准备",
  wash_before_pack: "清洗后打包",
  pack_now: "可直接打包",
  grab_before_leaving: "临出门拿",
  confirm_with_hospital: "向医院确认",
};

export const PACK_TIER_LABELS: Record<PackTier, string> = {
  core: "精简核心",
  confirm: "待确认",
  optional: "可选",
  hidden: "完整模式",
};

export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  item: "物品",
  task: "任务",
  question: "问题",
};

export const BAG_LABELS: Record<ChecklistBag, string> = {
  documents_folder: "证件包",
  mom_bag: "妈妈包",
  baby_bag: "宝宝包",
  dad_backpack: "爸爸背包",
  car: "车上/交通",
  last_minute: "临出门",
  none: "无需打包",
};

export const DISCLAIMER_TEXT =
  "DadKit 仅用于整理待产准备事项，不提供医疗诊断、治疗建议或医院官方入院要求。不同医院、病区、床位、生产方式和时间节点的要求可能不同，请以医生、助产士、护士、医院入院须知及当地政策为准。";

export const COMPLETED_STATUSES: PackStatus[] = [
  "packed",
  "hospital_provided",
  "not_needed",
];

export function getStatusLabel(
  status: PackStatus,
  itemKind: ItemKind = "item",
) {
  if (itemKind === "question") {
    if (status === "todo") {
      return "待确认";
    }

    if (status === "packed") {
      return "已确认";
    }

    if (status === "hospital_provided") {
      return "已确认提供";
    }

    if (status === "not_needed") {
      return "不需要确认";
    }
  }

  if (itemKind === "task") {
    if (status === "todo") {
      return "待完成";
    }

    if (status === "packed") {
      return "已完成";
    }

    if (status === "not_needed") {
      return "不需要";
    }
  }

  return STATUS_LABELS[status];
}
