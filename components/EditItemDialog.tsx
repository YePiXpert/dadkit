"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ChecklistCategory>(item.category);
  const [preparationKind, setPreparationKind] = useState<PreparationKind>(
    inferPreparationKind(item),
  );
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const canEditPreparationKind = item.source === "user";

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(item.name);
    setCategory(item.category);
    setPreparationKind(inferPreparationKind(item));
    setQuantity(item.quantity ?? "");
    setNote(item.note ?? "");
  }, [item, open]);

  function submit() {
    if (!name.trim()) {
      return;
    }

    updateItem(item.id, {
      name,
      category,
      ...(canEditPreparationKind ? { preparationKind } : {}),
      quantity: quantity || undefined,
      note: note || undefined,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="size-8" size="icon" variant="ghost" title="编辑物品">
          <Pencil className="size-4" />
          <span className="sr-only">编辑物品</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑物品</DialogTitle>
          <DialogDescription>
            调整这项清单的归类、数量或备注。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid divide-y divide-border rounded-2xl bg-card px-4">
            <FormRow label="物品名称">
              <Input
                className="border-0 bg-transparent px-0 text-right focus-visible:ring-0"
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
                <SelectTrigger className="w-auto border-0 bg-transparent px-0 focus:ring-0">
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
            ) : null}
          </div>
          <div className="grid gap-3 rounded-2xl bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">预计数量</span>
              <span className="w-36">
                <QuantityStepper value={quantity} onChange={setQuantity} />
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
            保存
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
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}
