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
