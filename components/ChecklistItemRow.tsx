"use client";

import Link from "next/link";
import { memo } from "react";
import { CheckCircle2, Hospital, RotateCcw, Trash2 } from "lucide-react";

import { EditItemDialog } from "@/components/EditItemDialog";
import { ItemTag } from "@/components/ItemTag";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDadKitStore } from "@/lib/store";
import {
  PREPARATION_KIND_LABELS,
  getQuickStatusOptionsForItem,
  getStatusLabelForItem,
  getStatusOptionsForItem,
  inferPreparationKind,
} from "@/lib/preparation";
import {
  BAG_LABELS,
  TIMING_LABELS,
  type ChecklistItem,
  type PackStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ChecklistItemRowProps = {
  item: ChecklistItem;
};

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
}: ChecklistItemRowProps) {
  const updateItem = useDadKitStore((state) => state.updateItem);
  const cycleItemStatus = useDadKitStore((state) => state.cycleItemStatus);
  const removeItem = useDadKitStore((state) => state.removeItem);
  const itemKind = item.itemKind ?? "item";
  const preparationKind = inferPreparationKind(item);
  const hasDetails = Boolean(item.note);
  const isDone = ["packed", "hospital_provided", "not_needed"].includes(
    item.status,
  );
  const isHospitalConfirmation =
    itemKind === "question" ||
    item.timing === "confirm_with_hospital" ||
    item.packTier === "confirm";
  const quickActionLabel = getQuickActionLabel(item);
  const statusOptions = getStatusOptionsForItem(item);
  const rowTone =
    item.packTier === "confirm" || itemKind === "question"
      ? "border-amber/35 bg-amber-soft/55"
      : itemKind === "task"
        ? "border-primary/20 bg-secondary/70"
      : item.packTier === "optional" || item.packTier === "hidden"
        ? "bg-card/60 opacity-85"
        : "bg-card";

  return (
    <div
      className={cn(
        "grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-border p-3 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center",
        rowTone,
      )}
    >
      <Button
        size="icon"
        className={cn(
          "mt-0.5 size-8 rounded-md border",
          isDone
            ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-primary/40 bg-card text-primary hover:bg-secondary",
        )}
        variant="ghost"
        title={quickActionLabel}
        onClick={() => cycleItemStatus(item.id)}
      >
        {isDone ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
        <span className="sr-only">{quickActionLabel}</span>
      </Button>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-sm font-semibold leading-6">
            {item.name}
          </h3>
          <ItemTag item={item} />
          <StatusBadge item={item} itemKind={itemKind} status={item.status} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
          {item.quantity ? <span>数量：{item.quantity}</span> : null}
          <span>动作：{PREPARATION_KIND_LABELS[preparationKind]}</span>
          {item.bag && item.bag !== "none" ? (
            <span>放置：{BAG_LABELS[item.bag]}</span>
          ) : null}
        </div>
        {hasDetails ? (
          <details className="text-xs leading-5 text-muted-foreground">
            <summary className="cursor-pointer select-none">备注/来源</summary>
            <div className="mt-1 grid gap-1">
              {item.note ? (
                <p className="break-words text-sm leading-6 text-muted-foreground">
                  {item.note}
                </p>
              ) : null}
              <span>时机：{TIMING_LABELS[item.timing]}</span>
              {item.bag ? <span>放置：{BAG_LABELS[item.bag]}</span> : null}
            </div>
          </details>
        ) : null}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1.5 sm:col-span-1">
        {isHospitalConfirmation ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/hospital">
              <Hospital className="size-4" />
              去确认
            </Link>
          </Button>
        ) : null}
        <Select
          value={item.status}
          onValueChange={(value) =>
            updateItem(item.id, { status: value as PackStatus })
          }
        >
          <SelectTrigger className="h-8 w-[116px] bg-card text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {getStatusLabelForItem(value as PackStatus, item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <EditItemDialog item={item} />
        {item.removable ? (
          <Button
            size="icon"
            className="size-8"
            variant="ghost"
            title="删除物品"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">删除物品</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
});

ChecklistItemRow.displayName = "ChecklistItemRow";

function getQuickActionLabel(item: ChecklistItem) {
  const options = getQuickStatusOptionsForItem(item);
  const currentIndex = options.indexOf(item.status);
  const nextStatus = options[(currentIndex + 1) % options.length] ?? "todo";

  return `切换为${getStatusLabelForItem(nextStatus, item)}`;
}
