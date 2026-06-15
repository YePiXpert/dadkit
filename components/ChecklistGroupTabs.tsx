"use client";

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

const groupTone: Record<ChecklistVisualGroup, string> = {
  all: "border-primary/20 bg-secondary text-primary",
  baby_bag: "border-coral/25 bg-secondary text-primary",
  dad: "border-amber/35 bg-amber-soft text-amber-foreground",
  documents_folder: "border-mint bg-mint text-primary",
  go: "border-peach bg-peach text-peach-foreground",
  going_home: "border-lavender bg-lavender text-lavender-foreground",
  last_minute: "border-blush bg-blush text-blush-foreground",
  mom_bag: "border-blush bg-blush text-blush-foreground",
  questions: "border-sky-200 bg-sky-50 text-sky-700",
  shopping: "border-peach bg-peach text-peach-foreground",
};

export function ChecklistGroupTabs({
  counts,
  value,
  onChange,
}: ChecklistGroupTabsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {CHECKLIST_VISUAL_GROUPS.map((group) => {
        const active = value === group.id;
        const count = counts?.[group.id];

        return (
          <button
            className={cn(
              "grid min-h-[4.75rem] grid-cols-[2.75rem_1fr] items-center gap-2 rounded-lg border border-white/80 bg-card/90 px-2.5 py-2 text-left text-sm font-semibold leading-5 text-muted-foreground shadow-sm transition-colors active:scale-[0.99]",
              active &&
                "border-primary/40 bg-secondary text-primary shadow-soft",
            )}
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
          >
            <span
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border shadow-sm",
                groupTone[group.id],
                active && "border-primary/35 bg-primary text-primary-foreground",
              )}
            >
              <ChecklistGroupIcon group={group.id} />
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

function ChecklistGroupIcon({ group }: { group: ChecklistVisualGroup }) {
  const stroke = "currentColor";
  const softFill = "hsl(var(--card) / 0.82)";

  if (group === "mom_bag") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <path d="M9 13h14l1.5 12h-17L9 13Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M12 13a4 4 0 0 1 8 0" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 18h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "baby_bag") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <circle cx="16" cy="16" fill={softFill} r="9" stroke={stroke} strokeWidth="2.2" />
        <circle cx="11.5" cy="8.5" fill={softFill} r="3" stroke={stroke} strokeWidth="2" />
        <circle cx="20.5" cy="8.5" fill={softFill} r="3" stroke={stroke} strokeWidth="2" />
        <path d="M12.5 17.5h.1M19.5 17.5h.1M13.5 22c1.5 1 3.5 1 5 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "shopping") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <path d="M9 11h14l-1.3 14H10.3L9 11Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M12 11a4 4 0 0 1 8 0" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 17h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "dad") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <circle cx="16" cy="15" fill={softFill} r="8" stroke={stroke} strokeWidth="2.2" />
        <path d="M9.5 14c1-4 4-6 6.5-6s5.4 2 6.5 6c-3-1.2-4.8-2.4-6.5-4-1.7 1.6-3.5 2.8-6.5 4Z" fill="currentColor" opacity=".28" />
        <path d="M12.7 17h.1M19.2 17h.1M13.5 21c1.5 1 3.5 1 5 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M11 25c2.6 1.8 7.4 1.8 10 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "questions") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <circle cx="14.5" cy="14.5" fill={softFill} r="7.5" stroke={stroke} strokeWidth="2.2" />
        <path d="m20 20 5 5" stroke={stroke} strokeLinecap="round" strokeWidth="2.4" />
        <path d="M12.2 12.6a2.6 2.6 0 1 1 4.3 2c-1.2.9-1.5 1.3-1.5 2.4" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
        <path d="M15 20.5h.1" stroke={stroke} strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    );
  }

  if (group === "go") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <rect fill={softFill} height="17" rx="4" stroke={stroke} strokeWidth="2.2" width="18" x="7" y="9" />
        <path d="M11 7v5M21 7v5M7 15h18" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 20h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "last_minute" || group === "documents_folder") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <rect fill={softFill} height="17" rx="3" stroke={stroke} strokeWidth="2.2" width="18" x="7" y="10" />
        <path d="M11 10V8h10v2M12 17h8M12 22h5" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        {group === "last_minute" ? (
          <path d="m19 22 2 2 4-5" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        ) : null}
      </svg>
    );
  }

  if (group === "going_home") {
    return (
      <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
        <path d="M7 16 16 8l9 8v10H9V16Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M14 26v-7h4v7" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-7" viewBox="0 0 32 32">
      <rect fill={softFill} height="20" rx="4" stroke={stroke} strokeWidth="2.2" width="16" x="8" y="7" />
      <path d="M13 11h6M12 16h8M12 21h5" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}
