import type { BirthPlan } from "@/lib/rc";

export type LaborPreparationArea = {
  id: "material" | "body" | "mind";
  title: string;
  description: string;
  items: string[];
};

export type LaborUrgentSignalCard = {
  id:
    | "regular-contractions"
    | "heavy-bleeding"
    | "water-break"
    | "abnormal-fetal-movement";
  title: string;
  description: string;
  actionLabel: string;
  notePrompt: string;
};

export type LaborGuideStep = {
  title: string;
  description: string;
};

export type PartnerSupportAction = {
  title: string;
  description: string;
};

export type BirthPlanShortField = {
  key: keyof Pick<BirthPlan, "emergencyContact" | "supportPerson" | "hospitalPhone">;
  label: string;
  placeholder: string;
};

export type BirthPlanLongField = {
  key: keyof Omit<BirthPlan, "emergencyContact" | "supportPerson" | "hospitalPhone">;
  label: string;
  placeholder: string;
};

export const LABOR_PREPARATION_AREAS: LaborPreparationArea[] = [
  {
    id: "material",
    title: "物质准备",
    description: "把医院会用、路上要拿、产房可带的物品先问清楚。",
    items: ["待产包", "证件资料", "入院路线", "临时购买清单"],
  },
  {
    id: "body",
    title: "生理准备",
    description: "按时产检，关注营养、运动和体重管理，减少临产前慌乱。",
    items: ["按时产检", "发现异常及时沟通", "控制体重", "适度运动"],
  },
  {
    id: "mind",
    title: "心理准备",
    description: "提前学习分娩知识，把疼痛管理、陪产沟通和支持方式说清楚。",
    items: ["学习分娩知识", "建立信心", "了解减痛方法", "确认陪产分工"],
  },
];

export const LABOR_URGENT_SIGNAL_CARDS: LaborUrgentSignalCard[] = [
  {
    id: "regular-contractions",
    title: "规律宫缩",
    description: "记录开始时间、持续时间、间隔和强度变化，方便和医院沟通。",
    actionLabel: "联系医院确认",
    notePrompt: "例：10 分钟一次，每次约 40 秒，强度逐渐增加。",
  },
  {
    id: "heavy-bleeding",
    title: "见红较多",
    description: "记录颜色、量和出现时间，尤其是出血量明显增多时。",
    actionLabel: "联系医院确认",
    notePrompt: "例：11:20 见红，量较多/少量，是否伴随腹痛。",
  },
  {
    id: "water-break",
    title: "破水",
    description: "记录破水时间和羊水情况，先平躺并按医院要求联系。",
    actionLabel: "联系医院确认",
    notePrompt: "例：12:05 破水，颜色清/黄绿，已平躺等待指引。",
  },
  {
    id: "abnormal-fetal-movement",
    title: "胎动异常",
    description: "记录变化出现的时间和持续情况，不用在家里自行判断。",
    actionLabel: "联系医院确认",
    notePrompt: "例：下午开始明显减少/异常频繁，已联系产检医院。",
  },
];

export const WATER_BREAK_STEPS: LaborGuideStep[] = [
  {
    title: "记录破水时间",
    description: "记下大概时间、颜色、气味和是否持续流出，便于入院沟通。",
  },
  {
    title: "平躺并垫高臀部",
    description: "先减少走动，按医院要求保持体位，等待进一步指引。",
  },
  {
    title: "联系医院或急救电话",
    description: "按医院要求说明孕周、破水时间、羊水情况和所在位置。",
  },
];

export const PARTNER_SUPPORT_ACTIONS: PartnerSupportAction[] = [
  {
    title: "擦汗",
    description: "准备纸巾/毛巾，妈妈需要时及时递上。",
  },
  {
    title: "按摩",
    description: "按妈妈偏好的力度协助腰背、肩颈放松。",
  },
  {
    title: "喂水喂饭",
    description: "按医护允许的范围补充水分和能量。",
  },
  {
    title: "协助沟通",
    description: "帮妈妈复述偏好、记录医嘱和确认下一步安排。",
  },
];

export const LABOR_HOSPITAL_QUESTION_TITLES = [
  "分娩镇痛的时机和费用？",
  "是否提供导乐或其他减痛支持？",
  "产房陪护制度是什么？",
  "破水、见红较多或胎动异常时应该联系哪里？",
  "临产前还需要临时购买哪些物品？",
  "入院时需要携带哪些孕期检查或化验结果？",
] as const;

export const DEFAULT_BIRTH_PLAN_LABOR_PROMPTS = {
  birthPreferences:
    "希望以医院流程和医生判断为准，陪产人协助沟通、记录医嘱，并在允许范围内擦汗、按摩、递水。",
  painManagement:
    "想提前了解无痛分娩、导乐、呼吸放松、体位调整等减痛方式的适用条件、流程、费用和风险。",
  feedingPreference: "希望了解母乳、配方奶和混合喂养的可选支持方式。",
  newbornCareQuestions: "希望确认新生儿护理、疫苗、筛查和陪护流程。",
  photoVisitPreference:
    "希望在不影响医疗流程和妈妈休息的前提下再拍照或探视。",
} satisfies Pick<
  BirthPlan,
  | "birthPreferences"
  | "painManagement"
  | "feedingPreference"
  | "newbornCareQuestions"
  | "photoVisitPreference"
>;

export const BIRTH_PLAN_SHORT_FIELDS: BirthPlanShortField[] = [
  {
    key: "emergencyContact",
    label: "紧急联系人",
    placeholder: "姓名 / 电话 / 关系",
  },
  {
    key: "supportPerson",
    label: "陪产人",
    placeholder: "陪产人姓名和联系方式",
  },
  {
    key: "hospitalPhone",
    label: "医院电话",
    placeholder: "产科 / 住院处 / 急诊电话",
  },
];

export const BIRTH_PLAN_LONG_FIELDS: BirthPlanLongField[] = [
  {
    key: "medicationNotes",
    label: "过敏 / 长期用药备注",
    placeholder: "只写需要医护快速知道的信息。",
  },
  {
    key: "birthPreferences",
    label: "生产偏好",
    placeholder: "例如沟通节奏、陪产人协助擦汗、按摩、递水和记录医嘱。",
  },
  {
    key: "painManagement",
    label: "疼痛管理沟通项",
    placeholder: "记录想了解的无痛、导乐、呼吸放松、体位调整等问题。",
  },
  {
    key: "feedingPreference",
    label: "喂养偏好",
    placeholder: "记录希望了解或尝试的喂养支持方式。",
  },
  {
    key: "newbornCareQuestions",
    label: "新生儿护理待确认",
    placeholder: "记录疫苗、筛查、护理、陪护等待确认事项。",
  },
  {
    key: "photoVisitPreference",
    label: "拍照 / 探视偏好",
    placeholder: "记录家人探视和拍照边界。",
  },
];
