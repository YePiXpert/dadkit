"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Ban, Check, PackageCheck, ShoppingBag, Trash2 } from "lucide-react";

import { ChecklistItemArt } from "@/components/ChecklistItemArt";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ItemPhotoField, useItemPhoto } from "@/components/ItemPhotoField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getChecklistItemState,
  type ChecklistItemState,
} from "@/lib/checklist-v2";
import { formatChecklistDisplayText } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import { formatPlanningMoney, getItemPlanningValues, getPlanningAssigneeLabel } from "@/lib/planning/selectors";
import { useItemPlanningStore } from "@/lib/planning/store";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const EditItemDialog = dynamic(
  () =>
    import("@/components/EditItemDialog").then(
      (module) => module.EditItemDialog,
    ),
  { ssr: false },
);

const ItemPlanningDialog = dynamic(
  () =>
    import("@/components/ItemPlanningDialog").then(
      (module) => module.ItemPlanningDialog,
    ),
  { ssr: false },
);

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
  departureMode = false,
  item,
  onOpenChange,
  open,
}: {
  departureMode?: boolean;
  item: ChecklistItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const photoController = useItemPhoto(item.id, open);
  const advanceItem = useDadKitStore((state) => state.advanceItem);
  const updateItem = useDadKitStore((state) => state.updateItem);
  const toggleItemSkipped = useDadKitStore((state) => state.toggleItemSkipped);
  const removeItem = useDadKitStore((state) => state.removeItem);
  const [removalConfirmOpen, setRemovalConfirmOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const planning = useItemPlanningStore((state) => state.planning);
  const hydratePlanning = useItemPlanningStore((state) => state.hydrate);
  const planningValues = getItemPlanningValues(planning, item.id);
  const itemState = getChecklistItemState(item);
  const stateMeta = STATE_META[itemState];
  const displayOptions = {
    transformAlternatives: item.source === "general",
  } as const;
  const displayName = formatChecklistDisplayText(item.name, displayOptions);
  const displayNote = formatChecklistDisplayText(
    item.note || "暂无补充说明，按你们的实际情况慢慢调整，医院通知优先。",
    displayOptions,
  );
  const displayQuantity = formatChecklistDisplayText(
    item.quantity || "1 件",
    displayOptions,
  );

  useEffect(() => {
    hydratePlanning();
  }, [hydratePlanning]);

  function removeCurrentItem() {
    removeItem(item.id);
    onOpenChange(false);
  }

  function handlePrimaryAction() {
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
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 rounded-card border border-border bg-background p-5 sm:max-w-md">
        <DialogHeader className="pr-8">
          <DialogTitle className="break-words text-xl leading-7">
            {displayName}
          </DialogTitle>
          <DialogDescription>
            建议 {displayQuantity} · {stateMeta.label}
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-inset border border-border/70 bg-card p-4">
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
          <Button className="mt-4 w-full" onClick={handlePrimaryAction}>
            {itemState === "ready" ? (
              <Check className="size-4" />
            ) : (
              <PackageCheck className="size-4" />
            )}
            {getAdvanceLabel(itemState, departureMode)}
          </Button>
        </section>

        <section className="rounded-inset border border-border/70 bg-card p-4">
          <p className="text-sm font-semibold">物品说明</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
            {displayNote}
          </p>
        </section>

        {!photoController.loading && !photoController.photoUrl ? (
          <section className="rounded-inset border border-border/70 bg-card p-4">
            <p className="text-sm font-semibold">物品示意</p>
            <div className="relative mt-2 aspect-[4/3] max-h-52 overflow-hidden rounded-xl bg-background">
              <ChecklistItemArt
                alt={`${displayName}的物品插画`}
                item={item}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              无品牌示意图，具体物品以医院和家庭实际需要为准。
            </p>
          </section>
        ) : null}

        <ItemPhotoField controller={photoController} itemName={displayName} />

        <section className="grid gap-3 rounded-inset border border-border/70 bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingBag className="size-4" />分工与采购
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                {planningSummary(planningValues)}
              </p>
            </div>
            <Button onClick={() => setPlanningOpen(true)} size="sm" variant="outline">
              编辑
            </Button>
          </div>
        </section>

        <section className="grid gap-2 rounded-inset border border-border/70 bg-card p-3">
          <div className="flex min-h-11 items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold">编辑物品</p>
              <p className="text-xs text-muted-foreground">
                修改分类、数量或备注
              </p>
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
              onClick={() => setRemovalConfirmOpen(true)}
            >
              <Trash2 className="size-4" />
              删除物品
            </Button>
          ) : null}
        </section>
      </DialogContent>
      <ConfirmDialog
        confirmLabel="删除物品"
        description={`“${displayName}”会先隐藏 5 秒，期间可以撤销。`}
        onConfirm={removeCurrentItem}
        onOpenChange={setRemovalConfirmOpen}
        open={removalConfirmOpen}
        title="确认删除这件物品？"
        variant="destructive"
      />
    </Dialog>
    <ItemPlanningDialog
      item={item}
      onOpenChange={setPlanningOpen}
      open={planningOpen}
    />
    </>
  );
}

function planningSummary(values: ReturnType<typeof getItemPlanningValues>) {
  const parts = [
    values.assignee !== "unassigned"
      ? getPlanningAssigneeLabel(values.assignee)
      : "",
    values.dueDate ? `期限 ${values.dueDate}` : "",
    values.estimatedPriceFen !== null
      ? `预计 ${formatPlanningMoney(values.estimatedPriceFen)}`
      : "",
    values.actualPriceFen !== null
      ? `实际 ${formatPlanningMoney(values.actualPriceFen)}`
      : "",
    values.storageLocation ? `放在 ${values.storageLocation}` : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "尚未填写分工与采购信息。";
}

function getAdvanceLabel(state: ChecklistItemState, departureMode: boolean) {
  if (departureMode) {
    return state === "packed" || state === "not_needed"
      ? "恢复重新核对"
      : "标记已确认";
  }

  if (state === "todo") return "标记已备好";
  if (state === "ready") return "标记已装包";
  return "重新打开";
}
