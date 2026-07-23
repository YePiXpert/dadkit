"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type DueDateCardProps = {
  dueDate?: string;
};

export function DueDateCard({ dueDate }: DueDateCardProps) {
  if (!dueDate) {
    return null;
  }

  const daysLeft = differenceInCalendarDays(parseISO(dueDate), new Date());
  const percent = Math.max(0, Math.min(100, Math.round(((280 - daysLeft) / 280) * 100)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" />
          预产期倒计时
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              预产期 {format(parseISO(dueDate), "yyyy-MM-dd")}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-normal">
              {daysLeft >= 0 ? `${daysLeft} 天` : "已到期"}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary">
            {percent}%
          </span>
        </div>
        <Progress value={percent} />
        {daysLeft < 21 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            建议尽快完成待产包打包，并把临出门物品放在固定位置。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
