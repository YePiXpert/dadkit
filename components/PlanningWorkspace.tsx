"use client";

import { ChevronDown, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BulkPlanningDialog } from "@/components/BulkPlanningDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ItemPlanningDialog } from "@/components/ItemPlanningDialog";
import { PageHeader } from "@/components/PageHeader";
import { PlanningItemRow } from "@/components/PlanningItemRow";
import { PlanningSummaryCard } from "@/components/PlanningSummaryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { showAppToast } from "@/lib/app-toast";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import { getLocalPlanningDate } from "@/lib/planning/date";
import {
  derivePlanningRows,
  type PlanningListFilter,
} from "@/lib/planning/selectors";
import { useItemPlanningStore } from "@/lib/planning/store";
import { useDadKitStore } from "@/lib/store";

const FILTER_OPTIONS: Array<{ label: string; value: PlanningListFilter }> = [
  { value: "all", label: "全部" },
  { value: "unassigned", label: "未分工" },
  { value: "overdue", label: "已逾期" },
  { value: "due-soon", label: "未来 7 天" },
  { value: "estimated", label: "已填写预计价格" },
  { value: "actual", label: "已填写实际价格" },
];

export function PlanningWorkspace() {
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistHydrated = useDadKitStore((state) => state.hydrated);
  const hydrateChecklist = useDadKitStore((state) => state.hydrate);
  const planning = useItemPlanningStore((state) => state.planning);
  const planningHydrated = useItemPlanningStore((state) => state.hydrated);
  const hydratePlanning = useItemPlanningStore((state) => state.hydrate);
  const clearAll = useItemPlanningStore((state) => state.clearAll);
  const household = useHouseholdStore((state) => state.household);
  const householdHydrated = useHouseholdStore((state) => state.hydrated);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PlanningListFilter>("all");
  const [assignee, setAssignee] = useState<string>("all");
  const [includeNotNeeded, setIncludeNotNeeded] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeItemId, setActiveItemId] = useState<string>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const today = getLocalPlanningDate();
  const rows = useMemo(
    () =>
      derivePlanningRows(checklist, planning, {
        today,
        filter,
        assignee,
        includeNotNeeded,
        query: search,
      }),
    [assignee, checklist, filter, includeNotNeeded, planning, search, today],
  );
  const activeItem = checklist.find((item) => item.id === activeItemId);
  const selected = [...selectedIds].filter((itemId) =>
    checklist.some((item) => item.id === itemId),
  );
  const activeFilterCount =
    (filter !== "all" ? 1 : 0) +
    (assignee !== "all" ? 1 : 0) +
    (includeNotNeeded ? 1 : 0);

  useEffect(() => {
    hydrateChecklist();
    hydratePlanning();
    hydrateHousehold();
  }, [hydrateChecklist, hydrateHousehold, hydratePlanning]);

  if (!checklistHydrated || !planningHydrated || !householdHydrated) {
    return <PlanningWorkspaceSkeleton />;
  }

  function toggleSelection(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function selectCurrentResults() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of rows) next.add(row.item.id);
      return next;
    });
  }

  function clearAllPlanning() {
    clearAll();
    setSelectedIds(new Set());
    showAppToast({ message: "全部家庭分工与采购信息已清空。", tone: "success" });
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4">
        <PageHeader
          backHref="/"
          backLabel="返回首页"
          kicker="一起准备"
          subtitle="按物品分配负责人，记录期限、价格和实际存放位置。"
          title="家庭分工与采购"
        />

        <PlanningSummaryCard />

        <section className="card-surface grid gap-3 p-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Label className="sr-only" htmlFor="planning-search">搜索物品</Label>
            <Input
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              id="planning-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索物品名称或备注"
              type="search"
              value={search}
            />
            {search ? (
              <button aria-label="清除搜索" className="flex size-10 items-center justify-center rounded-full hover:bg-secondary" onClick={() => setSearch("")} type="button">
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <details
            className="group"
            onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
            open={filtersOpen || activeFilterCount > 0}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span>筛选{activeFilterCount > 0 ? ` · ${activeFilterCount} 项生效` : ""}</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 pt-1">
              <div className="grid gap-2 sm:grid-cols-2">
                <Select value={filter} onValueChange={(value) => setFilter(value as PlanningListFilter)}>
                  <SelectTrigger aria-label="分工筛选"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILTER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger aria-label="负责人筛选"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部负责人</SelectItem>
                    <SelectItem value="unassigned">未分工</SelectItem>
                    {getActiveHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}</SelectItem>)}
                    {getRemovedHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}（已移除）</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-h-11 items-center justify-between gap-3">
                <Label htmlFor="planning-include-not-needed">包括“不需要”的物品</Label>
                <Switch checked={includeNotNeeded} id="planning-include-not-needed" onCheckedChange={setIncludeNotNeeded} />
              </div>
            </div>
          </details>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-[15px] font-semibold">物品安排</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">当前显示 {rows.length} 项</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={rows.length === 0} onClick={selectCurrentResults} size="sm" variant="outline">选择当前结果</Button>
            {selected.length > 0 ? <Button onClick={() => setSelectedIds(new Set())} size="sm" variant="ghost">取消选择</Button> : null}
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="grid gap-3">
            {rows.map((row) => (
              <PlanningItemRow
                item={row.item}
                household={household}
                key={row.item.id}
                onEdit={() => setActiveItemId(row.item.id)}
                onSelect={() => toggleSelection(row.item.id)}
                selected={selectedIds.has(row.item.id)}
                today={today}
                values={row.values}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            description="调整筛选或搜索词后再试。"
            icon={null}
            title="没有符合条件的物品"
            variant="dashed"
          />
        )}

        <Button className="justify-self-start text-destructive hover:text-destructive" onClick={() => setClearAllOpen(true)} variant="ghost">
          清空全部分工与采购信息
        </Button>
      </section>

      {selected.length > 0 ? (
        <div className="sticky bottom-[calc(5.6rem+env(safe-area-inset-bottom))] z-30 mx-auto mt-4 flex w-[min(calc(100%-2rem),40rem)] items-center justify-between gap-3 rounded-card bg-card/95 p-3 shadow-lg backdrop-blur sm:bottom-4">
          <span className="text-sm font-semibold">已选择 {selected.length} 项</span>
          <Button onClick={() => setBulkOpen(true)}><Users className="size-4" />批量设置</Button>
        </div>
      ) : null}

      {activeItem ? (
        <ItemPlanningDialog item={activeItem} onOpenChange={(open) => !open && setActiveItemId(undefined)} open={Boolean(activeItemId)} />
      ) : null}
      <BulkPlanningDialog itemIds={selected} onOpenChange={setBulkOpen} open={bulkOpen} />
      <ConfirmDialog
        confirmLabel="清空全部信息"
        description="所有物品的负责人、期限、价格、渠道和存放位置都会清空；离线旧设备也不能让旧值重新出现。"
        onConfirm={clearAllPlanning}
        onOpenChange={setClearAllOpen}
        open={clearAllOpen}
        title="确认清空全部分工与采购信息？"
        variant="destructive"
      />
    </div>
  );
}
export function PlanningWorkspaceSkeleton() {
  return (
    <div className="page-shell page-shell-with-nav" aria-label="正在读取家庭分工与采购信息">
      <section className="mobile-shell grid gap-4">
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-32 rounded-card" />
        <Skeleton className="h-36 rounded-card" />
      </section>
    </div>
  );
}
