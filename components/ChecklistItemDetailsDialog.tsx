"use client";

import { type ReactNode, useState } from "react";
import { Ban, Check, PackageCheck, Trash2 } from "lucide-react";

import { EditItemDialog } from "@/components/EditItemDialog";
import {
  ItemPhotoField,
  type ItemPhotoController,
} from "@/components/ItemPhotoField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import { formatChecklistDisplayText } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATE_META: Record<
  ChecklistItemState,
  { description: string; label: string }
> = {
  todo: { label: "待处理", description: "还没有准备好" },
  ready: { label: "已备好", description: "可以放进行李" },
  packed: { label: "已装包", description: "已经收进行李" },
  not_needed: { label: "不需要", description: "这次不准备" },
};

export function ChecklistItemDetailsDialog({
  item,
  photoController,
  trigger,
}: {
  item: ChecklistItem;
  photoController: ItemPhotoController;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const toggleItemSkipped = useDadKitStore((state) => state.toggleItemSkipped);
  const removeItem = useDadKitStore((state) => state.removeItem);
  const itemState = getChecklistItemState(item);
  const stateMeta = STATE_META[itemState];
  const displayOptions = {
    transformAlternatives: item.source === "general",
  } as const;
  const displayName = formatChecklistDisplayText(item.name, displayOptions);
  const displayNote = formatChecklistDisplayText(
    item.note || "暂时没有补充说明，可以按家庭和医院实际情况调整。",
    displayOptions,
  );
  const displayQuantity = formatChecklistDisplayText(
    item.quantity || "1 件",
    displayOptions,
  );

  function confirmRemoval() {
    if (!window.confirm(`从清单中删除“${displayName}”？`)) {
      return;
    }

    removeItem(item.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-4 rounded-[2rem] border border-border bg-background p-5 sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="break-words text-xl leading-7">
            {displayName}
          </DialogTitle>
          <DialogDescription>
            建议 {displayQuantity} · {stateMeta.label}
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-[1.5rem] border border-border/80 bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">当前状态</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {stateMeta.description}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground",
                itemState === "ready" && "bg-secondary text-primary",
                itemState === "packed" &&
                  "bg-primary text-primary-foreground",
              )}
            >
              {stateMeta.label}
            </span>
          </div>
          <Button className="mt-4 w-full" onClick={() => advanceItem(item.id)}>
            {itemState === "todo" ? (
              <PackageCheck className="size-4" />
            ) : itemState === "ready" ? (
              <Check className="size-4" />
            ) : (
              <PackageCheck className="size-4" />
            )}
            {getAdvanceLabel(itemState)}
          </Button>
        </section>

        <section className="rounded-[1.5rem] border border-border/80 bg-card p-4">
          <p className="text-sm font-semibold">物品说明</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {displayNote}
          </p>
        </section>

        <ItemPhotoField controller={photoController} itemName={displayName} />

        <section className="grid gap-2 rounded-[1.5rem] border border-border/80 bg-card p-3">
          <div className="flex min-h-11 items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold">编辑物品</p>
              <p className="text-xs text-muted-foreground">修改分类、数量或备注</p>
            </div>
            <EditItemDialog item={item} />
          </div>
          <Button
            className="justify-start"
            type="button"
            variant="ghost"
            onClick={() => toggleItemSkipped(item.id)}
          >
            <Ban className="size-4" />
            {itemState === "not_needed" ? "恢复物品" : "标记不需要"}
          </Button>
          {item.removable ? (
            <Button
              className="justify-start text-destructive hover:text-destructive"
              type="button"
              variant="ghost"
              onClick={confirmRemoval}
            >
              <Trash2 className="size-4" />
              删除物品
            </Button>
          ) : null}
        </section>
      </DialogContent>
    </Dialog>
  );
}

function getAdvanceLabel(state: ChecklistItemState) {
  if (state === "todo") return "标记已备好";
  if (state === "ready") return "标记已装包";
  return "重新打开";
}
