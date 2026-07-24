"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarClock,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { ExportTextArea } from "@/components/ExportTextArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LABOR_URGENT_SIGNAL_CARDS,
  WATER_BREAK_STEPS,
} from "@/lib/labor-guide";
import {
  calculateContractionStats,
  formatDuration,
  generateContractionsShareText,
} from "@/lib/rc";
import { buildPreparationSummary } from "@/lib/presentation/preparation-summary";
import { useDadKitStore } from "@/lib/store";

export default function ContractionsPage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const contractions = useDadKitStore((state) => state.contractions);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const addContraction = useDadKitStore((state) => state.addContraction);
  const deleteContraction = useDadKitStore((state) => state.deleteContraction);
  const clearContractions = useDadKitStore((state) => state.clearContractions);
  const [activeStartedAt, setActiveStartedAt] = useState<string>();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualStartedAt, setManualStartedAt] = useState(() =>
    toDateTimeLocal(new Date(Date.now() - 5 * 60 * 1000)),
  );
  const [manualEndedAt, setManualEndedAt] = useState(() =>
    toDateTimeLocal(new Date()),
  );
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const stats = useMemo(
    () => calculateContractionStats(contractions),
    [contractions],
  );
  const exportText = useMemo(
    () => generateContractionsShareText(contractions),
    [contractions],
  );
  const preparationSummary = useMemo(
    () =>
      profile
        ? buildPreparationSummary({
            birthPlan,
            checklist,
            contractions,
            hospitalAnswers,
            postpartumTasks,
            profile,
            timelineTaskStatuses,
          })
        : undefined,
    [
      birthPlan,
      checklist,
      contractions,
      hospitalAnswers,
      postpartumTasks,
      profile,
      timelineTaskStatuses,
    ],
  );
  const timerProgress = activeStartedAt
    ? Math.min(100, Math.round((elapsedSeconds / 90) * 100))
    : 0;

  useEffect(() => {
    if (!activeStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = activeStartedAt;

    function updateElapsed() {
      setElapsedSeconds(
        Math.max(
          0,
          Math.round((Date.now() - new Date(startedAt).getTime()) / 1000),
        ),
      );
    }

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timer);
  }, [activeStartedAt]);

  function startTimer() {
    setActiveStartedAt(new Date().toISOString());
    setMessage("");
  }

  function stopTimer() {
    if (!activeStartedAt) {
      return;
    }

    addContraction({
      startedAt: activeStartedAt,
      endedAt: new Date().toISOString(),
      note,
    });
    setNote("");
    setActiveStartedAt(undefined);
    setMessage("已记录本次宫缩。");
  }

  function addManualRecord() {
    const startedAt = fromDateTimeLocal(manualStartedAt);
    const endedAt = fromDateTimeLocal(manualEndedAt);

    if (!startedAt || !endedAt) {
      setMessage("请填写开始和结束时间。");
      return;
    }

    if (new Date(endedAt).getTime() < new Date(startedAt).getTime()) {
      setMessage("结束时间不能早于开始时间。");
      return;
    }

    addContraction({ startedAt, endedAt, note });
    setNote("");
    setManualStartedAt(toDateTimeLocal(new Date(Date.now() - 5 * 60 * 1000)));
    setManualEndedAt(toDateTimeLocal(new Date()));
    setMessage("已添加手动记录。");
  }

  function clearAll() {
    if (!window.confirm("确认清空全部宫缩记录？")) {
      return;
    }

    clearContractions();
    setMessage("宫缩记录已清空。");
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-1 lg:max-w-none">
        <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">宫缩记录</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          记录持续时间和间隔，便于沟通。
        </p>
      </section>

      {preparationSummary ? (
        <section className="mobile-shell lg:max-w-none">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="section-kicker">待产准备状态</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal">
                  {preparationSummary.readiness.label}{" "}
                  {preparationSummary.readiness.percent}%
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {preparationSummary.contractionStatus.label} ·{" "}
                  {preparationSummary.contractionStatus.detail}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  宫缩记录只用于保存和沟通，不计入待产准备进度。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild>
                  <Link href="/share">生成分享截图</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardContent className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">本次持续时间</p>
                <h2 className="mt-1 text-xl font-bold tracking-normal">
                  {activeStartedAt ? "正在记录中" : "准备开始记录"}
                </h2>
              </div>
            </div>

            <div className="mx-auto w-full max-w-72">
              <div
                aria-label="本次宫缩计时圆盘"
                className="mx-auto flex size-48 items-center justify-center rounded-full p-3 shadow-sm"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${timerProgress}%, hsl(var(--secondary)) ${timerProgress}% 100%)`,
                }}
              >
                <div className="flex size-full flex-col items-center justify-center rounded-full border border-border bg-card text-center shadow-sm">
                  <CalendarClock className="mb-2 size-6 text-primary" />
                  <p className="text-4xl font-bold tracking-normal text-foreground">
                    {formatDuration(elapsedSeconds)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {activeStartedAt ? "正在记录中" : "点击开始计时"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  上次间隔
                </p>
                <p className="mt-1 text-xl font-bold tracking-normal">
                  {formatDuration(stats.averageIntervalSeconds)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  平均持续
                </p>
                <p className="mt-1 text-xl font-bold tracking-normal">
                  {formatDuration(stats.averageDurationSeconds)}
                </p>
              </div>
            </div>

            <Textarea
              placeholder="备注，例如强度、姿势、是否破水等，仅作记录"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              {activeStartedAt ? (
                <Button className="h-14 text-base" onClick={stopTimer}>
                  结束并保存
                </Button>
              ) : (
                <Button className="h-14 text-base" onClick={startTimer}>
                  开始计时
                </Button>
              )}
              <Button className="h-14 text-base" variant="outline" onClick={clearAll}>
                <RotateCcw className="size-4" />
                清空
              </Button>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              是否去医院以医生/医院要求为准；DadKit 只帮你保存记录。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>手动添加</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="开始时间" htmlFor="contraction-started-at">
                <Input
                  id="contraction-started-at"
                  type="datetime-local"
                  value={manualStartedAt}
                  onChange={(event) => setManualStartedAt(event.target.value)}
                />
              </Field>
              <Field label="结束时间" htmlFor="contraction-ended-at">
                <Input
                  id="contraction-ended-at"
                  type="datetime-local"
                  value={manualEndedAt}
                  onChange={(event) => setManualEndedAt(event.target.value)}
                />
              </Field>
            </div>
            <Button className="justify-self-start" onClick={addManualRecord}>
              <Plus className="size-4" />
              添加记录
            </Button>
            {message ? (
              <p className="text-xs leading-5 text-muted-foreground">
                {message}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section
        className="mobile-shell grid gap-3 lg:max-w-none"
        id="labor-alerts"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              临产提醒
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {LABOR_URGENT_SIGNAL_CARDS.map((card) => (
                <div
                  className="rounded-lg border border-border bg-background p-3"
                  key={card.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-semibold">
                      {card.title}
                    </p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[0.68rem] font-semibold text-primary">
                      {card.actionLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {card.description}
                  </p>
                  <p className="mt-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs leading-5 text-muted-foreground">
                    {card.notePrompt}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-secondary/50 p-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="size-4 text-primary" />
                破水先这样记录
              </h3>
              <div className="mt-3 grid gap-2">
                {WATER_BREAK_STEPS.map((step) => (
                  <div
                    className="rounded-lg border border-border bg-card p-3"
                    key={step.title}
                  >
                    <p className="text-sm font-bold">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              这些内容只帮助家人记录和沟通，不替代医生判断；是否去医院以医院/医生要求为准。
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <StatTile label="最近1小时次数" value={`${stats.count} 次`} />
        <StatTile
          label="平均间隔"
          value={formatDuration(stats.averageIntervalSeconds)}
        />
        <StatTile
          label="平均持续"
          value={formatDuration(stats.averageDurationSeconds)}
        />
      </section>

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <Card>
          <CardHeader>
            <CardTitle>记录明细</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {contractions.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">
                暂无记录。临产时可以先按“开始计时”。
              </p>
            ) : (
              contractions.map((record) => (
                <div
                  className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_auto]"
                  key={record.id}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{formatRecordTime(record.startedAt)}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      持续 {formatDuration(record.durationSeconds)} · 间隔{" "}
                      {formatDuration(record.intervalSeconds)}
                    </p>
                    {record.note ? (
                      <p className="mt-1 text-sm leading-6">{record.note}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteContraction(record.id)}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导出记录</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportTextArea value={exportText} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatRecordTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}
