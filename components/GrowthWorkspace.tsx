"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Info,
  Ruler,
  Scale,
  Share2,
  Sparkles,
  UserRound,
} from "lucide-react";

import { GrowthAnalogyIllustration } from "@/components/GrowthAnalogyIllustration";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_GROWTH_WEEK,
  GROWTH_MEDICAL_DISCLAIMER,
  GROWTH_SOURCES,
  GROWTH_WEEKS,
  MAX_GROWTH_WEEK,
  MIN_GROWTH_WEEK,
  describeGrowthSincePreviousWeek,
  getCurrentGrowthWeekFromDueDate,
  getGrowthWeek,
  getProjectedGrowthWeekDate,
  type GrowthTrimester,
} from "@/lib/growth";
import { flushPendingProfileWrite, useGrowthStore } from "@/lib/growth-store";
import { getStoredPackingPercent } from "@/lib/packing-progress";
import { formatGrowthShareText, shareText } from "@/lib/share";
import { cn } from "@/lib/utils";

const TIMELINE_GROUPS: readonly GrowthTrimester[] = [
  "孕早期",
  "孕中期",
  "孕晚期",
];

export function GrowthWorkspace() {
  const hydrated = useGrowthStore((state) => state.hydrated);
  const hydrate = useGrowthStore((state) => state.hydrate);
  const nickname = useGrowthStore((state) => state.nickname);
  const dueDate = useGrowthStore((state) => state.dueDate);
  const lastViewedWeek = useGrowthStore((state) => state.lastViewedWeek);
  const completedTaskIds = useGrowthStore((state) => state.completedTaskIds);
  const setNickname = useGrowthStore((state) => state.setNickname);
  const setDueDate = useGrowthStore((state) => state.setDueDate);
  const setLastViewedWeek = useGrowthStore((state) => state.setLastViewedWeek);
  const toggleCompletedTask = useGrowthStore(
    (state) => state.toggleCompletedTask,
  );
  const [packingPercent, setPackingPercent] = useState(0);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const current = getGrowthWeek(
    hydrated ? lastViewedWeek : DEFAULT_GROWTH_WEEK,
  );
  const currentTaskDone = completedTaskIds.includes(current.checkupTaskId);
  const projectedDate = getProjectedGrowthWeekDate(dueDate, current.week);
  const babyName = nickname.trim() || "宝宝";
  const currentPregnancyWeek = dueDate
    ? getCurrentGrowthWeekFromDueDate(dueDate)
    : undefined;
  useEffect(() => {
    const refreshPackingPercent = () =>
      setPackingPercent(getStoredPackingPercent());

    refreshPackingPercent();
    window.addEventListener("storage", refreshPackingPercent);
    return () => window.removeEventListener("storage", refreshPackingPercent);
  }, []);
  const [currentWeekPopping, setCurrentWeekPopping] = useState(false);
  const previousViewedWeekRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const previousWeek = previousViewedWeekRef.current;
    previousViewedWeekRef.current = current.week;

    if (
      previousWeek === undefined ||
      previousWeek === current.week ||
      current.week !== currentPregnancyWeek
    ) {
      return;
    }

    setCurrentWeekPopping(true);
    const timeout = window.setTimeout(() => setCurrentWeekPopping(false), 500);

    return () => window.clearTimeout(timeout);
  }, [current.week, currentPregnancyWeek]);

  function updateDueDate(value: string) {
    setDueDate(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setLastViewedWeek(getCurrentGrowthWeekFromDueDate(value));
    }
  }

  function selectWeek(week: number, scrollToDetail = false) {
    setLastViewedWeek(week);

    if (scrollToDetail) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("growth-week-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          backHref="/settings"
          backLabel="返回我的"
          kicker="孕 8–40 周"
          title="宝宝成长记"
        />

        <details className="group rounded-card border bg-card">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="icon-tile">
              <UserRound className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">个性化成长记</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {nickname || dueDate
                  ? `${babyName}${dueDate ? ` · 预产期 ${formatFullDate(dueDate)}` : ""}`
                  : "可选填昵称和医生确认的预产期"}
              </span>
            </span>
            <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <div className="grid gap-4 border-t border-border/70 p-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium" htmlFor="growth-nickname">
              宝宝昵称（选填）
              <Input
                autoComplete="off"
                id="growth-nickname"
                maxLength={20}
                onBlur={() => flushPendingProfileWrite()}
                onInput={(event) => setNickname(event.currentTarget.value)}
                placeholder="例如：小栗子"
                value={nickname}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="growth-due-date">
              预产期（选填）
              <Input
                id="growth-due-date"
                onChange={(event) => updateDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </label>
            <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
              请填写产科确认的日期。填写后会先定位到当前参考孕周，你仍可手动浏览其他周。
            </p>
          </div>
        </details>

        <section
          aria-labelledby="growth-week-heading"
          className="scroll-mt-6 hero-card"
          id="growth-week-detail"
        >
          <div className="grid gap-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                  <span className="rounded-full bg-card/75 px-2.5 py-1">
                    {current.trimester}
                  </span>
                  <span>{current.stage}</span>
                </p>
                <h2
                  className="mt-2 text-3xl font-bold tracking-tight"
                  id="growth-week-heading"
                >
                  孕 {current.week} 周
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {babyName}大约像{current.analogy}
                </p>
              </div>
              {projectedDate ? (
                <div className="rounded-2xl border border-card/80 bg-card/75 px-3 py-2 text-right">
                  <p className="text-xs text-muted-foreground">按预产期推算</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    约 {formatFullDate(projectedDate)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-card border border-card/80 bg-card/70 p-3">
              <GrowthAnalogyIllustration
                analogy={current.analogy}
                className={currentWeekPopping ? "sticker-pop" : undefined}
                week={current.week}
              />
              <p className="mt-1 text-center text-xs text-muted-foreground">
                原创示意，仅帮助理解大致尺度，不按真实比例
              </p>
            </div>

            <Button
              className="justify-self-center"
              onClick={() =>
                void shareText(
                  formatGrowthShareText(
                    current.week,
                    current.analogy,
                    packingPercent,
                  ),
                )
              }
              size="sm"
              variant="outline"
            >
              <Share2 />
              分享本周
            </Button>

            <div
              className={cn(
                "grid gap-3",
                current.referenceWeightG === undefined
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3",
              )}
            >
              <Metric
                icon={<Ruler />}
                label={`约${current.lengthBasis}`}
                value={`${current.lengthCm} cm`}
              />
              {current.referenceWeightG !== undefined ? (
                <Metric
                  icon={<Scale />}
                  label="参考中位估重"
                  value={formatWeight(current.referenceWeightG)}
                />
              ) : null}
              <Metric
                className={
                  current.referenceWeightG === undefined
                    ? "sm:col-span-1"
                    : "col-span-2 sm:col-span-1"
                }
                icon={<Sparkles />}
                label="较上周"
                value={describeGrowthSincePreviousWeek(current.week)}
              />
            </div>
            {current.referenceWeightG !== undefined ? (
              <p className="-mt-2 px-1 text-xs leading-5 text-muted-foreground">
                体重为 INTERGROWTH‑21st 群体超声估重中位参考，不是宝宝的实测值，也不能代替连续生长评估。
              </p>
            ) : null}

            <div className="rounded-2xl border border-card/75 bg-card/70 p-4">
              <h3 className="text-sm font-semibold">这周可能在发生</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {current.summary}
              </p>
            </div>
          </div>

          <div className="border-t border-card/70 bg-card/55 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-primary">
                <ClipboardCheck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">本周常见产检提醒</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {current.checkupReminder}
                </p>
              </div>
            </div>
            <Button
              aria-pressed={currentTaskDone}
              className="mt-4 w-full"
              onClick={() => toggleCompletedTask(current.checkupTaskId)}
              variant={currentTaskDone ? "secondary" : "default"}
            >
              {currentTaskDone ? <Check /> : <Circle />}
              {currentTaskDone ? "本周提醒已完成" : "标记本周提醒完成"}
            </Button>
          </div>
        </section>

        <section aria-label="切换孕周" className="rounded-card border bg-card p-4 sm:p-5">
          <p aria-live="polite" className="sr-only">
            正在查看孕 {current.week} 周
          </p>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Button
              aria-label="查看上一周"
              disabled={current.week === MIN_GROWTH_WEEK}
              onClick={() => selectWeek(current.week - 1)}
              size="icon"
              variant="outline"
            >
              <ChevronLeft />
            </Button>
            <label className="grid gap-1 text-center text-xs text-muted-foreground" htmlFor="growth-week-select">
              逐周切换
              <select
                className="h-11 w-full rounded-xl border border-input bg-card px-3 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                id="growth-week-select"
                onChange={(event) => selectWeek(Number(event.target.value))}
                value={current.week}
              >
                {GROWTH_WEEKS.map((entry) => (
                  <option key={entry.week} value={entry.week}>
                    孕 {entry.week} 周 · {entry.analogy}
                  </option>
                ))}
              </select>
            </label>
            <Button
              aria-label="查看下一周"
              disabled={current.week === MAX_GROWTH_WEEK}
              onClick={() => selectWeek(current.week + 1)}
              size="icon"
              variant="outline"
            >
              <ChevronRight />
            </Button>
          </div>
          {currentPregnancyWeek !== undefined &&
          current.week !== currentPregnancyWeek ? (
            <Button
              className="mt-3 w-full"
              onClick={() => selectWeek(currentPregnancyWeek, true)}
              size="sm"
              variant="secondary"
            >
              回到本周（孕 {currentPregnancyWeek} 周）
            </Button>
          ) : null}
          <label className="sr-only" htmlFor="growth-week-range">
            拖动选择孕周
          </label>
          <input
            aria-valuetext={`孕 ${current.week} 周`}
            className="mt-4 h-8 w-full cursor-pointer accent-primary"
            id="growth-week-range"
            max={MAX_GROWTH_WEEK}
            min={MIN_GROWTH_WEEK}
            onChange={(event) => selectWeek(Number(event.target.value))}
            type="range"
            value={current.week}
          />
          <div aria-hidden="true" className="flex justify-between text-xs text-muted-foreground">
            <span>8 周</span>
            <span>40 周</span>
          </div>
        </section>

        <section aria-labelledby="growth-timeline-title" className="grid gap-4">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-xs font-semibold text-primary">孕 8–40 周</p>
              <h2 className="mt-1 text-lg font-bold" id="growth-timeline-title">
                完整时间表
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              已完成 {completedTaskIds.length} 项，共 {GROWTH_WEEKS.length} 项
            </p>
          </div>

          {TIMELINE_GROUPS.map((trimester) => (
            <section
              aria-labelledby={`growth-${trimester}`}
              className="overflow-hidden rounded-card border bg-card"
              key={trimester}
            >
              <h3
                className="border-b border-border/70 bg-muted/45 px-5 py-3 text-sm font-semibold"
                id={`growth-${trimester}`}
              >
                {trimester}
              </h3>
              <ol className="divide-y divide-border/70">
                {GROWTH_WEEKS.filter(
                  (entry) => entry.trimester === trimester,
                ).map((entry) => {
                  const taskDone = completedTaskIds.includes(
                    entry.checkupTaskId,
                  );
                  const active = entry.week === current.week;
                  const entryDate = getProjectedGrowthWeekDate(
                    dueDate,
                    entry.week,
                  );

                  return (
                    <li
                      className={cn(
                        "flex min-h-[4.5rem] items-center gap-2 px-3 py-2",
                        active && "bg-secondary/35",
                      )}
                      key={entry.week}
                    >
                      <button
                        aria-current={active ? "step" : undefined}
                        className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 text-left transition-colors hover:bg-secondary/50"
                        onClick={() => selectWeek(entry.week, true)}
                        type="button"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold tabular-nums",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-muted text-foreground",
                          )}
                        >
                          {entry.week}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {entry.stage} · {entry.analogy}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {entryDate
                              ? `约 ${formatFullDate(entryDate)}`
                              : entry.checkupReminder}
                          </span>
                        </span>
                      </button>
                      <button
                        aria-label={`${taskDone ? "撤销" : "完成"}孕 ${entry.week} 周产检提醒`}
                        aria-pressed={taskDone}
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
                          taskDone
                            ? "border-primary bg-secondary text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => toggleCompletedTask(entry.checkupTaskId)}
                        type="button"
                      >
                        {taskDone ? (
                          <Check className="size-5" />
                        ) : (
                          <Circle className="size-5" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </section>

        <aside className="rounded-card border bg-card p-5" role="note">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-muted-foreground">
              {GROWTH_MEDICAL_DISCLAIMER}
            </p>
          </div>
        </aside>

        <section className="rounded-card border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">内容依据</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            以下权威资料用于核对孕周、估重和常见产检时间窗；页面文字均为简短概括，并非照搬原文或图像。医学安排以你的产科团队为准。
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            {GROWTH_SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  className="inline-flex min-h-11 items-center rounded-xl px-2 text-primary underline decoration-primary/35 underline-offset-4 hover:bg-secondary/50"
                  href={source.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {source.organization} · {source.title}
                  <span className="sr-only">（在新窗口打开）</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}

function Metric({
  className,
  icon,
  label,
  value,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-card/75 bg-card/75 p-3", className)}>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-5 tabular-nums">{value}</p>
    </div>
  );
}

function formatWeight(weightG: number) {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(2).replace(/0$/, "")} kg`;
  }

  return `${weightG} g`;
}

function formatFullDate(isoDate: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
