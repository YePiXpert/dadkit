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
import { useItemPhoto } from "@/components/ItemPhotoField";
import { Badge } from "@/components/ui/badge";
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

// 所有卡片共享一个 IntersectionObserver，避免整页清单为每行各建一个实例。
const visibilityCallbacks = new Map<Element, (visible: boolean) => void>();
let sharedVisibilityObserver: IntersectionObserver | undefined;

function observeRowVisibility(
  element: Element,
  callback: (visible: boolean) => void,
) {
  if (typeof IntersectionObserver === "undefined") {
    callback(true);
    return () => {};
  }

  if (!sharedVisibilityObserver) {
    sharedVisibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibilityCallbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin: "600px 0px" },
    );
  }

  visibilityCallbacks.set(element, callback);
  sharedVisibilityObserver.observe(element);

  return () => {
    visibilityCallbacks.delete(element);
    sharedVisibilityObserver?.unobserve(element);
  };
}

type ChecklistItemRowProps = {
  departureMode?: boolean;
  item: ChecklistItem;
  onOpenDetails: (itemId: string) => void;
  showFullDescription?: boolean;
};

export const ChecklistItemRow = memo(function ChecklistItemRow({
  departureMode = false,
  item,
  onOpenDetails,
  showFullDescription = true,
}: ChecklistItemRowProps) {
  const articleRef = useRef<HTMLElement | null>(null);
  const [mediaEnabled, setMediaEnabled] = useState(false);
  const [justPacked, setJustPacked] = useState(false);
  const previousItemStateRef = useRef<ChecklistItemState | undefined>(undefined);
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const updateItem = useDadKitStore((state) => state.updateItem);
  const itemState = getChecklistItemState(item);
  const actionLabel = getActionLabel(itemState, departureMode);
  const itemPhoto = useItemPhoto(item.id, mediaEnabled);
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
    const element = articleRef.current;

    if (!element) {
      setMediaEnabled(true);
      return;
    }

    return observeRowVisibility(element, (visible) =>
      setMediaEnabled(visible),
    );
  }, []);

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

  return (
    <article
      ref={articleRef}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-card border border-border/70 bg-card p-2.5 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_26rem]",
        itemState === "ready" && "border-primary/30 bg-secondary/35",
        itemState === "packed" && "border-primary/35 bg-secondary/55",
        itemState === "not_needed" && "border-border/60 bg-muted/50",
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-inset bg-muted/75">
        {!mediaEnabled || itemPhoto.loading ? (
          <div
            aria-hidden="true"
            className="size-full animate-pulse bg-muted/70"
          />
        ) : itemPhoto.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${displayName}的物品照片`}
            className="size-full object-cover"
            loading="lazy"
            src={itemPhoto.photoUrl}
          />
        ) : (
          <ChecklistItemArt
            alt={`${displayName}的物品插画`}
            item={item}
          />
        )}

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
            "break-words text-sm font-semibold leading-5 sm:text-[15px]",
            itemState === "not_needed" && "text-muted-foreground",
          )}
        >
          {displayName}
        </h3>

        <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground">
          建议 {displayQuantity}
        </p>

        {showFullDescription ? (
          <p className="mt-2 min-h-10 whitespace-pre-wrap break-words rounded-xl bg-background/75 px-2 py-1.5 text-xs leading-[1.1rem] text-muted-foreground">
            {displayNote}
          </p>
        ) : null}

        <div className="mt-2.5 flex min-h-11 items-center justify-between gap-2 border-t border-border/70 pt-2">
          <button
            className="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            type="button"
            onClick={() => onOpenDetails(item.id)}
          >
            <MoreHorizontal className="size-4 shrink-0" />
            <span className="truncate">详情</span>
          </button>

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
