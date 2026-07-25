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

export const PREPARATION_KIND_LABELS: Record<PreparationKind, string> = {
  buy_and_pack: "需要购买",
  pack_existing: "家里已有",
  wash_then_pack: "清洗后装包",
  document: "证件资料",
  last_minute: "临出门拿",
  task: "待办事项",
  install_or_place: "安装或放车上",
};

export function inferPreparationKind(item: ChecklistItem): PreparationKind {
  if (item.preparationKind) {
    return item.preparationKind;
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
    return ["todo", "bought", "packed", "not_needed"];
  }

  if (preparationKind === "wash_then_pack") {
    return ["todo", "washed", "packed", "not_needed"];
  }

  if (preparationKind === "document") {
    return ["todo", "packed", "last_minute", "not_needed"];
  }

  if (preparationKind === "last_minute") {
    return ["todo", "last_minute", "packed", "not_needed"];
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
    return labelFor(status, {
      todo: "待整理",
      packed: "已放入证件包",
      last_minute: "临出门拿",
      not_needed: "不需要",
    });
  }

  if (preparationKind === "buy_and_pack") {
    return labelFor(status, {
      todo: "待购买",
      bought: "已购买",
      packed: "已装包",
      not_needed: "不需要",
    });
  }

  if (preparationKind === "wash_then_pack") {
    return labelFor(status, {
      todo: "待清洗",
      washed: "已清洗",
      packed: "已装包",
      not_needed: "不需要",
    });
  }

  if (preparationKind === "last_minute") {
    return labelFor(status, {
      todo: "待放到固定位置",
      last_minute: "临出门拿",
      packed: "已确认",
      not_needed: "不需要",
    });
  }

  if (preparationKind === "task" || preparationKind === "install_or_place") {
    return labelFor(status, {
      todo: "待完成",
      packed: "已完成",
      not_needed: "不需要",
    });
  }

  return labelFor(status, {
    todo: "待准备",
    packed: "已装包",
    not_needed: "不需要",
  });
}

function labelFor(
  status: PackStatus,
  labels: Partial<Record<PackStatus, string>>,
) {
  return labels[status] ?? fallbackStatusLabel(status);
}

function fallbackStatusLabel(status: PackStatus) {
  return (
    {
      todo: "待处理",
      bought: "已购买",
      washed: "已清洗",
      packed: "已完成",
      last_minute: "临出门拿",
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
