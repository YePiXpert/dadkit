"use client";

import Link from "next/link";
import {
  AlarmClock,
  Baby,
  Backpack,
  BedDouble,
  Boxes,
  Check,
  ChevronRight,
  FileText,
  HeartHandshake,
  Home,
  Moon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    surfaceClassName: "bg-tile-docs-bg/60",
  },
  mom: {
    icon: Backpack,
    className: "bg-tile-mom-bg text-tile-mom-fg",
    surfaceClassName: "bg-tile-mom-bg/65",
  },
  wardMom: {
    icon: BedDouble,
    className: "bg-tile-mom-bg text-tile-mom-fg",
    surfaceClassName: "bg-tile-mom-bg/65",
  },
  baby: {
    icon: Baby,
    className: "bg-tile-baby-bg text-tile-baby-fg",
    surfaceClassName: "bg-tile-baby-bg/70",
  },
  confinementMom: {
    icon: Moon,
    className: "bg-tile-mom-bg text-tile-mom-fg",
    surfaceClassName: "bg-card",
  },
  confinementBaby: {
    icon: Boxes,
    className: "bg-tile-baby-bg text-tile-baby-fg",
    surfaceClassName: "bg-card",
  },
  partner: {
    icon: HeartHandshake,
    className: "bg-tile-dad-bg text-tile-dad-fg",
    surfaceClassName: "bg-card",
  },
  home: {
    icon: Home,
    className: "bg-tile-car-bg text-tile-car-fg",
    surfaceClassName: "bg-card",
  },
  lastMinute: {
    icon: AlarmClock,
    className:
      "bg-tile-lastminute-bg text-tile-lastminute-fg",
    surfaceClassName: "bg-card",
  },
} satisfies Record<
  ChecklistSectionId,
  { icon: typeof Baby; className: string; surfaceClassName: string }
>;

type ChecklistCategoryCardProps = {
  caption?: string;
  href: string;
  items: ChecklistItem[];
  layout?: "feature" | "row";
  progressItems?: ChecklistItem[];
  resolvedLabel?: string;
  sectionId: ChecklistSectionId;
  title: string;
};

export function ChecklistCategoryCard({
  caption,
  href,
  items,
  layout = "row",
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
  const statusLabel =
    items.length === 0
      ? "暂无项目"
      : remaining > 0
        ? `还差 ${remaining} 项`
        : (resolvedLabel ?? "已完成");

  if (layout === "feature") {
    return (
      <section className="h-full min-w-0">
        <Link
          className={cn(
            "group flex h-full min-h-[10.75rem] w-full flex-col rounded-card p-4 text-left shadow-sm ring-1 ring-border/35 transition-shadow hover:shadow-md active:brightness-[0.98]",
            meta.surfaceClassName,
          )}
          href={href}
        >
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-card/85 shadow-sm",
                meta.className,
              )}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </span>
            <ChevronRight
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>

          <span className="mt-3 block min-w-0">
            <span className="block break-words text-[15px] font-bold leading-5">
              {title}
            </span>
            <span className="mt-1 block break-words text-[13px] leading-5 text-muted-foreground">
              {caption}
            </span>
          </span>

          <span className="mt-auto block pt-3">
            <span className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="text-muted-foreground">{progressPercent}%</span>
              <span className="text-foreground">{statusLabel}</span>
            </span>
            {progressItems.length > 0 ? (
              <span
                aria-label={`${title} 已完成 ${progressPercent}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={progressPercent}
                className="mt-2 block h-1.5 overflow-hidden rounded-full bg-card/75"
                role="progressbar"
              >
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${progressPercent}%` }}
                />
              </span>
            ) : null}
          </span>
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link
        className="group flex min-h-[5.25rem] w-full items-center gap-3 rounded-card bg-card px-4 py-3.5 text-left shadow-sm ring-1 ring-border/25 transition-shadow hover:shadow-md active:bg-secondary/35"
        href={href}
      >
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-inset",
            meta.className,
          )}
        >
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words text-[15px] font-semibold leading-5">
            {title}
          </span>
          <span className="mt-0.5 block text-[13px] leading-4 text-muted-foreground">
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
                className="block h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </span>
          ) : null}
        </span>
        <Badge variant="muted" className="shrink-0 whitespace-nowrap">
          {statusLabel}
        </Badge>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </section>
  );
}
