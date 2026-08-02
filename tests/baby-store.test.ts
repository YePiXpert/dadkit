import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createEmptyBabyProfile } from "@/lib/baby/defaults";
import { MemoryBabyRepository, setBabyRepositoryForTests } from "@/lib/baby/repository";
import { useBabyStore } from "@/lib/baby/store";
import { durationBetween } from "@/lib/baby/time";
import type { CareEvent } from "@/lib/baby/types";

let repository: MemoryBabyRepository;

function resetStore() {
  useBabyStore.setState({
    hydrated: false,
    profile: createEmptyBabyProfile(),
    careClearedAt: 0,
    recentEvents: [],
    todayEvents: [],
    activeEvents: [],
    timelineEvents: [],
    loading: false,
    repositoryError: undefined,
    changeToken: 0,
  });
}

beforeEach(() => {
  repository = new MemoryBabyRepository();
  setBabyRepositoryForTests(repository);
  resetStore();
});

afterEach(() => {
  setBabyRepositoryForTests(undefined);
  resetStore();
});

describe("baby store", () => {
  it("persists timer actions, hydrates active timers and never ticks the change token", async () => {
    await useBabyStore.getState().hydrate();
    expect(useBabyStore.getState().changeToken).toBe(0);

    await useBabyStore.getState().saveProfile({ nickname: "满满", birthDate: "2026-08-01", birthTime: "08:30", sex: "girl" });
    expect(useBabyStore.getState().changeToken).toBe(1);
    await useBabyStore.getState().startBreastfeeding("left");
    expect(useBabyStore.getState().changeToken).toBe(2);

    const active = useBabyStore.getState().activeEvents[0];
    if (!active || active.type !== "breastfeeding") throw new Error("亲喂计时未创建");
    const tokenBeforeTick = useBabyStore.getState().changeToken;
    expect(durationBetween(active.startAt, null, Date.parse(active.startAt) + 60_000)).toBe(60_000);
    expect(useBabyStore.getState().changeToken).toBe(tokenBeforeTick);

    resetStore();
    await useBabyStore.getState().hydrate();
    expect(useBabyStore.getState().activeEvents.some((event) => event.type === "breastfeeding")).toBe(true);
    expect(useBabyStore.getState().changeToken).toBe(0);

    const sameSide = await useBabyStore.getState().switchBreastfeedingSide("left");
    expect(sameSide).toMatchObject({ ok: true, changed: false });
    expect(useBabyStore.getState().changeToken).toBe(0);
    await useBabyStore.getState().switchBreastfeedingSide("right");
    await useBabyStore.getState().finishBreastfeeding("完成");
    const finished = (await repository.getAllEventsForPortableExport())[0];
    expect(finished?.type === "breastfeeding" ? finished.segments : []).toHaveLength(2);
    expect(finished?.type === "breastfeeding" ? finished.endAt : null).not.toBeNull();
  });

  it("allows sleep and pumping together, then clears once without remote resurrection", async () => {
    await useBabyStore.getState().hydrate();
    await useBabyStore.getState().startSleep();
    await useBabyStore.getState().startPumping("both");
    expect(useBabyStore.getState().activeEvents.map((event) => event.type).sort()).toEqual(["pumping", "sleep"]);

    resetStore();
    await useBabyStore.getState().hydrate();
    expect(useBabyStore.getState().activeEvents.map((event) => event.type).sort()).toEqual(["pumping", "sleep"]);

    const oldData = await repository.getAllBabyData();
    const tokenBeforeClear = useBabyStore.getState().changeToken;
    const result = await useBabyStore.getState().clearAllBabyData();
    expect(result.ok).toBe(true);
    expect(useBabyStore.getState().changeToken).toBe(tokenBeforeClear + 1);
    const clearedAt = useBabyStore.getState().careClearedAt;
    expect(clearedAt).toBeGreaterThan(Math.max(...oldData.care.events.map((event) => event.updatedAt)));

    const tokenBeforeRemote = useBabyStore.getState().changeToken;
    await useBabyStore.getState().applyRemoteBabyData(oldData);
    expect((await repository.getAllBabyData()).care.events).toEqual([]);
    expect(useBabyStore.getState().changeToken).toBe(tokenBeforeRemote);
  });

  it("updates state only after a repository write succeeds", async () => {
    await useBabyStore.getState().hydrate();
    repository.failNextWrite = true;
    const token = useBabyStore.getState().changeToken;
    const result = await useBabyStore.getState().addDiaperRecord({
      occurredAt: new Date().toISOString(),
      kind: "wet",
      note: "",
    });
    expect(result.ok).toBe(false);
    expect(useBabyStore.getState().changeToken).toBe(token);
    expect(useBabyStore.getState().recentEvents).toEqual([]);
  });

  it("keeps every event needed for today's summary even when recent history is capped", async () => {
    const occurredAt = new Date(new Date().setHours(12, 0, 0, 0)).toISOString();
    const events: CareEvent[] = Array.from({ length: 250 }, (_, index) => ({
      id: `today-${index}`,
      type: "diaper",
      note: "",
      createdAt: index + 1,
      updatedAt: index + 1,
      deletedAt: null,
      occurredAt,
      kind: "wet",
    }));
    await repository.putEvents(events);
    await useBabyStore.getState().hydrate();
    expect(useBabyStore.getState().recentEvents).toHaveLength(200);
    expect(useBabyStore.getState().todayEvents).toHaveLength(250);
  });

  it("refreshes loaded timeline rows after edit and deletion", async () => {
    const occurredAt = new Date().toISOString();
    const event: CareEvent = {
      id: "timeline-event",
      type: "diaper",
      note: "原备注",
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      occurredAt,
      kind: "wet",
    };
    await repository.putEvent(event);
    await useBabyStore.getState().hydrate();
    await useBabyStore.getState().loadTimelineRange(Date.parse(occurredAt) - 1, Date.parse(occurredAt) + 1);
    await useBabyStore.getState().updateEvent(event.id, { ...event, note: "新备注" });
    expect(useBabyStore.getState().timelineEvents[0]?.note).toBe("新备注");
    await useBabyStore.getState().deleteEvent(event.id);
    expect(useBabyStore.getState().timelineEvents[0]?.deletedAt).not.toBeNull();
  });
});
