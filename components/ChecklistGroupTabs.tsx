"use client";

import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Home,
  Hospital,
  Save,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CHECKLIST_VISUAL_GROUPS,
  type ChecklistVisualGroup,
} from "@/lib/presentation";

type ChecklistGroupTabsProps = {
  value: ChecklistVisualGroup;
  onChange: (value: ChecklistVisualGroup) => void;
  counts?: Partial<
    Record<ChecklistVisualGroup, { total: number; remaining: number }>
  >;
};

const groupIcons: Record<ChecklistVisualGroup, LucideIcon> = {
  all: ClipboardList,
  documents_folder: CheckCircle2,
  mom_bag: Save,
  baby_bag: Home,
  shopping: Copy,
  dad: Settings,
  going_home: Home,
  questions: Hospital,
  go: CalendarClock,
  last_minute: CheckCircle2,
};

export function ChecklistGroupTabs({
  counts,
  value,
  onChange,
}: ChecklistGroupTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CHECKLIST_VISUAL_GROUPS.map((group) => {
        const Icon = groupIcons[group.id];
        const active = value === group.id;
        const count = counts?.[group.id];

        return (
          <button
            className={cn(
              "grid min-h-20 grid-cols-[2.25rem_1fr] items-center gap-2 rounded-lg border border-white/80 bg-card/85 px-2.5 py-2 text-left text-sm font-semibold leading-5 text-muted-foreground shadow-sm transition-colors active:scale-[0.99]",
              active &&
                "border-primary/40 bg-mint text-primary shadow-soft",
            )}
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border border-white/90 bg-cream text-primary shadow-sm",
                active && "bg-primary text-primary-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span>
              <span className="block">{group.label}</span>
              {count ? (
                <span className="mt-0.5 block text-xs font-medium opacity-75">
                  未完成 {count.remaining} 项
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
