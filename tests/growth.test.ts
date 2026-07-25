import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROWTH_WEEK,
  GROWTH_CHECKUP_TASK_IDS,
  GROWTH_MEDICAL_DISCLAIMER,
  GROWTH_SOURCES,
  GROWTH_WEEKS,
  MAX_GROWTH_WEEK,
  MIN_GROWTH_WEEK,
  describeGrowthSincePreviousWeek,
  getCurrentGrowthWeekFromDueDate,
  getGrowthWeek,
  getProjectedGrowthWeekDate,
} from "@/lib/growth";

describe("growth content", () => {
  it("covers every week from 8 through 40 with week 36 as the default", () => {
    expect(DEFAULT_GROWTH_WEEK).toBe(36);
    expect(GROWTH_WEEKS).toHaveLength(33);
    expect(GROWTH_WEEKS.map((entry) => entry.week)).toEqual(
      Array.from(
        { length: MAX_GROWTH_WEEK - MIN_GROWTH_WEEK + 1 },
        (_, index) => MIN_GROWTH_WEEK + index,
      ),
    );

    for (const entry of GROWTH_WEEKS) {
      expect(entry.analogy.length).toBeGreaterThan(2);
      expect(entry.summary.length).toBeGreaterThan(20);
      expect(entry.checkupReminder.length).toBeGreaterThan(20);
    }
  });

  it("uses unique stable task ids for every prenatal reminder", () => {
    expect(GROWTH_CHECKUP_TASK_IDS).toHaveLength(GROWTH_WEEKS.length);
    expect(new Set(GROWTH_CHECKUP_TASK_IDS).size).toBe(GROWTH_WEEKS.length);
    expect(GROWTH_CHECKUP_TASK_IDS[0]).toBe("first-prenatal-contact");
    expect(GROWTH_CHECKUP_TASK_IDS.at(-1)).toBe("who-contact-40-weeks");
  });

  it("only shows the INTERGROWTH reference weight from week 22 onward", () => {
    for (const entry of GROWTH_WEEKS.filter((candidate) => candidate.week < 22)) {
      expect(entry.referenceWeightG).toBeUndefined();
    }

    expect(getGrowthWeek(22).referenceWeightG).toBe(525);
    expect(getGrowthWeek(36).referenceWeightG).toBe(2594);
    expect(getGrowthWeek(40).referenceWeightG).toBe(3338);
  });

  it("describes change from the previous week without inventing early weight", () => {
    expect(describeGrowthSincePreviousWeek(8)).toContain("起点周");
    expect(describeGrowthSincePreviousWeek(21)).not.toContain("估重约");
    expect(describeGrowthSincePreviousWeek(22)).toContain("从 22 周开始");
    expect(describeGrowthSincePreviousWeek(23)).toContain("+67 g");
  });

  it("projects a reference date from a clinician-confirmed due date", () => {
    expect(getProjectedGrowthWeekDate("2026-08-01", 36)).toBe("2026-07-04");
    expect(getProjectedGrowthWeekDate("2026-02-30", 36)).toBeUndefined();
    expect(getProjectedGrowthWeekDate("", 36)).toBeUndefined();
  });

  it("derives a clamped current week from a clinician-confirmed due date", () => {
    expect(
      getCurrentGrowthWeekFromDueDate(
        "2026-08-01",
        new Date("2026-07-04T12:00:00+08:00"),
      ),
    ).toBe(36);
    expect(
      getCurrentGrowthWeekFromDueDate(
        "2026-08-01",
        new Date("2026-08-01T12:00:00+08:00"),
      ),
    ).toBe(40);
    expect(getCurrentGrowthWeekFromDueDate("bad-date")).toBe(
      DEFAULT_GROWTH_WEEK,
    );
  });

  it("keeps a fixed disclaimer and traceable authoritative sources", () => {
    expect(GROWTH_MEDICAL_DISCLAIMER).toContain("不能替代产检");
    expect(GROWTH_MEDICAL_DISCLAIMER).toContain("胎动明显变化");
    expect(new Set(GROWTH_SOURCES.map((source) => source.organization))).toEqual(
      new Set(["NHS", "ACOG", "WHO", "INTERGROWTH-21st"]),
    );
    expect(GROWTH_SOURCES.every((source) => source.href.startsWith("https://"))).toBe(
      true,
    );
  });
});
