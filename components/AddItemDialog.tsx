"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

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
  type Priority,
} from "@/lib/types";
import { useDadKitStore } from "@/lib/store";

type AddItemDialogProps = {
  defaultCategory?: ChecklistCategory;
};

export function AddItemDialog({ defaultCategory = "mom_labor" }: AddItemDialogProps) {
  const addCustomItem = useDadKitStore((state) => state.addCustomItem);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>(defaultCategory);
  const [priority, setPriority] = useState<Priority>("recommended");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    if (!name.trim()) {
      return;
    }

    addCustomItem({
      name,
      category,
      priority,
      quantity: quantity || undefined,
      note: note || undefined,
    });
    setName("");
    setQuantity("");
    setNote("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          新增物品
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增自定义物品</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="名称">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="field-grid">
            <Field label="分类">
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as ChecklistCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((item) => (
                    <SelectItem key={item} value={item}>
                      {CATEGORY_LABELS[item]}
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
              placeholder="例如：2 条"
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
