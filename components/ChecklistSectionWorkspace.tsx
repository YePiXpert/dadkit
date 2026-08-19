"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, WrapText } from "lucide-react";

import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
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
  const { counts, sections } = useMemo(
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
      <section className="mobile-shell grid gap-4">
        <PageHeader
          title={section.label}
          kicker="清单分类"
          subtitle={section.caption}
          backHref={getChecklistHomeHref(query)}
          backLabel="返回清单首页"
          aside={
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
                  "flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-all hover:text-foreground hover:shadow-md active:scale-95",
                  viewMode === "list" &&
                    "bg-primary text-primary-foreground hover:text-primary-foreground",
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
                  <List className="size-5" />
                ) : (
                  <LayoutGrid className="size-5" />
                )}
              </button>
              <button
                aria-label="显示物品说明"
                aria-pressed={showFullDescriptions}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-all hover:text-foreground hover:shadow-md active:scale-95",
                  showFullDescriptions &&
                    "bg-primary text-primary-foreground hover:text-primary-foreground",
                )}
                title="开启后在卡片中完整显示，不截断文字"
                type="button"
                onClick={() => setShowFullDescriptions(!showFullDescriptions)}
              >
                <WrapText className="size-5" />
              </button>
            </div>
          }
        />

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

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
            className="safe-bottom-fab fixed right-4 z-40 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform active:scale-95 sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
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
    <div
      className="page-shell page-shell-with-nav"
      aria-label="正在准备分类清单"
    >
      <section className="mobile-shell grid gap-3">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
        <div className="item-card-grid">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </section>
    </div>
  );
}
