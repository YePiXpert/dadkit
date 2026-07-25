"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { EmptyState } from "@/components/EmptyState";
import { Switch } from "@/components/ui/switch";
import {
  CHECKLIST_SECTIONS,
  getChecklistSection,
  getChecklistViewCounts,
  getChecklistViewItems,
  groupChecklistViewItems,
  type ChecklistSectionId,
} from "@/lib/checklist-v2";
import { getChecklistHomeHref } from "@/lib/checklist-display";
import { filterItemsForChecklistMode } from "@/lib/rules";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistCategory } from "@/lib/types";
import { useChecklistDescriptionPreference } from "@/lib/use-checklist-description-preference";
import { useChecklistViewQuery } from "@/lib/use-checklist-view-query";

const DEFAULT_CATEGORY_BY_SECTION = {
  documents: "documents",
  mom: "mom_labor",
  baby: "baby",
  confinementMom: "confinement_mom",
  confinementBaby: "confinement_baby",
  partner: "partner",
  home: "going_home",
  lastMinute: "last_minute",
} as const satisfies Record<ChecklistSectionId, ChecklistCategory>;

export function ChecklistSectionWorkspace({
  sectionId,
}: {
  sectionId: ChecklistSectionId;
}) {
  const { query, setView, view } = useChecklistViewQuery();
  const {
    setShowFullDescriptions,
    showFullDescriptions,
  } = useChecklistDescriptionPreference();
  const hydrated = useDadKitStore((state) => state.hydrated);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const section = CHECKLIST_SECTIONS.find(
    (candidate) => candidate.id === sectionId,
  )!;
  const modeItems = useMemo(
    () => filterItemsForChecklistMode(checklist, checklistMode),
    [checklist, checklistMode],
  );
  const sectionItems = useMemo(
    () => modeItems.filter((item) => getChecklistSection(item) === sectionId),
    [modeItems, sectionId],
  );
  const counts = useMemo(
    () => getChecklistViewCounts(sectionItems),
    [sectionItems],
  );
  const visibleItems = useMemo(
    () =>
      groupChecklistViewItems(getChecklistViewItems(sectionItems, view)).find(
        (candidate) => candidate.id === sectionId,
      )?.items ?? [],
    [sectionId, sectionItems, view],
  );

  if (!hydrated) {
    return <ChecklistSectionWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <header className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-start gap-2 py-1 sm:py-3">
          <Link
            aria-label="返回清单首页"
            className="flex size-12 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            href={getChecklistHomeHref(query)}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 pt-0.5 text-center">
            <p className="text-xs font-semibold text-primary">清单分类</p>
            <h1 className="mt-0.5 break-words text-xl font-bold tracking-tight sm:text-2xl">
              {section.label}
            </h1>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {section.caption}
            </p>
          </div>
          <span
            aria-label={`共 ${counts.all} 项`}
            className="flex min-h-10 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-muted-foreground"
          >
            {counts.all} 项
          </span>
        </header>

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

        <div className="flex min-h-16 items-center justify-between gap-4 rounded-[1.5rem] border border-border/80 bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">显示物品说明</p>
            <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
              开启后在卡片中完整显示，不截断文字
            </p>
          </div>
          <Switch
            aria-label="显示物品说明"
            checked={showFullDescriptions}
            onCheckedChange={setShowFullDescriptions}
          />
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            title={
              view === "shopping"
                ? "这个分类没有待购物品"
                : "这个分类暂时没有项目"
            }
            description="切换上方筛选查看其他状态，或添加自己的物品。"
          />
        ) : (
          <div className="item-card-grid">
            {visibleItems.map((item) => (
              <ChecklistItemRow
                item={item}
                key={item.id}
                showFullDescription={showFullDescriptions}
              />
            ))}
          </div>
        )}

        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          清单是准备参考，不替代医院通知或医疗建议。
        </p>
      </section>

      <AddItemDialog
        defaultCategory={DEFAULT_CATEGORY_BY_SECTION[sectionId]}
        trigger={
          <button
            aria-label={`在${section.label}中新增物品`}
            className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-16 items-center justify-center rounded-full bg-foreground text-background shadow-[0_10px_30px_rgba(42,35,30,0.24)] transition-transform active:scale-95 sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
            type="button"
          >
            <Plus className="size-7" strokeWidth={2.2} />
          </button>
        }
      />
    </div>
  );
}

export function ChecklistSectionWorkspaceSkeleton() {
  return (
    <div className="page-shell" aria-label="正在准备分类清单">
      <section className="mobile-shell grid animate-pulse gap-3 lg:max-w-2xl">
        <div className="h-20 rounded-[1.75rem] bg-muted" />
        <div className="h-16 rounded-[1.75rem] bg-muted" />
        <div className="h-20 rounded-[1.75rem] bg-muted" />
        <div className="item-card-grid">
          <div className="h-80 rounded-[1.75rem] bg-muted" />
          <div className="h-80 rounded-[1.75rem] bg-muted" />
        </div>
      </section>
    </div>
  );
}
