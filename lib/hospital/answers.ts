import type {
  ChecklistItem,
  HospitalAnswerStatus,
  PackStatus,
} from "@/lib/types";

const PROVIDED_QUESTION_KEYWORDS = ["提供", "产褥垫", "尿不湿", "宝宝衣物"];

const CONFIRMATION_QUESTION_KEYWORDS = [
  "入院入口",
  "夜间路线",
  "停车",
  "电话",
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
  item: Pick<ChecklistItem, "name">,
): HospitalAnswerStatus[] {
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

export function getProvidedIdForQuestion(name: string) {
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

