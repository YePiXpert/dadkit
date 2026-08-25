"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid, List, Plus, WrapText } from "lucide-react";

import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { ChecklistProgressRing } from "@/components/ChecklistProgressRing";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import {
  CHECKLIST_SECTIONS,
  deriveChecklistView,
  type ChecklistSectionId,
} from "@/lib/checklist-v2";
import { getChecklistHomeHref } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistCategory } from "@/lib/types";
import { useChecklistDescriptionPreference } from "@/lib/use-checklist-description-preference";
import { useChecklistViewPreference } from "@/lib/use-checklist-view-preference";
import { useChecklistViewQuery } from "@/lib/use-checklist-view-query";

const AddItemDialog = dynamic(
  () =>
    import("@/components/AddItemDialog").then((module) => module.AddItemDialog),
  { ssr: false },
);

const ChecklistItemDetailsDialog = dynamic(
  () =>
    import("@/components/ChecklistItemDetailsDialog").then(
      (module) => module.ChecklistItemDetailsDialog,
    ),
  { ssr: false },
);

const DEFAULT_CATEGORY_BY_SECTION = {
  documents: "documents",
  mom: "mom_labor",
  wardMom: "mom_postpartum",
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
  const { toggleViewMode, viewMode } = useChecklistViewPreference();
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const [detailsItemId, setDetailsItemId] = useState<string>();
  const section = CHECKLIST_SECTIONS.find(
    (candidate) => candidate.id === sectionId,
  )!;
  const { counts, packing, sections } = useMemo(
    () =>
      deriveChecklistView(checklist, {
        mode: checklistMode,
        sectionId,
        view,
      }),
    [checklist, checklistMode, sectionId, view],
  );
  const visibleItems =
    sections.find((candidate) => candidate.id === sectionId)?.items ?? [];
  const detailsItem = detailsItemId
    ? checklist.find((item) => item.id === detailsItemId)
    : undefined;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <ChecklistSectionWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5">
        <section className="app-highlight-card px-4 pb-8 pt-4 sm:p-6">
          <div className="relative z-10 flex items-center justify-between gap-3">
            <Link
              aria-label="返回清单首页"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-highlight/15 text-on-highlight transition-colors hover:bg-on-highlight/25"
              href={getChecklistHomeHref(query)}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
            <div
              aria-label="清单显示选项"
              className="flex items-center gap-2"
              role="group"
            >
              <button
                aria-label={
                  viewMode === "cards"
                    ? "切换为紧凑列表"
                    : "切换为卡片视图"
                }
                aria-pressed={viewMode === "list"}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full bg-on-highlight/15 text-on-highlight transition-colors hover:bg-on-highlight/25",
                  viewMode === "list" &&
                    "bg-on-highlight text-primary hover:bg-on-highlight/90",
                )}
                title={
                  viewMode === "cards"
                    ? "紧凑列表：每行一个物品，快速勾选"
                    : "卡片视图：查看物品图片与说明"
                }
                type="button"
                onClick={toggleViewMode}
              >
                {viewMode === "cards" ? (
                  <List aria-hidden="true" className="size-5" />
                ) : (
                  <LayoutGrid aria-hidden="true" className="size-5" />
                )}
              </button>
              <button
                aria-label="显示物品说明"
                aria-pressed={showFullDescriptions}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full bg-on-highlight/15 text-on-highlight transition-colors hover:bg-on-highlight/25",
                  showFullDescriptions &&
                    "bg-on-highlight text-primary hover:bg-on-highlight/90",
                )}
                title="开启后在卡片中完整显示，不截断文字"
                type="button"
                onClick={() => setShowFullDescriptions(!showFullDescriptions)}
              >
                <WrapText aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-on-highlight">
                待产清单 · 分阶段准备
              </p>
              <h1 className="mt-1 break-words text-[26px] font-bold leading-tight tracking-tight text-on-highlight sm:text-3xl">
                {section.label}
              </h1>
              <p className="mt-2 max-w-[24rem] text-sm leading-6 text-on-highlight">
                {section.caption}
              </p>
            </div>
            <ChecklistProgressRing
              compact
              label={`${section.label}完成`}
              value={packing.percent}
            />
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-3 divide-x divide-on-highlight/20 rounded-2xl bg-on-highlight/15 py-3 text-center text-on-highlight">
            <SectionStat label="待买" value={counts.shopping} />
            <SectionStat label="待装" value={counts.packing} />
            <SectionStat label="已装" value={counts.packed} />
          </div>
        </section>

        <div className="relative z-20 -mt-9 px-2">
          <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />
        </div>

        {visibleItems.length === 0 ? (
          <div className="grid gap-3">
            <EmptyState
              title={
                view === "shopping"
                  ? "这个分类没有待购物品"
                  : view === "packed"
                    ? "这个分类还没有已装包物品"
                    : "这个分类暂时没有项目"
              }
              description="切换上方筛选查看其他状态，或添加自己的物品。"
              illustrationId={
                view === "shopping"
                  ? "general-baby-formula-bottle"
                  : view === "packed"
                    ? "general-baby-hospital-clothes"
                    : "general-baby-diapers"
              }
            />
            <Link
              className="justify-self-center rounded-full px-4 py-2 text-sm font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:bg-secondary/50"
              href={getChecklistHomeHref("highlight=not-needed")}
            >
              查看已标记不需要的物品
            </Link>
          </div>
        ) : (
          <div
            className={
              viewMode === "cards" ? "item-card-grid" : "grid gap-2"
            }
          >
            {visibleItems.map((item) => (
              <ChecklistItemRow
                compact={viewMode === "list"}
                item={item}
                key={item.id}
                onOpenDetails={setDetailsItemId}
                showFullDescription={showFullDescriptions}
              />
            ))}
          </div>
        )}

        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          清单是准备参考，不替代医院通知或医疗建议。
        </p>

        {detailsItem ? (
          <ChecklistItemDetailsDialog
            item={detailsItem}
            open
            onOpenChange={(open) => {
              if (!open) setDetailsItemId(undefined);
            }}
          />
        ) : null}
      </section>

      <AddItemDialog
        defaultCategory={DEFAULT_CATEGORY_BY_SECTION[sectionId]}
        trigger={
          <button
            aria-label={`在${section.label}中新增物品`}
            className="safe-bottom-fab fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform active:scale-95 motion-reduce:transition-none sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
            type="button"
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={2.2} />
          </button>
        }
      />
    </div>
  );
}

function SectionStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid gap-1 px-2">
      <strong className="text-lg font-bold leading-none">{value}</strong>
      <span className="text-xs font-medium text-on-highlight">
        {label}
      </span>
    </span>
  );
}

export function ChecklistSectionWorkspaceSkeleton() {
  return (
    <div
      className="page-shell page-shell-with-nav"
      aria-label="正在准备分类清单"
    >
      <section className="mobile-shell grid gap-4">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="-mt-10 h-16 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
        <div className="item-card-grid">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </section>
    </div>
  );
}
