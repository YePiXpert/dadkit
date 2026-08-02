import { describe, expect, it } from "vitest";

import {
  finishBreastfeedingEvent,
  finishSleepEvent,
  startBreastfeedingEvent,
  startSleepEvent,
  switchBreastfeedingSide,
} from "@/lib/baby/timers";
import { durationBetween } from "@/lib/baby/time";

describe("baby care timers", () => {
  it("creates, switches and finishes one breastfeeding event", () => {
    const started = startBreastfeedingEvent("left", 1, "2026-08-01T00:00:00.000Z", "feed-1");
    const same = switchBreastfeedingSide(started, "left", 2, "2026-08-01T00:01:00.000Z");
    expect(same).toBe(started);
    const switched = switchBreastfeedingSide(started, "right", 3, "2026-08-01T00:05:00.000Z");
    expect(switched.segments).toHaveLength(2);
    const finished = finishBreastfeedingEvent(switched, 4, "完成", "2026-08-01T00:10:00.000Z");
    expect(finished.endAt).toBe("2026-08-01T00:10:00.000Z");
    expect(finished.segments.at(-1)?.endAt).toBe(finished.endAt);
  });

  it("persists only timestamps and derives duration after restart", () => {
    const sleep = startSleepEvent(1, "2026-08-01T00:00:00.000Z", "sleep-1");
    const serialized = JSON.parse(JSON.stringify(sleep));
    expect(durationBetween(serialized.startAt, serialized.endAt, Date.parse("2026-08-01T01:00:00.000Z"))).toBe(3_600_000);
    expect(finishSleepEvent(sleep, 2, "", "2026-08-01T02:00:00.000Z").endAt).toBe("2026-08-01T02:00:00.000Z");
  });

  it("clamps negative display duration to zero", () => {
    expect(durationBetween("2026-08-01T01:00:00.000Z", null, Date.parse("2026-08-01T00:00:00.000Z"))).toBe(0);
  });
});
