"use client";

import Link from "next/link";
import { useEffect } from "react";

import {
  getCurrentGrowthWeekFromDueDate,
  getDaysUntilDueDate,
  getGrowthWeek,
} from "@/lib/growth";
import { useGrowthStore } from "@/lib/growth-store";

export function HomeGrowthHint() {
  const hydrated = useGrowthStore((state) => state.hydrated);
  const hydrate = useGrowthStore((state) => state.hydrate);
  const dueDate = useGrowthStore((state) => state.dueDate);
  const completedTaskIds = useGrowthStore((state) => state.completedTaskIds);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return null;
  }

  const daysUntilDue = getDaysUntilDueDate(dueDate);
  const currentWeek = getGrowthWeek(getCurrentGrowthWeekFromDueDate(dueDate));
  const hasPendingReminder =
    Boolean(dueDate) && !completedTaskIds.includes(currentWeek.checkupTaskId);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      {daysUntilDue === undefined ? (
        <Link
          className="rounded-lg text-muted-foreground underline decoration-primary/40 underline-offset-4 hover:text-foreground"
          href="/growth"
        >
          去填写预产期
        </Link>
      ) : (
        <Link
          className="rounded-lg font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:text-foreground"
          href="/growth"
        >
          {daysUntilDue >= 0
            ? `距预产期约 ${daysUntilDue} 天`
            : `预产期已过 ${Math.abs(daysUntilDue)} 天`}
        </Link>
      )}
      {hasPendingReminder ? (
        <Link
          className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive"
          href="/growth"
        >
          <span className="size-1.5 rounded-full bg-destructive" />
          本周产检提醒待确认
        </Link>
      ) : null}
    </div>
  );
}
