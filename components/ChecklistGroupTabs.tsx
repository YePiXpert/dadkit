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
    <div
      aria-label="清单视图"
      className="grid grid-cols-3 gap-1 rounded-[1.75rem] border border-border/70 bg-card/80 p-1.5"
      role="group"
    >
      {CHECKLIST_VIEWS.map((view) => {
        const active = value === view.id;
        const Icon = VIEW_ICONS[view.id];

        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.35rem] px-1 text-xs font-semibold text-muted-foreground transition-all sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm",
              active &&
                "bg-primary text-primary-foreground shadow-glow",
            )}
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{view.shortLabel}</span>
            </span>
            <span
              className={cn(
                "text-[10px] font-medium sm:text-xs",
                active
                  ? "text-primary-foreground/85"
                  : "text-muted-foreground/75",
              )}
            >
              {counts[view.id]} 项
            </span>
          </button>
        );
      })}
    </div>
  );
}
