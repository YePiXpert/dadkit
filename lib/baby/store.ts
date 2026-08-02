"use client";

import { create } from "zustand";

import { loadDeviceIdentity } from "@/lib/device-identity/repository";
import { loadHousehold } from "@/lib/household/repository";
import { resolveHouseholdMember } from "@/lib/household/selectors";
import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { mergeBabyData } from "@/lib/baby/merge";
import { cloneCareEvent, latestBabyTimestamp, updateBabyProfileValues } from "@/lib/baby/portable";
import { getBabyRepository } from "@/lib/baby/repository";
import {
  careEventsForLocalDay,
  getActiveBreastfeeding,
  getActivePumping,
  getActiveSleep,
} from "@/lib/baby/selectors";
import {
  finishBreastfeedingEvent,
  finishPumpingEvent,
  finishSleepEvent,
  newCareEventId,
  startBreastfeedingEvent,
  startPumpingEvent,
  startSleepEvent,
  switchBreastfeedingSide as switchSide,
} from "@/lib/baby/timers";
import type {
  BabyPortableData,
  BabyProfileDraft,
  BabyProfilePortableData,
  BottleRecordDraft,
  BreastSide,
  CareActionResult,
  CareEvent,
  DiaperRecordDraft,
  PumpingFinishDraft,
  PumpingSide,
} from "@/lib/baby/types";
import {
  isBabyPortableData,
  isCareEvent,
  normalizeBabyText,
  validateBabyProfileDraft,
} from "@/lib/baby/validation";
import { getSyncAdjustedNow } from "@/lib/sync-clock";

type BabyState = {
  hydrated: boolean;
  profile: BabyProfilePortableData;
  careClearedAt: number;
  recentEvents: CareEvent[];
  todayEvents: CareEvent[];
  activeEvents: CareEvent[];
  timelineEvents: CareEvent[];
  loading: boolean;
  repositoryError?: string;
  changeToken: number;
  hydrate(): Promise<void>;
  saveProfile(draft: BabyProfileDraft): Promise<CareActionResult>;
  clearProfile(): Promise<CareActionResult>;
  clearAllBabyData(): Promise<CareActionResult>;
  startBreastfeeding(side: BreastSide, recordedByMemberId?: string | null): Promise<CareActionResult>;
  switchBreastfeedingSide(side: BreastSide): Promise<CareActionResult>;
  finishBreastfeeding(note?: string): Promise<CareActionResult>;
  addBottleRecord(draft: BottleRecordDraft, recordedByMemberId?: string | null): Promise<CareActionResult>;
  startPumping(side: PumpingSide, recordedByMemberId?: string | null): Promise<CareActionResult>;
  finishPumping(draft: PumpingFinishDraft): Promise<CareActionResult>;
  addDiaperRecord(draft: DiaperRecordDraft, recordedByMemberId?: string | null): Promise<CareActionResult>;
  startSleep(recordedByMemberId?: string | null): Promise<CareActionResult>;
  finishSleep(note?: string): Promise<CareActionResult>;
  createManualEvent(event: CareEvent, recordedByMemberId?: string | null): Promise<CareActionResult>;
  updateEvent(eventId: string, event: CareEvent): Promise<CareActionResult>;
  deleteEvent(eventId: string): Promise<CareActionResult>;
  loadRecentEvents(): Promise<void>;
  loadTimelineRange(start: number, end: number): Promise<CareEvent[]>;
  applyRemoteBabyData(data: BabyPortableData): Promise<void>;
};

const ok = (changed = true): CareActionResult => ({ ok: true, changed });
const fail = (message: string): CareActionResult => ({ ok: false, changed: false, message });

export const useBabyStore = create<BabyState>((set, get) => ({
  hydrated: false,
  profile: createEmptyBabyProfile(),
  careClearedAt: 0,
  recentEvents: [],
  todayEvents: [],
  activeEvents: [],
  timelineEvents: [],
  loading: false,
  changeToken: 0,

  hydrate: async () => {
    if (get().hydrated || get().loading) return;
    set({ loading: true, repositoryError: undefined });
    try {
      const data = await getBabyRepository().getAllBabyData();
      set({
        hydrated: true,
        loading: false,
        profile: data.profile,
        careClearedAt: data.care.clearedAt,
        recentEvents: activeRecent(data),
        todayEvents: activeToday(data),
        activeEvents: activeOnly(data),
      });
    } catch (error) {
      set({
        hydrated: true,
        loading: false,
        repositoryError: errorMessage(error),
      });
    }
  },

  saveProfile: async (draft) => {
    const validation = validateBabyProfileDraft(draft, { requireBirthDate: true });
    if (!validation.ok) return fail(Object.values(validation.errors)[0] ?? "宝宝资料无效。");
    return write(async () => {
      const repository = getBabyRepository();
      const data = await repository.getAllBabyData();
      const timestamp = await nextTimestamp(data);
      const updated = updateBabyProfileValues(data.profile, validation.values, timestamp);
      if (!updated.changed) return ok(false);
      await repository.saveBabyProfile(updated.profile);
      set((state) => ({ profile: updated.profile, changeToken: state.changeToken + 1 }));
      return ok();
    });
  },

  clearProfile: async () => write(async () => {
    const repository = getBabyRepository();
    const data = await repository.getAllBabyData();
    const timestamp = await nextTimestamp(data);
    const profile = createEmptyBabyProfile(timestamp);
    await repository.saveBabyProfile(profile);
    set((state) => ({ profile, changeToken: state.changeToken + 1 }));
    return ok();
  }),

  clearAllBabyData: async () => write(async () => {
    const repository = getBabyRepository();
    const data = await repository.getAllBabyData();
    const timestamp = await nextTimestamp(data);
    await repository.clearAllBabyData(timestamp);
    set((state) => ({
      profile: createEmptyBabyProfile(timestamp),
      careClearedAt: timestamp,
      recentEvents: [],
      todayEvents: [],
      activeEvents: [],
      timelineEvents: [],
      changeToken: state.changeToken + 1,
    }));
    return ok();
  }),

  startBreastfeeding: async (side, recordedByMemberId) => writeEvent(async (data, timestamp) => {
    if (getActiveBreastfeeding(data.care.events, data.care.clearedAt)) return fail("已有正在进行的亲喂记录。");
    return startBreastfeedingEvent(side, timestamp, undefined, undefined, resolveRecorder(recordedByMemberId));
  }),

  switchBreastfeedingSide: async (side) => writeEvent(async (data, timestamp) => {
    const event = getActiveBreastfeeding(data.care.events, data.care.clearedAt);
    if (!event) return fail("没有正在进行的亲喂记录。");
    const next = switchSide(event, side, timestamp);
    return next === event ? ok(false) : next;
  }),

  finishBreastfeeding: async (note) => writeEvent(async (data, timestamp) => {
    const event = getActiveBreastfeeding(data.care.events, data.care.clearedAt);
    return event ? finishBreastfeedingEvent(event, timestamp, note ?? event.note) : fail("没有正在进行的亲喂记录。");
  }),

  addBottleRecord: async (draft, recordedByMemberId) => writeEvent(async (_data, timestamp) => {
    const event: CareEvent = {
      id: newCareEventId(),
      type: "bottle",
      note: normalizeBabyText(draft.note, true),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      recordedByMemberId: resolveRecorder(recordedByMemberId),
      occurredAt: draft.occurredAt,
      milkType: draft.milkType,
      amountMl: draft.amountMl,
    };
    return isCareEvent(event) ? event : fail("瓶喂记录无效，请检查时间和奶量。");
  }),

  startPumping: async (side, recordedByMemberId) => writeEvent(async (data, timestamp) => {
    if (getActivePumping(data.care.events, data.care.clearedAt)) return fail("已有正在进行的吸奶记录。");
    return startPumpingEvent(side, timestamp, undefined, undefined, resolveRecorder(recordedByMemberId));
  }),

  finishPumping: async (draft) => writeEvent(async (data, timestamp) => {
    const event = getActivePumping(data.care.events, data.care.clearedAt);
    if (!event) return fail("没有正在进行的吸奶记录。");
    const next = finishPumpingEvent(event, draft, timestamp);
    return isCareEvent(next) ? next : fail("吸奶记录无效，请检查奶量。");
  }),

  addDiaperRecord: async (draft, recordedByMemberId) => writeEvent(async (_data, timestamp) => {
    const event: CareEvent = {
      id: newCareEventId(),
      type: "diaper",
      note: normalizeBabyText(draft.note, true),
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      recordedByMemberId: resolveRecorder(recordedByMemberId),
      occurredAt: draft.occurredAt,
      kind: draft.kind,
    };
    return isCareEvent(event) ? event : fail("尿布记录无效，请检查时间。");
  }),

  startSleep: async (recordedByMemberId) => writeEvent(async (data, timestamp) => {
    if (getActiveSleep(data.care.events, data.care.clearedAt)) return fail("宝宝已经在睡眠计时中。");
    return startSleepEvent(timestamp, undefined, undefined, resolveRecorder(recordedByMemberId));
  }),

  finishSleep: async (note) => writeEvent(async (data, timestamp) => {
    const event = getActiveSleep(data.care.events, data.care.clearedAt);
    return event ? finishSleepEvent(event, timestamp, note ?? event.note) : fail("没有正在进行的睡眠记录。");
  }),

  createManualEvent: async (event, recordedByMemberId) => writeEvent(async (_data, timestamp) => {
    const next = { ...cloneCareEvent(event), id: newCareEventId(), note: normalizeBabyText(event.note, true), createdAt: timestamp, updatedAt: timestamp, deletedAt: null, recordedByMemberId: resolveRecorder(recordedByMemberId) } as CareEvent;
    return isCareEvent(next) ? next : fail("照护记录无效。");
  }),

  updateEvent: async (eventId, draft) => writeEvent(async (data, timestamp) => {
    const current = data.care.events.find((event) => event.id === eventId);
    if (!current || current.deletedAt !== null) return fail("没有找到这条记录。");
    if (draft.id !== eventId || draft.type !== current.type) return fail("不能修改记录标识或类型。");
    const next = { ...cloneCareEvent(draft), id: current.id, type: current.type, createdAt: current.createdAt, updatedAt: timestamp, deletedAt: null } as CareEvent;
    return isCareEvent(next) ? next : fail("修改后的记录无效。");
  }),

  deleteEvent: async (eventId) => write(async () => {
    const repository = getBabyRepository();
    const data = await repository.getAllBabyData();
    const current = data.care.events.find((event) => event.id === eventId);
    if (!current) return fail("没有找到这条记录。");
    const timestamp = await nextTimestamp(data, current.updatedAt);
    const deleted = await repository.deleteEventAsTombstone(eventId, timestamp);
    if (!deleted) return fail("没有找到这条记录。");
    await refreshEventState(true);
    return ok();
  }),

  loadRecentEvents: async () => { await refreshEventState(false); },

  loadTimelineRange: async (start, end) => {
    try {
      const events = await getBabyRepository().getEventsByRange(start, end);
      set({ timelineEvents: events, repositoryError: undefined });
      return events;
    } catch (error) {
      set({ repositoryError: errorMessage(error) });
      return [];
    }
  },

  applyRemoteBabyData: async (remote) => {
    if (!isBabyPortableData(remote)) throw new Error("远端宝宝数据无效。");
    const repository = getBabyRepository();
    const local = await repository.getAllBabyData();
    const merged = mergeBabyData(local, remote);
    await repository.replaceBabyDataTransaction(merged);
    set((state) => ({
      profile: merged.profile,
      careClearedAt: merged.care.clearedAt,
      recentEvents: activeRecent(merged),
      todayEvents: activeToday(merged),
      activeEvents: activeOnly(merged),
      timelineEvents: refreshLoadedTimeline(state.timelineEvents, merged),
      repositoryError: undefined,
    }));
  },
}));

async function writeEvent(
  build: (data: BabyPortableData, timestamp: number) => Promise<CareEvent | CareActionResult> | CareEvent | CareActionResult,
) {
  return write(async () => {
    const repository = getBabyRepository();
    const data = await repository.getAllBabyData();
    const timestamp = await nextTimestamp(data);
    const built = await build(data, timestamp);
    if ("ok" in built) return built;
    if (!isCareEvent(built)) return fail("照护记录格式无效。");
    await repository.putEvent(built);
    await refreshEventState(true);
    return ok();
  });
}

async function refreshEventState(changed: boolean) {
  const repository = getBabyRepository();
  const data = await repository.getAllBabyData();
  useBabyStore.setState((state) => ({
    profile: data.profile,
    careClearedAt: data.care.clearedAt,
    recentEvents: activeRecent(data),
    todayEvents: activeToday(data),
    activeEvents: activeOnly(data),
    timelineEvents: refreshLoadedTimeline(state.timelineEvents, data),
    repositoryError: undefined,
    changeToken: changed ? state.changeToken + 1 : state.changeToken,
  }));
}

async function write(operation: () => Promise<CareActionResult>) {
  try {
    const result = await operation();
    if (!result.ok && result.message) useBabyStore.setState({ repositoryError: result.message });
    else useBabyStore.setState({ repositoryError: undefined });
    return result;
  } catch (error) {
    const message = errorMessage(error);
    useBabyStore.setState({ repositoryError: message });
    return fail(message);
  }
}

async function nextTimestamp(data: BabyPortableData, targetTimestamp = 0) {
  return Math.max(getSyncAdjustedNow() + 1, latestBabyTimestamp(data) + 1, targetTimestamp + 1, data.profile.clearedAt + 1, data.care.clearedAt + 1);
}

function activeRecent(data: BabyPortableData) {
  return data.care.events
    .filter((event) => event.deletedAt === null && event.updatedAt > data.care.clearedAt)
    .sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
    .slice(0, 200)
    .map(cloneCareEvent);
}

function activeOnly(data: BabyPortableData) {
  return data.care.events
    .filter((event) => event.deletedAt === null && event.updatedAt > data.care.clearedAt)
    .filter((event) => (event.type === "breastfeeding" || event.type === "pumping" || event.type === "sleep") && event.endAt === null)
    .map(cloneCareEvent);
}

function activeToday(data: BabyPortableData) {
  return careEventsForLocalDay(
    data.care.events,
    new Date(),
    Date.now(),
    data.care.clearedAt,
  ).map(cloneCareEvent);
}

function refreshLoadedTimeline(current: CareEvent[], data: BabyPortableData) {
  const latest = new Map(data.care.events.map((event) => [event.id, event]));
  return current.map((event) => cloneCareEvent(latest.get(event.id) ?? event));
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : "宝宝记录保存失败，请重试。";
}

function resolveRecorder(explicitMemberId?: string | null) {
  const memberId = explicitMemberId === undefined
    ? loadDeviceIdentity().currentMemberId
    : explicitMemberId;
  if (!memberId) return null;
  const member = resolveHouseholdMember(loadHousehold(), memberId);
  return member && !member.deleted.value ? memberId : null;
}
