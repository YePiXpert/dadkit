import { normalizeBabyText } from "@/lib/baby/validation";
import type {
  BreastSide,
  BreastfeedingEvent,
  CareEvent,
  PumpingEvent,
  PumpingFinishDraft,
  PumpingSide,
  SleepEvent,
} from "@/lib/baby/types";

export function newCareEventId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return `care-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  throw new Error("当前环境不支持安全随机数，无法创建宝宝记录。");
}

export function startBreastfeedingEvent(
  side: BreastSide,
  timestamp: number,
  iso = new Date(timestamp).toISOString(),
  id = newCareEventId(),
  recordedByMemberId: string | null = null,
): BreastfeedingEvent {
  return {
    id,
    type: "breastfeeding",
    note: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    recordedByMemberId,
    startAt: iso,
    endAt: null,
    segments: [{ side, startAt: iso, endAt: null }],
  };
}

export function switchBreastfeedingSide(
  event: BreastfeedingEvent,
  side: BreastSide,
  timestamp: number,
  iso = new Date(timestamp).toISOString(),
) {
  if (event.endAt !== null) throw new Error("亲喂记录已经结束。");
  const current = event.segments[event.segments.length - 1]!;
  if (current.side === side) return event;
  return {
    ...event,
    updatedAt: timestamp,
    segments: [
      ...event.segments.slice(0, -1).map((segment) => ({ ...segment })),
      { ...current, endAt: iso },
      { side, startAt: iso, endAt: null },
    ],
  } satisfies BreastfeedingEvent;
}

export function finishBreastfeedingEvent(
  event: BreastfeedingEvent,
  timestamp: number,
  note = event.note,
  iso = new Date(timestamp).toISOString(),
) {
  if (event.endAt !== null) return event;
  const current = event.segments[event.segments.length - 1]!;
  return {
    ...event,
    note: normalizeBabyText(note, true),
    updatedAt: timestamp,
    endAt: iso,
    segments: [
      ...event.segments.slice(0, -1).map((segment) => ({ ...segment })),
      { ...current, endAt: iso },
    ],
  } satisfies BreastfeedingEvent;
}

export function startPumpingEvent(
  side: PumpingSide,
  timestamp: number,
  iso = new Date(timestamp).toISOString(),
  id = newCareEventId(),
  recordedByMemberId: string | null = null,
): PumpingEvent {
  return {
    id,
    type: "pumping",
    note: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    recordedByMemberId,
    startAt: iso,
    endAt: null,
    side,
    amountMl: null,
  };
}

export function finishPumpingEvent(
  event: PumpingEvent,
  draft: PumpingFinishDraft,
  timestamp: number,
  iso = new Date(timestamp).toISOString(),
) {
  if (event.endAt !== null) return event;
  return {
    ...event,
    note: normalizeBabyText(draft.note, true),
    updatedAt: timestamp,
    endAt: iso,
    amountMl: draft.amountMl,
  } satisfies PumpingEvent;
}

export function startSleepEvent(
  timestamp: number,
  iso = new Date(timestamp).toISOString(),
  id = newCareEventId(),
  recordedByMemberId: string | null = null,
): SleepEvent {
  return {
    id,
    type: "sleep",
    note: "",
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    recordedByMemberId,
    startAt: iso,
    endAt: null,
  };
}

export function finishSleepEvent(
  event: SleepEvent,
  timestamp: number,
  note = event.note,
  iso = new Date(timestamp).toISOString(),
) {
  if (event.endAt !== null) return event;
  return {
    ...event,
    note: normalizeBabyText(note, true),
    updatedAt: timestamp,
    endAt: iso,
  } satisfies SleepEvent;
}

export function tombstoneCareEvent(event: CareEvent, timestamp: number): CareEvent {
  return { ...event, updatedAt: timestamp, deletedAt: timestamp } as CareEvent;
}
