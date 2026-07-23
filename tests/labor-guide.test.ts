import { describe, expect, it } from "vitest";

import {
  BIRTH_PLAN_LONG_FIELDS,
  LABOR_HOSPITAL_QUESTION_TITLES,
  LABOR_PREPARATION_AREAS,
  LABOR_URGENT_SIGNAL_CARDS,
  PARTNER_SUPPORT_ACTIONS,
  WATER_BREAK_STEPS,
} from "@/lib/labor-guide";

describe("labor guide content", () => {
  it("keeps the midwife-clinic preparation structure reusable", () => {
    expect(LABOR_PREPARATION_AREAS.map((area) => area.title)).toEqual([
      "物质准备",
      "生理准备",
      "心理准备",
    ]);
    expect(LABOR_PREPARATION_AREAS.flatMap((area) => area.items)).toEqual(
      expect.arrayContaining(["按时产检", "控制体重", "学习分娩知识"]),
    );
  });

  it("lists urgent labor signals without turning them into diagnosis", () => {
    expect(LABOR_URGENT_SIGNAL_CARDS.map((card) => card.title)).toEqual([
      "规律宫缩",
      "见红较多",
      "破水",
      "胎动异常",
    ]);
    expect(
      LABOR_URGENT_SIGNAL_CARDS.every(
        (card) => card.actionLabel === "联系医院确认",
      ),
    ).toBe(true);
  });

  it("captures water-break handling as communication steps", () => {
    expect(WATER_BREAK_STEPS.map((step) => step.title)).toEqual([
      "记录破水时间",
      "平躺并垫高臀部",
      "联系医院或急救电话",
    ]);
    expect(WATER_BREAK_STEPS.map((step) => step.description).join("")).toContain(
      "按医院要求",
    );
  });

  it("turns partner support into dad-friendly action prompts", () => {
    expect(PARTNER_SUPPORT_ACTIONS.map((action) => action.title)).toEqual([
      "擦汗",
      "按摩",
      "喂水喂饭",
      "协助沟通",
    ]);
  });

  it("adds hospital and birth-plan prompts for pain relief and support policy", () => {
    expect(LABOR_HOSPITAL_QUESTION_TITLES).toEqual(
      expect.arrayContaining([
        "分娩镇痛的时机和费用？",
        "产房陪护制度是什么？",
        "临产前还需要临时购买哪些物品？",
      ]),
    );
    expect(BIRTH_PLAN_LONG_FIELDS.map((field) => field.key)).toContain(
      "painManagement",
    );
    expect(
      BIRTH_PLAN_LONG_FIELDS.find((field) => field.key === "painManagement")
        ?.placeholder,
    ).toContain("无痛");
  });

  it("gives an actionable 511 rule for regular contractions", () => {
    expect(
      LABOR_URGENT_SIGNAL_CARDS.find(
        (card) => card.id === "regular-contractions",
      )?.description,
    ).toContain("511");
  });
});
