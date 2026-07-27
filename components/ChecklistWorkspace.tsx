"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";

import { AddItemDialog } from "@/components/AddItemDialog";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { EmptyState } from "@/components/EmptyState";
import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { InstallPrompt } from "@/components/InstallPrompt";
import { PageHeader } from "@/components/PageHeader";
import {
  CHECKLIST_VIEWS,
  deriveChecklistView,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { getChecklistSectionHref } from "@/lib/checklist-display";
import { useDadKitStore } from "@/lib/store";
import { useChecklistViewQuery } from "@/lib/use-checklist-view-query";

export function ChecklistWorkspace() {
  const { query, setView, view } = useChecklistViewQuery();
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);

  const { counts, packing, sections, visibleItems } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view }),
    [checklist, checklistMode, view],
  );
  const activeView = CHECKLIST_VIEWS.find((candidate) => candidate.id === view);

  // 只在“进行中 → 100%”的这一刻庆祝：首次加载就是 100% 时不打扰。
  const [celebrating, setCelebrating] = useState(false);
  const previousPercentRef = useRef<number | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const previous = previousPercentRef.current;
    previousPercentRef.current = packing.percent;

    if (previous !== null && previous < 100 && packing.percent === 100) {
      setCelebrating(true);
    }
  }, [packing.percent]);

  if (!hydrated) {
    return <ChecklistWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <PageHeader
          title="待产包清单"
          subtitle="看一眼还差什么，准备好就打勾。"
        />

        <section className="hero-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">准备进度</p>
              <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-5xl font-bold leading-none tracking-[-0.06em] text-foreground">
                  {packing.percent}
                  <span className="ml-1 text-2xl tracking-normal">%</span>
                </span>
                <button
                  className="rounded-lg pb-1 text-sm text-muted-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:text-foreground"
                  type="button"
                  onClick={() => setView("packed")}
                >
                  已装包 {packing.completed} 项，共 {packing.total} 项
                </button>
              </div>
            </div>
            <HomeHeroIllustration className="size-20 shrink-0 sm:size-24" />
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
            <ProgressStat label="已装" value={counts.packed} />
          </div>
          <span className="sr-only">
            待买 {counts.shopping}，待装 {counts.packing}，已装 {counts.packed} 项
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
          <Link
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            href="/settings/checklist"
          >
            <Settings2 className="size-4" />
            <span>清单设置</span>
          </Link>
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            title={getEmptyStateCopy(view).title}
            description={getEmptyStateCopy(view).description}
          />
        ) : null}

        <div className="grid gap-4">
          {sections.map((section) => (
            <ChecklistCategoryCard
              caption={section.caption}
              href={getChecklistSectionHref(section.id, query)}
              items={section.items}
              key={section.id}
              resolvedLabel={
                view === "packed" ? `${section.items.length} 项已装` : undefined
              }
              sectionId={section.id}
              title={section.label}
            />
          ))}
        </div>

        <InstallPrompt />
        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          清单是准备参考，不替代医院通知或医疗建议。
        </p>
      </section>

      <AddItemDialog
        trigger={
          <button
            aria-label="新增物品"
            className="safe-bottom-fab fixed right-4 z-40 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95 sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
            type="button"
          >
            <Plus className="size-7" strokeWidth={2.2} />
          </button>
        }
      />

      <CelebrationOverlay
        onClose={() => setCelebrating(false)}
        open={celebrating}
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

function getEmptyStateCopy(view: ChecklistView) {
  if (view === "shopping") {
    return {
      title: "待购买已经清空",
      description: "需要购买的物品都已备好，可以去“待装包”继续。",
    };
  }

  if (view === "packing") {
    return {
      title: "这一页已经完成",
      description: "都装好了，去“已装包”核对行李。",
    };
  }

  if (view === "packed") {
    return {
      title: "还没有已装包的物品",
      description: "在“待装包”里点一下，装好的物品会出现在这里。",
    };
  }

  return {
    title: "清单还是空的",
    description: "点击右下角按钮，新增第一件要准备的物品。",
  };
}

function getViewCaption(view: ChecklistView, count: number) {
  if (view === "shopping") {
    return `${count} 件需要购买或补齐`;
  }

  if (view === "packing") {
    return `${count} 件已经可以放进行李`;
  }

  if (view === "packed") {
    return `${count} 件已经装进行李`;
  }

  return `${count} 件物品，完成项会自动排到后面`;
}

export function ChecklistWorkspaceSkeleton() {
  return (
    <div className="page-shell page-shell-with-nav" aria-label="正在准备清单">
      <section className="mobile-shell grid animate-pulse gap-3 lg:max-w-2xl">
        <div className="h-16 rounded-[1.75rem] bg-muted" />
        <div className="h-52 rounded-[2rem] bg-muted" />
        <div className="h-16 rounded-[1.75rem] bg-muted" />
        <div className="h-32 rounded-[1.75rem] bg-muted" />
      </section>
    </div>
  );
}
