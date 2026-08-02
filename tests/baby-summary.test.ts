import { describe, expect, it } from "vitest";

import { deriveRecentCareEvents, deriveTodayCareSummary } from "@/lib/baby/selectors";
import type { CareEvent } from "@/lib/baby/types";

const base = (id: string, updatedAt: number) => ({ id, note: "", createdAt: updatedAt, updatedAt, deletedAt: null }) as const;

describe("baby today summary", () => {
  it("counts feeding, pumping and both diaper kinds", () => {
    const events: CareEvent[] = [
      { ...base("feed", 1), type: "breastfeeding", startAt: "2026-08-01T01:00:00.000Z", endAt: "2026-08-01T01:10:00.000Z", segments: [{ side: "left", startAt: "2026-08-01T01:00:00.000Z", endAt: "2026-08-01T01:10:00.000Z" }] },
      { ...base("milk", 2), type: "bottle", occurredAt: "2026-08-01T02:00:00.000Z", milkType: "breastmilk", amountMl: 60 },
      { ...base("formula", 3), type: "bottle", occurredAt: "2026-08-01T03:00:00.000Z", milkType: "formula", amountMl: 30 },
      { ...base("pump", 4), type: "pumping", startAt: "2026-08-01T04:00:00.000Z", endAt: "2026-08-01T04:10:00.000Z", side: "both", amountMl: null },
      { ...base("diaper", 5), type: "diaper", occurredAt: "2026-08-01T05:00:00.000Z", kind: "both" },
    ];
    const summary = deriveTodayCareSummary(events, "2026-08-01", { now: Date.parse("2026-08-01T12:00:00.000Z") });
    expect(summary).toMatchObject({ breastfeedingCount: 1, breastfeedingDurationMs: 600_000, breastmilkBottleMl: 60, formulaMl: 30, pumpingCount: 1, pumpingRecordedAmountCount: 0, wetDiaperCount: 1, dirtyDiaperCount: 1 });
  });

  it("counts only the sleep overlap with today and active sleep up to now", () => {
    const events: CareEvent[] = [
      { ...base("sleep", 1), type: "sleep", startAt: "2026-07-31T23:00:00.000Z", endAt: "2026-08-01T02:00:00.000Z" },
      { ...base("active", 2), type: "sleep", startAt: "2026-08-01T10:00:00.000Z", endAt: null },
    ];
    const summary = deriveTodayCareSummary(events, "2026-08-01", { now: Date.parse("2026-08-01T11:00:00.000Z") });
    // Device-local Aug 1 includes three hours from the cross-midnight sleep
    // plus one hour from the active sleep in Asia/Shanghai.
    expect(summary.sleepDurationMs).toBe(4 * 3_600_000);
    expect(summary.completedSleepCount).toBe(1);
    expect(summary.sleeping).toBe(true);
  });

  it("excludes deleted and cleared records without mutating input", () => {
    const events: CareEvent[] = [
      { ...base("old", 10), type: "diaper", occurredAt: "2026-08-01T05:00:00.000Z", kind: "wet" },
      { ...base("deleted", 30), deletedAt: 30, type: "diaper", occurredAt: "2026-08-01T06:00:00.000Z", kind: "dirty" },
    ];
    const before = structuredClone(events);
    expect(deriveTodayCareSummary(events, "2026-08-01", { clearedAt: 20 }).totalRecordCount).toBe(0);
    expect(deriveRecentCareEvents(events, Date.parse("2026-08-01T12:00:00.000Z"), 24, 20)).toEqual([]);
    expect(events).toEqual(before);
  });

  it("handles 10,000 events within a practical unit-test budget", () => {
    const events: CareEvent[] = Array.from({ length: 10_000 }, (_, index) => ({ ...base(`event-${index}`, index + 1), type: "diaper", occurredAt: "2026-08-01T05:00:00.000Z", kind: index % 2 ? "wet" : "dirty" }));
    const started = performance.now();
    expect(deriveTodayCareSummary(events, "2026-08-01").totalRecordCount).toBe(10_000);
    expect(performance.now() - started).toBeLessThan(1_500);
  });
});
