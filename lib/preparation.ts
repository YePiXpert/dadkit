import type {
  ChecklistItem,
  PackStatus,
  PreparationKind,
} from "@/lib/types";

const BUY_AND_PACK_KEYWORDS = [
  "一次性内裤",
  "产褥垫",
  "产后卫生巾",
  "尿不湿",
  "湿巾",
  "棉柔巾",
  "溢乳垫",
  "乳头膏",
];

const GO_CHECK_KEYWORDS = [
  "证件包",
  "手机",
  "充电器",
  "充电线",
  "眼镜",
  "隐形眼镜",
  "常用药",
  "医生确认用药",
  "妈妈包",
  "宝宝包",
  "安全座椅",
  "关门窗水电燃气",
];

const LAST_MINUTE_DOCUMENT_ITEM_KEYWORDS = [
  "身份证件",
  "医保卡",
  "社保卡",
  "母子健康手册",
  "孕产资料",
  "产检资料",
];

export const PREPARATION_KIND_LABELS: Record<PreparationKind, string> = {
  buy_and_pack: "需要购买/补货",
  pack_existing: "已有物品，直接打包",
  wash_then_pack: "清洗后打包",
  document: "证件/资料整理",
  last_minute: "临出门拿",
  question: "医院问题",
  task: "爸爸任务",
  install_or_place: "安装/放车上",
};

export function inferPreparationKind(item: ChecklistItem): PreparationKind {
  if (item.preparationKind) {
    return item.preparationKind;
  }

  if (item.itemKind === "question" || item.category === "hospital_questions") {
    return "question";
  }

  if (shouldInstallOrPlace(item)) {
    return "install_or_place";
  }

  if (
    item.category === "last_minute" ||
    item.bag === "last_minute" ||
    item.timing === "grab_before_leaving"
  ) {
    return "last_minute";
  }

  if (item.itemKind === "task") {
    return "task";
  }

  if (item.category === "documents") {
    return "document";
  }

  if (item.timing === "wash_before_pack") {
    return "wash_then_pack";
  }

  if (BUY_AND_PACK_KEYWORDS.some((keyword) => item.name.includes(keyword))) {
    return "buy_and_pack";
  }

  return "pack_existing";
}

export function getStatusOptionsForItem(item: ChecklistItem): PackStatus[] {
  const preparationKind = inferPreparationKind(item);

  if (preparationKind === "buy_and_pack") {
    return ["todo", "bought", "packed", "hospital_provided", "not_needed"];
  }

  if (preparationKind === "pack_existing") {
    return ["todo", "packed", "hospital_provided", "not_needed"];
  }

  if (preparationKind === "wash_then_pack") {
    return ["todo", "washed", "packed", "hospital_provided", "not_needed"];
  }

  if (preparationKind === "document") {
    return ["todo", "packed", "last_minute", "not_needed"];
  }

  if (preparationKind === "last_minute") {
    return ["todo", "last_minute", "packed", "not_needed"];
  }

  if (preparationKind === "question") {
    return ["todo", "packed", "hospital_provided", "not_needed"];
  }

  return ["todo", "packed", "not_needed"];
}

export function getQuickStatusOptionsForItem(item: ChecklistItem): PackStatus[] {
  const preparationKind = inferPreparationKind(item);

  if (preparationKind === "buy_and_pack") {
    return ["todo", "bought", "packed"];
  }

  if (preparationKind === "wash_then_pack") {
    return ["todo", "washed", "packed"];
  }

  if (preparationKind === "last_minute") {
    return ["todo", "last_minute", "packed"];
  }

  return ["todo", "packed"];
}

export function getStatusLabelForItem(
  status: PackStatus,
  item: ChecklistItem,
): string {
  const preparationKind = inferPreparationKind(item);

  if (preparationKind === "document") {
    return (
      {
        todo: "待整理",
        packed: "已放入证件包",
        last_minute: "临出门拿",
        not_needed: "不需要",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待整理";
  }

  if (preparationKind === "buy_and_pack") {
    return (
      {
        todo: "待购买",
        bought: "已购买",
        packed: "已打包",
        hospital_provided: "医院提供",
        not_needed: "不需要",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待准备";
  }

  if (preparationKind === "pack_existing") {
    return (
      {
        todo: "待准备",
        packed: "已打包",
        hospital_provided: "医院提供",
        not_needed: "不需要",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待准备";
  }

  if (preparationKind === "wash_then_pack") {
    return (
      {
        todo: "待清洗",
        washed: "已清洗",
        packed: "已打包",
        hospital_provided: "医院提供",
        not_needed: "不需要",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? fallbackStatusLabel(status);
  }

  if (preparationKind === "last_minute") {
    return (
      {
        todo: "待放到固定位置",
        last_minute: "临出门拿",
        packed: "已确认",
        not_needed: "不需要",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待放到固定位置";
  }

  if (preparationKind === "question") {
    return (
      {
        todo: "待问",
        packed: "已确认",
        hospital_provided: "医院提供",
        not_needed: "不适用",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待问";
  }

  if (preparationKind === "task") {
    return (
      {
        todo: "待完成",
        packed: "已完成",
        not_needed: "不适用",
      } as Partial<Record<PackStatus, string>>
    )[status] ?? "待完成";
  }

  return (
    {
      todo: "待确认",
      packed: "已确认",
      not_needed: "不适用",
    } as Partial<Record<PackStatus, string>>
  )[status] ?? "待确认";
}

export function isShoppingListItem(item: ChecklistItem) {
  return (
    item.category !== "documents" &&
    item.itemKind !== "question" &&
    item.itemKind !== "task" &&
    item.bag !== "last_minute" &&
    inferPreparationKind(item) === "buy_and_pack" &&
    item.status !== "packed" &&
    item.status !== "hospital_provided" &&
    item.status !== "not_needed"
  );
}

export function isGoCheckItem(item: ChecklistItem) {
  if (item.category === "documents") {
    return false;
  }

  if (
    !item.name.includes("证件包") &&
    LAST_MINUTE_DOCUMENT_ITEM_KEYWORDS.some((keyword) =>
      item.name.includes(keyword),
    )
  ) {
    return false;
  }

  if (item.category === "last_minute" || item.bag === "last_minute") {
    return true;
  }

  if (item.name.includes("安全座椅")) {
    return true;
  }

  return GO_CHECK_KEYWORDS.some((keyword) => item.name.includes(keyword));
}

export function getShoppingGroup(item: ChecklistItem) {
  if (
    item.name.includes("溢乳垫") ||
    item.name.includes("乳头膏") ||
    item.name.includes("哺乳")
  ) {
    return "nursing";
  }

  if (item.bag === "baby_bag" || item.category === "baby") {
    return "baby_bag";
  }

  return "mom_bag";
}

function fallbackStatusLabel(status: PackStatus) {
  return (
    {
      todo: "待处理",
      bought: "已购买",
      washed: "已清洗",
      packed: "已完成",
      last_minute: "临出门拿",
      hospital_provided: "医院提供",
      not_needed: "不需要",
    } satisfies Record<PackStatus, string>
  )[status];
}

function shouldInstallOrPlace(item: ChecklistItem) {
  return (
    item.itemKind === "task" &&
    (item.bag === "car" ||
      item.name.includes("安全座椅") ||
      item.name.includes("返家交通"))
  );
}
