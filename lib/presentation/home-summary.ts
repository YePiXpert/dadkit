import { HOSPITAL_CONFIRMATION_QUESTIONS } from "@/lib/hospital/confirmation-plan";
import type { ChecklistItem, HospitalAnswer } from "@/lib/types";

type SummaryPart = {
  completed: number;
  total: number;
  percent: number;
};

export type HomeSummary = {
  corePacking: SummaryPart;
  hospitalQuestions: SummaryPart;
  lastMinute: SummaryPart;
};

export type HomeReadinessMetric = {
  id: "packing" | "hospital" | "go";
  label: string;
  completed: number;
  total: number;
  percent: number;
  caption: string;
  href: string;
};

function summaryPart(total: number, completed: number): SummaryPart {
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

function answerIsDone(answer?: Pick<HospitalAnswer, "status">) {
  return Boolean(answer && answer.status !== "todo");
}

function itemIsDone(item: ChecklistItem) {
  return ["packed", "hospital_provided", "not_needed"].includes(item.status);
}

function corePackable(item: ChecklistItem) {
  return (
    item.packTier === "core" &&
    item.itemKind === "item" &&
    item.bag !== "none" &&
    item.bag !== "car" &&
    item.category !== "last_minute"
  );
}

function lastMinuteCore(item: ChecklistItem) {
  if (item.packTier !== "core") {
    return false;
  }

  return (
    item.category === "last_minute" ||
    item.bag === "last_minute" ||
    item.timing === "grab_before_leaving"
  );
}

export function buildHomeSummary(
  checklist: ChecklistItem[],
  hospitalAnswers: HospitalAnswer[],
): HomeSummary {
  const answersById = new Map(
    hospitalAnswers.map((answer) => [answer.itemId, answer] as const),
  );
  const corePackingItems = checklist.filter(corePackable);
  const lastMinuteItems = checklist.filter(lastMinuteCore).slice(0, 8);
  const coreHospitalQuestions = HOSPITAL_CONFIRMATION_QUESTIONS.filter(
    (question) => question.homeCore,
  ).slice(0, 8);

  return {
    corePacking: summaryPart(
      corePackingItems.length,
      corePackingItems.filter(itemIsDone).length,
    ),
    hospitalQuestions: summaryPart(
      coreHospitalQuestions.length,
      coreHospitalQuestions.filter((unit) =>
        answerIsDone(answersById.get(unit.id)),
      ).length,
    ),
    lastMinute: summaryPart(
      lastMinuteItems.length,
      lastMinuteItems.filter(itemIsDone).length,
    ),
  };
}

export function buildHomeReadinessMetrics(
  summary: HomeSummary,
): HomeReadinessMetric[] {
  return [
    {
      id: "packing",
      label: "待产包",
      completed: summary.corePacking.completed,
      total: summary.corePacking.total,
      percent: summary.corePacking.percent,
      caption: "需要带到医院的核心物品",
      href: "/checklist",
    },
    {
      id: "hospital",
      label: "医院规则",
      completed: summary.hospitalQuestions.completed,
      total: summary.hospitalQuestions.total,
      percent: summary.hospitalQuestions.percent,
      caption: "入院流程和医院提供物品",
      href: "/hospital",
    },
    {
      id: "go",
      label: "临出门",
      completed: summary.lastMinute.completed,
      total: summary.lastMinute.total,
      percent: summary.lastMinute.percent,
      caption: "发动当天再拿和再确认",
      href: "/go",
    },
  ];
}
