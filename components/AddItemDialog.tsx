"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { QuantityStepper } from "@/components/QuantityStepper";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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

const CUSTOM_PREPARATION_OPTIONS: Array<{
  label: string;
  value: PreparationKind;
}> = [
  { label: "家里已有", value: "pack_existing" },
  { label: "需要购买", value: "buy_and_pack" },
  { label: "买了放家里", value: "buy_for_home" },
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
  const [feedback, setFeedback] = useState("");

  function submit() {
    if (!name.trim()) {
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
    setName("");
    setPreparationKind("pack_existing");
    setQuantity("");
    setNote("");
    if (result.merged) {
      setFeedback("已与清单里的同名物品合并，数量和备注已更新。");
      return;
    }

    setFeedback("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setFeedback("");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>自定义添加</DialogTitle>
          <DialogDescription>
            填写名称即可保存，归类和当前情况已有默认值。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {feedback ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-primary">
              {feedback}
            </p>
          ) : null}
          <div className="grid divide-y divide-border rounded-2xl bg-card px-4">
            <FormRow label="物品名称" hint="必填">
              <Input
                className="border-0 bg-transparent px-0 text-right focus-visible:ring-0"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FormRow>
            <FormRow label="分类">
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as ChecklistCategory)}
              >
                <SelectTrigger className="w-auto border-0 bg-transparent px-0 focus:ring-0">
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
                <SelectTrigger className="w-auto border-0 bg-transparent px-0 focus:ring-0">
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
          <div className="grid gap-3 rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">预计数量</span>
              <span className="w-36">
                <QuantityStepper
                  value={quantity}
                  onChange={setQuantity}
                />
              </span>
            </div>
            <Textarea
              className="border-0 bg-muted/60 px-3 focus-visible:ring-0"
              placeholder="可以添加规格、颜色…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="grid gap-2 sm:grid">
          <Button className="w-full" size="lg" onClick={submit}>
            加入清单
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormRow({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-sm font-medium">
        {label}
        {hint ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </div>
  );
}
