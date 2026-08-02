import { matchesChecklistSearch } from "@/lib/checklist-search";
import { planningDaysFromToday } from "@/lib/planning/date";
import { formatPlanningMoney } from "@/lib/planning/money";
import { itemPlanningValuesFromPortable } from "@/lib/planning/portable";
import {
  PLANNING_ASSIGNEE_LABELS,
  type ItemPlanningPortableData,
  type ItemPlanningValues,
  type PlanningAssignee,
} from "@/lib/planning/types";
import type { ChecklistItem } from "@/lib/types";

export type PlanningListFilter =
  | "all"
  | "unassigned"
  | "overdue"
  | "due-soon"
  | "estimated"
  | "actual";

export type PlanningRow = {
  item: ChecklistItem;
  values: ItemPlanningValues;
};

export function getItemPlanningValues(
  planning: ItemPlanningPortableData,
  itemId: string,
) {
  return itemPlanningValuesFromPortable(planning, itemId);
}

export function hasItemPlanningData(
  planning: ItemPlanningPortableData,
  itemId: string,
) {
  const values = getItemPlanningValues(planning, itemId);
  return (
    values.assignee !== "unassigned" ||
    values.dueDate !== "" ||
    values.estimatedPriceFen !== null ||
    values.actualPriceFen !== null ||
    values.purchaseChannel !== "" ||
    values.storageLocation !== ""
  );
}

export function hasAnyEffectiveItemPlanning(planning: ItemPlanningPortableData) {
  return Object.keys(planning.items).some((itemId) =>
    hasItemPlanningData(planning, itemId),
  );
}

export function isPlanningItemOverdue(
  item: ChecklistItem,
  values: ItemPlanningValues,
  today: string,
) {
  if (item.status === "packed" || item.status === "not_needed") return false;
  const days = planningDaysFromToday(values.dueDate, today);
  return days !== undefined && days < 0;
}

export function isPlanningItemDueSoon(
  item: ChecklistItem,
  values: ItemPlanningValues,
  today: string,
) {
  if (item.status === "packed" || item.status === "not_needed") return false;
  const days = planningDaysFromToday(values.dueDate, today);
  return days !== undefined && days >= 0 && days <= 7;
}

export function derivePlanningSummary(
  checklist: readonly ChecklistItem[],
  planning: ItemPlanningPortableData,
  today: string,
) {
  let unassignedCount = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let estimatedTotalFen = 0;
  let actualTotalFen = 0;
  let estimatedCoverageCount = 0;
  let actualCoverageCount = 0;

  for (const item of checklist) {
    if (item.status === "not_needed") continue;
    const values = getItemPlanningValues(planning, item.id);
    if (values.assignee === "unassigned") unassignedCount += 1;
    if (isPlanningItemOverdue(item, values, today)) overdueCount += 1;
    if (isPlanningItemDueSoon(item, values, today)) dueSoonCount += 1;
    if (values.estimatedPriceFen !== null) {
      estimatedCoverageCount += 1;
      estimatedTotalFen += values.estimatedPriceFen;
    }
    if (values.actualPriceFen !== null) {
      actualCoverageCount += 1;
      actualTotalFen += values.actualPriceFen;
    }
  }

  return {
    activeCount: checklist.filter((item) => item.status !== "not_needed").length,
    unassignedCount,
    overdueCount,
    dueSoonCount,
    estimatedTotalFen,
    actualTotalFen,
    estimatedCoverageCount,
    actualCoverageCount,
  };
}

export function derivePlanningRows(
  checklist: readonly ChecklistItem[],
  planning: ItemPlanningPortableData,
  options: {
    today: string;
    filter?: PlanningListFilter;
    assignee?: "all" | PlanningAssignee;
    includeNotNeeded?: boolean;
    query?: string;
  },
) {
  const filter = options.filter ?? "all";
  const assignee = options.assignee ?? "all";

  return checklist
    .map((item, index) => ({
      index,
      item,
      values: getItemPlanningValues(planning, item.id),
    }))
    .filter(({ item, values }) => {
      if (!options.includeNotNeeded && item.status === "not_needed") return false;
      if (options.query && !matchesChecklistSearch(item, options.query)) return false;
      if (assignee !== "all" && values.assignee !== assignee) return false;
      if (filter === "unassigned" && values.assignee !== "unassigned") return false;
      if (filter === "overdue" && !isPlanningItemOverdue(item, values, options.today)) return false;
      if (filter === "due-soon" && !isPlanningItemDueSoon(item, values, options.today)) return false;
      if (filter === "estimated" && values.estimatedPriceFen === null) return false;
      if (filter === "actual" && values.actualPriceFen === null) return false;
      return true;
    })
    .sort((left, right) => {
      const rankDifference =
        planningSortRank(left.item, left.values, options.today) -
        planningSortRank(right.item, right.values, options.today);
      return rankDifference || left.index - right.index;
    })
    .map(({ item, values }) => ({ item, values }));
}

function planningSortRank(
  item: ChecklistItem,
  values: ItemPlanningValues,
  today: string,
) {
  const days = planningDaysFromToday(values.dueDate, today);
  if (isPlanningItemOverdue(item, values, today)) return 0;
  if (days === 0 && item.status !== "packed" && item.status !== "not_needed") return 1;
  if (isPlanningItemDueSoon(item, values, today)) return 2;
  if (
    values.assignee === "unassigned" &&
    (item.priority === "must" || item.packTier === "core")
  ) return 3;
  if (values.dueDate) return 4;
  return 5;
}

export function getPlanningAssigneeLabel(value: PlanningAssignee) {
  return PLANNING_ASSIGNEE_LABELS[value];
}

export { formatPlanningMoney };
