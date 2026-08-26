import {
  calculateBreastfeedingDuration,
  getActiveBreastfeeding,
  getActivePumping,
  getActiveSleep,
} from "@/lib/baby/selectors";
import { durationBetween } from "@/lib/baby/time";
import type { CareEvent } from "@/lib/baby/types";

export type ActiveCareTimerKind = "breastfeeding" | "pumping" | "sleep";

export type ActiveCareTimer = {
  kind: ActiveCareTimerKind;
  label: string;
  durationMs: number;
  startedAt: number;
};

function safeStartedAt(startAt: string) {
  const parsed = Date.parse(startAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 汇总当前正在进行的照护计时，供全局迷你计时条展示。 */
export function deriveActiveCareTimers(
  events: readonly CareEvent[],
  clearedAt = 0,
  now = Date.now(),
): ActiveCareTimer[] {
  const timers: ActiveCareTimer[] = [];

  const breastfeeding = getActiveBreastfeeding(events, clearedAt);
  if (breastfeeding) {
    const currentSide = breastfeeding.segments.at(-1)?.side;
    timers.push({
      kind: "breastfeeding",
      label:
        currentSide === "left"
          ? "亲喂·左侧"
          : currentSide === "right"
            ? "亲喂·右侧"
            : "亲喂",
      durationMs: calculateBreastfeedingDuration(breastfeeding, now),
      startedAt: safeStartedAt(breastfeeding.startAt),
    });
  }

  const pumping = getActivePumping(events, clearedAt);
  if (pumping) {
    timers.push({
      kind: "pumping",
      label: "吸奶",
      durationMs: durationBetween(pumping.startAt, null, now),
      startedAt: safeStartedAt(pumping.startAt),
    });
  }

  const sleep = getActiveSleep(events, clearedAt);
  if (sleep) {
    timers.push({
      kind: "sleep",
      label: "睡眠",
      durationMs: durationBetween(sleep.startAt, null, now),
      startedAt: safeStartedAt(sleep.startAt),
    });
  }

  return timers.sort((left, right) => left.startedAt - right.startedAt);
}