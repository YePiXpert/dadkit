import { matchesChecklistSearch } from "@/lib/checklist-search";
import type { HouseholdPortableData } from "@/lib/household/types";
import { householdMemberLabel } from "@/lib/household/selectors";
import { planningDaysFromToday } from "@/lib/planning/date";
import { formatPlanningMoney } from "@/lib/planning/money";
import { itemPlanningValuesFromPortable } from "@/lib/planning/portable";
import type { ItemPlanningPortableData, ItemPlanningValues } from "@/lib/planning/types";
import type { ChecklistItem } from "@/lib/types";

export type PlanningListFilter = "all" | "unassigned" | "overdue" | "due-soon" | "estimated" | "actual";
export type PlanningRow = { item: ChecklistItem; values: ItemPlanningValues };

export function getItemPlanningValues(planning: ItemPlanningPortableData, itemId: string) {
  return itemPlanningValuesFromPortable(planning, itemId);
}

export function hasItemPlanningData(planning: ItemPlanningPortableData, itemId: string) {
  const values = getItemPlanningValues(planning, itemId);
  return values.assigneeIds.length > 0 || values.dueDate !== "" || values.estimatedPriceFen !== null || values.actualPriceFen !== null || values.purchaseChannel !== "" || values.storageLocation !== "";
}

export function hasAnyEffectiveItemPlanning(planning: ItemPlanningPortableData) {
  return Object.keys(planning.items).some((id) => hasItemPlanningData(planning, id));
}

export function isPlanningItemOverdue(item: ChecklistItem, values: ItemPlanningValues, today: string) {
  if (item.status === "packed" || item.status === "not_needed") return false;
  const days = planningDaysFromToday(values.dueDate, today);
  return days !== undefined && days < 0;
}

export function isPlanningItemDueSoon(item: ChecklistItem, values: ItemPlanningValues, today: string) {
  if (item.status === "packed" || item.status === "not_needed") return false;
  const days = planningDaysFromToday(values.dueDate, today);
  return days !== undefined && days >= 0 && days <= 7;
}

export function derivePlanningSummary(checklist: readonly ChecklistItem[], planning: ItemPlanningPortableData, today: string) {
  let unassignedCount = 0, overdueCount = 0, dueSoonCount = 0, estimatedTotalFen = 0, actualTotalFen = 0, estimatedCoverageCount = 0, actualCoverageCount = 0;
  for (const item of checklist) {
    if (item.status === "not_needed") continue;
    const values = getItemPlanningValues(planning, item.id);
    if (values.assigneeIds.length === 0) unassignedCount += 1;
    if (isPlanningItemOverdue(item, values, today)) overdueCount += 1;
    if (isPlanningItemDueSoon(item, values, today)) dueSoonCount += 1;
    if (values.estimatedPriceFen !== null) { estimatedCoverageCount += 1; estimatedTotalFen += values.estimatedPriceFen; }
    if (values.actualPriceFen !== null) { actualCoverageCount += 1; actualTotalFen += values.actualPriceFen; }
  }
  return { activeCount: checklist.filter((item) => item.status !== "not_needed").length, unassignedCount, overdueCount, dueSoonCount, estimatedTotalFen, actualTotalFen, estimatedCoverageCount, actualCoverageCount };
}

export function derivePlanningRows(
  checklist: readonly ChecklistItem[],
  planning: ItemPlanningPortableData,
  options: { today: string; filter?: PlanningListFilter; assignee?: "all" | "unassigned" | string; includeNotNeeded?: boolean; query?: string },
) {
  const filter = options.filter ?? "all";
  const assignee = options.assignee ?? "all";
  return checklist.map((item, index) => ({ index, item, values: getItemPlanningValues(planning, item.id) }))
    .filter(({ item, values }) => {
      if (!options.includeNotNeeded && item.status === "not_needed") return false;
      if (options.query && !matchesChecklistSearch(item, options.query)) return false;
      if (assignee === "unassigned" && values.assigneeIds.length > 0) return false;
      if (assignee !== "all" && assignee !== "unassigned" && !values.assigneeIds.includes(assignee)) return false;
      if (filter === "unassigned" && values.assigneeIds.length > 0) return false;
      if (filter === "overdue" && !isPlanningItemOverdue(item, values, options.today)) return false;
      if (filter === "due-soon" && !isPlanningItemDueSoon(item, values, options.today)) return false;
      if (filter === "estimated" && values.estimatedPriceFen === null) return false;
      if (filter === "actual" && values.actualPriceFen === null) return false;
      return true;
    })
    .sort((left, right) => planningSortRank(left.item, left.values, options.today) - planningSortRank(right.item, right.values, options.today) || left.index - right.index)
    .map(({ item, values }) => ({ item, values }));
}

function planningSortRank(item: ChecklistItem, values: ItemPlanningValues, today: string) {
  const days = planningDaysFromToday(values.dueDate, today);
  if (isPlanningItemOverdue(item, values, today)) return 0;
  if (days === 0 && item.status !== "packed" && item.status !== "not_needed") return 1;
  if (isPlanningItemDueSoon(item, values, today)) return 2;
  if (values.assigneeIds.length === 0 && (item.priority === "must" || item.packTier === "core")) return 3;
  if (values.dueDate) return 4;
  return 5;
}

export function getPlanningAssigneeLabel(
  assigneeIds: readonly string[],
  household?: HouseholdPortableData,
) {
  if (assigneeIds.length === 0) return "未分工";
  const labels = assigneeIds.map((id) => household ? householdMemberLabel(household, id) : "未知成员");
  if (labels.length <= 2) return labels.join("、");
  return `${labels.slice(0, 2).join("、")}等 ${labels.length} 人`;
}

export { formatPlanningMoney };
