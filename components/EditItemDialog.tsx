"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRIORITY_LABELS,
  type ChecklistCategory,
  type ChecklistItem,
  type Priority,
} from "@/lib/types";
import { useDadKitStore } from "@/lib/store";

type EditItemDialogProps = {
  item: ChecklistItem;
};

export function EditItemDialog({ item }: EditItemDialogProps) {
  const updateItem = useDadKitStore((state) => state.updateItem);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ChecklistCategory>(item.category);
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [quantity, setQuantity] = useState(item.quantity ?? "");
  const [note, setNote] = useState(item.note ?? "");

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(item.name);
    setCategory(item.category);
    setPriority(item.priority);
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
      priority,
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
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="名称">
            <Input
              disabled={!item.editable}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="field-grid">
            <Field label="分类">
              <Select
                disabled={!item.editable}
                value={category}
                onValueChange={(value) => setCategory(value as ChecklistCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((candidate) => (
                    <SelectItem key={candidate} value={candidate}>
                      {CATEGORY_LABELS[candidate]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="优先级">
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="数量">
            <Input
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </Field>
          <Field label="备注">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={submit}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
