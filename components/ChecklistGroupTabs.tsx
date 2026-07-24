"use client";

import { ListChecks, PackageCheck, ShoppingBasket } from "lucide-react";

import {
  CHECKLIST_VIEWS,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { cn } from "@/lib/utils";

const VIEW_ICONS = {
  all: ListChecks,
  shopping: ShoppingBasket,
  packing: PackageCheck,
} as const;

type ChecklistGroupTabsProps = {
  value: ChecklistView;
  onChange: (value: ChecklistView) => void;
  counts: Record<ChecklistView, number>;
};

export function ChecklistGroupTabs({
  counts,
  value,
  onChange,
}: ChecklistGroupTabsProps) {
  return (
    <div aria-label="清单视图" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
      {CHECKLIST_VIEWS.map((view) => {
        const active = value === view.id;
        const Icon = VIEW_ICONS[view.id];

        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold text-muted-foreground transition-all",
              active && "bg-card text-foreground shadow-sm",
            )}
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
          >
            <span className="flex items-center gap-1.5">
              <Icon className={cn("size-4", active && "text-primary")} />
              <span className="truncate">{view.shortLabel}</span>
            </span>
            <span className={cn("text-[10px]", active && "text-primary")}>
              {counts[view.id]} 项
            </span>
          </button>
        );
      })}
    </div>
  );
}
