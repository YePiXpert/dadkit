import { describe, expect, it } from "vitest";

import {
  calculateContractionStats,
  createContractionRecord,
  generateBirthPlanShareText,
  generateContractionsShareText,
  mergeBirthPlan,
} from "@/lib/rc";

describe("rc helpers", () => {
  it("calculates last-hour contraction averages", () => {
    const now = new Date("2026-06-10T12:00:00.000Z");
    const records = [
      {
        id: "old",
        startedAt: "2026-06-10T10:30:00.000Z",
        endedAt: "2026-06-10T10:31:00.000Z",
        durationSeconds: 60,
      },
      {
        id: "one",
        startedAt: "2026-06-10T11:10:00.000Z",
        endedAt: "2026-06-10T11:11:00.000Z",
        durationSeconds: 60,
      },
      {
        id: "two",
        startedAt: "2026-06-10T11:20:00.000Z",
        endedAt: "2026-06-10T11:22:00.000Z",
        durationSeconds: 120,
      },
      {
        id: "three",
        startedAt: "2026-06-10T11:35:00.000Z",
        endedAt: "2026-06-10T11:38:00.000Z",
        durationSeconds: 180,
      },
    ];

    expect(calculateContractionStats(records, now)).toEqual({
      count: 3,
      averageDurationSeconds: 120,
      averageIntervalSeconds: 750,
    });
  });

  it("creates contraction records with duration, interval, and trimmed notes", () => {
    const first = createContractionRecord({
      id: "first",
      startedAt: "2026-06-10T11:10:00.000Z",
      endedAt: "2026-06-10T11:11:20.000Z",
      note: "  轻微  ",
    });
    const second = createContractionRecord(
      {
        id: "second",
        startedAt: "2026-06-10T11:20:00.000Z",
        endedAt: "2026-06-10T11:22:00.000Z",
      },
      [first],
    );

    expect(first).toMatchObject({
      durationSeconds: 80,
      note: "轻微",
    });
    expect(second.intervalSeconds).toBe(600);
  });

  it("exports birth-plan and contraction text without medical judgment", () => {
    const birthPlanText = generateBirthPlanShareText(
      mergeBirthPlan({ emergencyContact: "爸爸 13800000000" }),
    );
    const contractionsText = generateContractionsShareText([]);

    expect(birthPlanText).toContain("爸爸 13800000000");
    expect(birthPlanText).toContain("这不是医疗建议");
    expect(contractionsText).toContain("是否去医院以医生/医院要求为准");
  });
});
