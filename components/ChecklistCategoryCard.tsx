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
    <section className="overflow-hidden rounded-3xl bg-card shadow-sm">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/45"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl",
            meta.className,
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm font-semibold leading-5">
            {title}
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
            {caption ? `${caption} · ` : ""}
            {remaining > 0 ? `还剩 ${remaining} 项` : "这一包已完成"}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
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
        <div className="grid gap-2 px-2 pb-2">
          {items.map((item) => (
            <ChecklistItemRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
