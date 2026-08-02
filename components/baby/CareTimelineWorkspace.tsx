"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CareEventDialog } from "@/components/baby/CareEventDialog";
import { CareEventRow } from "@/components/baby/CareEventRow";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showAppToast } from "@/lib/app-toast";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers, householdMemberLabel } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import { compareEventsNewestFirst, groupCareEventsByLocalDate } from "@/lib/baby/selectors";
import { useBabyStore } from "@/lib/baby/store";
import type { CareEvent, CareEventType } from "@/lib/baby/types";

export function CareTimelineWorkspace() {
  const hydrate = useBabyStore((state) => state.hydrate);
  const hydrated = useBabyStore((state) => state.hydrated);
  const activeEvents = useBabyStore((state) => state.activeEvents);
  const timelineEvents = useBabyStore((state) => state.timelineEvents);
  const careClearedAt = useBabyStore((state) => state.careClearedAt);
  const loadTimelineRange = useBabyStore((state) => state.loadTimelineRange);
  const deleteEvent = useBabyStore((state) => state.deleteEvent);
  const [days, setDays] = useState(7);
  const [filter, setFilter] = useState<"all" | CareEventType>("all");
  const [query, setQuery] = useState("");
  const [recorder, setRecorder] = useState<string>("all");
  const household = useHouseholdStore((state) => state.household);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  const [editing, setEditing] = useState<CareEvent>();
  const [deleting, setDeleting] = useState<CareEvent>();

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => { hydrateHousehold(); }, [hydrateHousehold]);
  useEffect(() => {
    if (!hydrated) return;
    const end = Date.now() + 1;
    void loadTimelineRange(end - days * 86_400_000, end);
  }, [days, hydrated, loadTimelineRange]);

  const visible = useMemo(() => {
    const map = new Map([...activeEvents, ...timelineEvents].map((event) => [event.id, event]));
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...map.values()].filter((event) => event.deletedAt === null && event.updatedAt > careClearedAt && (filter === "all" || event.type === filter) && (recorder === "all" || (recorder === "none" ? event.recordedByMemberId === null : event.recordedByMemberId === recorder)) && (!normalizedQuery || event.note.toLocaleLowerCase().includes(normalizedQuery) || householdMemberLabel(household, event.recordedByMemberId).toLocaleLowerCase().includes(normalizedQuery)));
  }, [activeEvents, careClearedAt, filter, household, query, recorder, timelineEvents]);
  const activeVisible = visible
    .filter((event) => (event.type === "breastfeeding" || event.type === "pumping" || event.type === "sleep") && event.endAt === null)
    .sort(compareEventsNewestFirst);
  const groups = groupCareEventsByLocalDate(
    visible.filter((event) => !activeVisible.some((active) => active.id === event.id)),
    careClearedAt,
  );

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-4 lg:max-w-2xl">
        <PageHeader backHref="/baby" backLabel="返回宝宝记录" kicker="照护时间线" subtitle="默认加载最近 7 天，可按类型筛选并搜索备注。" title="全部宝宝记录" />
        <section className="grid gap-3 rounded-card border border-border bg-card p-3">
          <div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground" /><Label className="sr-only" htmlFor="baby-timeline-search">搜索备注</Label><Input className="border-0 bg-transparent shadow-none" id="baby-timeline-search" onChange={(event) => setQuery(event.target.value)} placeholder="搜索备注" type="search" value={query} /></div>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger aria-label="记录类型筛选"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部</SelectItem><SelectItem value="breastfeeding">亲喂</SelectItem><SelectItem value="bottle">瓶喂</SelectItem><SelectItem value="pumping">吸奶</SelectItem><SelectItem value="diaper">尿布</SelectItem><SelectItem value="sleep">睡眠</SelectItem></SelectContent></Select>
          <Select value={recorder} onValueChange={setRecorder}><SelectTrigger aria-label="记录人筛选"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部记录人</SelectItem><SelectItem value="none">未标记记录人</SelectItem>{getActiveHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}</SelectItem>)}{getRemovedHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}（已移除）</SelectItem>)}</SelectContent></Select>
        </section>

        {activeVisible.length > 0 ? <section className="grid gap-3"><h2 className="px-1 text-sm font-semibold text-primary">进行中</h2>{activeVisible.map((event) => <CareEventRow event={event} key={event.id} onDelete={() => setDeleting(event)} />)}</section> : null}
        {[...groups.entries()].map(([date, events]) => <section className="grid gap-3" key={date}><h2 className="px-1 text-sm font-semibold text-muted-foreground">{date}</h2>{events.map((event) => <CareEventRow event={event} key={event.id} onDelete={() => setDeleting(event)} onEdit={() => setEditing(event)} />)}</section>)}
        {visible.length === 0 ? <EmptyState variant="dashed" icon={null} title="当前范围没有符合条件的记录。" /> : null}
        <Button onClick={() => setDays((value) => Math.min(3650, value + 7))} variant="outline">继续加载更早 7 天</Button>
      </section>

      <CareEventDialog event={editing} onOpenChange={(open) => !open && setEditing(undefined)} open={Boolean(editing)} />
      <ConfirmDialog confirmLabel="删除记录" description="记录会从正常时间线隐藏，并保留删除墓碑，旧设备不能使它重新出现。" onConfirm={() => { if (!deleting) return; void deleteEvent(deleting.id).then((result) => showAppToast({ message: result.ok ? "记录已删除。" : result.message ?? "删除失败。", tone: result.ok ? "success" : "warning" })); setDeleting(undefined); }} onOpenChange={(open) => !open && setDeleting(undefined)} open={Boolean(deleting)} title="确认删除这条记录？" variant="destructive" />
    </div>
  );
}
