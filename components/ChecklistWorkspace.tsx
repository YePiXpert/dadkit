"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  CalendarDays,
  ChevronRight,
  ListRestart,
  Settings2,
  Sparkles,
} from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { EmptyState } from "@/components/EmptyState";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CHECKLIST_VIEWS,
  getChecklistViewCounts,
  getChecklistViewItems,
  groupChecklistViewItems,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { filterItemsForChecklistMode, calculatePackingCompletion } from "@/lib/rules";
import {
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import { useDadKitStore } from "@/lib/store";

export function ChecklistWorkspace() {
  const [view, setView] = useState<ChecklistView>("all");
  const [message, setMessage] = useState("");
  const hydrated = useDadKitStore((state) => state.hydrated);
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const setChecklistMode = useDadKitStore((state) => state.setChecklistMode);
  const resetChecklist = useDadKitStore((state) => state.resetChecklist);

  const modeItems = useMemo(
    () => filterItemsForChecklistMode(checklist, checklistMode),
    [checklist, checklistMode],
  );
  const counts = useMemo(() => getChecklistViewCounts(modeItems), [modeItems]);
  const allItems = useMemo(
    () => getChecklistViewItems(modeItems, "all"),
    [modeItems],
  );
  const packing = useMemo(
    () => calculatePackingCompletion(allItems),
    [allItems],
  );
  const visibleItems = useMemo(
    () => getChecklistViewItems(modeItems, view),
    [modeItems, view],
  );
  const sections = useMemo(
    () => groupChecklistViewItems(visibleItems),
    [visibleItems],
  );
  const activeView = CHECKLIST_VIEWS.find((candidate) => candidate.id === view);
  const daysLeft = profile?.dueDate
    ? differenceInCalendarDays(parseISO(profile.dueDate), new Date())
    : undefined;
  const pregnancy = getPregnancyProgress(daysLeft);

  function resetToTemplate() {
    if (!window.confirm("确认恢复通用清单？当前勾选进度和自定义物品会被清空。")) {
      return;
    }

    try {
      resetChecklist();
      setMessage("已恢复为一份全新的通用清单。");
      setView("all");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "暂时无法恢复清单，请稍后再试。",
      );
    }
  }

  if (!hydrated) {
    return <ChecklistWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3 lg:max-w-2xl">
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="section-kicker">DadKit · 待产准备</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              待产包清单
            </h1>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              看一眼还差什么，准备好就打勾。
            </p>
          </div>
          <AddItemDialog />
        </div>

        <section className="overflow-hidden rounded-3xl border border-primary/10 bg-card shadow-sm">
          <div className="bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card))_70%)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-primary">准备进度</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-4xl font-semibold leading-none tracking-tight">
                    {packing.percent}%
                  </span>
                  <span className="pb-0.5 text-sm text-muted-foreground">
                    {packing.completed}/{packing.total} 已装包
                  </span>
                </div>
              </div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </span>
            </div>
            <Progress className="mt-4 h-2" value={packing.percent} />
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-background/80 px-2.5 py-1 text-muted-foreground">
                待买 {counts.shopping}
              </span>
              <span className="rounded-full bg-background/80 px-2.5 py-1 text-muted-foreground">
                待装 {counts.packing}
              </span>
              <span className="rounded-full bg-background/80 px-2.5 py-1 text-muted-foreground">
                共 {counts.all} 项
              </span>
            </div>
          </div>

          <Link
            className="flex min-h-12 items-center gap-3 border-t border-border/70 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
            href="/setup"
          >
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              {profile?.dueDate
                ? `${pregnancy.label} · ${getCountdownLabel(daysLeft)}`
                : "预产期可选：填写后开启孕周、时间线和证件提醒"}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

        {view === "all" && (pregnancy.week ?? 0) >= 36 ? (
          <Link
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
            href="/hospital"
          >
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="block font-semibold">证件提前放到固定位置</strong>
              <span className="mt-0.5 block text-xs leading-5 text-amber-800">
                孕 36 周后建议把证件袋和入院资料放在家人都知道的位置，并向医院确认最新要求。
              </span>
            </span>
          </Link>
        ) : null}

        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold">{activeView?.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getViewCaption(view, visibleItems.length)}
            </p>
          </div>
          <details className="relative">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm [&::-webkit-details-marker]:hidden">
              <Settings2 className="size-4" />
              <span className="sr-only">清单设置</span>
            </summary>
            <div className="absolute right-0 top-11 z-20 grid w-64 gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
              <p className="text-xs font-semibold text-foreground">清单设置</p>
              <Button
                className="justify-start"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setChecklistMode(checklistMode === "lean" ? "full" : "lean")
                }
              >
                {checklistMode === "lean" ? "显示全部建议项" : "只显示核心物品"}
              </Button>
              <Button
                className="justify-start"
                size="sm"
                variant="ghost"
                onClick={resetToTemplate}
              >
                <ListRestart className="size-4" />
                恢复通用清单
              </Button>
            </div>
          </details>
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            title={view === "shopping" ? "待购买已经清空" : "这一页已经完成"}
            description={
              view === "shopping"
                ? "需要购买的物品都已备好，可以去“待装包”继续。"
                : "可以回到“全部”查看已完成物品，或新增自己的物品。"
            }
          />
        ) : (
          <div className="grid gap-3">
            {sections.map((section, index) => (
              <ChecklistCategoryCard
                caption={section.caption}
                defaultOpen={view !== "all" || index === 0}
                items={section.items}
                key={section.id}
                sectionId={section.id}
                title={section.label}
              />
            ))}
          </div>
        )}

        {message ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <InstallPrompt />
        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          清单是准备参考，不替代医院通知或医疗建议。
        </p>
      </section>
    </div>
  );
}

function getViewCaption(view: ChecklistView, count: number) {
  if (view === "shopping") {
    return `${count} 件需要购买或补齐`;
  }

  if (view === "packing") {
    return `${count} 件已经可以放进行李`;
  }

  return `${count} 件物品，完成项会自动排到后面`;
}

function ChecklistWorkspaceSkeleton() {
  return (
    <div className="page-shell" aria-label="正在准备清单">
      <section className="mobile-shell grid animate-pulse gap-3 lg:max-w-2xl">
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="h-44 rounded-3xl bg-muted" />
        <div className="h-16 rounded-2xl bg-muted" />
        <div className="h-28 rounded-3xl bg-muted" />
      </section>
    </div>
  );
}
