"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import {
  getCurrentGrowthWeekFromDueDate,
  getDaysUntilDueDate,
  getGrowthWeek,
} from "@/lib/growth";
import { useGrowthStore } from "@/lib/growth-store";
import { cn } from "@/lib/utils";

export function HomeGrowthHint({ tone = "default" }: { tone?: "default" | "inverse" }) {
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
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm",
        tone === "inverse" &&
          "relative z-10 border-t border-on-highlight/20 pt-3",
      )}
    >
      {daysUntilDue === undefined ? (
        <Link
          className={cn(
            "inline-flex min-h-11 items-center rounded-lg underline underline-offset-4 active:opacity-75",
            tone === "inverse"
              ? "font-medium text-on-highlight decoration-on-highlight/45 hover:text-on-highlight"
              : "text-muted-foreground decoration-primary/40 hover:text-foreground",
          )}
          href="/growth"
        >
          去填写预产期
        </Link>
      ) : (
        <Link
          className={cn(
            "inline-flex min-h-11 items-center rounded-lg font-medium underline underline-offset-4 active:opacity-75",
            tone === "inverse"
              ? "text-on-highlight decoration-on-highlight/45 hover:text-on-highlight"
              : "text-primary decoration-primary/40 hover:text-foreground",
          )}
          href="/growth"
        >
          {daysUntilDue >= 0
            ? `距预产期约 ${daysUntilDue} 天`
            : `预产期已过 ${Math.abs(daysUntilDue)} 天`}
        </Link>
      )}
      {hasPendingReminder ? (
        <Link className="inline-flex min-h-11 items-center rounded-lg active:opacity-75" href="/growth">
          <Badge
            className={cn(
              tone === "inverse" &&
                "bg-on-highlight/15 text-on-highlight",
            )}
            variant={tone === "inverse" ? "secondary" : "destructive"}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                tone === "inverse"
                  ? "bg-on-highlight"
                  : "bg-destructive",
              )}
            />
            本周产检提醒待确认
          </Badge>
        </Link>
      ) : null}
    </div>
  );
}
