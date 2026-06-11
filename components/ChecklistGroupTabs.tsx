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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CHECKLIST_VISUAL_GROUPS.map((group) => (
        <button
          className={cn(
            "min-h-11 rounded-md border border-border bg-card px-2.5 py-2 text-center text-sm font-medium leading-5 text-muted-foreground shadow-sm transition-colors",
            value === group.id &&
              "border-primary bg-primary text-primary-foreground",
          )}
          key={group.id}
          type="button"
          onClick={() => onChange(group.id)}
        >
          {group.label}
        </button>
      ))}
    </div>
  );
}
