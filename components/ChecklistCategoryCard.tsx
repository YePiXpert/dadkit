"use client";

import { useState } from "react";
import {
  AlarmClock,
  Baby,
  Backpack,
  Boxes,
  Check,
  ChevronDown,
  FileText,
  HeartHandshake,
  Home,
  Moon,
} from "lucide-react";

import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import {
  getChecklistItemState,
  type ChecklistSectionId,
} from "@/lib/checklist-v2";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTION_META = {
  documents: {
    icon: FileText,
    className: "bg-[hsl(var(--tile-docs-bg))] text-[hsl(var(--tile-docs-fg))]",
  },
  mom: {
    icon: Backpack,
    className: "bg-[hsl(var(--tile-mom-bg))] text-[hsl(var(--tile-mom-fg))]",
  },
  baby: {
    icon: Baby,
    className: "bg-[hsl(var(--tile-baby-bg))] text-[hsl(var(--tile-baby-fg))]",
  },
  confinementMom: {
    icon: Moon,
    className: "bg-[hsl(var(--tile-mom-bg))] text-[hsl(var(--tile-mom-fg))]",
  },
  confinementBaby: {
    icon: Boxes,
    className: "bg-[hsl(var(--tile-baby-bg))] text-[hsl(var(--tile-baby-fg))]",
  },
  partner: {
    icon: HeartHandshake,
    className: "bg-[hsl(var(--tile-dad-bg))] text-[hsl(var(--tile-dad-fg))]",
  },
  home: {
    icon: Home,
    className: "bg-[hsl(var(--tile-car-bg))] text-[hsl(var(--tile-car-fg))]",
  },
  lastMinute: {
    icon: AlarmClock,
    className:
      "bg-[hsl(var(--tile-lastminute-bg))] text-[hsl(var(--tile-lastminute-fg))]",
  },
} satisfies Record<ChecklistSectionId, { icon: typeof Baby; className: string }>;

type ChecklistCategoryCardProps = {
  caption?: string;
  items: ChecklistItem[];
  sectionId: ChecklistSectionId;
  title: string;
};

export function ChecklistCategoryCard({
  caption,
  items,
  sectionId,
  title,
}: ChecklistCategoryCardProps) {
  const [open, setOpen] = useState(false);
  const resolved = items.filter((item) =>
    ["packed", "not_needed"].includes(getChecklistItemState(item)),
  ).length;
  const remaining = items.filter((item) =>
    ["todo", "ready"].includes(getChecklistItemState(item)),
  ).length;
  const meta = SECTION_META[sectionId];
  const Icon = resolved === items.length ? Check : meta.icon;

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-3">
      <button
        aria-expanded={open}
        className="flex min-h-[5.25rem] w-full items-center gap-3 rounded-[1.75rem] border border-border/80 bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/35"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-[1.15rem]",
            meta.className,
          )}
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold leading-5 sm:text-base">
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
            {caption ? `${caption} · ` : ""}
            {remaining > 0 ? `还剩 ${remaining} 项` : "这一包已完成"}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {resolved}/{items.length}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          {items.map((item) => (
            <ChecklistItemRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
