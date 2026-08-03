"use client";

import { CalendarDays, Check, MapPin, Pencil, ShoppingBag, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getChecklistItemState } from "@/lib/checklist-v2";
import type { HouseholdPortableData } from "@/lib/household/types";
import {
  formatPlanningMoney,
  getPlanningAssigneeLabel,
  isPlanningItemOverdue,
} from "@/lib/planning/selectors";
import type { ItemPlanningValues } from "@/lib/planning/types";
import { CATEGORY_LABELS, type ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  todo: "待处理",
  ready: "已备好",
  packed: "已装包",
  not_needed: "不需要",
};

export function PlanningItemRow({
  item,
  onEdit,
  onSelect,
  selected,
  today,
  values,
  household,
}: {
  item: ChecklistItem;
  onEdit: () => void;
  onSelect: () => void;
  selected: boolean;
  today: string;
  values: ItemPlanningValues;
  household: HouseholdPortableData;
}) {
  const overdue = isPlanningItemOverdue(item, values, today);
  const prices = [
    values.estimatedPriceFen !== null
      ? `预计 ${formatPlanningMoney(values.estimatedPriceFen)}`
      : "",
    values.actualPriceFen !== null
      ? `实际 ${formatPlanningMoney(values.actualPriceFen)}`
      : "",
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "grid min-w-0 gap-3 rounded-card bg-card p-4 shadow-sm transition-colors",
        selected && "bg-secondary/50",
        overdue && "ring-1 ring-destructive/40",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          aria-label={`${selected ? "取消选择" : "选择"}${item.name}`}
          aria-pressed={selected}
          className={cn(
            "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors",
            selected && "border-primary bg-primary text-primary-foreground",
          )}
          onClick={onSelect}
          type="button"
        >
          {selected ? <Check aria-hidden="true" className="size-5" /> : null}
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={onEdit} type="button">
          <span className="block break-words text-sm font-semibold">{item.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {CATEGORY_LABELS[item.category]} · {STATUS_LABELS[getChecklistItemState(item)]}
          </span>
        </button>
        <Button aria-label={`编辑${item.name}的分工与采购`} onClick={onEdit} size="icon" variant="ghost">
          <Pencil className="size-4" />
        </Button>
      </div>

      <button className="grid gap-2 text-left" onClick={onEdit} type="button">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="size-4" />
            {getPlanningAssigneeLabel(values.assigneeIds, household)}
          </span>
          {values.dueDate ? (
            <span className={cn("inline-flex items-center gap-1.5", overdue && "font-semibold text-destructive")}>
              <CalendarDays className="size-4" />
              {overdue ? "已逾期 · " : ""}{values.dueDate}
            </span>
          ) : null}
          {prices.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="size-4" />{prices.join(" · ")}
            </span>
          ) : null}
        </div>
        {values.purchaseChannel || values.storageLocation ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {values.purchaseChannel ? <span>渠道：{values.purchaseChannel}</span> : null}
            {values.storageLocation ? (
              <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{values.storageLocation}</span>
            ) : null}
          </div>
        ) : null}
      </button>
    </article>
  );
}
