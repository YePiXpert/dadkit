"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Clipboard,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

import { CelebrationOverlay } from "@/components/CelebrationOverlay";
import { ChecklistCategoryCard } from "@/components/ChecklistCategoryCard";
import { ChecklistGroupTabs } from "@/components/ChecklistGroupTabs";
import { ChecklistProgressRing } from "@/components/ChecklistProgressRing";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  markSectionClearedMilestones,
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

const HOSPITAL_SECTION_IDS = new Set(["documents", "mom", "wardMom", "baby"]);

export function ChecklistWorkspace() {
  const { query, setView, view } = useChecklistViewQuery();
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const changeOrigin = useDadKitStore((state) => state.changeOrigin);
  const changeRevision = useDadKitStore((state) => state.changeRevision);
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
  const displayedSections = useMemo(
    () =>
      search.trim()
        ? searchedSections.filter((section) => section.items.length > 0)
        : searchedSections,
    [search, searchedSections],
  );
  const hospitalSections = displayedSections.filter((section) =>
    HOSPITAL_SECTION_IDS.has(section.id),
  );
  const followUpSections = displayedSections.filter(
    (section) => !HOSPITAL_SECTION_IDS.has(section.id),
  );
  const departureItemCount = useMemo(
    () => getDepartureItemCount(checklist),
    [checklist],
  );
  const bulkPackingIds = searchedVisibleItems
    .filter(
      (item) =>
        item.itemKind === "item" &&
        item.status !== "packed" &&
        item.status !== "not_needed",
    )
    .map((item) => item.id);

  // 只在“进行中 → 100%”的这一刻庆祝：首次加载就是 100% 时不打扰。
  const [celebrating, setCelebrating] = useState(false);
  const [sectionCelebration, setSectionCelebration] = useState<string>();
  const previousPercentRef = useRef<number | null>(null);
  const previousMilestonePercentRef = useRef<number | null>(null);
  const previousCompletedSectionsRef = useRef<Set<string> | undefined>(undefined);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const previous = previousPercentRef.current;
    previousPercentRef.current = packing.percent;

    if (
      changeOrigin === "local" &&
      previous !== null &&
      previous < 100 &&
      packing.percent === 100
    ) {
      setCelebrating(true);
    }
  }, [changeOrigin, changeRevision, hydrated, packing.percent]);

  useEffect(() => {
    if (!hydrated) return;
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

    if (changeOrigin !== "local") {
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

    const newlyClearedSections = [...completedSectionIds].filter(
      (sectionId) =>
        !previousSections.has(sectionId) &&
        !milestones.clearedSectionIds.includes(sectionId),
    );
    if (newlyClearedSections.length > 0) {
      markSectionClearedMilestones(newlyClearedSections);
      const labels = newlyClearedSections.map(
        (sectionId) =>
          allSections.find((section) => section.id === sectionId)?.label ?? "一个分类",
      );
      setSectionCelebration(
        labels.length === 1
          ? labels[0]
          : `${labels.length} 个分类（${labels.slice(0, 3).join("、")}${labels.length > 3 ? "等" : ""}）`,
      );
    }
  }, [allSections, changeOrigin, changeRevision, hydrated, packing.percent]);

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
    let changed: number;
    try {
      changed = markItemsPacked(bulkPackingIds);
    } catch (error) {
      showAppToast({
        message: error instanceof Error && error.message ? error.message : "批量装包失败，请稍后重试。",
        tone: "warning",
      });
      return;
    }
    if (changed > 0) {
      showAppToast({ message: `已将 ${changed} 件物品标记为已装包。`, tone: "success" });
    }
  }

  if (!hydrated) {
    return <ChecklistWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5">
        <header className="flex items-start justify-between gap-4 px-1 pt-1">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-primary">待产准备</p>
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
              待产包清单
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              产房、病房分开装，入院时更从容。
            </p>
          </div>
          <Link
            aria-label="清单设置"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm ring-1 ring-border/35 transition-colors hover:bg-secondary hover:text-primary active:bg-secondary/70"
            href="/settings/checklist"
          >
            <Settings2 aria-hidden="true" className="size-5" />
          </Link>
        </header>

        <section className="app-highlight-card p-5 sm:p-6">
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-on-highlight/15 px-3 py-1 text-xs font-semibold text-on-highlight">
                <Sparkles aria-hidden="true" className="size-3.5" />
                准备进度
              </p>
              <h2 className="mt-3 text-balance text-[22px] font-bold leading-8 text-on-highlight sm:text-2xl">
                {getProgressHeadline(packing.percent)}
              </h2>
              <button
                className="mt-2 min-h-11 rounded-full px-1 text-left text-[13px] font-medium text-on-highlight underline decoration-on-highlight/45 underline-offset-4"
                type="button"
                onClick={() => setView("packed")}
              >
                已装包 {packing.completed} 项，共 {packing.total} 项
              </button>
            </div>
            <ChecklistProgressRing label="清单完成" value={packing.percent} />
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 divide-x divide-on-highlight/20 rounded-inset bg-on-highlight/10 py-3 text-center text-on-highlight">
            <HeroStat label="待买" value={counts.shopping} />
            <HeroStat label="待装" value={counts.packing} />
            <HeroStat label="已装" value={counts.packed} />
          </div>
          <HomeGrowthHint tone="inverse" />
        </section>

        {/* 移动端没有页头，sm 起要让出 4rem 高的吸顶 AppHeader，避免标签被盖住。 */}
        <div className="sticky top-[max(env(safe-area-inset-top),0.5rem)] z-30 -mt-8 rounded-card bg-background/95 p-1 backdrop-blur-xl sm:top-[calc(4.5rem+env(safe-area-inset-top))]">
          <ChecklistGroupTabs counts={counts} value={view} onChange={setView} />
        </div>

        <div className="flex items-end justify-between gap-3 px-1 pt-1">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{activeView?.label}</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
              {getViewCaption(view, searchedVisibleItems.length)}
            </p>
          </div>
          <Button
            aria-label="复制清单为文本"
            onClick={copyChecklistText}
            size="sm"
            variant="ghost"
          >
            <Clipboard aria-hidden="true" />
            复制
          </Button>
        </div>

        <div className="rounded-card bg-card p-3 shadow-sm ring-1 ring-border/25">
          <label className="sr-only" htmlFor="checklist-search">
            搜索清单
          </label>
          <div className="flex items-center gap-2">
            <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              id="checklist-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`搜索物品名称或备注（当前「${activeView?.label}」）`}
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="清除搜索"
                 className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary active:bg-secondary/70"
                onClick={() => setSearch("")}
                type="button"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {view === "packing" && bulkPackingIds.length > 0 ? (
          <div className="flex flex-wrap gap-2 px-1">
            <Button onClick={() => setBulkConfirmOpen(true)} size="sm" variant="outline">
              <PackageCheck aria-hidden="true" />
              本页全部标记装包
            </Button>
          </div>
        ) : null}

        {highlightNotNeeded ? (
          <section
            className="rounded-card bg-secondary/45 p-3 text-sm text-primary ring-1 ring-primary/30"
            id="not-needed-items"
          >
            {notNeededCount > 0
              ? `已为你标出 ${notNeededCount} 件“不需要”物品：它们会显示在各分类卡片的末尾，可随时到详情中恢复。`
              : "目前还没有标记为“不需要”的物品。"}
          </section>
        ) : null}

        {copyFallbackText ? (
          <div className="rounded-card bg-secondary/35 p-3 ring-1 ring-primary/30">
            <p className="mb-2 text-sm font-medium">浏览器未授权复制，请手动复制以下内容：</p>
            <textarea
              className="min-h-36 w-full rounded-inset border border-border bg-card p-3 text-base leading-6 outline-none focus:ring-2 focus:ring-ring"
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

        {searchedVisibleItems.length > 0 ? (
          <div className="grid gap-6">
            {hospitalSections.length > 0 ? (
              <section aria-labelledby="hospital-bags-heading" className="grid gap-3">
                <div className="px-1">
                  <h2 className="text-[15px] font-bold" id="hospital-bags-heading">
                    住院分包
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                    证件、产房和病房用品分开放，拿取更快。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {hospitalSections.map((section) => (
                    <ChecklistCategoryCard
                      caption={section.caption}
                      href={getChecklistSectionHref(section.id, query)}
                      items={section.items}
                      key={section.id}
                      layout="feature"
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
              </section>
            ) : null}

            {followUpSections.length > 0 ? (
              <section aria-labelledby="follow-up-heading" className="grid gap-3">
                <div className="px-1">
                  <h2 className="text-[15px] font-bold" id="follow-up-heading">
                    后续准备
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                    月子、陪产与返家事项按阶段慢慢完成。
                  </p>
                </div>
                <div className="grid gap-3">
                  {followUpSections.map((section) => (
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
              </section>
            ) : null}
          </div>
        ) : null}

        <p className="px-3 text-center text-[13px] leading-5 text-muted-foreground">
          清单是准备参考，不替代医院通知或医疗建议。
        </p>
      </section>

      <AddItemDialog
        trigger={
          <button
            aria-label="新增物品"
            className="safe-bottom-fab fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform active:scale-95 motion-reduce:transition-none sm:right-[max(1rem,calc(50%_-_21rem_-_5rem))]"
            type="button"
          >
            <Plus aria-hidden="true" className="size-6" strokeWidth={2.2} />
          </button>
        }
      />

      <CelebrationOverlay
        departureItemCount={departureItemCount}
        onClose={() => setCelebrating(false)}
        open={celebrating}
        packingPercent={packing.percent}
      />
      <CelebrationOverlay
        onClose={() => setSectionCelebration(undefined)}
        open={Boolean(sectionCelebration)}
        sectionLabel={sectionCelebration}
        variant="section"
      />
      <ConfirmDialog
        confirmLabel="全部标记装包"
        description={`将当前页 ${bulkPackingIds.length} 件待装物品标记为已装包。此操作会同步到家庭的其他设备。`}
        onConfirm={confirmBulkPack}
        onOpenChange={setBulkConfirmOpen}
        open={bulkConfirmOpen}
        title="确认批量装包？"
      />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid gap-1 px-2">
      <strong className="text-lg font-bold leading-none">{value}</strong>
      <span className="text-xs font-medium text-on-highlight">
        {label}
      </span>
    </span>
  );
}

function getProgressHeadline(percent: number) {
  if (percent >= 100) return "入院行李已经准备妥当";
  if (percent >= 60) return "大部分物品已经备好了";
  if (percent >= 20) return "正在把待产包慢慢备齐";
  return "从四个住院分包开始准备";
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
    <div role="status" className="page-shell page-shell-with-nav" aria-label="正在准备清单">
      <section className="mobile-shell grid gap-4">
        <div className="flex items-start justify-between gap-4 px-1 py-2">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-7 w-32 rounded-inset" />
            <Skeleton className="h-4 w-52 rounded-lg" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="grid gap-4 rounded-card bg-muted p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="grid flex-1 gap-3">
              <Skeleton className="h-6 w-24 rounded-full bg-background/70" />
              <Skeleton className="h-8 w-48 rounded-inset bg-background/70" />
            </div>
            <Skeleton className="size-24 rounded-full bg-background/70" />
          </div>
          <Skeleton className="h-14 rounded-inset bg-background/70" />
        </div>
        <div className="grid h-16 grid-cols-4 gap-1 rounded-card bg-muted p-1">
          <Skeleton className="rounded-full bg-background/70" />
          <Skeleton className="rounded-full bg-background/70" />
          <Skeleton className="rounded-full bg-background/70" />
          <Skeleton className="rounded-full bg-background/70" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
          <Skeleton className="h-44 rounded-card" />
        </div>
      </section>
    </div>
  );
}
