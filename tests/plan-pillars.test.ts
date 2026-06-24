import { describe, expect, it } from "vitest";

import { buildPlanPillars } from "@/lib/presentation/plan-pillars";
import { mergePostpartumTasks } from "@/lib/rc";
import { generateChecklist } from "@/lib/rules";
import type { UserProfile } from "@/lib/types";

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

describe("plan pillars", () => {
  it("builds the four v1.2 content pillars with boundary copy", () => {
    const profile = makeProfile();
    const postpartumTasks = mergePostpartumTasks().map((task, index) =>
      index === 0 ? { ...task, status: "done" as const } : task,
    );
    const pillars = buildPlanPillars({
      checklist: generateChecklist(profile),
      hospitalAnswers: [],
      postpartumTasks,
    });

    expect(pillars.map((pillar) => pillar.title)).toEqual([
      "医院确认",
      "核心待产包",
      "临出门沟通卡",
      "产后提醒",
    ]);
    expect(pillars.find((pillar) => pillar.id === "hospital")?.boundary).toContain(
      "不代表官方入院要求",
    );
    expect(pillars.find((pillar) => pillar.id === "core_bag")?.boundary).toContain(
      "不做购物推荐",
    );
    expect(pillars.find((pillar) => pillar.id === "go_card")?.boundary).toContain(
      "不判断是否入院",
    );
    expect(pillars.find((pillar) => pillar.id === "postpartum")).toMatchObject({
      completed: 1,
      sourceLabel: "窗口待确认",
      total: 9,
    });
  });
});
