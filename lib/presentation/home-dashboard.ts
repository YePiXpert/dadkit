import type { HomeSummary } from "@/lib/presentation/home-summary";

const FULL_TERM_DAYS = 280;

export type PregnancyProgress = {
  label: string;
  percent: number;
  week?: number;
  day?: number;
};

export type ArchiveCard = {
  label: string;
  value: string;
  caption: string;
};

export function getCountdownLabel(daysLeft?: number) {
  if (typeof daysLeft !== "number") {
    return "未设置";
  }

  if (daysLeft > 0) {
    return `还有 ${daysLeft} 天`;
  }

  if (daysLeft === 0) {
    return "今天是预产期";
  }

  return `已过预产期 ${Math.abs(daysLeft)} 天`;
}

export function getPregnancyProgress(daysLeft?: number): PregnancyProgress {
  if (typeof daysLeft !== "number") {
    return {
      label: "待填写预产期",
      percent: 0,
    };
  }

  if (daysLeft <= 0) {
    return {
      label: "已到预产期",
      percent: 100,
      week: 40,
      day: 0,
    };
  }

  const pregnancyDays = Math.min(
    FULL_TERM_DAYS,
    Math.max(0, FULL_TERM_DAYS - daysLeft),
  );
  const week = Math.floor(pregnancyDays / 7);
  const day = pregnancyDays % 7;

  return {
    label: `孕 ${week} 周 ${day} 天`,
    percent: Math.round((pregnancyDays / FULL_TERM_DAYS) * 100),
    week,
    day,
  };
}

export function buildArchiveCards({
  currentStageTitle,
  deliveryModeLabel,
  dueDate,
  hospitalName,
  summary,
}: {
  currentStageTitle: string;
  deliveryModeLabel: string;
  dueDate?: string;
  hospitalName?: string;
  summary: HomeSummary;
}): ArchiveCard[] {
  const pendingConfirmations = Math.max(
    0,
    summary.hospitalQuestions.total - summary.hospitalQuestions.completed,
  );

  return [
    {
      label: "预产期",
      value: dueDate ?? "待填写",
      caption: currentStageTitle,
    },
    {
      label: "生产医院",
      value: hospitalName ?? "待确定",
      caption: `${pendingConfirmations} 项医院待确认`,
    },
    {
      label: "生产方式",
      value: deliveryModeLabel,
      caption: "可在资料页随时修改",
    },
    {
      label: "临出门准备",
      value: `${summary.lastMinute.percent}%`,
      caption: `${summary.lastMinute.completed}/${summary.lastMinute.total} 项完成`,
    },
  ];
}
