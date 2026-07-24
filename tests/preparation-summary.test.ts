import { describe, expect, it } from "vitest";

import { HOSPITAL_CONFIRMATION_QUESTIONS } from "@/lib/hospital/confirmation-plan";
import {
  buildPreparationSummary,
  PREPARATION_MODULE_WEIGHTS,
} from "@/lib/presentation/preparation-summary";
import { mergePostpartumTasks, type BirthPlan, type ContractionRecord } from "@/lib/rc";
import { generateChecklist } from "@/lib/rules";
import { generateGoModeTasks, type TimelineTaskStatus } from "@/lib/timeline";
import type { ChecklistItem, HospitalAnswer, UserProfile } from "@/lib/types";

const now = new Date("2026-06-29T10:00:00.000Z");

function makeProfile(): UserProfile {
  return {
    dueDate: "2026-08-01",
    regionId: "cn-bj-general",
    hospitalMode: "unknown",
    deliveryMode: "unknown",
    expectedStayDays: 3,
    breastfeeding: true,
    partnerPresent: true,
    coldWeather: false,
    hospitalProvidedItemIds: [],
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z",
  };
}

function hospitalAnswers(): HospitalAnswer[] {
  return HOSPITAL_CONFIRMATION_QUESTIONS.map((question) => ({
    itemId: question.id,
    name: question.title,
    status: "confirmed",
    updatedAt: now.toISOString(),
  }));
}

function packed(checklist: ChecklistItem[]) {
  return checklist.map((item) => ({ ...item, status: "packed" as const }));
}

function goDoneStatuses(
  profile: UserProfile,
  checklist: ChecklistItem[],
): TimelineTaskStatus[] {
  return generateGoModeTasks(profile, checklist).map((task) => ({
    taskId: task.id,
    status: "done",
    updatedAt: now.toISOString(),
  }));
}

const birthPlan: Partial<BirthPlan> = {
  emergencyContact: "爸爸 13800000000",
};

describe("preparation summary", () => {
  it("builds weighted modules for the v1.3 readiness model", () => {
    const profile = makeProfile();
    const summary = buildPreparationSummary({
      checklist: generateChecklist(profile),
      hospitalAnswers: [],
      now,
      postpartumTasks: mergePostpartumTasks(),
      profile,
    });

    expect(summary.modules.map((module) => module.id)).toEqual([
      "hospital",
      "go",
      "checklist",
      "postpartum",
    ]);
    expect(Object.fromEntries(summary.modules.map((module) => [module.id, module.weight]))).toEqual(
      PREPARATION_MODULE_WEIGHTS,
    );
    expect(summary.readiness).toMatchObject({
      percent: 0,
      totalWeight: 100,
    });
    expect(summary.contractionStatus.countsTowardReadiness).toBe(false);
  });

  it("weights hospital completion without accidentally counting contractions", () => {
    const profile = makeProfile();
    const checklist = generateChecklist(profile);
    const contractions: ContractionRecord[] = [
      {
        durationSeconds: 60,
        endedAt: "2026-06-29T09:51:00.000Z",
        id: "one",
        startedAt: "2026-06-29T09:50:00.000Z",
      },
    ];
    const withoutContractions = buildPreparationSummary({
      checklist,
      hospitalAnswers: hospitalAnswers(),
      now,
      postpartumTasks: mergePostpartumTasks(),
      profile,
    });
    const withContractions = buildPreparationSummary({
      checklist,
      contractions,
      hospitalAnswers: hospitalAnswers(),
      now,
      postpartumTasks: mergePostpartumTasks(),
      profile,
    });

    expect(withoutContractions.modules.find((module) => module.id === "hospital")).toMatchObject({
      percent: 100,
      weight: 30,
    });
    expect(withoutContractions.readiness.percent).toBe(30);
    expect(withContractions.readiness.percent).toBe(withoutContractions.readiness.percent);
    expect(withContractions.contractionStatus).toMatchObject({
      countsTowardReadiness: false,
      recentCount: 1,
      totalCount: 1,
    });
  });

  it("allows Go mode and all other modules to prove full readiness", () => {
    const profile = makeProfile();
    const checklist = packed(generateChecklist(profile));
    const summary = buildPreparationSummary({
      birthPlan,
      checklist,
      hospitalAnswers: hospitalAnswers(),
      now,
      postpartumTasks: mergePostpartumTasks().map((task) => ({
        ...task,
        status: "done" as const,
      })),
      profile,
      timelineTaskStatuses: goDoneStatuses(profile, checklist),
    });

    expect(summary.modules.find((module) => module.id === "go")).toMatchObject({
      percent: 100,
      weight: 30,
    });
    expect(summary.readiness.percent).toBe(100);
    expect(summary.nextAction.href).toBe("/hospital");
  });
});
