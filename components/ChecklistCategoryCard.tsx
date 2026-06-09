"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

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
    <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="space-y-2">
        <button
          className="flex w-full items-center justify-between gap-3 text-left"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "" : "-rotate-90"
              }`}
            />
            <span className="truncate text-base font-semibold tracking-normal">
              {title}
            </span>
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {completion.completed}/{completion.total}
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
