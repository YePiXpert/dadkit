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
    className: "bg-tile-docs-bg text-tile-docs-fg",
  },
  mom: {
    icon: Backpack,
    className: "bg-tile-mom-bg text-tile-mom-fg",
  },
  baby: {
    icon: Baby,
    className: "bg-tile-baby-bg text-tile-baby-fg",
  },
  confinementMom: {
    icon: Moon,
    className: "bg-tile-mom-bg text-tile-mom-fg",
  },
  confinementBaby: {
    icon: Boxes,
    className: "bg-tile-baby-bg text-tile-baby-fg",
  },
  partner: {
    icon: HeartHandshake,
    className: "bg-tile-dad-bg text-tile-dad-fg",
  },
  home: {
    icon: Home,
    className: "bg-tile-car-bg text-tile-car-fg",
  },
  lastMinute: {
    icon: AlarmClock,
    className:
      "bg-tile-lastminute-bg text-tile-lastminute-fg",
  },
} satisfies Record<ChecklistSectionId, { icon: typeof Baby; className: string }>;

type ChecklistCategoryCardProps = {
  caption?: string;
  href: string;
  items: ChecklistItem[];
  progressItems?: ChecklistItem[];
  resolvedLabel?: string;
  sectionId: ChecklistSectionId;
  title: string;
};

export function ChecklistCategoryCard({
  caption,
  href,
  items,
  progressItems = items,
  resolvedLabel,
  sectionId,
  title,
}: ChecklistCategoryCardProps) {
  const resolved = progressItems.filter((item) =>
    ["packed", "not_needed"].includes(getChecklistItemState(item)),
  ).length;
  const progressPercent =
    progressItems.length === 0
      ? 0
      : Math.round((resolved / progressItems.length) * 100);
  const remaining = items.filter((item) =>
    ["todo", "ready"].includes(getChecklistItemState(item)),
  ).length;
  const meta = SECTION_META[sectionId];
  const Icon =
    progressItems.length > 0 && resolved === progressItems.length
      ? Check
      : meta.icon;

  return (
    <section>
      <Link
        className="flex min-h-[5.25rem] w-full items-center gap-3 rounded-card border border-border/70 bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted/35"
        href={href}
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-inset",
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
          {progressItems.length > 0 ? (
            <span
              aria-label={`${title} 已完成 ${progressPercent}%`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={progressPercent}
              className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </span>
          ) : null}
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {items.length === 0
            ? "暂无项目"
            : remaining > 0
              ? `还差 ${remaining} 项`
              : (resolvedLabel ?? "已完成")}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </section>
  );
}
