"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Check, Circle, MoreHorizontal, RotateCcw } from "lucide-react";

import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import { formatChecklistDisplayText } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function getDepartureActionLabel(state: ChecklistItemState) {
  return state === "packed" || state === "not_needed"
    ? "重新核对"
    : "标记已确认";
}

type DepartureItemRowProps = {
  item: ChecklistItem;
  onOpenDetails: (itemId: string) => void;
};

export const DepartureItemRow = memo(function DepartureItemRow({
  item,
  onOpenDetails,
}: DepartureItemRowProps) {
  const [justPacked, setJustPacked] = useState(false);
  const previousItemStateRef = useRef<ChecklistItemState | undefined>(undefined);
  const updateItem = useDadKitStore((state) => state.updateItem);
  const itemState = getChecklistItemState(item);
  const confirmed = itemState === "packed" || itemState === "not_needed";
  const actionLabel = getDepartureActionLabel(itemState);
  const displayOptions = {
    transformAlternatives: item.source === "general",
  } as const;
  const displayName = formatChecklistDisplayText(item.name, displayOptions);
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

  function handleAction() {
    updateItem(item.id, {
      status: confirmed ? "todo" : "packed",
    });
  }

  return (
    <article
      className={cn(
        "flex min-h-16 min-w-0 items-center gap-2.5 rounded-card bg-card px-3 py-2 shadow-sm transition-shadow hover:shadow-md",
        itemState === "ready" && "bg-secondary/35 ring-1 ring-primary/30",
        itemState === "packed" && "bg-secondary/55 ring-1 ring-primary/35",
        itemState === "not_needed" && "bg-muted/50 ring-1 ring-border/60",
      )}
    >
      <div className="min-w-0 flex-1 py-1">
        <h3
          className={cn(
            "break-words text-[15px] font-semibold leading-5",
            itemState === "not_needed" && "text-muted-foreground",
            itemState === "packed" && "text-foreground",
          )}
        >
          {displayName}
        </h3>
        <p className="mt-0.5 text-[13px] leading-4 text-muted-foreground">
          建议 {displayQuantity}
          {itemState === "ready" ? " · 已备好" : ""}
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
        ) : itemState === "not_needed" ? (
          <RotateCcw className="size-4" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>
    </article>
  );
});

DepartureItemRow.displayName = "DepartureItemRow";
