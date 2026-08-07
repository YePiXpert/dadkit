"use client";

import { ArrowLeft, CalendarClock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
import { MemberMultiSelect } from "@/components/household/MemberMultiSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAppToast } from "@/lib/app-toast";
import { useHouseholdStore } from "@/lib/household/store";
import { itemPlanningDraftFromPortable } from "@/lib/planning/portable";
import { useItemPlanningStore } from "@/lib/planning/store";
import {
  PLANNING_TEXT_LIMIT,
  type ItemPlanningDraft,
  type PlanningDraftField,
  type PlanningValidationErrors,
} from "@/lib/planning/types";
import type { ChecklistItem } from "@/lib/types";
import { useDraftConflict } from "@/lib/use-draft-conflict";
import { useDialogHistoryGuard } from "@/lib/use-dialog-history-guard";

const CHANNEL_SHORTCUTS = ["京东", "淘宝", "线下门店", "医院", "亲友赠送", "其他"];
const LOCATION_SHORTCUTS = ["证件包", "妈妈包", "宝宝包", "爸爸背包", "车内", "家中", "临出门拿"];
const FIELD_ORDER: PlanningDraftField[] = [
  "assigneeIds",
  "dueDate",
  "estimatedPrice",
  "actualPrice",
  "purchaseChannel",
  "storageLocation",
];

export function ItemPlanningDialog({
  item,
  onOpenChange,
  open,
}: {
  item: ChecklistItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const planning = useItemPlanningStore((state) => state.planning);
  const hydrate = useItemPlanningStore((state) => state.hydrate);
  const saveItemDraft = useItemPlanningStore((state) => state.saveItemDraft);
  const clearItem = useItemPlanningStore((state) => state.clearItem);
  const household = useHouseholdStore((state) => state.household);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  const conflict = useDraftConflict<ItemPlanningDraft>(
    itemPlanningDraftFromPortable(planning, item.id),
    open,
  );
  const draft = conflict.draft;
  const [errors, setErrors] = useState<PlanningValidationErrors>({});
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  useDialogHistoryGuard(open, () => onOpenChange(false));

  useEffect(() => {
    hydrate();
    hydrateHousehold();
  }, [hydrate, hydrateHousehold]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
  }, [item.id, open]);

  function updateDraft<K extends keyof ItemPlanningDraft>(
    key: K,
    value: ItemPlanningDraft[K],
  ) {
    conflict.setField(key, value);
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function save() {
    const result = saveItemDraft(item.id, draft);
    if (!result.ok) {
      const nextErrors = result.errors ?? {};
      setErrors(nextErrors);
      const first = FIELD_ORDER.find((key) => nextErrors[key]);
      if (first) document.getElementById(`planning-${first}-${item.id}`)?.focus();
      return;
    }
    onOpenChange(false);
    showAppToast({
      message: result.changed ? "分工与采购信息已保存。" : "分工与采购信息没有变化。",
      tone: "success",
    });
  }

  function clearSavedItem() {
    const result = clearItem(item.id);
    if (!result.ok) {
      showAppToast({ message: result.message ?? "清空失败。", tone: "warning" });
      return;
    }
    onOpenChange(false);
    showAppToast({ message: "这项分工与采购信息已清空。", tone: "success" });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex flex-col overflow-hidden sm:gap-5 sm:p-6"
          mobileFullscreen
          showCloseButton={false}
        >
          <DialogHeader className="relative block min-h-[5.5rem] shrink-0 border-b border-border/60 px-16 pb-4 pt-[max(env(safe-area-inset-top),1rem)] text-center sm:min-h-0 sm:border-0 sm:px-0 sm:pb-0 sm:pt-0 sm:text-left">
            <DialogClose asChild>
              <button
                aria-label="返回物品详情"
                className="absolute bottom-3 left-3 flex size-12 items-center justify-center rounded-full hover:bg-secondary sm:hidden"
                type="button"
              >
                <ArrowLeft className="size-6" />
              </button>
            </DialogClose>
            <DialogTitle className="truncate text-xl leading-10 sm:text-2xl">
              {item.name}
            </DialogTitle>
            <DialogDescription>编辑负责人、期限和该项采购信息。</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:overflow-visible sm:p-0">
            <div className="grid gap-5">
              <DraftConflictNotice
                fields={conflict.conflictFields.map((key) => PLANNING_FIELD_LABELS[key])}
                onAcceptExternal={conflict.acceptExternal}
                onKeepLocal={conflict.keepLocal}
              />
              <PlanningField label="负责人（可多选）" error={errors.assigneeIds} id={`planning-assigneeIds-${item.id}`}>
                <MemberMultiSelect household={household} id={`planning-assigneeIds-${item.id}`} onChange={(value) => updateDraft("assigneeIds", value)} selectedIds={draft.assigneeIds} />
              </PlanningField>

              <PlanningField label="完成期限" error={errors.dueDate} id={`planning-dueDate-${item.id}`}>
                <Input
                  aria-describedby={errors.dueDate ? `planning-dueDate-${item.id}-error` : undefined}
                  aria-invalid={Boolean(errors.dueDate)}
                  id={`planning-dueDate-${item.id}`}
                  onChange={(event) => updateDraft("dueDate", event.target.value)}
                  type="date"
                  value={draft.dueDate}
                />
              </PlanningField>

              <div className="grid gap-4 sm:grid-cols-2">
                <PlanningField label="该项预计总价" error={errors.estimatedPrice} id={`planning-estimatedPrice-${item.id}`} hint="固定使用人民币元，不乘以清单数量。">
                  <Input
                    aria-describedby={errors.estimatedPrice ? `planning-estimatedPrice-${item.id}-error` : undefined}
                    aria-invalid={Boolean(errors.estimatedPrice)}
                    id={`planning-estimatedPrice-${item.id}`}
                    inputMode="decimal"
                    onChange={(event) => updateDraft("estimatedPrice", event.target.value)}
                    placeholder="例如 129.90"
                    value={draft.estimatedPrice}
                  />
                </PlanningField>
                <PlanningField label="该项实际总价" error={errors.actualPrice} id={`planning-actualPrice-${item.id}`} hint="0 元也可以保存。">
                  <Input
                    aria-describedby={errors.actualPrice ? `planning-actualPrice-${item.id}-error` : undefined}
                    aria-invalid={Boolean(errors.actualPrice)}
                    id={`planning-actualPrice-${item.id}`}
                    inputMode="decimal"
                    onChange={(event) => updateDraft("actualPrice", event.target.value)}
                    placeholder="例如 118.00"
                    value={draft.actualPrice}
                  />
                </PlanningField>
              </div>

              <TextPlanningField
                error={errors.purchaseChannel}
                field="purchaseChannel"
                itemId={item.id}
                label="购买渠道"
                onChange={(value) => updateDraft("purchaseChannel", value)}
                shortcuts={CHANNEL_SHORTCUTS}
                value={draft.purchaseChannel}
              />
              <TextPlanningField
                error={errors.storageLocation}
                field="storageLocation"
                hint="表示物品现在实际放在哪里，不等同于目标包袋分类。"
                itemId={item.id}
                label="存放位置"
                onChange={(value) => updateDraft("storageLocation", value)}
                shortcuts={LOCATION_SHORTCUTS}
                value={draft.storageLocation}
              />

              <Button className="justify-start text-destructive hover:text-destructive" onClick={() => setClearConfirmOpen(true)} type="button" variant="ghost">
                <Trash2 className="size-4" />清空该项分工与采购信息
              </Button>
            </div>
          </div>

          <DialogFooter className="grid shrink-0 gap-2 border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur sm:border-0 sm:bg-transparent sm:p-0">
            <Button className="h-14 w-full text-base" disabled={conflict.hasConflict} onClick={save} size="lg">
              <CalendarClock className="size-5" />保存
            </Button>
            <DialogClose asChild><Button className="hidden sm:inline-flex" variant="ghost">取消</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        confirmLabel="清空该项信息"
        description={`“${item.name}”的负责人、期限、价格、渠道和存放位置都会清空，并同步到家庭设备。`}
        onConfirm={clearSavedItem}
        onOpenChange={setClearConfirmOpen}
        open={clearConfirmOpen}
        title="确认清空这项分工与采购信息？"
        variant="destructive"
      />
    </>
  );
}

const PLANNING_FIELD_LABELS: Record<keyof ItemPlanningDraft, string> = {
  assigneeIds: "负责人",
  dueDate: "完成期限",
  estimatedPrice: "预计总价",
  actualPrice: "实际总价",
  purchaseChannel: "购买渠道",
  storageLocation: "存放位置",
};

function PlanningField({
  children,
  error,
  hint,
  id,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}

function TextPlanningField({
  error,
  field,
  hint,
  itemId,
  label,
  onChange,
  shortcuts,
  value,
}: {
  error?: string;
  field: "purchaseChannel" | "storageLocation";
  hint?: string;
  itemId: string;
  label: string;
  onChange: (value: string) => void;
  shortcuts: string[];
  value: string;
}) {
  const id = `planning-${field}-${itemId}`;
  return (
    <PlanningField error={error} hint={hint} id={id} label={label}>
      <Input
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={id}
        maxLength={PLANNING_TEXT_LIMIT}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <div className="flex flex-wrap gap-2">
        {shortcuts.map((shortcut) => (
          <button
            className="min-h-9 rounded-full bg-secondary px-3 text-xs text-muted-foreground hover:text-foreground"
            key={shortcut}
            onClick={() => onChange(shortcut)}
            type="button"
          >
            {shortcut}
          </button>
        ))}
      </div>
    </PlanningField>
  );
}
