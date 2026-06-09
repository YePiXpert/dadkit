import {
  filterItemsForChecklistMode,
  normalizeChecklistItem,
} from "@/lib/rules";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRIORITY_LABELS,
  getStatusLabel,
  type ChecklistItem,
  type PackStatus,
  type UserProfile,
} from "@/lib/types";

const DAD_EXECUTION_KEYWORDS = [
  "证件",
  "身份证",
  "医保卡",
  "电话",
  "入口",
  "路线",
  "停车",
  "支付",
  "押金",
  "临出门",
  "安全座椅",
  "产科",
  "住院处",
];

function formatProfile(profile: UserProfile | undefined, title: string) {
  const lines = [title];

  if (profile?.dueDate) {
    lines.push(`预产期：${profile.dueDate}`);
  }

  lines.push(
    "提醒：医院入院要求、陪产规则、提供物品可能变化，请以最近一次产检、入院须知或医院通知为准。",
  );

  return lines.join("\n");
}

function lineForItem(item: ChecklistItem) {
  const normalized = normalizeChecklistItem(item);
  const detail = [
    getStatusLabel(normalized.status, normalized.itemKind),
    PRIORITY_LABELS[normalized.priority],
    normalized.quantity ? `数量：${normalized.quantity}` : undefined,
    normalized.note,
  ]
    .filter(Boolean)
    .join(" · ");

  return `- ${normalized.name}${detail ? `（${detail}）` : ""}`;
}

function section(title: string, items: ChecklistItem[]) {
  if (items.length === 0) {
    return "";
  }

  return [`\n## ${title}`, ...items.map(lineForItem)].join("\n");
}

function byCategory(items: ChecklistItem[]) {
  return CATEGORY_ORDER.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);

    if (categoryItems.length === 0) {
      return "";
    }

    return section(CATEGORY_LABELS[category], categoryItems);
  })
    .filter(Boolean)
    .join("\n");
}

function isIncomplete(status: PackStatus) {
  return !["packed", "hospital_provided", "not_needed"].includes(status);
}

export function generateShareText(
  items: ChecklistItem[],
  profile?: UserProfile,
  title = "DadKit 待产准备清单",
) {
  const normalizedItems = items.map(normalizeChecklistItem);
  const packed = normalizedItems.filter((item) =>
    ["packed", "hospital_provided"].includes(item.status),
  );
  const lastMinute = normalizedItems.filter(
    (item) =>
      item.category === "last_minute" ||
      item.bag === "last_minute" ||
      (item.bag !== "car" &&
        item.timing === "grab_before_leaving" &&
        item.itemKind === "task"),
  );
  const hospitalQuestions = normalizedItems.filter(
    (item) => item.category === "hospital_questions" || item.itemKind === "question",
  );
  const incomplete = normalizedItems.filter(
    (item) =>
      isIncomplete(item.status) &&
      item.status !== "last_minute" &&
      item.category !== "last_minute" &&
      item.bag !== "last_minute" &&
      !(
        item.bag !== "car" &&
        item.timing === "grab_before_leaving" &&
        item.itemKind === "task"
      ) &&
      item.category !== "hospital_questions" &&
      item.itemKind !== "question",
  );

  return [
    formatProfile(profile, title),
    section("已打包 / 医院提供", packed),
    "\n## 未完成",
    byCategory(incomplete) || "- 暂无",
    section("临出门拿", lastMinute),
    section("医院待确认", hospitalQuestions),
  ]
    .filter(Boolean)
    .join("\n");
}

export function generateLeanShareText(
  items: ChecklistItem[],
  profile?: UserProfile,
) {
  return generateShareText(
    filterItemsForChecklistMode(items, "lean"),
    profile,
    "DadKit 精简待产准备清单",
  );
}

function hasDadExecutionKeyword(item: ChecklistItem) {
  return DAD_EXECUTION_KEYWORDS.some((keyword) => item.name.includes(keyword));
}

function dadExecutionItems(items: ChecklistItem[]) {
  return items.map(normalizeChecklistItem).filter((item) => {
    if (item.status === "not_needed") {
      return false;
    }

    if (item.category === "documents" || item.category === "hospital_questions") {
      return true;
    }

    if (item.category === "partner" || item.category === "last_minute") {
      return true;
    }

    if (
      item.packTier === "core" &&
      ["mom_labor", "mom_postpartum", "baby", "going_home"].includes(item.category)
    ) {
      return true;
    }

    return hasDadExecutionKeyword(item);
  });
}

export function generateDadExecutionShareText(
  items: ChecklistItem[],
  profile?: UserProfile,
) {
  const dadItems = dadExecutionItems(items);
  const docs = dadItems.filter((item) => item.category === "documents");
  const phone = dadItems.filter(
    (item) =>
      item.name.includes("电话") ||
      item.name.includes("产科") ||
      item.name.includes("住院处") ||
      item.name.includes("急诊"),
  );
  const route = dadItems.filter(
    (item) =>
      item.name.includes("入口") ||
      item.name.includes("路线") ||
      item.name.includes("停车"),
  );
  const payment = dadItems.filter(
    (item) => item.name.includes("支付") || item.name.includes("押金"),
  );
  const lastMinute = dadItems.filter(
    (item) =>
      item.category === "last_minute" ||
      item.bag === "last_minute" ||
      (item.bag !== "car" &&
        item.timing === "grab_before_leaving" &&
        item.itemKind === "task"),
  );
  const goingHome = dadItems.filter(
    (item) =>
      item.name.includes("安全座椅") ||
      item.name.includes("宝宝出院衣物") ||
      item.name.includes("包被") ||
      item.category === "going_home",
  );
  const momBabyCore = dadItems.filter((item) =>
    ["mom_labor", "mom_postpartum", "baby"].includes(item.category),
  );
  const questions = dadItems.filter(
    (item) => item.category === "hospital_questions" || item.itemKind === "question",
  );

  return [
    formatProfile(profile, "DadKit 爸爸执行版"),
    section("保存电话", phone),
    section("确认路线", route),
    section("证件包", docs),
    section("支付 / 押金", payment),
    section("临出门拿", lastMinute),
    section("出院返家", goingHome),
    section("妈妈和宝宝核心物品", momBabyCore),
    section("下次产检要问的问题", questions),
  ]
    .filter(Boolean)
    .join("\n");
}

export function generatePartnerShareText(
  items: ChecklistItem[],
  profile?: UserProfile,
) {
  return generateDadExecutionShareText(items, profile);
}
