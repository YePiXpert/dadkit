import { describe, expect, it } from "vitest";

import {
  DAD_ACTION_TASKS,
  HOSPITAL_CONFIRMATION_QUESTIONS,
} from "@/lib/hospital/confirmation-plan";

describe("hospital confirmation plan", () => {
  it("lists the fixed next-checkup questions", () => {
    expect(HOSPITAL_CONFIRMATION_QUESTIONS.map((question) => question.title)).toEqual([
      "医院是否提供产褥垫？",
      "医院是否提供宝宝尿不湿？",
      "医院是否提供宝宝衣物？",
      "是否建议自带吸奶器？",
      "白天从哪个入口入院？",
      "夜间从哪个入口 / 急诊路线？",
      "住院处或产科联系电话是多少？",
      "是否需要提前办理住院手续？",
      "是否允许陪产？",
      "陪产人需要哪些证件或核验？",
      "探视规则是什么？",
      "住院押金大概多少？",
      "支付方式有哪些？",
      "医保结算方式是什么？",
      "是否需要实体银行卡或现金？",
      "出生医学证明需要哪些材料？",
      "出院结算在哪里办理？",
    ]);
  });

  it("keeps the home hospital-question core set small", () => {
    const homeCoreQuestions = HOSPITAL_CONFIRMATION_QUESTIONS.filter(
      (question) => question.homeCore,
    );

    expect(homeCoreQuestions.length).toBeGreaterThanOrEqual(6);
    expect(homeCoreQuestions.length).toBeLessThanOrEqual(8);
  });

  it("lists the fixed dad action tasks", () => {
    expect(DAD_ACTION_TASKS.map((task) => task.title)).toEqual([
      "保存医院电话",
      "收藏夜间入院导航",
      "确认停车方案",
      "证件包放到固定位置",
      "确认支付方式",
      "确认陪产人证件",
      "临近入院前再确认医院规则",
    ]);
  });
});
