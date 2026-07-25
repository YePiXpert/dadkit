"use client";

import Link from "next/link";
import {
  AlarmClock,
  Baby,
  Backpack,
  Boxes,
  Check,
  ChevronRight,
  FileText,
  HeartHandshake,
  Home,
  Moon,
} from "lucide-react";

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
  href: string;
  items: ChecklistItem[];
  sectionId: ChecklistSectionId;
  title: string;
};

export function ChecklistCategoryCard({
  caption,
  href,
  items,
  sectionId,
  title,
}: ChecklistCategoryCardProps) {
  const resolved = items.filter((item) =>
    ["packed", "not_needed"].includes(getChecklistItemState(item)),
  ).length;
  const remaining = items.filter((item) =>
    ["todo", "ready"].includes(getChecklistItemState(item)),
  ).length;
  const meta = SECTION_META[sectionId];
  const Icon = items.length > 0 && resolved === items.length ? Check : meta.icon;

  return (
    <section>
      <Link
        className="flex min-h-[5.25rem] w-full items-center gap-3 rounded-[1.75rem] border border-border/70 bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/35"
        href={href}
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
            {caption}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {items.length === 0
            ? "暂无项目"
            : remaining > 0
              ? `还差 ${remaining} 项`
              : "已完成"}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
}
