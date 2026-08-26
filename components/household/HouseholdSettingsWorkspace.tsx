"use client";

import { Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
import { CurrentDeviceMemberCard } from "@/components/household/CurrentDeviceMemberCard";
import { DangerZone } from "@/components/DangerZone";
import { HouseholdMemberDialog } from "@/components/household/HouseholdMemberDialog";
import { HouseholdMemberRow } from "@/components/household/HouseholdMemberRow";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showAppToast } from "@/lib/app-toast";
import { getBabyRepository } from "@/lib/baby/repository";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import type { HouseholdMemberPortable } from "@/lib/household/types";
import { useDraftConflict } from "@/lib/use-draft-conflict";

export function HouseholdSettingsWorkspace() {
  const household = useHouseholdStore((state) => state.household);
  const hydrate = useHouseholdStore((state) => state.hydrate);
  const setHouseholdName = useHouseholdStore((state) => state.setHouseholdName);
  const removeMember = useHouseholdStore((state) => state.removeMember);
  const clearAll = useHouseholdStore((state) => state.clearAll);
  const nameConflict = useDraftConflict(
    { name: household.householdName.value },
    true,
  );
  const name = nameConflict.draft.name;
  const [editing, setEditing] = useState<HouseholdMemberPortable | "new">();
  const [removing, setRemoving] = useState<HouseholdMemberPortable>();
  const [clearOpen, setClearOpen] = useState(false);
  const [recordedCounts, setRecordedCounts] = useState<Record<string, number>>({});
  const active = getActiveHouseholdMembers(household);
  const removed = getRemovedHouseholdMembers(household);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { void getBabyRepository().getAllEventsForPortableExport().then((events) => setRecordedCounts(events.reduce<Record<string, number>>((counts, event) => { if (event.recordedByMemberId) counts[event.recordedByMemberId] = (counts[event.recordedByMemberId] ?? 0) + 1; return counts; }, {}))).catch(() => undefined); }, [household]);

  function saveName() {
    const result = setHouseholdName(name);
    showAppToast({ message: result.ok ? (result.changed ? "家庭名称已保存。" : "家庭名称没有变化。") : result.message ?? result.errors?.householdName ?? "保存失败。", tone: result.ok ? "success" : "warning" });
  }

  return <div className="page-shell page-shell-with-nav"><section className="mobile-shell grid gap-4 sm:max-w-[42rem]"><PageHeader backHref="/settings" backLabel="返回我的" kicker="家庭协作" subtitle="成员名称和关系由你定义；宝宝记录人不会因成员移除而丢失。" title="家庭成员" /><Card><CardHeader><CardTitle>家庭显示名称（可选）</CardTitle></CardHeader><CardContent className="grid gap-3"><DraftConflictNotice fields={nameConflict.conflictFields.map(() => "家庭显示名称")} onAcceptExternal={nameConflict.acceptExternal} onKeepLocal={nameConflict.keepLocal} /><Label className="sr-only" htmlFor="household-name">家庭显示名称（可选）</Label><div className="flex gap-2"><Input id="household-name" maxLength={40} onChange={(event) => nameConflict.setField("name", event.target.value)} placeholder="例如：小满之家" value={name} /><Button disabled={nameConflict.hasConflict} onClick={saveName}>保存</Button></div></CardContent></Card><CurrentDeviceMemberCard household={household} /><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>家庭成员</CardTitle><p className="text-[13px] text-muted-foreground">{active.length}/12 位活跃成员</p></div><Button disabled={active.length >= 12 || Object.keys(household.members).length >= 100} onClick={() => setEditing("new")} size="sm"><Plus className="size-4" />添加成员</Button></div></CardHeader><CardContent className="grid gap-3">{active.length ? active.map((member) => <HouseholdMemberRow key={member.id} member={member} onEdit={() => setEditing(member)} onRemove={() => setRemoving(member)} />) : <div className="rounded-inset border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 size-6" />可以不添加成员，所有功能仍可使用。</div>}</CardContent></Card>{removed.length ? <Card><CardHeader><CardTitle>已移除成员</CardTitle></CardHeader><CardContent className="grid gap-3">{removed.map((member) => <HouseholdMemberRow key={member.id} member={member} removed />)}</CardContent></Card> : null}<DangerZone title="危险操作" description="清空后家庭名称和成员会清空，当前设备使用者会重置；宝宝记录仍保留，并显示为未知或已清空成员。离线旧设备不能恢复已清空成员。"><Button className="justify-self-start text-destructive hover:text-destructive" onClick={() => setClearOpen(true)} variant="ghost">清空家庭档案</Button></DangerZone></section><HouseholdMemberDialog member={editing === "new" ? undefined : editing} onOpenChange={(open) => !open && setEditing(undefined)} open={Boolean(editing)} /><ConfirmDialog confirmLabel="移除成员" description={removing ? `该成员不会再出现在新记录人选择中。已经记录了 ${recordedCounts[removing.id] ?? 0} 条宝宝事件；历史记录人仍会保留，不会删除宝宝记录。` : ""} onConfirm={() => { if (!removing) return; const result = removeMember(removing.id); showAppToast({ message: result.ok ? "成员已移除，宝宝历史记录保持不变。" : result.message ?? "移除失败。", tone: result.ok ? "success" : "warning" }); if (result.ok) setRemoving(undefined); }} onOpenChange={(open) => !open && setRemoving(undefined)} open={Boolean(removing)} title="确认移除这位家庭成员？" variant="destructive" /><ConfirmDialog confirmLabel="清空家庭档案" description="家庭名称和成员会清空，当前设备使用者会重置；宝宝记录仍保留，并显示为未知或已清空成员。离线旧设备不能恢复已清空成员。" onConfirm={() => { const result = clearAll(); showAppToast({ message: result.ok ? "家庭档案已清空，其他业务数据保持不变。" : result.message ?? "清空失败。", tone: result.ok ? "success" : "warning" }); }} onOpenChange={setClearOpen} open={clearOpen} title="确认清空家庭档案？" variant="destructive" /></div>;
}
