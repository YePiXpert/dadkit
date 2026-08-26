import { describe, expect, it } from "vitest";

import { deriveActiveCareTimers } from "@/lib/baby/active-timers";
import {
  finishSleepEvent,
  startBreastfeedingEvent,
  startPumpingEvent,
  startSleepEvent,
  switchBreastfeedingSide,
} from "@/lib/baby/timers";

const T0 = Date.parse("2026-08-20T00:00:00.000Z");

describe("deriveActiveCareTimers", () => {
  it("returns nothing when no timer is running", () => {
    const finished = finishSleepEvent(
      startSleepEvent(T0, "2026-08-20T00:00:00.000Z", "sleep-1"),
      T0 + 600_000,
      "",
      "2026-08-20T00:10:00.000Z",
    );
    expect(deriveActiveCareTimers([finished], 0, T0 + 900_000)).toEqual([]);
  });

  it("labels the current breastfeeding side and totals segments", () => {
    let event = startBreastfeedingEvent("left", T0, "2026-08-20T00:00:00.000Z", "feed-1");
    event = switchBreastfeedingSide(event, "right", T0 + 300_000, "2026-08-20T00:05:00.000Z");

    const timers = deriveActiveCareTimers([event], 0, T0 + 600_000);
    expect(timers).toHaveLength(1);
    expect(timers[0]).toMatchObject({
      kind: "breastfeeding",
      label: "亲喂·右侧",
      durationMs: 600_000,
      startedAt: T0,
    });
  });

  it("lists concurrent timers oldest first", () => {
    const sleep = startSleepEvent(T0, "2026-08-20T00:00:00.000Z", "sleep-1");
    const pumping = startPumpingEvent("both", T0 + 60_000, "2026-08-20T00:01:00.000Z", "pump-1");

    const timers = deriveActiveCareTimers([pumping, sleep], 0, T0 + 600_000);
    expect(timers.map((timer) => timer.kind)).toEqual(["sleep", "pumping"]);
    expect(timers[0].durationMs).toBe(600_000);
    expect(timers[1].durationMs).toBe(540_000);
  });

  it("hides events cleared by an older clearAll marker", () => {
    const stale = startSleepEvent(T0, "2026-08-20T00:00:00.000Z", "sleep-1");
    expect(deriveActiveCareTimers([stale], T0 + 1, T0 + 600_000)).toEqual([]);
  });
});