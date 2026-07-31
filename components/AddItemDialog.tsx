"use client";

import { useState } from "react";
import { ArrowLeft, PackagePlus, Plus } from "lucide-react";

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
  CATEGORY_LABELS,
  type ChecklistCategory,
  type PreparationKind,
} from "@/lib/types";
import { CUSTOM_PREPARATION_OPTIONS } from "@/lib/custom-item-options";
import { showAppToast } from "@/lib/app-toast";
import { useDadKitStore } from "@/lib/store";

type AddItemDialogProps = {
  defaultCategory?: ChecklistCategory;
  trigger?: React.ReactNode;
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

export function AddItemDialog({ defaultCategory = "mom_labor", trigger }: AddItemDialogProps) {
  const addCustomItem = useDadKitStore((state) => state.addCustomItem);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>(defaultCategory);
  const [preparationKind, setPreparationKind] =
    useState<PreparationKind>("pack_existing");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const nameError = nameTouched && !name.trim();

  function submit() {
    if (!name.trim()) {
      setNameTouched(true);
      return;
    }

    const result = addCustomItem({
      name,
      category,
      priority: "recommended",
      preparationKind,
      quantity: quantity || undefined,
      note: note || undefined,
    });
    if (result.merged) {
      showAppToast({ message: "已与现有物品合并", tone: "success" });
    }

    setName("");
    setNameTouched(false);
    setPreparationKind("pack_existing");
    setQuantity("");
    setNote("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setNameTouched(false);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            新增物品
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-background p-0 shadow-none sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:gap-5 sm:overflow-y-auto sm:rounded-card sm:border sm:border-border sm:p-6 sm:shadow-lg"
        showCloseButton={false}
      >
        <DialogHeader className="relative block min-h-[5.5rem] shrink-0 border-b border-border/60 px-16 pb-4 pt-[max(env(safe-area-inset-top),1rem)] text-center sm:min-h-0 sm:border-0 sm:px-0 sm:pb-0 sm:pt-0">
          <DialogClose asChild>
            <button
              aria-label="返回清单"
              className="absolute bottom-3 left-3 flex size-12 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
              type="button"
            >
              <ArrowLeft className="size-6" />
            </button>
          </DialogClose>
          <DialogTitle className="text-xl leading-10 sm:text-2xl">
            自定义添加
          </DialogTitle>
          <DialogDescription className="sr-only">
            填写名称即可保存，归类和当前情况已有默认值。
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:overflow-visible sm:p-0">
          <div className="mb-5 grid grid-cols-[6.75rem_1fr] items-center gap-5 sm:grid-cols-[6rem_1fr]">
            <div className="flex aspect-square items-center justify-center rounded-card bg-secondary/70 text-primary">
              <PackagePlus className="size-12" strokeWidth={1.45} />
            </div>
            <div className="grid gap-3">
              <p className="text-lg font-semibold">预计数量</p>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid divide-y divide-border rounded-card border border-border bg-card px-5">
              <FormRow htmlFor="add-item-name" label="物品名称" hint="必填">
                <Input
                  id="add-item-name"
                  className="min-w-0 border-0 bg-transparent px-0 text-right text-base shadow-none focus-visible:ring-0"
                  aria-describedby={nameError ? "add-item-name-error" : undefined}
                  aria-invalid={nameError}
                  placeholder="例如：哺乳枕"
                  value={name}
                  onBlur={() => setNameTouched(true)}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (event.target.value.trim()) setNameTouched(false);
                  }}
                />
              </FormRow>
              {nameError ? (
                <p
                  className="pb-3 text-right text-sm text-destructive"
                  id="add-item-name-error"
                  role="alert"
                >
                  请填写物品名称后再加入清单。
                </p>
              ) : null}
              <FormRow label="分类">
                <Select
                  value={category}
                  onValueChange={(value) => setCategory(value as ChecklistCategory)}
                >
                  <SelectTrigger aria-label="分类" className="w-auto max-w-[11rem] border-0 bg-transparent px-0 text-right shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_CATEGORIES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {CATEGORY_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
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
            </div>
            <div className="grid gap-3 rounded-card border border-border bg-card p-5">
              <label className="text-sm font-semibold" htmlFor="add-item-note">
                备注
              </label>
              <Textarea
                id="add-item-note"
                className="min-h-28 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                placeholder="可以添加规格、颜色…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="grid shrink-0 gap-2 border-t border-border/60 bg-background/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur sm:border-0 sm:bg-transparent sm:p-0">
          <Button
            className="h-14 w-full text-base"
            disabled={!name.trim()}
            size="lg"
            onClick={submit}
          >
            加入清单
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

function FormRow({
  children,
  htmlFor,
  hint,
  label,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-3 py-2">
      <label className="shrink-0 text-sm font-semibold" htmlFor={htmlFor}>
        {label}
        {hint ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}
