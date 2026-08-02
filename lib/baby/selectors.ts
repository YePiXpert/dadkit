import { localDayRange } from "@/lib/baby/date";
import { careEventSortTime, formatCareDuration, formatCareRelativeTime } from "@/lib/baby/time";
import type {
  BreastfeedingEvent,
  CareEvent,
  PumpingEvent,
  SleepEvent,
  TodayCareSummary,
} from "@/lib/baby/types";

export function effectiveCareEvents(events: readonly CareEvent[], clearedAt = 0) {
  return events.filter((event) => event.deletedAt === null && event.updatedAt > clearedAt);
}

export function calculateBreastfeedingDuration(event: BreastfeedingEvent, now = Date.now()) {
  return event.segments.reduce((total, segment) => {
    const start = Date.parse(segment.startAt);
    const end = segment.endAt === null ? now : Date.parse(segment.endAt);
    return total + (Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0);
  }, 0);
}

export function calculateSleepOverlap(
  event: SleepEvent,
  dayStart: number | Date,
  dayEnd: number | Date,
  now = Date.now(),
) {
  const rangeStart = dayStart instanceof Date ? dayStart.getTime() : dayStart;
  const rangeEnd = dayEnd instanceof Date ? dayEnd.getTime() : dayEnd;
  const start = Date.parse(event.startAt);
  const end = event.endAt === null ? now : Date.parse(event.endAt);
  if (![rangeStart, rangeEnd, start, end].every(Number.isFinite)) return 0;
  return Math.max(0, Math.min(end, rangeEnd) - Math.max(start, rangeStart));
}

export function getActiveBreastfeeding(events: readonly CareEvent[], clearedAt = 0) {
  return latestActive(events, "breastfeeding", clearedAt) as BreastfeedingEvent | undefined;
}

export function getActivePumping(events: readonly CareEvent[], clearedAt = 0) {
  return latestActive(events, "pumping", clearedAt) as PumpingEvent | undefined;
}

export function getActiveSleep(events: readonly CareEvent[], clearedAt = 0) {
  return latestActive(events, "sleep", clearedAt) as SleepEvent | undefined;
}

export function getLastFeedingEvent(events: readonly CareEvent[], clearedAt = 0) {
  return effectiveCareEvents(events, clearedAt)
    .filter((event) => event.type === "breastfeeding" || event.type === "bottle")
    .sort(compareEventsNewestFirst)[0];
}

export function deriveRecentCareEvents(
  events: readonly CareEvent[],
  now = Date.now(),
  hours = 24,
  clearedAt = 0,
) {
  const threshold = now - Math.max(0, hours) * 3_600_000;
  return effectiveCareEvents(events, clearedAt)
    .filter((event) => eventIsActive(event) || careEventSortTime(event) >= threshold)
    .sort(compareEventsNewestFirst);
}

export function deriveTodayCareSummary(
  events: readonly CareEvent[],
  localToday: Date | string = new Date(),
  options: { now?: number; clearedAt?: number } = {},
): TodayCareSummary {
  const date = typeof localToday === "string" ? new Date(`${localToday}T12:00:00`) : localToday;
  const { start, end } = localDayRange(date);
  const now = options.now ?? Date.now();
  const active = effectiveCareEvents(events, options.clearedAt ?? 0);
  const result: TodayCareSummary = {
    breastfeedingCount: 0,
    breastfeedingDurationMs: 0,
    breastmilkBottleCount: 0,
    breastmilkBottleMl: 0,
    formulaCount: 0,
    formulaMl: 0,
    pumpingCount: 0,
    pumpingRecordedAmountCount: 0,
    pumpingMl: 0,
    wetDiaperCount: 0,
    dirtyDiaperCount: 0,
    completedSleepCount: 0,
    sleepDurationMs: 0,
    sleeping: false,
    totalRecordCount: 0,
  };

  for (const event of active) {
    const timestamp = careEventSortTime(event);
    const startedToday = timestamp >= start && timestamp < end;
    if (startedToday) result.totalRecordCount += 1;

    if (event.type === "breastfeeding" && startedToday) {
      result.breastfeedingCount += 1;
      result.breastfeedingDurationMs += calculateBreastfeedingDuration(event, now);
    } else if (event.type === "bottle" && startedToday) {
      if (event.milkType === "breastmilk") {
        result.breastmilkBottleCount += 1;
        result.breastmilkBottleMl += event.amountMl;
      } else {
        result.formulaCount += 1;
        result.formulaMl += event.amountMl;
      }
    } else if (event.type === "pumping" && startedToday) {
      result.pumpingCount += 1;
      if (event.amountMl !== null) {
        result.pumpingRecordedAmountCount += 1;
        result.pumpingMl += event.amountMl;
      }
    } else if (event.type === "diaper" && startedToday) {
      if (event.kind === "wet" || event.kind === "both") result.wetDiaperCount += 1;
      if (event.kind === "dirty" || event.kind === "both") result.dirtyDiaperCount += 1;
    } else if (event.type === "sleep") {
      const overlap = calculateSleepOverlap(event, start, end, now);
      result.sleepDurationMs += overlap;
      if (event.endAt !== null) {
        const completedAt = Date.parse(event.endAt);
        if (completedAt >= start && completedAt < end) result.completedSleepCount += 1;
      }
      if (event.endAt === null) result.sleeping = true;
    }
  }
  return result;
}

/**
 * Keeps only the records needed to render one local-day summary. Timed sleep
 * records are selected by interval overlap so a sleep that started before
 * midnight is not lost. Other record types are counted by their start or
 * occurrence time, matching deriveTodayCareSummary().
 */
export function careEventsForLocalDay(
  events: readonly CareEvent[],
  localDay: Date | string = new Date(),
  now = Date.now(),
  clearedAt = 0,
) {
  const date = typeof localDay === "string" ? new Date(`${localDay}T12:00:00`) : localDay;
  const { start, end } = localDayRange(date);
  return effectiveCareEvents(events, clearedAt)
    .filter((event) => {
      if (event.type !== "sleep") {
        const occurredAt = careEventSortTime(event);
        return occurredAt >= start && occurredAt < end;
      }
      const sleepStart = Date.parse(event.startAt);
      const sleepEnd = event.endAt === null ? now : Date.parse(event.endAt);
      return sleepStart < end && sleepEnd > start;
    })
    .sort(compareEventsNewestFirst);
}

export function groupCareEventsByLocalDate(events: readonly CareEvent[], clearedAt = 0) {
  const groups = new Map<string, CareEvent[]>();
  for (const event of effectiveCareEvents(events, clearedAt).sort(compareEventsNewestFirst)) {
    const date = new Date(careEventSortTime(event));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  return groups;
}

export function compareEventsNewestFirst(left: CareEvent, right: CareEvent) {
  const difference = careEventSortTime(right) - careEventSortTime(left);
  return difference !== 0 ? difference : left.id.localeCompare(right.id);
}

function latestActive(events: readonly CareEvent[], type: CareEvent["type"], clearedAt: number) {
  return effectiveCareEvents(events, clearedAt)
    .filter((event) => event.type === type && eventIsActive(event))
    .sort(compareEventsNewestFirst)[0];
}

function eventIsActive(event: CareEvent) {
  return (event.type === "breastfeeding" || event.type === "pumping" || event.type === "sleep") && event.endAt === null;
}

export { formatCareDuration, formatCareRelativeTime };
