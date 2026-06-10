"use client";

import { useState } from "react";
import { ArrowRight, Copy, RotateCcw, SlidersHorizontal } from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistModeNotice } from "@/components/ChecklistModeNotice";
import { DisclaimerBox } from "@/components/DisclaimerBox";
import { EmptyState } from "@/components/EmptyState";
import { ModeToggle } from "@/components/ModeToggle";
import { ProgressSummary } from "@/components/ProgressSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const modeItems = filterItemsForChecklistMode(checklist, checklistMode);
  const groupedModeItems = filterItemsByVisualGroup(modeItems, visualGroup);
  const filteredItems = groupedModeItems.filter((item) => {
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
  });
  const viewCopy = VIEW_COPY[visualGroup];
  const renderedGroups =
    visualGroup === "shopping"
      ? groupItemsForShopping(filteredItems)
      : groupItemsForChecklist(filteredItems);

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
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">{viewCopy.title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          {viewCopy.description}
        </p>
      </div>

      <div className="mobile-shell grid gap-4 lg:max-w-none">
        <ModeToggle mode={checklistMode} onChange={setChecklistMode} />
        <ChecklistModeNotice />
        <ProgressSummary items={modeItems} />
        <ChecklistGroupTabs value={visualGroup} onChange={setVisualGroup} />
      </div>

      <Card>
        <CardContent className="grid gap-2 p-3">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="size-4 text-primary" />
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
                <p className="text-sm text-muted-foreground">{copyMessage}</p>
              ) : null}
            </div>
          </details>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="没有符合筛选的物品"
          description="可以调整分类、状态或优先级筛选，也可以新增自定义项目。"
        />
      ) : visualGroup === "all" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {renderedGroups.map((group) => (
            <ChecklistGroupSummaryCard
              group={group}
              key={group.group}
              onOpen={() => setVisualGroup(group.group as ChecklistVisualGroup)}
            />
          ))}
        </div>
      ) : (
        renderedGroups.map((group) => (
          <ChecklistCategoryCard
            defaultOpen
            items={group.items}
            key={group.group}
            title={group.label}
          />
        ))
      )}

      <DisclaimerBox />
    </div>
  );
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
      className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40"
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
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <ArrowRight className="size-4" />
        </span>
      </div>
    </button>
  );
}
