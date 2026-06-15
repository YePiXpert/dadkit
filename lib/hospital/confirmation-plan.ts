import { LABOR_HOSPITAL_QUESTION_TITLES } from "@/lib/labor-guide";

export type HospitalConfirmationGroupId =
  | "provided_items"
  | "admission_flow"
  | "partner_policy"
  | "labor_support"
  | "payment"
  | "discharge";

export type HospitalConfirmationQuestion = {
  id: string;
  groupId: HospitalConfirmationGroupId;
  title: string;
  description?: string;
  answerType: "provided_item" | "confirmation";
  providedItemId?: "postpartum-pads" | "baby-diapers" | "baby-clothes";
  homeCore?: boolean;
};

export type DadActionTask = {
  id: string;
  title: string;
  description?: string;
  relatedQuestionIds?: string[];
  homeCore?: boolean;
};

export const HOSPITAL_CONFIRMATION_GROUP_LABELS: Record<
  HospitalConfirmationGroupId,
  string
> = {
  provided_items: "医院提供物品",
  admission_flow: "入院流程",
  partner_policy: "陪产探视",
  labor_support: "临产支持",
  payment: "费用结算",
  discharge: "出院办理",
};

export const HOSPITAL_CONFIRMATION_QUESTIONS: HospitalConfirmationQuestion[] = [
  {
    id: "question-provided-postpartum-pads",
    groupId: "provided_items",
    title: "医院是否提供产褥垫？",
    answerType: "provided_item",
    providedItemId: "postpartum-pads",
    homeCore: true,
  },
  {
    id: "question-provided-baby-diapers",
    groupId: "provided_items",
    title: "医院是否提供宝宝尿不湿？",
    answerType: "provided_item",
    providedItemId: "baby-diapers",
    homeCore: true,
  },
  {
    id: "question-provided-baby-clothes",
    groupId: "provided_items",
    title: "医院是否提供宝宝衣物？",
    answerType: "provided_item",
    providedItemId: "baby-clothes",
    homeCore: true,
  },
  {
    id: "question-provided-breast-pump",
    groupId: "provided_items",
    title: "是否建议自带吸奶器？",
    answerType: "confirmation",
  },
  {
    id: "question-admission-day-entrance",
    groupId: "admission_flow",
    title: "白天从哪个入口入院？",
    answerType: "confirmation",
    homeCore: true,
  },
  {
    id: "question-admission-night-route",
    groupId: "admission_flow",
    title: "夜间从哪个入口 / 急诊路线？",
    answerType: "confirmation",
    homeCore: true,
  },
  {
    id: "question-admission-phone",
    groupId: "admission_flow",
    title: "住院处或产科联系电话是多少？",
    answerType: "confirmation",
  },
  {
    id: "question-admission-precheck",
    groupId: "admission_flow",
    title: "是否需要提前办理住院手续？",
    answerType: "confirmation",
  },
  {
    id: "question-partner-allowed",
    groupId: "partner_policy",
    title: "是否允许陪产？",
    answerType: "confirmation",
    homeCore: true,
  },
  {
    id: "question-partner-documents",
    groupId: "partner_policy",
    title: "陪产人需要哪些证件或核验？",
    answerType: "confirmation",
  },
  {
    id: "question-visitor-policy",
    groupId: "partner_policy",
    title: "探视规则是什么？",
    answerType: "confirmation",
  },
  {
    id: "question-labor-analgesia-timing-cost",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[0],
    description: "把无痛分娩等镇痛方案的时机、流程、费用和风险问清楚。",
    answerType: "confirmation",
  },
  {
    id: "question-labor-doula-support",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[1],
    description: "确认是否有导乐、导乐仪、呼吸放松或体位指导等支持。",
    answerType: "confirmation",
  },
  {
    id: "question-labor-room-companion-policy",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[2],
    description: "确认陪产人能进入的区域、时间、证件和核验要求。",
    answerType: "confirmation",
  },
  {
    id: "question-labor-urgent-contact",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[3],
    description: "提前保存产科、急诊、住院处或产房联系路径。",
    answerType: "confirmation",
    homeCore: true,
  },
  {
    id: "question-labor-last-minute-purchases",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[4],
    description: "把医院临产前要求自购的物品和购买地点写下来。",
    answerType: "confirmation",
  },
  {
    id: "question-labor-exam-results",
    groupId: "labor_support",
    title: LABOR_HOSPITAL_QUESTION_TITLES[5],
    description: "确认纸质或电子产检、化验、B 超结果是否要随身带。",
    answerType: "confirmation",
  },
  {
    id: "question-payment-deposit",
    groupId: "payment",
    title: "住院押金大概多少？",
    answerType: "confirmation",
    homeCore: true,
  },
  {
    id: "question-payment-methods",
    groupId: "payment",
    title: "支付方式有哪些？",
    answerType: "confirmation",
  },
  {
    id: "question-payment-insurance",
    groupId: "payment",
    title: "医保结算方式是什么？",
    answerType: "confirmation",
  },
  {
    id: "question-payment-card-cash",
    groupId: "payment",
    title: "是否需要实体银行卡或现金？",
    answerType: "confirmation",
  },
  {
    id: "question-discharge-birth-certificate",
    groupId: "discharge",
    title: "出生医学证明需要哪些材料？",
    answerType: "confirmation",
  },
  {
    id: "question-discharge-settlement",
    groupId: "discharge",
    title: "出院结算在哪里办理？",
    answerType: "confirmation",
  },
];

export const DAD_ACTION_TASKS: DadActionTask[] = [
  {
    id: "dad-save-phone",
    title: "保存医院电话",
    description: "把产科、住院处或夜间入口电话保存到手机。",
    relatedQuestionIds: ["question-admission-phone"],
    homeCore: true,
  },
  {
    id: "dad-save-night-navigation",
    title: "收藏夜间入院导航",
    description: "确认白天和夜间分别从哪里进。",
    relatedQuestionIds: [
      "question-admission-day-entrance",
      "question-admission-night-route",
    ],
    homeCore: true,
  },
  {
    id: "dad-confirm-parking",
    title: "确认停车方案",
    description: "停车场入口、夜间是否开放、是否方便临停。",
    homeCore: true,
  },
  {
    id: "dad-place-documents",
    title: "证件包放到固定位置",
    description: "身份证、医保卡、母子健康手册或电子条形码、产检资料。",
    homeCore: true,
  },
  {
    id: "dad-confirm-payment",
    title: "确认支付方式",
    description: "住院押金、医保结算、是否需要实体银行卡或现金。",
    relatedQuestionIds: [
      "question-payment-deposit",
      "question-payment-methods",
      "question-payment-insurance",
      "question-payment-card-cash",
    ],
    homeCore: true,
  },
  {
    id: "dad-confirm-partner-documents",
    title: "确认陪产人证件",
    description: "陪产人身份证、核验要求、陪产规则。",
    relatedQuestionIds: [
      "question-partner-allowed",
      "question-partner-documents",
    ],
  },
  {
    id: "dad-confirm-labor-urgent-flow",
    title: "确认临产异常联系流程",
    description: "把破水、见红较多、胎动异常时要联系的电话和入口写清楚。",
    relatedQuestionIds: [
      "question-labor-urgent-contact",
      "question-admission-night-route",
    ],
  },
  {
    id: "dad-prepare-labor-support",
    title: "准备陪产减痛协助",
    description: "提前和妈妈确认擦汗、按摩、递水、沟通记录这些协助边界。",
    relatedQuestionIds: [
      "question-labor-analgesia-timing-cost",
      "question-labor-doula-support",
      "question-labor-room-companion-policy",
    ],
  },
  {
    id: "dad-reconfirm-rules",
    title: "临近入院前再确认医院规则",
    description: "医院规则可能变化，临近入院前再确认一次。",
  },
];
