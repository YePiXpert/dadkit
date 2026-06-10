import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStatusLabelForItem } from "@/lib/preparation";
import { generateChecklist, normalizeChecklistItem } from "@/lib/rules";
import {
  CATEGORY_LABELS,
  type ChecklistCategory,
  type UserProfile,
} from "@/lib/types";

const exampleProfile: UserProfile = {
  dueDate: dueDateIn(42),
  regionId: "cn-bj-general",
  hospitalMode: "unknown",
  deliveryMode: "unknown",
  expectedStayDays: 3,
  breastfeeding: true,
  partnerPresent: true,
  coldWeather: false,
  hospitalProvidedItemIds: [],
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

const previewCategories: ChecklistCategory[] = [
  "documents",
  "mom_labor",
  "baby",
  "partner",
  "hospital_questions",
  "last_minute",
];

export default function ExamplePage() {
  const items = generateChecklist(exampleProfile).map(normalizeChecklistItem);

  return (
    <div className="page-shell">
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">示例清单</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          这只是只读预览，不会覆盖或写入你的真实数据。
        </p>
      </div>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-2">
        {previewCategories.map((category) => {
          const categoryItems = items
            .filter((item) => item.category === category)
            .slice(0, 4);

          return (
            <Card className="rounded-lg" key={category}>
              <CardHeader>
                <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {categoryItems.map((item) => (
                  <div
                    className="rounded-lg border border-border bg-background p-3"
                    key={item.id}
                  >
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getStatusLabelForItem(item.status, item)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <div className="mobile-shell flex flex-wrap gap-2 lg:max-w-none">
        <Button asChild>
          <Link href="/setup">创建我的清单</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}

function dueDateIn(days: number) {
  const dueDate = new Date();

  dueDate.setDate(dueDate.getDate() + days);

  return dueDate.toISOString().slice(0, 10);
}
