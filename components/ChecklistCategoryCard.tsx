"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardList } from "lucide-react";

import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculateCompletion } from "@/lib/rules";
import type { ChecklistItem } from "@/lib/types";

type ChecklistCategoryCardProps = {
  defaultOpen?: boolean;
  items: ChecklistItem[];
  title: string;
};

export function ChecklistCategoryCard({
  defaultOpen = false,
  items,
  title,
}: ChecklistCategoryCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const completion = calculateCompletion(items);

  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="card-surface p-3">
      <div className="space-y-3">
        <button
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/60"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="icon-tile">
            {completion.percent === 100 ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <ClipboardList className="size-5" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold leading-5">
              {title}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              已完成 {completion.completed} 项 · 未完成{" "}
              {Math.max(0, completion.total - completion.completed)} 项
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold text-primary">
              {completion.percent}%
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "" : "-rotate-90"
              }`}
            />
          </span>
        </button>
        <div className="flex items-center gap-3">
          <Progress value={completion.percent} />
          {!open ? (
            <Button
              className="h-8 shrink-0 px-2 text-xs"
              variant="ghost"
              onClick={() => setOpen(true)}
            >
              展开
            </Button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <ChecklistItemRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
