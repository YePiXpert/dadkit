"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DraftConflictNotice } from "@/components/DraftConflictNotice";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showAppToast } from "@/lib/app-toast";
import { getActiveHouseholdMembers, getRemovedHouseholdMembers, householdMemberLabel } from "@/lib/household/selectors";
import { useHouseholdStore } from "@/lib/household/store";
import { localDateTimeInputToIso } from "@/lib/baby/date";
import { cloneCareEvent } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";
import type { BreastSide, CareEvent } from "@/lib/baby/types";
import { isCareEvent, normalizeBabyText } from "@/lib/baby/validation";

export function CareEventDialog({ event, open, onOpenChange }: { event?: CareEvent; open: boolean; onOpenChange(open: boolean): void }) {
  const updateEvent = useBabyStore((state) => state.updateEvent);
  const household = useHouseholdStore((state) => state.household);
  const hydrateHousehold = useHouseholdStore((state) => state.hydrate);
  const [draft, setDraft] = useState<CareEvent>();
  const [conflictedExternal, setConflictedExternal] = useState<CareEvent>();
  const baseRef = useRef<CareEvent | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !event) {
      baseRef.current = undefined;
      setConflictedExternal(undefined);
      return;
    }
    const external = cloneCareEvent(event);
    const base = baseRef.current;
    if (!base || base.id !== external.id) {
      baseRef.current = external;
      setDraft(external);
      setConflictedExternal(undefined);
      return;
    }
    if (JSON.stringify(base) === JSON.stringify(external)) return;
    const dirty = draft && JSON.stringify(draft) !== JSON.stringify(base);
    baseRef.current = external;
    if (dirty && JSON.stringify(draft) !== JSON.stringify(external)) {
      setConflictedExternal(external);
    } else {
      setDraft(external);
      setConflictedExternal(undefined);
    }
  }, [draft, event, open]);
  useEffect(() => { hydrateHousehold(); }, [hydrateHousehold]);
  if (!event || !draft) return null;

  function updateTime(key: "occurredAt" | "startAt" | "endAt", value: string) {
    const iso = localDateTimeInputToIso(value);
    if (!iso) return;
    setDraft({ ...draft, [key]: iso } as CareEvent);
  }

  async function save() {
    let normalized = { ...cloneCareEvent(draft!), note: normalizeBabyText(draft!.note, true) } as CareEvent;
    if (normalized.type === "breastfeeding") {
      normalized = {
        ...normalized,
        startAt: normalized.segments[0]!.startAt,
        endAt: normalized.segments.at(-1)!.endAt,
      };
    }
    if (!isCareEvent(normalized)) {
      showAppToast({ message: "记录时间或数值无效，请检查后重试。", tone: "warning" });
      return;
    }
    setSaving(true);
    const result = await updateEvent(event!.id, normalized);
    setSaving(false);
    showAppToast({ message: result.ok ? "记录已更新。" : result.message ?? "更新失败。", tone: result.ok ? "success" : "warning" });
    if (result.ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>编辑照护记录</DialogTitle><DialogDescription>记录类型和标识不会改变；保存后会按整条记录参与家庭同步。</DialogDescription></DialogHeader>
        <DraftConflictNotice
          fields={conflictedExternal ? ["照护记录"] : []}
          onAcceptExternal={() => {
            if (conflictedExternal) setDraft(cloneCareEvent(conflictedExternal));
            setConflictedExternal(undefined);
          }}
          onKeepLocal={() => setConflictedExternal(undefined)}
        />
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          {draft.type === "bottle" ? <><DateTimeField id="edit-bottle-occurred" label="发生时间" value={draft.occurredAt} onChange={(value) => updateTime("occurredAt", value)} /><div className="grid gap-2"><Label htmlFor="edit-bottle-milk-type">奶类</Label><Select value={draft.milkType} onValueChange={(milkType) => setDraft({ ...draft, milkType: milkType as typeof draft.milkType })}><SelectTrigger id="edit-bottle-milk-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="breastmilk">瓶喂母乳</SelectItem><SelectItem value="formula">配方奶</SelectItem></SelectContent></Select></div><Amount id="edit-bottle-amount" value={draft.amountMl} onChange={(amountMl) => setDraft({ ...draft, amountMl: amountMl ?? draft.amountMl })} /></> : null}
          {draft.type === "diaper" ? <><DateTimeField id="edit-diaper-occurred" label="发生时间" value={draft.occurredAt} onChange={(value) => updateTime("occurredAt", value)} /><div className="grid gap-2"><Label htmlFor="edit-diaper-kind">尿布类型</Label><Select value={draft.kind} onValueChange={(kind) => setDraft({ ...draft, kind: kind as typeof draft.kind })}><SelectTrigger id="edit-diaper-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="wet">小便</SelectItem><SelectItem value="dirty">大便</SelectItem><SelectItem value="both">都有</SelectItem></SelectContent></Select></div></> : null}
          {draft.type === "sleep" || draft.type === "pumping" ? <><DateTimeField id={`edit-${draft.type}-start`} label="开始时间" value={draft.startAt} onChange={(value) => updateTime("startAt", value)} /><DateTimeField id={`edit-${draft.type}-end`} label="结束时间" value={draft.endAt!} onChange={(value) => updateTime("endAt", value)} />{draft.type === "pumping" ? <><div className="grid gap-2"><Label htmlFor="edit-pumping-side">侧别</Label><Select value={draft.side} onValueChange={(side) => setDraft({ ...draft, side: side as typeof draft.side })}><SelectTrigger id="edit-pumping-side"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">左侧</SelectItem><SelectItem value="right">右侧</SelectItem><SelectItem value="both">双侧</SelectItem></SelectContent></Select></div><Amount id="edit-pumping-amount" allowEmpty value={draft.amountMl} onChange={(amountMl) => setDraft({ ...draft, amountMl })} /></> : null}</> : null}
          {draft.type === "breastfeeding" ? <div className="grid gap-3">{draft.segments.map((segment, index) => <div className="grid gap-3 rounded-inset bg-card p-3 shadow-sm" key={`${event.id}-${index}`}><p className="text-[15px] font-semibold">第 {index + 1} 段</p><Select value={segment.side} onValueChange={(side) => setDraft({ ...draft, segments: draft.segments.map((item, candidate) => candidate === index ? { ...item, side: side as BreastSide } : item) })}><SelectTrigger aria-label={`第 ${index + 1} 段侧别`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">左侧</SelectItem><SelectItem value="right">右侧</SelectItem></SelectContent></Select><DateTimeField id={`edit-breastfeeding-${index}-start`} label="开始" value={segment.startAt} onChange={(value) => { const iso = localDateTimeInputToIso(value); if (iso) setDraft({ ...draft, segments: draft.segments.map((item, candidate) => candidate === index ? { ...item, startAt: iso } : item) }); }} /><DateTimeField id={`edit-breastfeeding-${index}-end`} label="结束" value={segment.endAt!} onChange={(value) => { const iso = localDateTimeInputToIso(value); if (iso) setDraft({ ...draft, segments: draft.segments.map((item, candidate) => candidate === index ? { ...item, endAt: iso } : item) }); }} /></div>)}</div> : null}
          <div className="grid gap-2"><Label htmlFor="edit-care-recorder">记录人</Label><Select value={draft.recordedByMemberId ?? "none"} onValueChange={(value) => setDraft({ ...draft, recordedByMemberId: value === "none" ? null : value })}><SelectTrigger id="edit-care-recorder"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">未标记记录人</SelectItem>{getActiveHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}</SelectItem>)}{getRemovedHouseholdMembers(household).map((member) => <SelectItem key={member.id} value={member.id}>{member.displayName.value}（已移除）</SelectItem>)}{draft.recordedByMemberId && !household.members[draft.recordedByMemberId] ? <SelectItem value={draft.recordedByMemberId}>{householdMemberLabel(household, draft.recordedByMemberId)}</SelectItem> : null}</SelectContent></Select></div>
          <div className="grid gap-2"><Label htmlFor="edit-care-note">备注</Label><Textarea id="edit-care-note" maxLength={1000} onChange={(change) => setDraft({ ...draft, note: change.target.value })} value={draft.note} /></div>
        </div>
        <DialogFooter><Button disabled={saving} onClick={() => onOpenChange(false)} variant="outline">取消</Button><Button disabled={saving || Boolean(conflictedExternal)} onClick={() => void save()}>{saving ? "正在保存…" : "保存修改"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DateTimeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange(value: string): void }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} onChange={(event) => onChange(event.target.value)} type="datetime-local" value={isoToLocalInput(value)} /></div>;
}

function Amount({ id, value, onChange, allowEmpty = false }: { id: string; value: number | null; onChange(value: number | null): void; allowEmpty?: boolean }) {
  return <div className="grid gap-2"><Label htmlFor={id}>奶量 ml{allowEmpty ? "（可留空）" : ""}</Label><Input id={id} inputMode="numeric" max={2000} min={allowEmpty ? 0 : 1} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} onKeyDown={(event) => { if (["e", "E", "+", "-", "."].includes(event.key)) event.preventDefault(); }} type="number" value={value ?? ""} /></div>;
}

function isoToLocalInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
