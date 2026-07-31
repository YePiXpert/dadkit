"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clipboard, PackageCheck, Plus, Search, Settings2, X } from "lucide-react";

import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHECKLIST_VIEWS,
  deriveChecklistView,
  getDepartureItemCount,
  type ChecklistView,
} from "@/lib/checklist-v2";
import { getChecklistSectionHref } from "@/lib/checklist-display";
import { formatChecklistAsText } from "@/lib/checklist-text";
import {
  loadChecklistMilestones,
  markHalfwayMilestone,
  markSectionClearedMilestone,
} from "@/lib/checklist-milestones";
import { matchesChecklistSearch } from "@/lib/checklist-search";
import { showAppToast } from "@/lib/app-toast";
import { useDadKitStore } from "@/lib/store";
import { useChecklistViewQuery } from "@/lib/use-checklist-view-query";

const AddItemDialog = dynamic(
  () =>
    import("@/components/AddItemDialog").then((module) => module.AddItemDialog),
  { ssr: false },
);

const HomeGrowthHint = dynamic(
  () =>
    import("@/components/HomeGrowthHint").then(
      (module) => module.HomeGrowthHint,
    ),
  { ssr: false },
);

export function ChecklistWorkspace() {
  const { query, setView, view } = useChecklistViewQuery();
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const markItemsPacked = useDadKitStore((state) => state.markItemsPacked);
  const [search, setSearch] = useState("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState("");

  const { counts, packing, sections, visibleItems } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view }),
    [checklist, checklistMode, view],
  );
  const activeView = CHECKLIST_VIEWS.find((candidate) => candidate.id === view);
  const highlightNotNeeded = new URLSearchParams(query).get("highlight") === "not-needed";
  const notNeededCount = checklist.filter((item) => item.status === "not_needed").length;
  const { sections: allSections } = useMemo(
    () => deriveChecklistView(checklist, { mode: checklistMode, view: "all" }),
    [checklist, checklistMode],
  );
  const searchedSections = useMemo(
    () =>
      search.trim()
        ? sections.map((section) => ({
            ...section,
            items: section.items.filter((item) =>
              matchesChecklistSearch(item, search),
            ),
          }))
        : sections,
    [search, sections],
  );
  const searchedVisibleItems = useMemo(
    () => (search.trim() ? searchedSections.flatMap((section) => section.items) : visibleItems),
    [search, searchedSections, visibleItems],
  );
  const departureItemCount = useMemo(
    () => getDepartureItemCount(checklist),
    [checklist],
  );
  const bulkPackingIds = searchedVisibleItems
    .filter((item) => item.itemKind === "item" && item.status !== "packed")
    .map((item) => item.id);

  // 只在“进行中 → 100%”的这一刻庆祝：首次加载就是 100% 时不打扰。
  const [celebrating, setCelebrating] = useState(false);
  const previousPercentRef = useRef<number | null>(null);
  const previousMilestonePercentRef = useRef<number | null>(null);
  const previousCompletedSectionsRef = useRef<Set<string> | undefined>(undefined);

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

  useEffect(() => {
    const completedSectionIds = new Set(
      allSections
        .filter(
          (section) =>
            section.items.length > 0 &&
            section.items.every(
              (item) => item.status === "packed" || item.status === "not_needed",
            ),
        )
        .map((section) => section.id),
    );
    const previousPercent = previousMilestonePercentRef.current;
    const previousSections = previousCompletedSectionsRef.current;
    previousMilestonePercentRef.current = packing.percent;
    previousCompletedSectionsRef.current = completedSectionIds;

    if (previousPercent === null || !previousSections) {
      return;
    }

    const milestones = loadChecklistMilestones();
    if (
      !milestones.reachedHalfway &&
      previousPercent < 50 &&
      packing.percent >= 50
    ) {
      markHalfwayMilestone();
      showAppToast({ message: "待产包已经准备过半，继续稳稳推进。", tone: "success" });
    }

    const newlyClearedSection = [...completedSectionIds].find(
      (sectionId) =>
        !previousSections.has(sectionId) &&
        !milestones.clearedSectionIds.includes(sectionId),
    );
    if (newlyClearedSection) {
      markSectionClearedMilestone(newlyClearedSection);
      const label = allSections.find(
        (section) => section.id === newlyClearedSection,
      )?.label;
      showAppToast({
        message: `${label ?? "一个分类"}已经准备完成，真棒。`,
        tone: "success",
      });
    }
  }, [allSections, packing.percent]);

  async function copyChecklistText() {
    const text = formatChecklistAsText(checklist);

    try {
      await navigator.clipboard.writeText(text);
      setCopyFallbackText("");
      showAppToast({ message: "清单已复制，可以发给家人一起核对。", tone: "success" });
    } catch {
      setCopyFallbackText(text);
      window.requestAnimationFrame(() => {
        (
          document.getElementById(
            "checklist-copy-fallback",
          ) as HTMLTextAreaElement | null
        )?.select();
      });
    }
  }

  function confirmBulkPack() {
    const changed = markItemsPacked(bulkPackingIds);
    if (changed > 0) {
      showAppToast({ message: `已将 ${changed} 件物品标记为已装包。`, tone: "success" });
    }
  }

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
          <HomeGrowthHint />
        </section>

        <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />

        <div className="grid gap-2 rounded-2xl border border-border bg-card p-3">
          <label className="sr-only" htmlFor="checklist-search">
            搜索清单
          </label>
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              id="checklist-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索物品名称或备注"
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="清除搜索"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                onClick={() => setSearch("")}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            搜索会在当前「{activeView?.label}」筛选中查找名称和备注。
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 pt-1">
          <div>
            <h2 className="text-base font-semibold">{activeView?.label}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {getViewCaption(view, searchedVisibleItems.length)}
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

        <div className="flex flex-wrap gap-2 px-1">
          <Button onClick={copyChecklistText} size="sm" variant="outline">
            <Clipboard />
            复制清单为文本
          </Button>
          {view === "packing" && bulkPackingIds.length > 0 ? (
            <Button onClick={() => setBulkConfirmOpen(true)} size="sm" variant="outline">
              <PackageCheck />
              本页全部标记装包
            </Button>
          ) : null}
        </div>

        {highlightNotNeeded ? (
          <section
            className="rounded-2xl border border-primary/30 bg-secondary/45 p-3 text-sm text-primary"
            id="not-needed-items"
          >
            {notNeededCount > 0
              ? `已为你标出 ${notNeededCount} 件“不需要”物品：它们会显示在各分类卡片的末尾，可随时到详情中恢复。`
              : "目前还没有标记为“不需要”的物品。"}
          </section>
        ) : null}

        {copyFallbackText ? (
          <div className="rounded-2xl border border-primary/30 bg-secondary/35 p-3">
            <p className="mb-2 text-sm font-medium">浏览器未授权复制，请手动复制以下内容：</p>
            <textarea
              className="min-h-36 w-full rounded-xl border border-border bg-card p-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              id="checklist-copy-fallback"
              readOnly
              value={copyFallbackText}
            />
          </div>
        ) : null}

        {searchedVisibleItems.length === 0 ? (
          <EmptyState
            title={getEmptyStateCopy(view, Boolean(search.trim())).title}
            description={getEmptyStateCopy(view, Boolean(search.trim())).description}
            illustrationId={getEmptyStateCopy(view, Boolean(search.trim())).illustrationId}
          />
        ) : null}

        <div className="grid gap-4">
          {searchedSections.map((section) => (
            <ChecklistCategoryCard
              caption={section.caption}
              href={getChecklistSectionHref(section.id, query)}
              items={section.items}
              key={section.id}
              progressItems={
                allSections.find((candidate) => candidate.id === section.id)
                  ?.items
              }
              resolvedLabel={
                view === "packed" ? `${section.items.length} 项已装` : undefined
              }
              sectionId={section.id}
              title={section.label}
            />
          ))}
        </div>

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
        departureItemCount={departureItemCount}
        onClose={() => setCelebrating(false)}
        open={celebrating}
        packingPercent={packing.percent}
      />
      <ConfirmDialog
        confirmLabel="全部标记装包"
        description={`将当前页 ${bulkPackingIds.length} 件待装物品标记为已装包。此操作会同步到家庭成员。`}
        onConfirm={confirmBulkPack}
        onOpenChange={setBulkConfirmOpen}
        open={bulkConfirmOpen}
        title="确认批量装包？"
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
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

function getEmptyStateCopy(view: ChecklistView, searching: boolean) {
  if (searching) {
    return {
      title: "没有找到匹配物品",
      description: "试试更短的关键词，或清除搜索后查看当前筛选中的全部物品。",
      illustrationId: "general-baby-bottle-brush",
    };
  }
  if (view === "shopping") {
    return {
      title: "待购买已经清空",
      description: "需要购买的物品都已备好，可以去“待装包”继续。",
      illustrationId: "general-baby-formula-bottle",
    };
  }

  if (view === "packing") {
    return {
      title: "这一页已经完成",
      description: "都装好了，去“已装包”核对行李。",
      illustrationId: "general-baby-blanket",
    };
  }

  if (view === "packed") {
    return {
      title: "还没有已装包的物品",
      description: "在“待装包”里点一下，装好的物品会出现在这里。",
      illustrationId: "general-baby-hospital-clothes",
    };
  }

  return {
    title: "清单还是空的",
    description: "点击右下角按钮，新增第一件要准备的物品。",
    illustrationId: "general-baby-diapers",
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
      <section className="mobile-shell grid animate-pulse gap-4 lg:max-w-2xl">
        <div className="grid gap-2 px-1 py-2">
          <div className="h-7 w-32 rounded-xl bg-muted" />
          <div className="h-4 w-52 rounded-lg bg-muted" />
        </div>
        <div className="grid h-52 gap-4 rounded-card bg-muted p-5">
          <div className="flex items-start justify-between">
            <div className="grid gap-3">
              <div className="h-4 w-20 rounded-lg bg-background/70" />
              <div className="h-12 w-28 rounded-xl bg-background/70" />
            </div>
            <div className="size-20 rounded-inset bg-background/70" />
          </div>
          <div className="h-2 rounded-full bg-background/70" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-10 rounded-xl bg-background/70" />
            <div className="h-10 rounded-xl bg-background/70" />
            <div className="h-10 rounded-xl bg-background/70" />
          </div>
        </div>
        <div className="grid h-16 grid-cols-4 gap-1 rounded-card bg-muted p-1.5">
          <div className="rounded-inset bg-background/70" />
          <div className="rounded-inset bg-background/70" />
          <div className="rounded-inset bg-background/70" />
          <div className="rounded-inset bg-background/70" />
        </div>
        <div className="grid gap-3">
          <div className="h-28 rounded-card bg-muted" />
          <div className="h-28 rounded-card bg-muted" />
        </div>
      </section>
    </div>
  );
}
