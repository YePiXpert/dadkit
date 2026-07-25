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
    <div aria-label="清单视图" className="grid grid-cols-3 gap-2">
      {CHECKLIST_VIEWS.map((view) => {
        const active = value === view.id;
        const Icon = VIEW_ICONS[view.id];

        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-all",
              active && "bg-primary text-primary-foreground shadow-sm",
            )}
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{view.shortLabel}</span>
            <span className={cn("text-xs font-medium", active ? "text-primary-foreground/85" : "text-muted-foreground/80")}>
              {counts[view.id]} 项
            </span>
          </button>
        );
      })}
    </div>
  );
}
