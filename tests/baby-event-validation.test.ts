import { describe, expect, it } from "vitest";

import { createEmptyBabyCare } from "@/lib/baby/defaults";
import { startBreastfeedingEvent } from "@/lib/baby/timers";
import type { CareEvent } from "@/lib/baby/types";
import { isBabyCarePortableData, isCareEvent } from "@/lib/baby/validation";

const base = {
  id: "care-1",
  note: "",
  recordedByMemberId: null,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
} as const;

describe("baby care event validation", () => {
  it("accepts valid events and milk amount boundaries", () => {
    expect(isCareEvent(startBreastfeedingEvent("left", 1, "2026-08-01T00:00:00.000Z", "feed-1"))).toBe(true);
    expect(isCareEvent({ ...base, type: "bottle", occurredAt: "2026-08-01T00:00:00.000Z", milkType: "formula", amountMl: 1 })).toBe(true);
    expect(isCareEvent({ ...base, type: "bottle", occurredAt: "2026-08-01T00:00:00.000Z", milkType: "formula", amountMl: 2000 })).toBe(true);
    expect(isCareEvent({ ...base, type: "pumping", startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-08-01T00:10:00.000Z", side: "both", amountMl: 0 })).toBe(true);
    expect(isCareEvent({ ...base, type: "pumping", startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-08-01T00:10:00.000Z", side: "both", amountMl: null })).toBe(true);
  });

  it("rejects overlapping or inconsistent breastfeeding segments", () => {
    const event = startBreastfeedingEvent("left", 1, "2026-08-01T00:00:00.000Z", "feed-1");
    event.endAt = "2026-08-01T00:10:00.000Z";
    event.segments = [
      { side: "left", startAt: "2026-08-01T00:00:00.000Z", endAt: "2026-08-01T00:08:00.000Z" },
      { side: "right", startAt: "2026-08-01T00:07:00.000Z", endAt: "2026-08-01T00:10:00.000Z" },
    ];
    expect(isCareEvent(event)).toBe(false);
    event.segments[1]!.startAt = "2026-08-01T00:08:00.000Z";
    event.startAt = "2026-08-01T00:01:00.000Z";
    expect(isCareEvent(event)).toBe(false);

    event.startAt = "2026-08-01T00:00:00.000Z";
    event.segments[0]!.endAt = null;
    expect(isCareEvent(event)).toBe(false);
  });

  it("rejects invalid ids, ISO strings, amounts, unknown fields and early sleep end", () => {
    expect(isCareEvent({ ...base, id: "__proto__", type: "diaper", occurredAt: "bad", kind: "wet" })).toBe(false);
    expect(isCareEvent({ ...base, type: "bottle", occurredAt: "2026-08-01T00:00:00.000Z", milkType: "formula", amountMl: 1.5 })).toBe(false);
    expect(isCareEvent({ ...base, type: "sleep", startAt: "2026-08-01T01:00:00.000Z", endAt: "2026-08-01T00:00:00.000Z" })).toBe(false);
    expect(isCareEvent({ ...base, type: "diaper", occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet", extra: true })).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const event = { ...base, type: "diaper", occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" } as CareEvent;
    expect(isBabyCarePortableData({ ...createEmptyBabyCare(), events: [event, { ...event }] })).toBe(false);
  });

  it("enforces deletion timestamps and the maximum collection size", () => {
    const event = { ...base, type: "diaper", occurredAt: "2026-08-01T00:00:00.000Z", kind: "wet" } as CareEvent;
    expect(isCareEvent({ ...event, updatedAt: 10, deletedAt: 9 })).toBe(false);
    expect(isCareEvent({ ...event, createdAt: 10, updatedAt: 9 })).toBe(false);
    expect(isBabyCarePortableData({ ...createEmptyBabyCare(), events: Array(25_001).fill(event) })).toBe(false);
  });
});
