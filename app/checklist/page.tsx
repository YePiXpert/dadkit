"use client";

import { useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

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
import { filterItemsForChecklistMode, getHospitalForProfile } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type ChecklistCategory,
  type PackStatus,
  type Priority,
} from "@/lib/types";
import {
  filterItemsByVisualGroup,
  groupItemsForChecklist,
  type ChecklistVisualGroup,
} from "@/lib/presentation";

export default function ChecklistPage() {
  const [visualGroup, setVisualGroup] = useState<ChecklistVisualGroup>("all");
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
          description="先填写预产期、地区、医院和生产方式，DadKit 会生成第一版可编辑清单。"
          actionHref="/setup"
          actionLabel="开始创建清单"
        />
      </div>
    );
  }

  const hospital = getHospitalForProfile(profile);
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

  return (
    <div className="page-shell">
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">我的待产准备</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          先看精简清单，把要拿、要问、要确认的事处理掉。
        </p>
      </div>

      {hospital?.verificationStatus === "unverified" ? (
        <div className="mobile-shell rounded-lg border border-amber/30 bg-amber-soft p-4 text-sm leading-6 text-amber-foreground lg:max-w-none">
          该医院模板尚未核验，请以最近一次产检、入院须知或医院通知为准。
        </div>
      ) : null}

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
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
              </div>
            </div>
          </details>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="没有符合筛选的物品"
          description="可以调整分类、状态或优先级筛选，也可以新增自定义物品。"
        />
      ) : (
        groupItemsForChecklist(filteredItems).map((group) => (
          <ChecklistCategoryCard
            defaultOpen={
              visualGroup !== "all" ||
              filters.category !== "all" ||
              group.group === "documents_folder" ||
              group.group === "dad"
            }
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
