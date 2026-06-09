"use client";

import {
  calculateCategoryCompletion,
  calculateConfirmationCompletion,
  calculateLastMinuteCompletion,
  calculatePackingCompletion,
} from "@/lib/rules";
import {
  CATEGORY_LABELS,
  type ChecklistCategory,
  type ChecklistItem,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProgressSummaryProps = {
  items: ChecklistItem[];
};

export function ProgressSummary({ items }: ProgressSummaryProps) {
  const packing = calculatePackingCompletion(items);
  const confirmation = calculateConfirmationCompletion(items);
  const lastMinute = calculateLastMinuteCompletion(items);
  const categories = calculateCategoryCompletion(items).filter((item) => item.total > 0);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>核心打包进度</span>
          <span className="text-primary">{packing.percent}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={packing.percent} />
        <div className="grid grid-cols-2 gap-2">
          <SummaryPill
            completed={confirmation.completed}
            label="医院确认"
            percent={confirmation.percent}
            total={confirmation.total}
          />
          <SummaryPill
            completed={lastMinute.completed}
            label="临出门检查"
            percent={lastMinute.percent}
            total={lastMinute.total}
          />
        </div>
        {categories.length > 0 ? (
          <details className="rounded-md border border-border bg-background">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground">
              查看分类进度
            </summary>
            <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
              {categories.map((category) => (
                <CategoryProgress
                  category={category.category}
                  completed={category.completed}
                  key={category.category}
                  percent={category.percent}
                  total={category.total}
                />
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryPill({
  completed,
  label,
  percent,
  total,
}: {
  completed: number;
  label: string;
  percent: number;
  total: number;
}) {
  return (
    <div className="rounded-xl bg-secondary p-2.5 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-secondary-foreground">{label}</span>
        <span className="text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}

function CategoryProgress({
  category,
  completed,
  percent,
  total,
}: {
  category: ChecklistCategory;
  completed: number;
  percent: number;
  total: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{CATEGORY_LABELS[category]}</span>
        <span className="text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <Progress value={percent} />
    </div>
  );
}
