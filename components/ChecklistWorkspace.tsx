"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ListRestart,
  Plus,
  Settings2,
} from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { EmptyState } from "@/components/EmptyState";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Button } from "@/components/ui/button";
import {
  CHECKLIST_VIEWS,
  getChecklistViewCounts,
  getChecklistViewItems,
  groupChecklistViewItems,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { filterItemsForChecklistMode, calculatePackingCompletion } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";

export function ChecklistWorkspace() {
  const [view, setView] = useState<ChecklistView>("all");
  const [message, setMessage] = useState("");
  const hydrated = useDadKitStore((state) => state.hydrated);
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
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <header className="pb-1 pt-2 text-center sm:pt-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            待产包清单
          </h1>
          <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
            看一眼还差什么，准备好就打勾。
          </p>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--card))_72%)] p-5 shadow-[0_12px_36px_rgba(92,70,54,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">准备进度</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-5xl font-bold leading-none tracking-[-0.06em] text-foreground">
                  {packing.percent}
                  <span className="ml-1 text-2xl tracking-normal">%</span>
                </span>
                <span className="pb-1 text-sm text-muted-foreground">
                  {packing.completed}/{packing.total} 已装包
                </span>
              </div>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-2xl shadow-sm" aria-hidden="true">
              🎒
            </span>
          </div>

          <div
            aria-label={`清单完成 ${packing.percent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={packing.percent}
            className="mt-5 h-2 overflow-hidden rounded-full bg-card/80"
            role="progressbar"
          >
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${packing.percent}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-primary/10 rounded-2xl bg-card/70 py-3 text-center">
            <ProgressStat label="待买" value={counts.shopping} />
            <ProgressStat label="待装" value={counts.packing} />
            <ProgressStat label="全部" value={counts.all} />
          </div>
          <span className="sr-only">
            待买 {counts.shopping}，待装 {counts.packing}，共 {counts.all} 项
          </span>
        </section>

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <h2 className="text-base font-semibold">{activeView?.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getViewCaption(view, visibleItems.length)}
            </p>
          </div>
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <Settings2 className="size-4" />
              <span>清单设置</span>
              <ChevronDown className="size-3.5" />
            </summary>
            <div className="absolute right-0 top-12 z-20 grid w-64 gap-2 rounded-3xl border border-border bg-card p-3 shadow-lg">
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
          <div className="grid gap-4">
            {sections.map((section) => (
              <ChecklistCategoryCard
                caption={section.caption}
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

      <AddItemDialog
        trigger={
          <button
            aria-label="新增物品"
            className="safe-bottom-fab fixed right-4 z-40 flex size-16 items-center justify-center rounded-full bg-foreground text-background shadow-[0_10px_30px_rgba(42,35,30,0.24)] transition-transform active:scale-95 sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
            type="button"
          >
            <Plus className="size-7" strokeWidth={2.2} />
          </button>
        }
      />
    </div>
  );
}

function ProgressStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid gap-0.5 px-1">
      <strong className="text-lg font-bold leading-none text-foreground">
        {value}
      </strong>
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
    </span>
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
        <div className="h-16 rounded-[1.75rem] bg-muted" />
        <div className="h-52 rounded-[2rem] bg-muted" />
        <div className="h-16 rounded-[1.75rem] bg-muted" />
        <div className="h-32 rounded-[1.75rem] bg-muted" />
      </section>
    </div>
  );
}
