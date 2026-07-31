import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import {
  estimateSyncClockOffset,
  getSyncAdjustedNow,
  getSyncClockTimelineInitialized,
  saveSyncClockOffset,
  saveSyncClockTimelineInitialized,
  MAX_SYNC_CLOCK_OFFSET_MS,
} from "@/lib/sync-clock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync clock correction", () => {
  it("persists a server offset and marks a local timeline only once", () => {
    installBrowserStorage();

    expect(estimateSyncClockOffset("1970-01-01T01:00:00.000Z", 0)).toBe(
      3_600_000,
    );
    saveSyncClockOffset(3_600_000);
    expect(getSyncAdjustedNow(100)).toBe(3_600_100);
    expect(getSyncClockTimelineInitialized()).toBe(false);

    saveSyncClockTimelineInitialized(true);
    expect(getSyncClockTimelineInitialized()).toBe(true);
  });

  it("uses the request midpoint and clamps implausible offsets", () => {
    expect(
      estimateSyncClockOffset("1970-01-01T00:00:01.000Z", 200, 0),
    ).toBe(900);
    expect(
      estimateSyncClockOffset("2100-01-01T00:00:00.000Z", 200, 0),
    ).toBe(MAX_SYNC_CLOCK_OFFSET_MS);
    expect(
      estimateSyncClockOffset("1970-01-01T00:00:00.000Z", 100, 200),
    ).toBeUndefined();
  });
});
