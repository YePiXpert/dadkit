import { describe, expect, it } from "vitest";

import {
  buildArchiveCards,
  getCountdownLabel,
  getPregnancyProgress,
} from "@/lib/presentation/home-dashboard";
import type { HomeSummary } from "@/lib/presentation/home-summary";

const summary: HomeSummary = {
  corePacking: {
    completed: 2,
    total: 4,
    percent: 50,
  },
  hospitalQuestions: {
    completed: 3,
    total: 8,
    percent: 38,
  },
  lastMinute: {
    completed: 1,
    total: 5,
    percent: 20,
  },
};

describe("home dashboard presentation", () => {
  it("formats countdown labels without medical judgement", () => {
    expect(getCountdownLabel(undefined)).toBe("未设置");
    expect(getCountdownLabel(42)).toBe("还有 42 天");
    expect(getCountdownLabel(0)).toBe("今天是预产期");
    expect(getCountdownLabel(-2)).toBe("已过预产期 2 天");
  });

  it("calculates gestational progress from due-date distance", () => {
    expect(getPregnancyProgress(undefined)).toMatchObject({
      label: "待填写预产期",
      percent: 0,
    });
    expect(getPregnancyProgress(42)).toMatchObject({
      label: "孕 34 周 0 天",
      percent: 85,
      week: 34,
      day: 0,
    });
    expect(getPregnancyProgress(0)).toMatchObject({
      label: "已到预产期",
      percent: 100,
    });
  });

  it("builds archive cards with pending confirmations and go readiness", () => {
    expect(
      buildArchiveCards({
        currentStageTitle: "核心打包完成",
        deliveryModeLabel: "还不确定",
        dueDate: "2026-08-01",
        hospitalName: "测试医院",
        summary,
      }),
    ).toEqual([
      {
        label: "预产期",
        value: "2026-08-01",
        caption: "核心打包完成",
      },
      {
        label: "生产医院",
        value: "测试医院",
        caption: "5 项医院待确认",
      },
      {
        label: "生产方式",
        value: "还不确定",
        caption: "可在资料页随时修改",
      },
      {
        label: "临出门准备",
        value: "20%",
        caption: "1/5 项完成",
      },
    ]);
  });
});
