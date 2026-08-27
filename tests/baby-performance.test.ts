import { describe, expect, it } from "vitest";

import { createEmptyBabyCare } from "@/lib/baby/defaults";
import { mergeBabyCare } from "@/lib/baby/merge";
import { cloneBabyCare } from "@/lib/baby/portable";
import { deriveRecentCareEvents, deriveTodayCareSummary } from "@/lib/baby/selectors";
import type { CareEvent } from "@/lib/baby/types";
import { isBabyCarePortableData } from "@/lib/baby/validation";
import { calculateChecksum } from "@/lib/checksum";

const now = new Date();
now.setHours(12, 0, 0, 0);
const occurredAt = now.toISOString();
const events: CareEvent[] = Array.from({ length: 10_000 }, (_, index) => ({
  id: `performance-${String(index).padStart(5, "0")}`,
  type: "diaper",
  note: index % 10 === 0 ? "性能样本" : "",
  createdAt: index + 1,
  updatedAt: index + 1,
  deletedAt: null,
  recordedByMemberId: null,
  occurredAt,
  kind: index % 3 === 0 ? "both" : index % 2 === 0 ? "wet" : "dirty",
}));

function withinBudget<T>(operation: () => T, milliseconds = 2_500) {
  const started = performance.now();
  const result = operation();
  expect(performance.now() - started).toBeLessThan(milliseconds);
  return result;
}

describe("10,000 baby event performance", () => {
  it("strictly validates the collection", () => {
    expect(withinBudget(() => isBabyCarePortableData({ version: 2, clearedAt: 0, events }))).toBe(true);
  });

  it("merges two offline halves into one stable collection", () => {
    const local = { ...createEmptyBabyCare(), events: events.slice(0, 5_000) };
    const remote = { ...createEmptyBabyCare(), events: events.slice(5_000) };
    const merged = withinBudget(() => mergeBabyCare(local, remote));
    expect(merged.events).toHaveLength(10_000);
    expect(merged.events[0]?.id).toBe("performance-00000");
  });

  it("derives today's summary", () => {
    const summary = withinBudget(() => deriveTodayCareSummary(events, now, { now: now.getTime() }));
    expect(summary.totalRecordCount).toBe(10_000);
  });

  it("derives the recent seven-day timeline", () => {
    const recent = withinBudget(() => deriveRecentCareEvents(events, now.getTime(), 24 * 7));
    expect(recent).toHaveLength(10_000);
  });

  it("produces a stable checksum after id sorting", () => {
    const forward = withinBudget(() => cloneBabyCare({ version: 2, clearedAt: 0, events }));
    const reverse = withinBudget(() => cloneBabyCare({ version: 2, clearedAt: 0, events: [...events].reverse() }));
    const first = withinBudget(() => calculateChecksum(forward));
    const second = withinBudget(() => calculateChecksum(reverse));
    expect(second).toBe(first);
  });
});
