"use client";

import { cn } from "@/lib/utils";
import {
  CHECKLIST_VISUAL_GROUPS,
  type ChecklistVisualGroup,
} from "@/lib/presentation";

type ChecklistGroupTabsProps = {
  value: ChecklistVisualGroup;
  onChange: (value: ChecklistVisualGroup) => void;
};

export function ChecklistGroupTabs({ value, onChange }: ChecklistGroupTabsProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-2">
        {CHECKLIST_VISUAL_GROUPS.map((group) => (
          <button
            className={cn(
              "h-9 rounded-full border border-border bg-card px-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors",
              value === group.id && "border-primary bg-primary text-primary-foreground",
            )}
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
          >
            {group.label}
          </button>
        ))}
      </div>
    </div>
  );
}
