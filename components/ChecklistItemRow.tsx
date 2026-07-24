"use client";

import { memo } from "react";
import {
  Check,
  ChevronDown,
  PackageCheck,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { EditItemDialog } from "@/components/EditItemDialog";
import { ChecklistItemGlyph } from "@/components/ChecklistItemGlyph";
import {
  ItemPhotoField,
  useItemPhoto,
} from "@/components/ItemPhotoField";
import { Button } from "@/components/ui/button";
import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import {
  getItemTileTone,
  ITEM_TILE_TONE_STYLES,
} from "@/lib/presentation/item-icons";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<ChecklistItemState, string> = {
  todo: "待处理",
  ready: "已备好",
  packed: "已装包",
  not_needed: "不需要",
};

type ChecklistItemRowProps = {
  item: ChecklistItem;
};

export const ChecklistItemRow = memo(function ChecklistItemRow({
  item,
}: ChecklistItemRowProps) {
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const toggleItemSkipped = useDadKitStore(
    (state) => state.toggleItemSkipped,
  );
  const removeItem = useDadKitStore((state) => state.removeItem);
  const itemState = getChecklistItemState(item);
  const toneStyle = ITEM_TILE_TONE_STYLES[getItemTileTone(item)];
  const actionLabel = getActionLabel(itemState);
  const itemPhoto = useItemPhoto(item.id);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/80 bg-card px-3 py-3 transition-colors",
        itemState === "packed" && "bg-muted/45",
        itemState === "not_needed" && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label={`${actionLabel}：${item.name}`}
          className={cn(
            "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground transition-colors active:scale-95",
            itemState === "ready" &&
              "border-primary/30 bg-secondary text-primary",
            itemState === "packed" &&
              "border-primary bg-primary text-primary-foreground",
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
            <span aria-hidden="true" className="size-4 rounded-full border-2" />
          )}
        </button>

        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={toneStyle}
        >
          <ChecklistItemGlyph item={item} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3
              className={cn(
                "min-w-0 flex-1 break-words text-sm font-semibold leading-5",
                itemState === "packed" && "text-muted-foreground line-through",
              )}
            >
              {item.name}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground",
                itemState === "ready" && "bg-secondary text-primary",
                itemState === "packed" && "bg-primary/10 text-primary",
              )}
            >
              {STATE_LABELS[itemState]}
            </span>
          </div>
          {item.quantity ? (
            <p className="mt-1 text-xs font-medium text-foreground/70">
              建议 {item.quantity}
            </p>
          ) : null}
          {item.note ? (
            <p className="mt-1.5 line-clamp-2 break-words rounded-lg bg-muted px-2.5 py-1.5 text-xs leading-5 text-muted-foreground">
              {item.note}
            </p>
          ) : null}
        </div>

        {itemPhoto.photoUrl ? (
          <span className="mt-0.5 size-9 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${item.name}的物品照片缩略图`}
              className="size-full object-cover"
              src={itemPhoto.photoUrl}
            />
          </span>
        ) : null}
      </div>

      <details className="group ml-[6.5rem] mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary [&::-webkit-details-marker]:hidden">
          说明与设置
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 border-t border-border/70 pt-3">
          <p className="text-xs leading-5 text-muted-foreground">
            {item.note || "这件物品暂时没有补充说明，可以按家里实际情况调整。"}
          </p>
          <ItemPhotoField controller={itemPhoto} itemName={item.name} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => advanceItem(item.id)}>
              {actionLabel}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toggleItemSkipped(item.id)}
            >
              {itemState === "not_needed" ? "恢复物品" : "标记不需要"}
            </Button>
            <EditItemDialog item={item} />
            {item.removable ? (
              <Button
                className="size-8"
                size="icon"
                title="删除物品"
                variant="ghost"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">删除物品</span>
              </Button>
            ) : null}
          </div>
        </div>
      </details>
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
