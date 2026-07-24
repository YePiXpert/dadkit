import type {
  ChecklistItem,
  HospitalAnswerStatus,
  PackStatus,
} from "@/lib/types";

const PROVIDED_QUESTION_KEYWORDS = ["提供", "产褥垫", "尿不湿", "宝宝衣物"];
const PROVIDED_ID_BY_QUESTION_ID: Record<string, string> = {
  "question-provided-postpartum-pads": "postpartum-pads",
  "question-provided-baby-diapers": "baby-diapers",
  "question-provided-baby-clothes": "baby-clothes",
};

const CONFIRMATION_QUESTION_KEYWORDS = [
  "支付",
  "押金",
  "医保结算",
  "陪产",
];

const PROVIDED_STATUS_OPTIONS: HospitalAnswerStatus[] = [
  "todo",
  "provided",
  "not_provided",
  "partial",
  "not_needed",
];

const CONFIRMATION_STATUS_OPTIONS: HospitalAnswerStatus[] = [
  "todo",
  "confirmed",
  "not_needed",
];

export function getHospitalAnswerOptions(
  item: Pick<ChecklistItem, "name"> & {
    answerType?: "provided_item" | "confirmation";
    kind?: "question" | "task";
  },
): HospitalAnswerStatus[] {
  if (item.answerType === "provided_item") {
    return PROVIDED_STATUS_OPTIONS;
  }

  if (PROVIDED_QUESTION_KEYWORDS.some((keyword) => item.name.includes(keyword))) {
    return PROVIDED_STATUS_OPTIONS;
  }

  if (
    CONFIRMATION_QUESTION_KEYWORDS.some((keyword) =>
      item.name.includes(keyword),
    )
  ) {
    return CONFIRMATION_STATUS_OPTIONS;
  }

  return CONFIRMATION_STATUS_OPTIONS;
}

export function getProvidedIdForQuestion(name: string, itemId?: string) {
  if (itemId && PROVIDED_ID_BY_QUESTION_ID[itemId]) {
    return PROVIDED_ID_BY_QUESTION_ID[itemId];
  }

  if (name.includes("产褥垫")) {
    return "postpartum-pads";
  }

  if (name.includes("宝宝尿不湿") || name.includes("尿不湿")) {
    return "baby-diapers";
  }

  if (name.includes("宝宝衣物")) {
    return "baby-clothes";
  }

  return undefined;
}

export function mapHospitalAnswerStatusToPackStatus(
  status: HospitalAnswerStatus,
): PackStatus {
  if (status === "todo") {
    return "todo";
  }

  if (status === "provided" || status === "partial") {
    return "hospital_provided";
  }

  if (status === "not_needed") {
    return "not_needed";
  }

  return "packed";
}
