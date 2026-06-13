"use client";

import Image from "next/image";

import { EmptyState } from "@/components/EmptyState";
import { useDadKitStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type TimelineMilestone = {
  accent: "lavender" | "mint" | "teal" | "orange" | "amber";
  date?: string;
  icon: "book" | "search" | "dna" | "calendar" | "flag";
  status: "已完成" | "本周建议完成" | "未开始";
  tag?: string;
  title: string;
  weeks: string;
};

const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    accent: "lavender",
    date: "2026-03-01",
    icon: "book",
    status: "已完成",
    title: "建档",
    weeks: "12-16 周",
  },
  {
    accent: "mint",
    date: "2026-03-15",
    icon: "search",
    status: "已完成",
    title: "NT 检查",
    weeks: "11-14 周",
  },
  {
    accent: "teal",
    date: "2026-04-10",
    icon: "dna",
    status: "已完成",
    title: "无创 DNA",
    weeks: "12-20 周",
  },
  {
    accent: "orange",
    icon: "calendar",
    status: "本周建议完成",
    tag: "本周",
    title: "糖耐检查",
    weeks: "24-28 周",
  },
  {
    accent: "amber",
    date: "预计 2026-05-20",
    icon: "flag",
    status: "未开始",
    title: "大排畸",
    weeks: "20-24 周",
  },
];

const accentStyles: Record<
  TimelineMilestone["accent"],
  {
    card: string;
    icon: string;
    line: string;
    status: string;
    tag: string;
  }
> = {
  lavender: {
    card: "border-lavender/60 bg-card",
    icon: "border-lavender bg-lavender/70 text-lavender-foreground ring-6 ring-lavender/35",
    line: "bg-lavender",
    status: "text-primary",
    tag: "bg-lavender text-lavender-foreground",
  },
  mint: {
    card: "border-mint bg-card",
    icon: "border-mint bg-mint text-primary ring-6 ring-mint/55",
    line: "bg-primary/55",
    status: "text-primary",
    tag: "bg-mint text-primary",
  },
  teal: {
    card: "border-mint bg-card",
    icon: "border-mint bg-card text-primary ring-6 ring-mint/50",
    line: "bg-primary/55",
    status: "text-primary",
    tag: "bg-mint text-primary",
  },
  orange: {
    card: "border-amber bg-amber-soft/60",
    icon: "border-amber bg-amber-soft text-amber-foreground ring-6 ring-amber-soft/90",
    line: "bg-coral",
    status: "text-coral-foreground",
    tag: "bg-blush text-coral-foreground",
  },
  amber: {
    card: "border-amber/55 bg-card",
    icon: "border-amber bg-amber-soft text-amber-foreground ring-6 ring-amber-soft/75",
    line: "bg-amber",
    status: "text-muted-foreground",
    tag: "bg-amber-soft text-amber-foreground",
  },
};

export default function TimelinePage() {
  const profile = useDadKitStore((state) => state.profile);

  if (!profile?.dueDate) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有准备时间线"
          description="填写预产期后，DadKit 会自动生成准备时间线。"
          actionHref="/setup"
          actionLabel="填写预产期"
        />
      </div>
    );
  }

  const dueDateLabel = formatDueDateLabel(profile.dueDate);

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3 bg-card px-4 pb-4 pt-1 lg:max-w-none">
        <p className="text-sm font-semibold leading-6 text-muted-foreground">
          重要节点不错过，每一步都安心
        </p>

        <div className="relative grid gap-3 pb-1">
          <div
            aria-hidden="true"
            className="absolute bottom-[4.75rem] left-[1.82rem] top-[2.15rem] w-1 rounded-full bg-gradient-to-b from-lavender via-mint to-amber"
          />
          {TIMELINE_MILESTONES.map((milestone, index) => (
            <TimelineMilestoneRow
              isLast={index === TIMELINE_MILESTONES.length - 1}
              key={milestone.title}
              milestone={milestone}
            />
          ))}
        </div>

        <div className="relative mt-3 min-h-[4.05rem] overflow-hidden rounded-full border border-amber/45 bg-amber-soft px-5 py-3 shadow-soft">
          <span className="pointer-events-none absolute -left-1 bottom-3 text-sm text-coral">
            ❤
          </span>
          <span className="pointer-events-none absolute left-5 top-2 text-xs text-coral">
            ❧
          </span>
          <p className="relative z-10 text-sm font-bold text-cream-foreground">
            预产期&nbsp; {dueDateLabel}
          </p>
          <Image
            alt="小熊预产期提醒"
            className="absolute bottom-0 right-3 h-16 w-16 object-contain"
            height={96}
            priority
            src="/illustrations/dadkit-bear-transparent.png"
            width={96}
          />
        </div>
      </section>
    </div>
  );
}

function TimelineMilestoneRow({
  isLast,
  milestone,
}: {
  isLast: boolean;
  milestone: TimelineMilestone;
}) {
  const styles = accentStyles[milestone.accent];

  return (
    <article className="relative grid min-h-[4.45rem] grid-cols-[3.75rem_1fr] items-center gap-2">
      {!isLast ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-[1.82rem] top-1/2 h-[calc(100%-1.05rem)] w-1 rounded-full",
            styles.line,
          )}
        />
      ) : null}
      <div className="relative z-10 flex justify-center">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full border-2 bg-card",
            styles.icon,
          )}
        >
          <TimelineMilestoneIcon icon={milestone.icon} />
        </span>
      </div>

      <div
        className={cn(
          "grid min-h-[3.65rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-4 py-2.5 shadow-sm",
          styles.card,
        )}
      >
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[0.95rem] font-black tracking-normal">
            {milestone.title}
            <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
              ({milestone.weeks})
            </span>
          </p>
          <p className={cn("mt-1 text-sm font-bold leading-none", styles.status)}>
            {milestone.status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
          {milestone.date ? <span>{milestone.date}</span> : null}
          {milestone.tag ? (
            <span className={cn("rounded-full px-3 py-1 text-xs", styles.tag)}>
              {milestone.tag}
            </span>
          ) : (
            <span className="text-primary">✓</span>
          )}
        </div>
      </div>
    </article>
  );
}

function TimelineMilestoneIcon({ icon }: { icon: TimelineMilestone["icon"] }) {
  if (icon === "book") {
    return (
      <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
        <path
          d="M6.5 5.5h7a4 4 0 0 1 4 4v8h-7a4 4 0 0 0-4 4z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M6.5 5.5a3 3 0 0 0-3 3v8h3M10 9h4M10 12h4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (icon === "search") {
    return (
      <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
        <path
          d="M9.5 4.5h5l3 3v8.5a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-9.5a2 2 0 0 1 2-2z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="m13.5 4.5.2 3h3M10.5 11.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0ZM15 15l1.8 1.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (icon === "dna") {
    return (
      <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          fill="none"
          r="7"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M8.5 12c2-3 5-3 7 0M8.5 12c2 3 5 3 7 0M10 8.5l4 7M14 8.5l-4 7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (icon === "calendar") {
    return (
      <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
        <rect
          fill="none"
          height="15"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          x="5"
          y="6"
        />
        <path
          d="M8 4v4M16 4v4M5 10h14M9 14h2M13 14h2M9 17h2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24">
      <path
        d="M6 20V5.5M6 6h10l-1.5 3L16 12H6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function formatDueDateLabel(dueDate: string) {
  const date = new Date(`${dueDate}T00:00:00`);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = Number.isNaN(date.getTime()) ? undefined : weekdays[date.getDay()];

  return weekday ? `${dueDate}（${weekday}）` : dueDate;
}
