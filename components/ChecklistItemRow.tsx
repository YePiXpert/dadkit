"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  Ban,
  Check,
  Circle,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

import { ChecklistItemArt } from "@/components/ChecklistItemArt";
import { Badge } from "@/components/ui/badge";
import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import { formatChecklistDisplayText } from "@/lib/checklist-display";
import { triggerHaptic } from "@/lib/haptics";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<ChecklistItemState, string> = {
  todo: "待处理",
  ready: "已备好",
  packed: "已装包",
  not_needed: "不需要",
};

const STATE_ICONS = {
  todo: Circle,
  ready: PackageCheck,
  packed: Check,
  not_needed: Ban,
} satisfies Record<ChecklistItemState, typeof Circle>;

// 行左缘的 4px 状态色条：深色模式下整行底色差异很弱，色条扫读更稳。
const STATE_SPINE_CLASSES: Record<ChecklistItemState, string> = {
  todo: "bg-border",
  ready: "bg-primary/55",
  packed: "bg-primary",
  not_needed: "bg-muted-foreground/30",
};

type ChecklistItemRowProps = {
  compact?: boolean;
  departureMode?: boolean;
  item: ChecklistItem;
  onOpenDetails: (itemId: string) => void;
  showFullDescription?: boolean;
};

export const ChecklistItemRow = memo(function ChecklistItemRow({
  compact = false,
  departureMode = false,
  item,
  onOpenDetails,
  showFullDescription = true,
}: ChecklistItemRowProps) {
  const [justPacked, setJustPacked] = useState(false);
  const previousItemStateRef = useRef<ChecklistItemState | undefined>(undefined);
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const updateItem = useDadKitStore((state) => state.updateItem);
  const toggleItemSkipped = useDadKitStore((state) => state.toggleItemSkipped);
  const itemState = getChecklistItemState(item);
  const actionLabel = getActionLabel(itemState, departureMode);
  const StateIcon = STATE_ICONS[itemState];
  const displayOptions = {
    transformAlternatives: item.source === "general",
  } as const;
  const displayName = formatChecklistDisplayText(item.name, displayOptions);
  const displayNote = formatChecklistDisplayText(
    item.note || "按你们的实际需要慢慢准备，医院通知优先。",
    displayOptions,
  );
  const displayQuantity = formatChecklistDisplayText(
    item.quantity || "1 件",
    displayOptions,
  );

  useEffect(() => {
    const previous = previousItemStateRef.current;
    previousItemStateRef.current = itemState;

    if (previous === undefined || previous === itemState || itemState !== "packed") {
      return;
    }

    setJustPacked(true);
    const timeout = window.setTimeout(() => setJustPacked(false), 500);

    return () => window.clearTimeout(timeout);
  }, [itemState]);

  // 出发核对页只做最终勾选；已「不需要」的行由主按钮（重新打开）提供恢复入口，
  // 所以快速叉掉按钮只出现在普通清单的未跳过行上。
  const showSkipAction = !departureMode && itemState !== "not_needed";

  function handleSkipAction() {
    triggerHaptic("tap");
    toggleItemSkipped(item.id);
  }

  function handleAction() {
    triggerHaptic(
      itemState === "packed" || itemState === "not_needed" ? "tap" : "success",
    );
    if (departureMode) {
      updateItem(item.id, {
        status:
          itemState === "packed" || itemState === "not_needed"
            ? "todo"
            : "packed",
      });
      return;
    }

    advanceItem(item.id);
  }

  if (compact) {
    return (
      <article
          className={cn(
          "relative flex min-h-16 min-w-0 items-center gap-2.5 overflow-hidden rounded-card bg-card px-3 py-2 shadow-sm transition-shadow hover:shadow-md [content-visibility:auto] [contain-intrinsic-size:auto_4.5rem]",
          itemState === "ready" && "bg-secondary/35 ring-1 ring-primary/30",
          itemState === "packed" && "bg-secondary/55 ring-1 ring-primary/35",
          itemState === "not_needed" && "bg-muted/50 ring-1 ring-border/60",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-1",
            STATE_SPINE_CLASSES[itemState],
          )}
        />
        <div className="min-w-0 flex-1 py-1">
          <h3
            className={cn(
              "break-words text-[15px] font-semibold leading-5",
              itemState === "not_needed" && "text-muted-foreground",
            )}
          >
            {displayName}
          </h3>
          <p className="mt-0.5 text-[13px] leading-4 text-muted-foreground">
            建议 {displayQuantity} · {STATE_LABELS[itemState]}
          </p>
        </div>

        <button
          aria-label={`查看详情：${displayName}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          type="button"
          onClick={() => onOpenDetails(item.id)}
        >
          <MoreHorizontal className="size-5" />
        </button>

        {showSkipAction ? (
          <button
            aria-label={`标记不需要：${displayName}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            title="标记不需要，不占进度"
            type="button"
            onClick={handleSkipAction}
          >
            <Ban className="size-5" />
          </button>
        ) : null}

        <button
          aria-label={`${actionLabel}：${displayName}`}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-border transition-all hover:bg-secondary/70 hover:text-primary hover:ring-primary/40 active:scale-95",
            itemState === "ready" &&
              "bg-secondary text-primary ring-primary/30",
            itemState === "packed" &&
              "bg-primary text-primary-foreground ring-primary",
            itemState === "not_needed" && "bg-muted ring-border",
          )}
          title={actionLabel}
          type="button"
          onClick={handleAction}
        >
          {itemState === "packed" ? (
            <Check
              className={cn("size-5", justPacked && "sticker-pop")}
              strokeWidth={2.8}
            />
          ) : itemState === "ready" ? (
            <PackageCheck className="size-5" />
          ) : itemState === "not_needed" ? (
            <RotateCcw className="size-4" />
          ) : (
            <Circle className="size-5" />
          )}
        </button>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-card bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md [content-visibility:auto] [contain-intrinsic-size:auto_22rem]",
        itemState === "ready" && "bg-secondary/35 ring-1 ring-primary/30",
        itemState === "packed" && "bg-secondary/55 ring-1 ring-primary/35",
        itemState === "not_needed" && "bg-muted/50 ring-1 ring-border/60",
      )}
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-inset bg-muted/75 xs:aspect-[4/3]">
        <ChecklistItemArt alt={`${displayName}的物品插画`} item={item} />

        <Badge
          className="absolute right-2 top-2 min-h-7 shadow-sm"
          variant={
            itemState === "ready"
              ? "primaryOutline"
              : itemState === "packed"
                ? "primarySolid"
                : "outline"
          }
        >
          <StateIcon className="size-3" strokeWidth={2.2} />
          {STATE_LABELS[itemState]}
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-1.5 pb-1 pt-3">
        <h3
          className={cn(
            "break-words text-[15px] font-semibold leading-5",
            itemState === "not_needed" && "text-muted-foreground",
          )}
        >
          {displayName}
        </h3>

        <p className="mt-1 text-[13px] font-medium leading-4 text-muted-foreground">
          建议 {displayQuantity}
        </p>

        {showFullDescription ? (
          <p className="mt-2 min-h-10 whitespace-pre-wrap break-words rounded-inset bg-background/75 px-2 py-1.5 text-sm leading-6 text-muted-foreground">
            {displayNote}
          </p>
        ) : null}

        <div className="mt-2.5 flex min-h-11 items-center justify-between gap-2 border-t border-border/70 pt-2">
          <button
            className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-1 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onOpenDetails(item.id)}
          >
            <MoreHorizontal className="size-4 shrink-0" />
            <span className="truncate">详情</span>
          </button>

          <div className="flex items-center gap-2">
            {showSkipAction ? (
              <button
                aria-label={`标记不需要：${displayName}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                title="标记不需要，不占进度"
                type="button"
                onClick={handleSkipAction}
              >
                <Ban className="size-5" />
              </button>
            ) : null}

            <button
              aria-label={`${actionLabel}：${displayName}`}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-border transition-all hover:bg-secondary/70 hover:text-primary hover:ring-primary/40 active:scale-95",
                itemState === "ready" &&
                  "bg-secondary text-primary ring-primary/30",
                itemState === "packed" &&
                  "bg-primary text-primary-foreground ring-primary",
                itemState === "not_needed" && "bg-muted ring-border",
              )}
              title={actionLabel}
              type="button"
              onClick={handleAction}
            >
              {itemState === "packed" ? (
                <Check
                  className={cn("size-5", justPacked && "sticker-pop")}
                  strokeWidth={2.8}
                />
              ) : itemState === "ready" ? (
                <PackageCheck className="size-5" />
              ) : itemState === "not_needed" ? (
                <RotateCcw className="size-4" />
              ) : (
                <Circle className="size-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

ChecklistItemRow.displayName = "ChecklistItemRow";

function getActionLabel(state: ChecklistItemState, departureMode: boolean) {
  if (departureMode) {
    return state === "packed" || state === "not_needed"
      ? "重新核对"
      : "标记已确认";
  }

  if (state === "ready") return "标记已装包";
  if (state === "packed" || state === "not_needed") return "重新打开";
  return "标记已备好";
}
