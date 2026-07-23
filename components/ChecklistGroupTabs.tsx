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
              "grid min-h-[3.9rem] grid-cols-[2.25rem_1fr] items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 text-left text-sm font-medium leading-5 text-muted-foreground transition-colors hover:bg-secondary/60",
              active && "border-primary/30 bg-secondary text-foreground",
            )}
            key={group.id}
            type="button"
            onClick={() => onChange(group.id)}
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg bg-secondary text-primary",
                active && "bg-primary text-primary-foreground",
              )}
            >
              <ChecklistGroupIcon className="size-6" group={group.id} />
            </span>
            <span className="min-w-0">
              <span className="block break-words">{group.label}</span>
              {count ? (
                <span className="mt-0.5 block break-words text-xs opacity-75">
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

function ChecklistGroupIcon({
  className = "size-7",
  group,
}: {
  className?: string;
  group: ChecklistVisualGroup;
}) {
  const stroke = "currentColor";
  const softFill = "hsl(var(--card) / 0.82)";

  if (group === "mom_bag") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <path d="M9 13h14l1.5 12h-17L9 13Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M12 13a4 4 0 0 1 8 0" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 18h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "baby_bag") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <circle cx="16" cy="16" fill={softFill} r="9" stroke={stroke} strokeWidth="2.2" />
        <circle cx="11.5" cy="8.5" fill={softFill} r="3" stroke={stroke} strokeWidth="2" />
        <circle cx="20.5" cy="8.5" fill={softFill} r="3" stroke={stroke} strokeWidth="2" />
        <path d="M12.5 17.5h.1M19.5 17.5h.1M13.5 22c1.5 1 3.5 1 5 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "shopping") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <path d="M9 11h14l-1.3 14H10.3L9 11Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M12 11a4 4 0 0 1 8 0" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 17h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "dad") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <circle cx="16" cy="15" fill={softFill} r="8" stroke={stroke} strokeWidth="2.2" />
        <path d="M9.5 14c1-4 4-6 6.5-6s5.4 2 6.5 6c-3-1.2-4.8-2.4-6.5-4-1.7 1.6-3.5 2.8-6.5 4Z" fill="currentColor" opacity=".28" />
        <path d="M12.7 17h.1M19.2 17h.1M13.5 21c1.5 1 3.5 1 5 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M11 25c2.6 1.8 7.4 1.8 10 0" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "go") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <rect fill={softFill} height="17" rx="4" stroke={stroke} strokeWidth="2.2" width="18" x="7" y="9" />
        <path d="M11 7v5M21 7v5M7 15h18" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
        <path d="M13 20h6" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  if (group === "last_minute" || group === "documents_folder") {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
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
      <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
        <path d="M7 16 16 8l9 8v10H9V16Z" fill={softFill} stroke={stroke} strokeLinejoin="round" strokeWidth="2.2" />
        <path d="M14 26v-7h4v7" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 32 32">
      <rect fill={softFill} height="20" rx="4" stroke={stroke} strokeWidth="2.2" width="16" x="8" y="7" />
      <path d="M13 11h6M12 16h8M12 21h5" stroke={stroke} strokeLinecap="round" strokeWidth="2.2" />
    </svg>
  );
}
