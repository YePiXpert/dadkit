"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Save, Sparkles } from "lucide-react";

import { DueDateCard } from "@/components/DueDateCard";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createDemoChecklist, createDemoProfile } from "@/lib/demo";
import {
  filterItemsForChecklistMode,
  calculateConfirmationCompletion,
  calculateLastMinuteCompletion,
  calculatePackingCompletion,
} from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import { loadUserProfile } from "@/lib/storage";
import {
  BAG_LABELS,
  ITEM_KIND_LABELS,
  TIMING_LABELS,
  getStatusLabel,
  type ChecklistItem,
} from "@/lib/types";
import {
  filterItemsByVisualGroup,
  type ChecklistVisualGroup,
} from "@/lib/presentation";
import { Progress } from "@/components/ui/progress";

const DEMO_GROUPS: ChecklistVisualGroup[] = [
  "documents_folder",
  "mom_bag",
  "baby_bag",
  "dad",
  "questions",
  "last_minute",
];

const DEMO_GROUP_LABELS: Record<ChecklistVisualGroup, string> = {
  all: "全部",
  documents_folder: "证件包",
  mom_bag: "妈妈包",
  baby_bag: "宝宝包",
  dad: "爸爸负责",
  questions: "下次产检问",
  last_minute: "临出门拿",
  going_home: "出院返家",
};

export default function DemoPage() {
  const router = useRouter();
  const existingProfile = useDadKitStore((state) => state.profile);
  const createProfile = useDadKitStore((state) => state.createProfile);
  const demoProfile = useMemo(() => createDemoProfile(), []);
  const demoChecklist = useMemo(() => createDemoChecklist(), []);
  const demoItems = filterItemsForChecklistMode(demoChecklist, "lean");
  const packing = calculatePackingCompletion(demoItems);
  const confirmation = calculateConfirmationCompletion(demoItems);
  const lastMinute = calculateLastMinuteCompletion(demoItems);

  function useExample() {
    const hasExistingProfile = existingProfile || loadExistingProfile();
    const message = hasExistingProfile
      ? "这会替换你当前的资料和清单。建议先导出 JSON 备份。是否继续？"
      : "这会把示例资料保存为你的清单，之后可以修改。是否继续？";

    if (!window.confirm(message)) {
      return;
    }

    createProfile(demoProfile);
    router.push("/checklist");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-2 lg:max-w-none">
        <p className="text-sm font-medium text-primary">只读示例</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          DadKit 示例清单
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          这是只读示例，不会保存或覆盖你的真实清单。
        </p>
      </section>

      <div className="mobile-shell grid gap-4 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr]">
        <DueDateCard dueDate={demoProfile.dueDate} />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" />
              示例进度
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <DemoProgress
              completed={packing.completed}
              label="打包进度"
              percent={packing.percent}
              total={packing.total}
            />
            <DemoProgress
              completed={confirmation.completed}
              label="医院确认进度"
              percent={confirmation.percent}
              total={confirmation.total}
            />
            <DemoProgress
              completed={lastMinute.completed}
              label="临出门检查进度"
              percent={lastMinute.percent}
              total={lastMinute.total}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mobile-shell lg:max-w-none">
        <ProgressSummary items={demoItems} />
      </div>

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-xl font-semibold tracking-normal">精简清单示例</h2>
        </div>
        {DEMO_GROUPS.map((group) => {
          const groupItems = filterItemsByVisualGroup(demoItems, group).slice(0, 5);

          if (groupItems.length === 0) {
            return null;
          }

          return (
            <ReadOnlyChecklistGroup
              items={groupItems}
              key={group}
              title={DEMO_GROUP_LABELS[group]}
            />
          );
        })}
      </section>

      <section className="mobile-shell flex flex-wrap gap-2 lg:max-w-none">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="size-4" />
            返回首页
          </Link>
        </Button>
        <Button asChild>
          <Link href="/setup">开始创建我的清单</Link>
        </Button>
        <Button variant="outline" onClick={useExample}>
          <Save className="size-4" />
          使用这个示例创建我的清单
        </Button>
      </section>
    </div>
  );
}

function loadExistingProfile() {
  try {
    return loadUserProfile();
  } catch {
    return undefined;
  }
}

function DemoProgress({
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
    <div className="rounded-xl bg-secondary p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-secondary-foreground">{label}</span>
        <span className="text-muted-foreground">
          {completed}/{total}
        </span>
      </div>
      <Progress value={percent} />
      <p className="mt-2 font-semibold text-primary">{percent}%</p>
    </div>
  );
}

function ReadOnlyChecklistGroup({
  items,
  title,
}: {
  items: ChecklistItem[];
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold tracking-normal">{title}</h3>
        <span className="text-sm text-muted-foreground">{items.length} 项示例</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <ReadOnlyChecklistItem item={item} key={item.id} />
        ))}
      </div>
    </section>
  );
}

function ReadOnlyChecklistItem({ item }: { item: ChecklistItem }) {
  const itemKind = item.itemKind ?? "item";

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="min-w-0 break-words text-sm font-semibold leading-6">
          {item.name}
        </h4>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs text-primary">
          {getStatusLabel(item.status, itemKind)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted-foreground">
        {item.quantity ? <span>数量：{item.quantity}</span> : null}
        <span>类型：{ITEM_KIND_LABELS[itemKind]}</span>
        {item.bag && item.bag !== "none" ? (
          <span>放置：{BAG_LABELS[item.bag]}</span>
        ) : null}
        <span>时机：{TIMING_LABELS[item.timing]}</span>
      </div>
      {item.note ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.note}</p>
      ) : null}
    </div>
  );
}
