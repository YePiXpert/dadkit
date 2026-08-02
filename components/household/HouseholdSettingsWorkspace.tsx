"use client";

import { Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CurrentDeviceMemberCard } from "@/components/household/CurrentDeviceMemberCard";
import { HouseholdMemberDialog } from "@/components/household/HouseholdMemberDialog";
import { HouseholdMemberRow } from "@/components/household/HouseholdMemberRow";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAppToast } from "@/lib/app-toast";
import { getBabyRepository } from "@/lib/baby/repository";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import type { HouseholdMemberPortable } from "@/lib/household/types";
import { useItemPlanningStore } from "@/lib/planning/store";

export function HouseholdSettingsWorkspace() {
  const household = useHouseholdStore((state) => state.household);
  const hydrate = useHouseholdStore((state) => state.hydrate);
  const setHouseholdName = useHouseholdStore((state) => state.setHouseholdName);
  const removeMember = useHouseholdStore((state) => state.removeMember);
  const clearAll = useHouseholdStore((state) => state.clearAll);
  const planning = useItemPlanningStore((state) => state.planning);
  const hydratePlanning = useItemPlanningStore((state) => state.hydrate);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<HouseholdMemberPortable | "new">();
  const [removing, setRemoving] = useState<HouseholdMemberPortable>();
  const [clearOpen, setClearOpen] = useState(false);
  const [recordedCounts, setRecordedCounts] = useState<Record<string, number>>({});
  const active = getActiveHouseholdMembers(household);
  const removed = getRemovedHouseholdMembers(household);

  useEffect(() => { hydrate(); hydratePlanning(); }, [hydrate, hydratePlanning]);
  useEffect(() => { setName(household.householdName.value); }, [household.householdName.value]);
  useEffect(() => { void getBabyRepository().getAllEventsForPortableExport().then((events) => setRecordedCounts(events.reduce<Record<string, number>>((counts, event) => { if (event.recordedByMemberId) counts[event.recordedByMemberId] = (counts[event.recordedByMemberId] ?? 0) + 1; return counts; }, {}))).catch(() => undefined); }, [household]);
  const planningCounts = useMemo(() => Object.values(planning.items).reduce<Record<string, number>>((counts, record) => { for (const id of record.assigneeIds.value) counts[id] = (counts[id] ?? 0) + 1; return counts; }, {}), [planning]);

  function saveName() {
    const result = setHouseholdName(name);
    showAppToast({ message: result.ok ? (result.changed ? "家庭名称已保存。" : "家庭名称没有变化。") : result.errors?.householdName ?? "保存失败。", tone: result.ok ? "success" : "warning" });
  }

  return <div className="page-shell page-shell-with-nav"><section className="mobile-shell grid gap-4 sm:max-w-2xl"><PageHeader backHref="/settings" backLabel="返回我的" kicker="家庭协作" subtitle="成员名称和关系由你定义；历史负责人和记录人不会因成员移除而丢失。" title="家庭成员" /><section className="grid gap-3 rounded-card border border-border bg-card p-4"><Label htmlFor="household-name">家庭显示名称（可选）</Label><div className="flex gap-2"><Input id="household-name" maxLength={40} onChange={(event) => setName(event.target.value)} placeholder="例如：小满之家" value={name} /><Button onClick={saveName}>保存</Button></div></section><CurrentDeviceMemberCard household={household} /><section className="grid gap-3 rounded-card border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">家庭成员</h2><p className="text-xs text-muted-foreground">{active.length}/12 位活跃成员</p></div><Button disabled={active.length >= 12 || Object.keys(household.members).length >= 100} onClick={() => setEditing("new")} size="sm"><Plus className="size-4" />添加成员</Button></div>{active.length ? active.map((member) => <HouseholdMemberRow key={member.id} member={member} onEdit={() => setEditing(member)} onRemove={() => setRemoving(member)} />) : <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 size-6" />可以不添加成员，所有功能仍可使用。</div>}</section>{removed.length ? <section className="grid gap-3 rounded-card border border-border bg-card p-4"><h2 className="font-semibold">已移除成员</h2>{removed.map((member) => <HouseholdMemberRow key={member.id} member={member} removed />)}</section> : null}<Button className="justify-self-start text-destructive hover:text-destructive" onClick={() => setClearOpen(true)} variant="ghost">清空家庭档案</Button></section><HouseholdMemberDialog member={editing === "new" ? undefined : editing} onOpenChange={(open) => !open && setEditing(undefined)} open={Boolean(editing)} /><ConfirmDialog confirmLabel="移除成员" description={removing ? `该成员不会再出现在新任务选择中。当前负责 ${planningCounts[removing.id] ?? 0} 个清单项目，记录了 ${recordedCounts[removing.id] ?? 0} 条宝宝事件；历史负责人和记录人仍会保留，不会删除宝宝记录，也不会自动重新分配任务。` : ""} onConfirm={() => { if (!removing) return; const result = removeMember(removing.id); showAppToast({ message: result.ok ? "成员已移除，历史引用仍保留。" : result.message ?? "移除失败。", tone: result.ok ? "success" : "warning" }); setRemoving(undefined); }} onOpenChange={(open) => !open && setRemoving(undefined)} open={Boolean(removing)} title="确认移除这位家庭成员？" variant="destructive" /><ConfirmDialog confirmLabel="清空家庭档案" description="家庭名称和成员会清空，当前设备使用者会重置；清单、分工引用和宝宝记录仍保留，并显示为未知或已清空成员。离线旧设备不能恢复已清空成员。" onConfirm={() => { clearAll(); showAppToast({ message: "家庭档案已清空，其他业务数据保持不变。", tone: "success" }); }} onOpenChange={setClearOpen} open={clearOpen} title="确认清空家庭档案？" variant="destructive" /></div>;
}
