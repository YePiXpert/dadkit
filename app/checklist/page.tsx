"use client";

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
import { PageIntro } from "@/components/PageIntro";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateCompletion,
  filterItemsForChecklistMode,
} from "@/lib/rules";
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

const VIEW_COPY: Record<
  ChecklistVisualGroup,
  {
    title: string;
    description: string;
  }
> = {
  all: {
    title: "我的待产准备",
    description: "先看精简清单，把要拿、要问、要确认的事处理掉。",
  },
  documents_folder: {
    title: "证件包检查",
    description: "只看证件、医保卡、产检资料和入院资料，状态按整理证件处理。",
  },
  mom_bag: {
    title: "妈妈包",
    description: "区分需要购买、已有物品、清洗后打包和临出门拿。",
  },
  baby_bag: {
    title: "宝宝包",
    description: "宝宝衣物按清洗后打包处理，消耗品按购买补货处理。",
  },
  dad: {
    title: "爸爸负责",
    description: "只看需要确认、安装、放车上和临出门执行的任务。",
  },
  shopping: {
    title: "购物清单",
    description: "只显示可能需要购买或补货的物品。证件、任务、临出门拿和医院问题不会出现在这里。",
  },
  go: {
    title: "临出门检查",
    description: "只看证件包、手机、充电器、眼镜、常用药、妈妈包、宝宝包和安全座椅等临出门事项。",
  },
  questions: {
    title: "下次产检要问",
    description: "只看医院确认问题，状态按待问、已确认、医院提供和不适用处理。",
  },
  last_minute: {
    title: "临出门拿",
    description: "只看需要放到固定位置、临出门拿或最终确认的项目。",
  },
  going_home: {
    title: "出院返家",
    description: "只看返家交通、出院衣物和安全座椅等回家相关事项。",
  },
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
  const viewCopy = VIEW_COPY[visualGroup];
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
  const completion = useMemo(() => calculateCompletion(filteredItems), [filteredItems]);
  const remaining = Math.max(0, completion.total - completion.completed);
  const emptyCopy = getEmptyStateCopy(visualGroup);

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
      <PageIntro
        eyebrow="待产包整理"
        title="清单工作台"
        description={viewCopy.description}
      >
        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="当前视图" value={viewCopy.title} />
          <MetricTile label="已完成" value={`${completion.completed} 项`} />
          <MetricTile label="待处理" value={`${remaining} 项`} />
        </div>
      </PageIntro>

      <section className="mobile-shell macaron-panel grid gap-3 p-4 lg:max-w-none">
        <div className="grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
          <ModeToggle mode={checklistMode} onChange={setChecklistMode} />
          <ProgressSummary items={modeItems} />
        </div>
        <ChecklistGroupTabs
          counts={groupCounts}
          value={visualGroup}
          onChange={setVisualGroup}
        />
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            筛选与操作
          </summary>
          <div className="mt-3 grid gap-3">
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

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="macaron-strip">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-base font-semibold tracking-normal sm:text-lg">
        {value}
      </p>
    </div>
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
