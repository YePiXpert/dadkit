"use client";

import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

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
  BAG_LABELS,
  ITEM_KIND_LABELS,
  STATUS_LABELS,
  TIMING_LABELS,
  getStatusLabel,
  type ChecklistItem,
  type PackStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ChecklistItemRowProps = {
  item: ChecklistItem;
};

export function ChecklistItemRow({ item }: ChecklistItemRowProps) {
  const updateItem = useDadKitStore((state) => state.updateItem);
  const cycleItemStatus = useDadKitStore((state) => state.cycleItemStatus);
  const removeItem = useDadKitStore((state) => state.removeItem);
  const itemKind = item.itemKind ?? "item";
  const hasDetails = Boolean(item.note);
  const isDone =
    itemKind === "question" || itemKind === "task"
      ? item.status !== "todo"
      : item.status === "packed";
  const quickActionLabel = getQuickActionLabel(itemKind, isDone);
  const statusOptions = getStatusOptions(itemKind);
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
        "grid grid-cols-[auto_1fr] gap-2 rounded-xl border border-border p-3 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center",
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
          <StatusBadge itemKind={itemKind} status={item.status} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
          {item.quantity ? <span>数量：{item.quantity}</span> : null}
          <span>类型：{ITEM_KIND_LABELS[itemKind]}</span>
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
                {getStatusLabel(value as PackStatus, itemKind)}
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
}

function getQuickActionLabel(itemKind: ChecklistItem["itemKind"], isDone: boolean) {
  if (itemKind === "question") {
    return isDone ? "重新标为待确认" : "标记为已确认";
  }

  if (itemKind === "task") {
    return isDone ? "重新标为待完成" : "标记为已完成";
  }

  return "切换到下一个状态";
}

function getStatusOptions(itemKind: ChecklistItem["itemKind"]): PackStatus[] {
  if (itemKind === "question") {
    return ["todo", "packed", "hospital_provided", "not_needed"];
  }

  if (itemKind === "task") {
    return ["todo", "packed", "not_needed"];
  }

  return Object.keys(STATUS_LABELS) as PackStatus[];
}
