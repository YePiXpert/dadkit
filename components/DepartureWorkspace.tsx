"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DepartureItemRow } from "@/components/DepartureItemRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { HospitalSummaryCard } from "@/components/HospitalSummaryCard";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { showAppToast } from "@/lib/app-toast";
import {
  deriveDepartureGroups,
  getDepartureProgress,
  type DepartureGroupId,
} from "@/lib/departure";
import { useDadKitStore } from "@/lib/store";

const ChecklistItemDetailsDialog = dynamic(
  () =>
    import("@/components/ChecklistItemDetailsDialog").then(
      (module) => module.ChecklistItemDetailsDialog,
    ),
  { ssr: false },
);

export function DepartureWorkspace() {
  const hydrated = useDadKitStore((state) => state.hydrated);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const markItemsPacked = useDadKitStore((state) => state.markItemsPacked);
  const [detailsItemId, setDetailsItemId] = useState<string>();
  const [confirmGroupId, setConfirmGroupId] = useState<DepartureGroupId>();
  const groups = useMemo(
    () => deriveDepartureGroups(checklist),
    [checklist],
  );
  const progress = useMemo(
    () => getDepartureProgress(checklist),
    [checklist],
  );
  const confirmGroup = groups.find((group) => group.id === confirmGroupId);
  const confirmIds = confirmGroup
    ? confirmGroup.items
        .filter(
          (item) =>
            item.status !== "packed" &&
            item.status !== "not_needed",
        )
        .map((item) => item.id)
    : [];
  const detailsItem = detailsItemId
    ? checklist.find((item) => item.id === detailsItemId)
    : undefined;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  function confirmCurrentGroup() {
    if (!confirmGroup || confirmIds.length === 0) return;

    let changed: number;
    try {
      changed = markItemsPacked(confirmIds);
    } catch (error) {
      showAppToast({
        message: error instanceof Error && error.message ? error.message : "批量确认失败，请稍后重试。",
        tone: "warning",
      });
      return;
    }

    if (changed > 0) {
      showAppToast({
        message: `${confirmGroup.label}已确认 ${changed} 项。`,
        tone: "success",
      });
    }
  }

  if (!hydrated) {
    return <DepartureWorkspaceSkeleton />;
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4">
        <PageHeader
          backHref="/"
          backLabel="返回首页"
          kicker="临产核对"
          subtitle="只看现在要拿、要带、要确认的事项。"
          title="准备出发"
        />

        <section className="hero-card p-5 sm:p-6">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">总体确认进度</p>
              <p className="mt-2 text-4xl font-bold leading-none">
                {progress.percent}
                <span className="ml-1 text-xl tracking-normal">%</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                已确认 {progress.completed} 项，共 {progress.total} 项
              </p>
            </div>
            <span className="icon-tile size-14 bg-card/80">
              <PackageCheck className="size-7" />
            </span>
          </div>

          <div
            aria-label={`出发物品确认 ${progress.percent}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="mt-5 h-2 overflow-hidden rounded-full bg-card/80"
            role="progressbar"
          >
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          <p
            className="mt-4 text-sm font-semibold text-foreground"
            id="departure-remaining-count"
          >
            {progress.remaining > 0
              ? `剩余 ${progress.remaining} 项需要确认`
              : progress.total > 0
                ? "关键物品已经确认，出发前再看一眼医院通知。"
                : "暂时没有需要出发确认的项目。"}
          </p>
        </section>

        <HospitalSummaryCard />

        {progress.total > 0 && progress.remaining === 0 ? (
          <section className="flex items-start gap-3 rounded-card bg-secondary/50 p-4 shadow-sm">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold">关键物品已经确认</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                可以安心出发；需要重新核对时，点开下面的物品即可恢复。
              </p>
            </div>
          </section>
        ) : null}

        {groups.length === 0 ? (
          <EmptyState
            description="现有清单里没有证件、临出门、随车或关键行李项目。"
            illustrationId="general-partner-doc-folder"
            title="暂时没有出发项目"
          />
        ) : (
          <div className="grid gap-5">
            {groups.map((group) => {
              const pendingIds = group.items
                .filter(
                  (item) =>
                    item.status !== "packed" &&
                    item.status !== "not_needed",
                )
                .map((item) => item.id);

              return (
                <section
                  aria-labelledby={`departure-group-${group.id}`}
                  className="grid gap-3"
                  key={group.id}
                >
                  <div className="flex min-w-0 items-end justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <h2
                        className="break-words text-[15px] font-semibold"
                        id={`departure-group-${group.id}`}
                      >
                        {group.label}
                      </h2>
                      <p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                      {group.completed} / {group.total}
                    </span>
                  </div>

                  {pendingIds.length > 0 ? (
                    <Button
                      className="min-h-11 justify-self-start"
                      onClick={() => setConfirmGroupId(group.id)}
                      size="sm"
                      variant="outline"
                    >
                      <PackageCheck />
                      本组全部确认
                    </Button>
                  ) : null}

                  <div className="grid gap-2">
                    {group.items.map((item) => (
                      <DepartureItemRow
                        item={item}
                        key={item.id}
                        onOpenDetails={setDetailsItemId}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <p className="px-3 text-center text-xs leading-5 text-muted-foreground">
          本页面仅用于整理物品，入院时机和医疗问题请遵照医生及医院要求。
        </p>

        {detailsItem ? (
          <ChecklistItemDetailsDialog
            departureMode
            item={detailsItem}
            open
            onOpenChange={(open) => {
              if (!open) setDetailsItemId(undefined);
            }}
          />
        ) : null}
      </section>

      <ConfirmDialog
        confirmLabel="确认本组项目"
        description={`将“${confirmGroup?.label ?? "本组"}”中的 ${confirmIds.length} 项标记为已确认。状态会同步到首页、家庭成员和备份。`}
        onConfirm={confirmCurrentGroup}
        onOpenChange={(open) => {
          if (!open) setConfirmGroupId(undefined);
        }}
        open={Boolean(confirmGroupId)}
        title="确认本组全部完成？"
      />
    </div>
  );
}

export function DepartureWorkspaceSkeleton() {
  return (
    <div
      aria-label="正在准备出发清单"
      className="page-shell page-shell-with-nav"
    >
      <section className="mobile-shell grid gap-4">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
        <div className="grid gap-3">
          <Skeleton className="h-12 rounded-inset" />
          <div className="grid gap-2">
            <Skeleton className="h-16 rounded-card" />
            <Skeleton className="h-16 rounded-card" />
            <Skeleton className="h-16 rounded-card" />
          </div>
        </div>
      </section>
    </div>
  );
}
