import { describe, expect, it } from "vitest";

import {
  DAD_ACTION_TASKS,
  getDadActionProgress,
  getHospitalQuestionProgress,
  HOSPITAL_CONFIRMATION_QUESTIONS,
} from "@/lib/hospital/confirmation-plan";

describe("hospital confirmation plan", () => {
  it("lists the fixed next-checkup questions", () => {
    expect(HOSPITAL_CONFIRMATION_QUESTIONS.map((question) => question.title)).toEqual(
      expect.arrayContaining([
        "医院是否提供产褥垫？",
        "医院是否提供宝宝尿不湿？",
        "医院是否提供宝宝衣物？",
        "是否允许陪产？",
        "住院押金大概多少？",
        "分娩镇痛的时机和费用？",
        "产房陪护制度是什么？",
        "破水、见红较多或胎动异常时应该联系哪里？",
        "临产前还需要临时购买哪些物品？",
      ]),
    );
  });

  it("keeps the home hospital-question core set small", () => {
    const homeCoreQuestions = HOSPITAL_CONFIRMATION_QUESTIONS.filter(
      (question) => question.homeCore,
    );

    expect(homeCoreQuestions.length).toBeGreaterThanOrEqual(6);
    expect(homeCoreQuestions.length).toBeLessThanOrEqual(8);
  });

  it("lists the fixed dad action tasks", () => {
    expect(DAD_ACTION_TASKS.map((task) => task.title)).toEqual(
      expect.arrayContaining([
        "证件包放到固定位置",
        "确认支付方式",
        "确认陪产人证件",
        "确认临产异常联系流程",
        "准备陪产减痛协助",
        "临近入院前再确认医院规则",
      ]),
    );
  });

  it("keeps hospital questions and dad actions as separate progress counts", () => {
    const hospitalProgress = getHospitalQuestionProgress([]);
    const dadProgress = getDadActionProgress([]);

    expect(hospitalProgress).toMatchObject({
      completed: 0,
      total: HOSPITAL_CONFIRMATION_QUESTIONS.length,
    });
    expect(dadProgress).toMatchObject({
      completed: 0,
      total: DAD_ACTION_TASKS.length,
    });
    expect(hospitalProgress.total).toBe(20);
    expect(dadProgress.total).toBe(6);
  });
});
