"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistItemRow } from "@/components/ChecklistItemRow";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { SettingToggleRow } from "@/components/SettingToggleRow";
import {
  CHECKLIST_SECTIONS,
  deriveChecklistView,
  type ChecklistSectionId,
} from "@/lib/checklist-v2";
import { getChecklistHomeHref } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import type { ChecklistCategory } from "@/lib/types";
import { useChecklistDescriptionPreference } from "@/lib/use-checklist-description-preference";
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
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <PageHeader
          title={section.label}
          kicker="清单分类"
          subtitle={section.caption}
          backHref={getChecklistHomeHref(query)}
          backLabel="返回清单首页"
          aside={
            <span
              aria-label={`共 ${counts.all} 项`}
              className="flex min-h-10 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-muted-foreground"
            >
              {counts.all} 项
            </span>
          }
        />

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

        <SettingToggleRow
          title="显示物品说明"
          description="开启后在卡片中完整显示，不截断文字"
          checked={showFullDescriptions}
          onCheckedChange={setShowFullDescriptions}
        />

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
          <div className="item-card-grid">
            {visibleItems.map((item) => (
              <ChecklistItemRow
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
            className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
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
        <div className="h-20 rounded-card bg-muted" />
        <div className="h-16 rounded-card bg-muted" />
        <div className="h-20 rounded-card bg-muted" />
        <div className="item-card-grid">
          <div className="h-80 rounded-card bg-muted" />
          <div className="h-80 rounded-card bg-muted" />
        </div>
      </section>
    </div>
  );
}
