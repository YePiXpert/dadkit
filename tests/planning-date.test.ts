import { describe, expect, it } from "vitest";

import {
  getLocalPlanningDate,
  isPlanningDate,
  planningDaysFromToday,
} from "@/lib/planning/date";

describe("planning local calendar dates", () => {
  it("accepts empty and real leap dates", () => {
    expect(isPlanningDate("")).toBe(true);
    expect(isPlanningDate("2028-02-29")).toBe(true);
    expect(isPlanningDate("2026-02-29")).toBe(false);
  });

  it.each(["2026-13-01", "2026-04-31", "2026-2-01", "not-a-date"])(
    "rejects invalid date %s",
    (value) => expect(isPlanningDate(value)).toBe(false),
  );

  it("uses calendar-day arithmetic across month and DST boundaries", () => {
    expect(planningDaysFromToday("2026-03-08", "2026-03-01")).toBe(7);
    expect(planningDaysFromToday("2026-04-01", "2026-03-31")).toBe(1);
    expect(planningDaysFromToday("2026-02-28", "2026-03-01")).toBe(-1);
  });

  it("formats the machine-local calendar date", () => {
    expect(getLocalPlanningDate(new Date(2026, 7, 1, 23, 59))).toBe("2026-08-01");
  });
});
