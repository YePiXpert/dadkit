import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import {
  estimateSyncClockOffset,
  getSyncAdjustedNow,
  getSyncClockTimelineInitialized,
  saveSyncClockOffset,
  saveSyncClockTimelineInitialized,
} from "@/lib/sync-clock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync clock correction", () => {
  it("persists a server offset and marks a local timeline only once", () => {
    installBrowserStorage();

    expect(estimateSyncClockOffset("2026-07-30T01:00:00.000Z", 0)).toBe(
      Date.parse("2026-07-30T01:00:00.000Z"),
    );
    saveSyncClockOffset(3_600_000);
    expect(getSyncAdjustedNow(100)).toBe(3_600_100);
    expect(getSyncClockTimelineInitialized()).toBe(false);

    saveSyncClockTimelineInitialized(true);
    expect(getSyncClockTimelineInitialized()).toBe(true);
  });
});
