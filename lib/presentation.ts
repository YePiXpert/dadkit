import { normalizeChecklistItem } from "@/lib/rules";
import {
  getShoppingGroup,
  isGoCheckItem,
  isShoppingListItem,
} from "@/lib/preparation";
import type { ChecklistItem } from "@/lib/types";

export type ChecklistVisualGroup =
  | "all"
  | "documents_folder"
  | "mom_bag"
  | "baby_bag"
  | "dad"
  | "shopping"
  | "go"
  | "questions"
  | "last_minute"
  | "going_home";

export const CHECKLIST_VISUAL_GROUPS: Array<{
  id: ChecklistVisualGroup;
  label: string;
}> = [
  { id: "all", label: "全部" },
  { id: "documents_folder", label: "证件包检查" },
  { id: "mom_bag", label: "妈妈包" },
  { id: "baby_bag", label: "宝宝包" },
  { id: "shopping", label: "购物清单" },
  { id: "dad", label: "爸爸协作" },
  { id: "going_home", label: "出院返家" },
  { id: "questions", label: "下次产检问" },
  { id: "go", label: "临出门检查" },
  { id: "last_minute", label: "临出门拿" },
];

export const CHECKLIST_GROUP_LABELS: Record<ChecklistVisualGroup, string> = {
  all: "全部",
  documents_folder: "证件包检查",
  mom_bag: "妈妈包",
  baby_bag: "宝宝包",
  dad: "爸爸协作",
  shopping: "购物清单",
  go: "临出门检查",
  questions: "到下次产检时问清楚",
  last_minute: "临出门拿",
  going_home: "出院返家",
};

export const CHECKLIST_GROUP_ORDER: ChecklistVisualGroup[] = [
  "documents_folder",
  "mom_bag",
  "baby_bag",
  "dad",
  "going_home",
  "questions",
  "last_minute",
];

export function getChecklistVisualGroup(item: ChecklistItem): ChecklistVisualGroup {
  const normalized = normalizeChecklistItem(item);

  if (normalized.category === "documents") {
    return "documents_folder";
  }

  if (
    normalized.category === "mom_labor" ||
    normalized.category === "mom_postpartum"
  ) {
    return "mom_bag";
  }

  if (normalized.category === "baby") {
    return "baby_bag";
  }

  if (
    normalized.category === "last_minute" ||
    normalized.status === "last_minute" ||
    normalized.bag === "last_minute"
  ) {
    return "last_minute";
  }

  if (normalized.category === "partner") {
    return "dad";
  }

  if (normalized.category === "hospital_questions" || normalized.itemKind === "question") {
    return "questions";
  }

  return "going_home";
}

export function filterItemsByVisualGroup(
  items: ChecklistItem[],
  visualGroup: ChecklistVisualGroup,
) {
  if (visualGroup === "all") {
    return items;
  }

  if (visualGroup === "shopping") {
    return items.map(normalizeChecklistItem).filter(isShoppingListItem);
  }

  if (visualGroup === "go") {
    return items.map(normalizeChecklistItem).filter(isGoCheckItem);
  }

  return items.filter((item) => getChecklistVisualGroup(item) === visualGroup);
}

export function groupItemsForChecklist(items: ChecklistItem[]) {
  return CHECKLIST_GROUP_ORDER.map((group) => ({
    group,
    label: CHECKLIST_GROUP_LABELS[group],
    items: items.filter((item) => getChecklistVisualGroup(item) === group),
  })).filter((entry) => entry.items.length > 0);
}

export function groupItemsForShopping(items: ChecklistItem[]) {
  const groups = [
    { group: "mom_bag", label: "妈妈包" },
    { group: "baby_bag", label: "宝宝包" },
    { group: "nursing", label: "哺乳相关" },
  ];

  return groups
    .map((group) => ({
      ...group,
      items: items
        .map(normalizeChecklistItem)
        .filter((item) => getShoppingGroup(item) === group.group),
    }))
    .filter((entry) => entry.items.length > 0);
}
