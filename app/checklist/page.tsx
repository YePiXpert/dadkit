"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Copy,
  RotateCcw,
} from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistModeNotice } from "@/components/ChecklistModeNotice";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { EmptyState } from "@/components/EmptyState";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateCompletion,
  calculatePackingCompletion,
  filterItemsForChecklistMode,
} from "@/lib/rules";
import { getBabyMascot, getBabySexLabel } from "@/lib/baby-profile";
import { useDadKitStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRIORITY_LABELS,
  type ChecklistCategory,
  type PackStatus,
  type Priority,
} from "@/lib/types";
import {
  CHECKLIST_VISUAL_GROUPS,
  filterItemsByVisualGroup,
  groupItemsForChecklist,
  groupItemsForShopping,
  type ChecklistVisualGroup,
} from "@/lib/presentation";

type ChecklistGroupSummary =
  | ReturnType<typeof groupItemsForChecklist>[number]
  | ReturnType<typeof groupItemsForShopping>[number];

const STATUS_FILTER_LABELS: Record<PackStatus, string> = {
  todo: "待处理",
  bought: "已购买",
  washed: "已清洗",
  packed: "已完成/已打包",
  last_minute: "临出门拿",
  hospital_provided: "医院提供",
  not_needed: "不需要",
};

export default function ChecklistPage() {
  const [visualGroup, setVisualGroup] = useState<ChecklistVisualGroup>("all");
  const [copyMessage, setCopyMessage] = useState("");
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const filters = useDadKitStore((state) => state.filters);
  const setFilters = useDadKitStore((state) => state.setFilters);
  const setChecklistMode = useDadKitStore((state) => state.setChecklistMode);
  const regenerateChecklist = useDadKitStore((state) => state.regenerateChecklist);
  const resetChecklist = useDadKitStore((state) => state.resetChecklist);
  const modeItems = useMemo(
    () => filterItemsForChecklistMode(checklist, checklistMode),
    [checklist, checklistMode],
  );
  const packing = useMemo(() => calculatePackingCompletion(modeItems), [modeItems]);
  const groupedModeItems = useMemo(
    () => filterItemsByVisualGroup(modeItems, visualGroup),
    [modeItems, visualGroup],
  );
  const filteredItems = useMemo(
    () =>
      groupedModeItems.filter((item) => {
        if (filters.category !== "all" && item.category !== filters.category) {
          return false;
        }

        if (filters.status !== "all" && item.status !== filters.status) {
          return false;
        }

        if (filters.priority !== "all" && item.priority !== filters.priority) {
          return false;
        }

        return true;
      }),
    [filters.category, filters.priority, filters.status, groupedModeItems],
  );
  const groupCounts = useMemo(
    () =>
      Object.fromEntries(
        CHECKLIST_VISUAL_GROUPS.map((group) => {
          const items = filterItemsByVisualGroup(modeItems, group.id);
          const stats = calculateCompletion(items);

          return [
            group.id,
            {
              remaining: Math.max(0, stats.total - stats.completed),
              total: stats.total,
            },
          ];
        }),
      ) as Record<ChecklistVisualGroup, { total: number; remaining: number }>,
    [modeItems],
  );
  const renderedGroups = useMemo(
    () =>
      visualGroup === "shopping"
        ? groupItemsForShopping(filteredItems)
        : groupItemsForChecklist(filteredItems),
    [filteredItems, visualGroup],
  );
  const emptyCopy = getEmptyStateCopy(visualGroup);
  const babyMascot = getBabyMascot(profile);

  if (!profile) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有清单"
          description="先填写预产期、地区、医院和生产方式，DadKit 会生成一份可编辑清单。"
          actionHref="/setup"
          actionLabel="开始创建清单"
        />
      </div>
    );
  }

  function copyShoppingList() {
    const text = groupItemsForShopping(filteredItems)
      .map((group) =>
        [`${group.label}`, ...group.items.map((item) => `- ${item.name}`)].join(
          "\n",
        ),
      )
      .join("\n\n");

    navigator.clipboard.writeText(text || "购物清单暂无待购买物品");
    setCopyMessage("购物清单已复制");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight tracking-normal">
              清单
            </h1>
            <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
              为{getBabySexLabel(profile)}的待产包逐项打勾
            </p>
          </div>
          <span className="relative mt-1 flex size-14 shrink-0 overflow-hidden rounded-full border border-primary/15 bg-secondary shadow-sm">
            <Image
              alt={babyMascot.alt}
              className="object-contain p-0.5"
              fill
              priority
              sizes="56px"
              src={babyMascot.src}
            />
          </span>
        </div>

        <ChecklistProgressCard packing={packing} />

        <div className="grid gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-bold">分类入口</p>
            <p className="text-xs font-semibold text-muted-foreground">
              共 {CHECKLIST_VISUAL_GROUPS.length} 类
            </p>
          </div>
          <ChecklistGroupTabs
            counts={groupCounts}
            value={visualGroup}
            onChange={setVisualGroup}
          />
        </div>
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <details className="rounded-lg border border-white/90 bg-card/90 p-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            清单操作
          </summary>
          <div className="mt-3 grid gap-3">
            <p className="macaron-note">
              分类、筛选和批量处理放在这里，主页面只保留待产包进度和分组。
            </p>
            <ModeToggle mode={checklistMode} onChange={setChecklistMode} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters({ category: value as ChecklistCategory | "all" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {CATEGORY_ORDER.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ status: value as PackStatus | "all" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.priority}
                onValueChange={(value) =>
                  setFilters({ priority: value as Priority | "all" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <AddItemDialog />
              <Button asChild variant="outline">
                <Link href="/timeline">
                  <CalendarClock className="size-4" />
                  准备时间线
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/go">
                  <CheckCircle2 className="size-4" />
                  临出门模式
                </Link>
              </Button>
              <Button variant="outline" onClick={regenerateChecklist}>
                <RotateCcw className="size-4" />
                重新生成
              </Button>
              <Button variant="outline" onClick={resetChecklist}>
                重置
              </Button>
              {visualGroup === "shopping" ? (
                <Button variant="outline" onClick={copyShoppingList}>
                  <Copy className="size-4" />
                  复制购物清单
                </Button>
              ) : null}
            </div>
            {copyMessage ? (
              <p className="macaron-note">{copyMessage}</p>
            ) : null}
          </div>
        </details>
        <ChecklistModeNotice />
      </section>

      {filteredItems.length === 0 ? (
        <EmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
        />
      ) : visualGroup === "all" ? (
        <div className="mobile-shell grid gap-3 sm:grid-cols-2 lg:max-w-none">
          {renderedGroups.map((group) => (
            <ChecklistGroupSummaryCard
              group={group}
              key={group.group}
              onOpen={() => setVisualGroup(group.group as ChecklistVisualGroup)}
            />
          ))}
        </div>
      ) : (
        <div className="mobile-shell grid gap-3 lg:max-w-none">
          {renderedGroups.map((group) => (
            <ChecklistCategoryCard
              defaultOpen
              items={group.items}
              key={group.group}
              title={group.label}
            />
          ))}
        </div>
      )}

      <DisclaimerBox />
    </div>
  );
}

function ChecklistProgressCard({
  packing,
}: {
  packing: { completed: number; percent: number; total: number };
}) {
  return (
    <section className="pony-soft-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-muted-foreground">清单总进度</p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-3xl font-black leading-none text-primary">
              {packing.percent}%
            </span>
          </div>
        </div>
        <span className="text-sm font-black text-primary">
          {packing.completed}/{packing.total}
        </span>
      </div>
      <Progress className="mt-3 h-2.5 bg-primary/12" value={packing.percent} />
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        已完成 {packing.completed} 项，共 {packing.total} 项
      </p>
    </section>
  );
}

function getEmptyStateCopy(visualGroup: ChecklistVisualGroup) {
  if (visualGroup === "shopping") {
    return {
      title: "当前没有待购买物品",
      description: "购物清单只显示可能需要购买或补货、且尚未完成的物品。",
    };
  }

  if (visualGroup === "questions") {
    return {
      title: "暂时没有待问事项",
      description: "医院确认问题处理完后，这里会保持清爽。",
    };
  }

  if (visualGroup === "go" || visualGroup === "last_minute") {
    return {
      title: "临出门事项已收口",
      description: "可以回到全部清单查看其他准备项目。",
    };
  }

  return {
    title: "没有符合筛选的物品",
    description: "可以调整分类、状态或优先级筛选，也可以新增自定义项目。",
  };
}

function ChecklistGroupSummaryCard({
  group,
  onOpen,
}: {
  group: ChecklistGroupSummary;
  onOpen: () => void;
}) {
  const completion = calculateCompletion(group.items);
  const remaining = Math.max(0, completion.total - completion.completed);

  return (
    <button
      className="rounded-lg border border-white/90 bg-card/95 p-4 text-left shadow-sm transition-colors hover:border-primary/40"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-normal">{group.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            已完成 {completion.completed} 项 · 未完成 {remaining} 项
          </p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-peach text-peach-foreground">
          <ArrowRight className="size-4" />
        </span>
      </div>
    </button>
  );
}
