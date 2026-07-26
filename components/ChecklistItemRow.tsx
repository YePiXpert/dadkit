"use client";

import { memo } from "react";
import {
  Ban,
  Check,
  Circle,
  MoreHorizontal,
  PackageCheck,
  RotateCcw,
} from "lucide-react";

import { ChecklistItemDetailsDialog } from "@/components/ChecklistItemDetailsDialog";
import { ChecklistItemIllustration } from "@/components/ChecklistItemIllustration";
import { useItemPhoto } from "@/components/ItemPhotoField";
import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import { formatChecklistDisplayText } from "@/lib/checklist-display";
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

type ChecklistItemRowProps = {
  item: ChecklistItem;
  showFullDescription?: boolean;
};

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
  showFullDescription = true,
}: ChecklistItemRowProps) {
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const itemState = getChecklistItemState(item);
  const actionLabel = getActionLabel(itemState);
  const itemPhoto = useItemPhoto(item.id);
  const StateIcon = STATE_ICONS[itemState];
  const displayOptions = {
    transformAlternatives: item.source === "general",
  } as const;
  const displayName = formatChecklistDisplayText(item.name, displayOptions);
  const displayNote = formatChecklistDisplayText(
    item.note || "按家庭和医院实际需要准备",
    displayOptions,
  );
  const displayQuantity = formatChecklistDisplayText(
    item.quantity || "1 件",
    displayOptions,
  );

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-2.5 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_26rem]",
        itemState === "ready" && "border-primary/30 bg-secondary/35",
        itemState === "packed" && "border-primary/35 bg-secondary/55",
        itemState === "not_needed" && "border-border/60 bg-muted/50",
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.35rem] bg-muted/75">
        {itemPhoto.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${displayName}的物品照片`}
            className="size-full object-cover"
            loading="lazy"
            src={itemPhoto.photoUrl}
          />
        ) : (
          <ChecklistItemIllustration
            className="h-[68%] w-[68%] max-h-28 max-w-28"
            item={item}
          />
        )}

        <span
          className={cn(
            "absolute right-2 top-2 inline-flex min-h-7 items-center gap-1 rounded-full border border-border/70 bg-card/95 px-2 text-[10px] font-semibold text-muted-foreground shadow-sm",
            itemState === "ready" && "border-primary/20 text-primary",
            itemState === "packed" &&
              "border-primary bg-primary text-primary-foreground",
            itemState === "not_needed" && "text-foreground/65",
          )}
        >
          <StateIcon className="size-3" strokeWidth={2.2} />
          {STATE_LABELS[itemState]}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-1.5 pb-1 pt-3">
        <h3
          className={cn(
            "break-words text-sm font-semibold leading-5 sm:text-[15px]",
            itemState === "not_needed" && "text-muted-foreground",
          )}
        >
          {displayName}
        </h3>

        <p className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">
          建议 {displayQuantity}
        </p>

        {showFullDescription ? (
          <p className="mt-2 min-h-10 whitespace-pre-wrap break-words rounded-xl bg-background/75 px-2 py-1.5 text-[11px] leading-[1.1rem] text-muted-foreground">
            {displayNote}
          </p>
        ) : null}

        <div className="mt-2.5 flex min-h-11 items-center justify-between gap-2 border-t border-border/70 pt-2">
          <ChecklistItemDetailsDialog
            item={item}
            photoController={itemPhoto}
            trigger={
              <button
                className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
              >
                <MoreHorizontal className="size-4 shrink-0" />
                <span className="truncate">详情</span>
              </button>
            }
          />

          <button
            aria-label={`${actionLabel}：${displayName}`}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground transition-all active:scale-95",
              itemState === "ready" &&
                "border-primary/30 bg-secondary text-primary",
              itemState === "packed" &&
                "border-primary bg-primary text-primary-foreground",
              itemState === "not_needed" && "border-border bg-muted",
            )}
            title={actionLabel}
            type="button"
            onClick={() => advanceItem(item.id)}
          >
            {itemState === "packed" ? (
              <Check className="size-5" strokeWidth={2.8} />
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
    </article>
  );
});

ChecklistItemRow.displayName = "ChecklistItemRow";

function getActionLabel(state: ChecklistItemState) {
  if (state === "ready") {
    return "标记已装包";
  }

  if (state === "packed" || state === "not_needed") {
    return "重新打开";
  }

  return "标记已备好";
}
