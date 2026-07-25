"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PackageOpen, Pencil } from "lucide-react";

import { QuantityStepper } from "@/components/QuantityStepper";
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
import { useDadKitStore } from "@/lib/store";

type EditItemDialogProps = {
  item: ChecklistItem;
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

const CUSTOM_PREPARATION_OPTIONS: Array<{
  label: string;
  value: PreparationKind;
}> = [
  { label: "家里已有", value: "pack_existing" },
  { label: "需要购买", value: "buy_and_pack" },
  { label: "买了放家里", value: "buy_for_home" },
  { label: "需要清洗", value: "wash_then_pack" },
];

export function EditItemDialog({ item }: EditItemDialogProps) {
  const updateItem = useDadKitStore((state) => state.updateItem);
  const displayOptions = useMemo(
    () => ({ transformAlternatives: item.source === "general" }),
    [item.source],
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(
    formatChecklistDisplayText(item.name, displayOptions),
  );
  const [category, setCategory] = useState<ChecklistCategory>(item.category);
  const [preparationKind, setPreparationKind] = useState<PreparationKind>(
    inferPreparationKind(item),
  );
  const [quantity, setQuantity] = useState(
    formatChecklistDisplayText(item.quantity, displayOptions),
  );
  const [note, setNote] = useState(
    formatChecklistDisplayText(item.note, displayOptions),
  );
  const canEditPreparationKind = item.source === "user";

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(formatChecklistDisplayText(item.name, displayOptions));
    setCategory(item.category);
    setPreparationKind(inferPreparationKind(item));
    setQuantity(formatChecklistDisplayText(item.quantity, displayOptions));
    setNote(formatChecklistDisplayText(item.note, displayOptions));
  }, [displayOptions, item, open]);

  function submit() {
    if (!name.trim()) {
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
        className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-background p-0 shadow-none [@media(min-width:640px)_and_(min-height:640px)]:left-1/2 [@media(min-width:640px)_and_(min-height:640px)]:top-1/2 [@media(min-width:640px)_and_(min-height:640px)]:h-auto [@media(min-width:640px)_and_(min-height:640px)]:max-h-[90dvh] [@media(min-width:640px)_and_(min-height:640px)]:w-[calc(100%-2rem)] [@media(min-width:640px)_and_(min-height:640px)]:max-w-lg [@media(min-width:640px)_and_(min-height:640px)]:-translate-x-1/2 [@media(min-width:640px)_and_(min-height:640px)]:-translate-y-1/2 [@media(min-width:640px)_and_(min-height:640px)]:gap-5 [@media(min-width:640px)_and_(min-height:640px)]:overflow-y-auto [@media(min-width:640px)_and_(min-height:640px)]:rounded-[2rem] [@media(min-width:640px)_and_(min-height:640px)]:border [@media(min-width:640px)_and_(min-height:640px)]:border-border [@media(min-width:640px)_and_(min-height:640px)]:p-6 [@media(min-width:640px)_and_(min-height:640px)]:shadow-lg"
        showCloseButton={false}
      >
        <DialogHeader className="relative block min-h-[5.5rem] shrink-0 border-b border-border/60 px-16 pb-4 pt-[max(env(safe-area-inset-top),1rem)] text-center [@media(min-width:640px)_and_(min-height:640px)]:min-h-0 [@media(min-width:640px)_and_(min-height:640px)]:border-0 [@media(min-width:640px)_and_(min-height:640px)]:px-0 [@media(min-width:640px)_and_(min-height:640px)]:pb-0 [@media(min-width:640px)_and_(min-height:640px)]:pt-0">
          <DialogClose asChild>
            <button
              aria-label="返回物品详情"
              className="absolute bottom-3 left-3 flex size-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(min-width:640px)_and_(min-height:640px)]:hidden"
              type="button"
            >
              <ArrowLeft className="size-6" />
            </button>
          </DialogClose>
          <DialogTitle className="text-xl leading-10 [@media(min-width:640px)_and_(min-height:640px)]:text-2xl">
            编辑物品
          </DialogTitle>
          <DialogDescription className="sr-only">
            调整这项清单的归类、数量或备注。
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 [@media(min-width:640px)_and_(min-height:640px)]:overflow-visible [@media(min-width:640px)_and_(min-height:640px)]:p-0">
          <div className="mb-5 grid grid-cols-[6.75rem_1fr] items-center gap-5 [@media(min-width:640px)_and_(min-height:640px)]:grid-cols-[6rem_1fr]">
            <div className="flex aspect-square items-center justify-center rounded-[1.75rem] bg-secondary/70 text-primary">
              <PackageOpen className="size-12" strokeWidth={1.45} />
            </div>
            <div className="grid gap-3">
              <p className="text-lg font-semibold">预计数量</p>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid divide-y divide-border rounded-[1.75rem] border border-border bg-card px-5">
              <FormRow htmlFor={`edit-item-name-${item.id}`} label="物品名称">
                <Input
                  id={`edit-item-name-${item.id}`}
                  className="min-w-0 border-0 bg-transparent px-0 text-right text-base shadow-none focus-visible:ring-0"
                  disabled={!item.editable}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </FormRow>
              <FormRow label="分类">
                <Select
                  disabled={!item.editable}
                  value={category}
                  onValueChange={(value) => setCategory(value as ChecklistCategory)}
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
                      setPreparationKind(value as PreparationKind)
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
            <div className="grid gap-3 rounded-[1.75rem] border border-border bg-card p-5">
              <label className="text-sm font-semibold" htmlFor={`edit-item-note-${item.id}`}>
                备注
              </label>
              <Textarea
                id={`edit-item-note-${item.id}`}
                className="min-h-28 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                placeholder="可以添加规格、颜色…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="grid shrink-0 gap-2 border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur [@media(min-width:640px)_and_(min-height:640px)]:border-0 [@media(min-width:640px)_and_(min-height:640px)]:bg-transparent [@media(min-width:640px)_and_(min-height:640px)]:p-0">
          <Button className="h-14 w-full text-base" size="lg" onClick={submit}>
            保存
          </Button>
          <DialogClose asChild>
            <Button className="hidden w-full [@media(min-width:640px)_and_(min-height:640px)]:inline-flex" variant="ghost">
              取消
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      <label className="shrink-0 text-sm font-semibold" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
