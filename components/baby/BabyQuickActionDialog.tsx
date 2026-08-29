"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showAppToast } from "@/lib/app-toast";
import { triggerHaptic } from "@/lib/haptics";
import { localDateTimeInputToIso, localDateTimeInputValue } from "@/lib/baby/date";
import { calculateBreastfeedingDuration, formatCareDuration, getActiveBreastfeeding, getActivePumping, getActiveSleep } from "@/lib/baby/selectors";
import { useBabyStore } from "@/lib/baby/store";
import type { BottleMilkType, CareEvent, CareEventType, DiaperKind, PumpingSide } from "@/lib/baby/types";
import { useOpenDraftInitializer } from "@/lib/use-open-draft";

type QuickAction = CareEventType;

type CareFieldErrorKey = "amount" | "occurredAt" | "manualStartAt" | "manualEndAt";

export function BabyQuickActionDialog({ action, open, onOpenChange }: { action?: QuickAction; open: boolean; onOpenChange(open: boolean): void }) {
  const activeEvents = useBabyStore((state) => state.activeEvents);
  const careClearedAt = useBabyStore((state) => state.careClearedAt);
  const startBreastfeeding = useBabyStore((state) => state.startBreastfeeding);
  const switchBreastfeedingSide = useBabyStore((state) => state.switchBreastfeedingSide);
  const finishBreastfeeding = useBabyStore((state) => state.finishBreastfeeding);
  const addBottleRecord = useBabyStore((state) => state.addBottleRecord);
  const startPumping = useBabyStore((state) => state.startPumping);
  const finishPumping = useBabyStore((state) => state.finishPumping);
  const addDiaperRecord = useBabyStore((state) => state.addDiaperRecord);
  const startSleep = useBabyStore((state) => state.startSleep);
  const finishSleep = useBabyStore((state) => state.finishSleep);
  const createManualEvent = useBabyStore((state) => state.createManualEvent);
  const deleteEvent = useBabyStore((state) => state.deleteEvent);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => localDateTimeInputValue());
  const [milkType, setMilkType] = useState<BottleMilkType>("breastmilk");
  const [pumpingSide, setPumpingSide] = useState<PumpingSide>("both");
  const [manualMode, setManualMode] = useState(false);
  const [manualStartAt, setManualStartAt] = useState(() => localDateTimeInputValue(new Date(Date.now() - 10 * 60_000)));
  const [manualEndAt, setManualEndAt] = useState(() => localDateTimeInputValue());
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CareFieldErrorKey, string>>>({});
  const breastfeeding = getActiveBreastfeeding(activeEvents, careClearedAt);
  const pumping = getActivePumping(activeEvents, careClearedAt);
  const sleep = getActiveSleep(activeEvents, careClearedAt);

  useOpenDraftInitializer(open, action, () => {
    setNote("");
    setAmount("");
    setOccurredAt(localDateTimeInputValue());
    setPumpingSide("both");
    setManualMode(false);
    setManualStartAt(localDateTimeInputValue(new Date(Date.now() - 10 * 60_000)));
    setManualEndAt(localDateTimeInputValue());
    setFieldErrors({});
  });

  function clearFieldError(key: CareFieldErrorKey) {
    setFieldErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  }

  function updateAmount(value: string) {
    setAmount(value);
    clearFieldError("amount");
  }

  function updateOccurredAt(value: string) {
    setOccurredAt(value);
    clearFieldError("occurredAt");
  }

  function updateManualStartAt(value: string) {
    setManualStartAt(value);
    clearFieldError("manualStartAt");
  }

  function updateManualEndAt(value: string) {
    setManualEndAt(value);
    clearFieldError("manualEndAt");
  }

  useEffect(() => {
    if (!open || (!breastfeeding && !pumping && !sleep)) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [open, breastfeeding, pumping, sleep]);

  async function run(operation: () => Promise<{ ok: boolean; message?: string }>, success: string, close = true) {
    setBusy(true);
    const result = await operation();
    setBusy(false);
    if (result.ok) triggerHaptic("success");
    showAppToast({ message: result.ok ? success : result.message ?? "保存失败。", tone: result.ok ? "success" : "warning" });
    if (result.ok && close) onOpenChange(false);
  }

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileSheet>
        <DialogHeader>
          <DialogTitle>{ACTION_TITLES[action]}</DialogTitle>
          <DialogDescription>{ACTION_DESCRIPTIONS[action]}</DialogDescription>
        </DialogHeader>

        {action === "breastfeeding" ? (
          breastfeeding ? (
            <div className="grid gap-4">
              <TimerLabel label={`当前${breastfeeding.segments.at(-1)?.side === "left" ? "左侧" : "右侧"}`} value={formatCareDuration(now - Date.parse(breastfeeding.segments.at(-1)!.startAt))} />
              <TimerLabel label="亲喂总时长" value={formatCareDuration(calculateBreastfeedingDuration(breastfeeding, now))} />
              <div className="grid grid-cols-2 gap-3">
                <Button disabled={busy || breastfeeding.segments.at(-1)?.side === "left"} onClick={() => void run(() => switchBreastfeedingSide("left"), "已切换到左侧。", false)} variant="outline">切换左侧</Button>
                <Button disabled={busy || breastfeeding.segments.at(-1)?.side === "right"} onClick={() => void run(() => switchBreastfeedingSide("right"), "已切换到右侧。", false)} variant="outline">切换右侧</Button>
              </div>
              <NoteField note={note} setNote={setNote} />
              <Button disabled={busy} size="lg" onClick={() => void run(() => finishBreastfeeding(note), "亲喂记录已保存。")}>结束亲喂</Button>
              <Button disabled={busy} onClick={() => void run(() => deleteEvent(breastfeeding.id), "错误亲喂记录已删除。") } variant="destructive">删除本次记录</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button disabled={busy} onClick={() => void run(() => startBreastfeeding("left"), "已开始左侧亲喂。")}>左侧开始</Button>
              <Button disabled={busy} onClick={() => void run(() => startBreastfeeding("right"), "已开始右侧亲喂。")}>右侧开始</Button>
            </div>
          )
        ) : null}

        {action === "bottle" ? (
          <div className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="baby-bottle-type">奶类</Label><Select value={milkType} onValueChange={(value) => setMilkType(value as BottleMilkType)}><SelectTrigger id="baby-bottle-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="breastmilk">瓶喂母乳</SelectItem><SelectItem value="formula">配方奶</SelectItem></SelectContent></Select></div>
            <AmountField amount={amount} error={fieldErrors.amount} setAmount={updateAmount} label="奶量 ml *" />
            <TimeField id="baby-bottle-time" error={fieldErrors.occurredAt} value={occurredAt} onChange={updateOccurredAt} />
            <NoteField note={note} setNote={setNote} />
            <Button disabled={busy} size="lg" onClick={() => {
              const iso = localDateTimeInputToIso(occurredAt);
              const parsed = Number(amount);
              const amountError = /^\d+$/.test(amount) && parsed >= 1 && parsed <= 2000 ? undefined : "请输入 1–2000 的整数奶量。";
              const timeError = iso ? undefined : "请选择有效时间。";
              if (amountError || timeError || !iso) { setFieldErrors({ amount: amountError, occurredAt: timeError }); return; }
              void run(() => addBottleRecord({ occurredAt: iso, milkType, amountMl: parsed, note }), "瓶喂记录已保存。");
            }}>保存瓶喂记录</Button>
          </div>
        ) : null}

        {action === "pumping" ? (
          pumping ? (
            <div className="grid gap-4">
              <TimerLabel label="吸奶计时" value={formatCareDuration(now - Date.parse(pumping.startAt))} />
              <AmountField amount={amount} error={fieldErrors.amount} setAmount={updateAmount} label="吸出奶量 ml（可留空）" />
              <NoteField note={note} setNote={setNote} />
              <Button disabled={busy} size="lg" onClick={() => {
                const amountError = amount !== "" && (!/^\d+$/.test(amount) || Number(amount) > 2000) ? "奶量需为 0–2000 的整数。" : undefined;
                if (amountError) { setFieldErrors({ amount: amountError }); return; }
                void run(() => finishPumping({ amountMl: amount === "" ? null : Number(amount), note }), "吸奶记录已保存。");
              }}>结束吸奶</Button>
              <Button disabled={busy} onClick={() => void run(() => deleteEvent(pumping.id), "错误吸奶记录已删除。") } variant="destructive">删除本次记录</Button>
            </div>
          ) : manualMode ? (
            <div className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="baby-manual-pumping-side">侧别</Label><Select value={pumpingSide} onValueChange={(value) => setPumpingSide(value as PumpingSide)}><SelectTrigger id="baby-manual-pumping-side"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">左侧</SelectItem><SelectItem value="right">右侧</SelectItem><SelectItem value="both">双侧</SelectItem></SelectContent></Select></div>
              <TimeField id="baby-pumping-start" error={fieldErrors.manualStartAt} label="开始时间" value={manualStartAt} onChange={updateManualStartAt} />
              <TimeField id="baby-pumping-end" error={fieldErrors.manualEndAt} label="结束时间" value={manualEndAt} onChange={updateManualEndAt} />
              <AmountField amount={amount} error={fieldErrors.amount} setAmount={updateAmount} label="吸出奶量 ml（可留空）" />
              <NoteField note={note} setNote={setNote} />
              <Button disabled={busy} size="lg" onClick={() => {
                const startAt = localDateTimeInputToIso(manualStartAt);
                const endAt = localDateTimeInputToIso(manualEndAt);
                const startError = startAt ? undefined : "请选择有效的开始时间。";
                const endError = !endAt ? "请选择有效的结束时间。" : startAt && endAt && Date.parse(endAt) < Date.parse(startAt) ? "结束时间不能早于开始时间。" : undefined;
                const amountError = amount !== "" && (!/^\d+$/.test(amount) || Number(amount) > 2000) ? "奶量需为 0–2000 的整数。" : undefined;
                if (amountError || startError || endError || !startAt || !endAt) { setFieldErrors({ manualStartAt: startError, manualEndAt: endError, amount: amountError }); return; }
                const event: CareEvent = { id: "manual-pumping-draft", type: "pumping", note, createdAt: 0, updatedAt: 0, deletedAt: null, startAt, endAt, side: pumpingSide, amountMl: amount === "" ? null : Number(amount) };
                void run(() => createManualEvent(event), "吸奶补录已保存。");
              }}>保存吸奶补录</Button>
              <Button disabled={busy} onClick={() => setManualMode(false)} variant="outline">返回计时</Button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">{(["left", "right", "both"] as PumpingSide[]).map((side) => <Button disabled={busy} key={side} onClick={() => void run(() => startPumping(side), "已开始吸奶计时。")}>{side === "left" ? "左侧" : side === "right" ? "右侧" : "双侧"}</Button>)}</div>
              <Button disabled={busy} onClick={() => setManualMode(true)} variant="outline">手动补录已完成吸奶</Button>
            </div>
          )
        ) : null}

        {action === "diaper" ? (
          <div className="grid gap-4">
            <TimeField id="baby-diaper-time" error={fieldErrors.occurredAt} value={occurredAt} onChange={updateOccurredAt} />
            <NoteField note={note} setNote={setNote} />
            <div className="grid grid-cols-3 gap-2">
              {(["wet", "dirty", "both"] as DiaperKind[]).map((kind) => <Button disabled={busy} key={kind} onClick={() => {
                const iso = localDateTimeInputToIso(occurredAt);
                if (!iso) { setFieldErrors({ occurredAt: "请选择有效时间。" }); return; }
                void run(() => addDiaperRecord({ occurredAt: iso, kind, note }), "尿布记录已保存。");
              }}>{kind === "wet" ? "小便" : kind === "dirty" ? "大便" : "都有"}</Button>)}
            </div>
          </div>
        ) : null}

        {action === "sleep" ? (
          sleep ? (
            <div className="grid gap-4">
              <TimerLabel label="已睡时长" value={formatCareDuration(now - Date.parse(sleep.startAt))} />
              {now - Date.parse(sleep.startAt) > 86_400_000 ? <p className="rounded-lg border border-warning-foreground/25 bg-warning p-3 text-sm text-warning-foreground">计时已超过 24 小时，请确认是否忘记结束；DadKit 不会自动修改记录。</p> : null}
              <NoteField note={note} setNote={setNote} />
              <Button disabled={busy} size="lg" onClick={() => void run(() => finishSleep(note), "睡眠记录已保存。")}>结束睡眠</Button>
              <Button disabled={busy} onClick={() => void run(() => deleteEvent(sleep.id), "错误睡眠记录已删除。") } variant="destructive">删除错误记录</Button>
            </div>
          ) : manualMode ? (
            <div className="grid gap-4">
              <TimeField id="baby-sleep-start" error={fieldErrors.manualStartAt} label="开始时间" value={manualStartAt} onChange={updateManualStartAt} />
              <TimeField id="baby-sleep-end" error={fieldErrors.manualEndAt} label="结束时间" value={manualEndAt} onChange={updateManualEndAt} />
              <NoteField note={note} setNote={setNote} />
              <Button disabled={busy} size="lg" onClick={() => {
                const startAt = localDateTimeInputToIso(manualStartAt);
                const endAt = localDateTimeInputToIso(manualEndAt);
                const startError = startAt ? undefined : "请选择有效的开始时间。";
                const endError = !endAt ? "请选择有效的结束时间。" : startAt && endAt && Date.parse(endAt) < Date.parse(startAt) ? "结束时间不能早于开始时间。" : undefined;
                if (startError || endError || !startAt || !endAt) { setFieldErrors({ manualStartAt: startError, manualEndAt: endError }); return; }
                const event: CareEvent = { id: "manual-sleep-draft", type: "sleep", note, createdAt: 0, updatedAt: 0, deletedAt: null, startAt, endAt };
                void run(() => createManualEvent(event), "睡眠补录已保存。");
              }}>保存睡眠补录</Button>
              <Button disabled={busy} onClick={() => setManualMode(false)} variant="outline">返回计时</Button>
            </div>
          ) : <div className="grid gap-3"><Button disabled={busy} onClick={() => void run(() => startSleep(), "已开始睡眠计时。")}>开始睡眠</Button><Button disabled={busy} onClick={() => setManualMode(true)} variant="outline">手动补录已完成睡眠</Button></div>
        ) : null}

        <DialogFooter><Button disabled={busy} onClick={() => onOpenChange(false)} variant="outline">关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AmountField({ amount, error, setAmount, label }: { amount: string; error?: string; setAmount(value: string): void; label: string }) {
  return <div className="grid gap-2"><Label htmlFor="baby-care-amount">{label}</Label><Input aria-describedby={error ? "baby-care-amount-error" : undefined} aria-invalid={error ? true : undefined} id="baby-care-amount" inputMode="numeric" min="0" max="2000" onChange={(event) => setAmount(event.target.value)} onKeyDown={(event) => { if (["e", "E", "+", "-", "."].includes(event.key)) event.preventDefault(); }} pattern="[0-9]*" type="number" value={amount} />{error ? <p className="text-sm text-destructive" id="baby-care-amount-error" role="alert">{error}</p> : null}</div>;
}

function TimeField({ id, error, label = "时间", value, onChange }: { id: string; error?: string; label?: string; value: string; onChange(value: string): void }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined} id={id} onChange={(event) => onChange(event.target.value)} type="datetime-local" value={value} />{error ? <p className="text-sm text-destructive" id={`${id}-error`} role="alert">{error}</p> : null}</div>;
}

function NoteField({ note, setNote }: { note: string; setNote(value: string): void }) {
  return <div className="grid gap-2"><Label htmlFor="baby-care-note">备注</Label><Textarea id="baby-care-note" maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="可选" value={note} /></div>;
}

function TimerLabel({ label, value }: { label: string; value: string }) {
  return <div aria-label={`${label} ${value}`} className="rounded-card bg-secondary p-5 text-center"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold tabular-nums">{value}</p></div>;
}

const ACTION_TITLES: Record<QuickAction, string> = { breastfeeding: "亲喂", bottle: "瓶喂", pumping: "吸奶", diaper: "尿布", sleep: "睡眠" };
const ACTION_DESCRIPTIONS: Record<QuickAction, string> = { breastfeeding: "选择左右侧开始；切换侧会继续保存在同一条亲喂记录中。", bottle: "记录瓶喂母乳或配方奶的奶量。", pumping: "吸奶计时可以和宝宝睡眠同时进行。", diaper: "快速记录小便、大便或都有。", sleep: "只保存开始和结束动作，锁屏后仍可恢复正确时长。" };
