"use client";

import { CheckCircle2, ListChecks, PackageCheck, ShoppingBasket } from "lucide-react";

import {
  CHECKLIST_VIEWS,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { cn } from "@/lib/utils";

const VIEW_ICONS = {
  all: ListChecks,
  shopping: ShoppingBasket,
  packing: PackageCheck,
  packed: CheckCircle2,
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
      className="grid grid-cols-4 gap-1.5 rounded-card bg-card p-1.5 shadow-sm ring-1 ring-border/35"
      role="group"
    >
      {CHECKLIST_VIEWS.map((view) => {
        const active = value === view.id;
        const Icon = VIEW_ICONS[view.id];

        return (
          <button
            aria-pressed={active}
            className={cn(
              "flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-inset px-1 text-[13px] font-semibold text-muted-foreground transition-colors sm:flex-row sm:gap-1.5 sm:px-3",
              active &&
                "bg-secondary text-primary",
            )}
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{view.shortLabel}</span>
            </span>
            <span
              className={cn(
                "text-[13px] font-medium",
                active
                  ? "text-primary"
                  : "text-muted-foreground",
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
