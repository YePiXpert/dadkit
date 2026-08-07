"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PackageOpen, Pencil } from "lucide-react";

import { QuantityStepper } from "@/components/QuantityStepper";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatChecklistDisplayText,
  preserveChecklistStorageText,
} from "@/lib/checklist-display";
import { inferPreparationKind } from "@/lib/preparation";
import {
  CATEGORY_LABELS,
  type ChecklistCategory,
  type ChecklistItem,
  type PreparationKind,
} from "@/lib/types";
import { CUSTOM_PREPARATION_OPTIONS } from "@/lib/custom-item-options";
import { useDadKitStore } from "@/lib/store";
import { useDraftConflict } from "@/lib/use-draft-conflict";
import { useDialogHistoryGuard } from "@/lib/use-dialog-history-guard";

type EditItemDialogProps = {
  item: ChecklistItem;
};

type ChecklistItemForm = {
  name: string;
  category: ChecklistCategory;
  preparationKind: PreparationKind;
  quantity: string;
  note: string;
};

const CUSTOM_CATEGORIES: ChecklistCategory[] = [
  "documents",
  "mom_labor",
  "baby",
  "confinement_mom",
  "confinement_baby",
  "partner",
  "going_home",
  "last_minute",
];

export function EditItemDialog({ item }: EditItemDialogProps) {
  const updateItem = useDadKitStore((state) => state.updateItem);
  const displayOptions = useMemo(
    () => ({ transformAlternatives: item.source === "general" }),
    [item.source],
  );
  const [open, setOpen] = useState(false);
  const conflict = useDraftConflict<ChecklistItemForm>({
    name: formatChecklistDisplayText(item.name, displayOptions),
    category: item.category,
    preparationKind: inferPreparationKind(item),
    quantity: formatChecklistDisplayText(item.quantity, displayOptions),
    note: formatChecklistDisplayText(item.note, displayOptions),
  }, open);
  const { name, category, preparationKind, quantity, note } = conflict.draft;
  const [nameTouched, setNameTouched] = useState(false);
  useDialogHistoryGuard(open, () => setOpen(false));
  const canEditPreparationKind = item.source === "user";
  const nameError = nameTouched && !name.trim();

  useEffect(() => {
    if (!open) {
      return;
    }

    setNameTouched(false);
  }, [displayOptions, item, open]);

  function submit() {
    if (!name.trim()) {
      setNameTouched(true);
      return;
    }

    updateItem(item.id, {
      name:
        preserveChecklistStorageText(name, item.name, displayOptions) ?? name,
      category,
      ...(canEditPreparationKind ? { preparationKind } : {}),
      quantity:
        preserveChecklistStorageText(quantity, item.quantity, displayOptions) ||
        undefined,
      note:
        preserveChecklistStorageText(note, item.note, displayOptions) ||
        undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="size-11" size="icon" variant="ghost" title="编辑物品">
          <Pencil className="size-4" />
          <span className="sr-only">编辑物品</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex flex-col overflow-hidden rounded-card bg-background shadow-lg sm:gap-5 sm:p-6"
        mobileFullscreen
        showCloseButton={false}
      >
        <DialogHeader className="relative block min-h-[5.5rem] shrink-0 border-b border-border/60 px-16 pb-4 pt-[max(env(safe-area-inset-top),1rem)] text-center sm:min-h-0 sm:border-0 sm:px-0 sm:pb-0 sm:pt-0">
          <DialogClose asChild>
            <button
              aria-label="返回物品详情"
              className="absolute bottom-3 left-3 flex size-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
              type="button"
            >
              <ArrowLeft className="size-6" />
            </button>
          </DialogClose>
          <DialogTitle className="text-xl leading-10 sm:text-2xl">
            编辑物品
          </DialogTitle>
          <DialogDescription className="sr-only">
            调整这项清单的归类、数量或备注。
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:overflow-visible sm:p-0">
          <DraftConflictNotice
            fields={conflict.conflictFields.map((key) => CHECKLIST_FIELD_LABELS[key])}
            onAcceptExternal={conflict.acceptExternal}
            onKeepLocal={conflict.keepLocal}
          />
          <div className="mb-5 grid grid-cols-[6.75rem_1fr] items-center gap-5 sm:grid-cols-[6rem_1fr]">
            <div className="flex aspect-square items-center justify-center rounded-card bg-secondary/70 text-primary">
              <PackageOpen className="size-12" strokeWidth={1.45} />
            </div>
            <div className="grid gap-3">
              <p className="text-[15px] font-semibold">预计数量</p>
              <QuantityStepper value={quantity} onChange={(value) => conflict.setField("quantity", value)} />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid divide-y divide-border rounded-card bg-card px-5 shadow-sm">
              <FormRow htmlFor={`edit-item-name-${item.id}`} label="物品名称">
                <Input
                  id={`edit-item-name-${item.id}`}
                  className="min-w-0 border-0 bg-transparent px-0 text-right text-base shadow-none focus-visible:ring-0"
                  aria-describedby={nameError ? `edit-item-name-error-${item.id}` : undefined}
                  aria-invalid={nameError}
                  disabled={!item.editable}
                  value={name}
                  onBlur={() => setNameTouched(true)}
                  onChange={(event) => {
                    conflict.setField("name", event.target.value);
                    if (event.target.value.trim()) setNameTouched(false);
                  }}
                />
              </FormRow>
              {nameError ? (
                <p
                  className="pb-3 text-right text-sm text-destructive"
                  id={`edit-item-name-error-${item.id}`}
                  role="alert"
                >
                  请填写物品名称后再保存。
                </p>
              ) : null}
              <FormRow label="分类">
                <Select
                  disabled={!item.editable}
                  value={category}
                  onValueChange={(value) => conflict.setField("category", value as ChecklistCategory)}
                >
                  <SelectTrigger aria-label="分类" className="w-auto max-w-[11rem] border-0 bg-transparent px-0 text-right shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_CATEGORIES.map((candidate) => (
                      <SelectItem key={candidate} value={candidate}>
                        {CATEGORY_LABELS[candidate]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
              {canEditPreparationKind ? (
                <FormRow label="当前情况">
                  <Select
                    value={preparationKind}
                    onValueChange={(value) =>
                      conflict.setField("preparationKind", value as PreparationKind)
                    }
                  >
                    <SelectTrigger aria-label="当前情况" className="w-auto max-w-[11rem] border-0 bg-transparent px-0 text-right shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_PREPARATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              ) : null}
            </div>
            <div className="grid gap-3 rounded-card bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold" htmlFor={`edit-item-note-${item.id}`}>
                备注
              </label>
              <Textarea
                id={`edit-item-note-${item.id}`}
                className="min-h-28 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                placeholder="可以添加规格、颜色…"
                value={note}
                onChange={(event) => conflict.setField("note", event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="grid shrink-0 gap-2 border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur sm:border-0 sm:bg-transparent sm:p-0">
          <Button
            className="h-14 w-full text-base"
            disabled={!name.trim() || conflict.hasConflict}
            size="lg"
            onClick={submit}
          >
            保存
          </Button>
          <DialogClose asChild>
            <Button className="hidden w-full sm:inline-flex" variant="ghost">
              取消
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CHECKLIST_FIELD_LABELS: Record<keyof ChecklistItemForm, string> = {
  name: "物品名称",
  category: "分类",
  preparationKind: "当前情况",
  quantity: "预计数量",
  note: "备注",
};

function FormRow({
  children,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-3 py-2">
      <Label className="shrink-0" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}
