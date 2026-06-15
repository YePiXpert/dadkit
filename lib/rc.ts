import { DEFAULT_BIRTH_PLAN_LABOR_PROMPTS } from "@/lib/labor-guide";

export type ContractionRecord = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  intervalSeconds?: number;
  note?: string;
};

export type BirthPlan = {
  emergencyContact: string;
  supportPerson: string;
  hospitalPhone: string;
  medicationNotes: string;
  birthPreferences: string;
  painManagement: string;
  feedingPreference: string;
  newbornCareQuestions: string;
  photoVisitPreference: string;
};

export type PostpartumTaskStatus = "todo" | "done" | "not_needed";

export type PostpartumTaskGroup =
  | "birth_certificate"
  | "discharge_billing"
  | "insurance"
  | "household"
  | "postpartum_check"
  | "newborn_check";

export type PostpartumTask = {
  id: string;
  group: PostpartumTaskGroup;
  title: string;
  status: PostpartumTaskStatus;
  note?: string;
};

export type ContractionStats = {
  count: number;
  averageDurationSeconds?: number;
  averageIntervalSeconds?: number;
};

export const POSTPARTUM_GROUP_LABELS: Record<PostpartumTaskGroup, string> = {
  birth_certificate: "出生医学证明",
  discharge_billing: "出院结算",
  insurance: "医保/生育保险",
  household: "户口/居住地相关",
  postpartum_check: "产后复查",
  newborn_check: "新生儿复查",
};

export const POSTPARTUM_STATUS_LABELS: Record<PostpartumTaskStatus, string> = {
  todo: "待确认",
  done: "已确认",
  not_needed: "不适用",
};

export const DEFAULT_BIRTH_PLAN: BirthPlan = {
  emergencyContact: "",
  supportPerson: "",
  hospitalPhone: "",
  medicationNotes: "",
  ...DEFAULT_BIRTH_PLAN_LABOR_PROMPTS,
};

export const DEFAULT_POSTPARTUM_TASKS: PostpartumTask[] = [
  {
    id: "postpartum-birth-certificate-materials",
    group: "birth_certificate",
    title: "确认出生医学证明办理材料",
    status: "todo",
  },
  {
    id: "postpartum-birth-certificate-location",
    group: "birth_certificate",
    title: "确认出生医学证明办理地点和时间",
    status: "todo",
  },
  {
    id: "postpartum-discharge-billing",
    group: "discharge_billing",
    title: "确认出院结算流程和押金退还",
    status: "todo",
  },
  {
    id: "postpartum-discharge-documents",
    group: "discharge_billing",
    title: "确认出院小结、费用清单和发票保存方式",
    status: "todo",
  },
  {
    id: "postpartum-insurance-materials",
    group: "insurance",
    title: "确认医保/生育保险报销所需材料",
    status: "todo",
  },
  {
    id: "postpartum-insurance-location",
    group: "insurance",
    title: "确认线上或线下提交渠道",
    status: "todo",
  },
  {
    id: "postpartum-household",
    group: "household",
    title: "确认户口/居住地相关办理口径",
    status: "todo",
    note: "北京/玉泉等具体场景先作为备注记录，最终以当地窗口和医院要求为准。",
  },
  {
    id: "postpartum-mom-check",
    group: "postpartum_check",
    title: "确认妈妈产后复查时间和地点",
    status: "todo",
  },
  {
    id: "postpartum-newborn-check",
    group: "newborn_check",
    title: "确认新生儿复查、疫苗和筛查安排",
    status: "todo",
  },
];

export function mergeBirthPlan(saved?: Partial<BirthPlan>): BirthPlan {
  return {
    ...DEFAULT_BIRTH_PLAN,
    ...(saved ?? {}),
  };
}

export function mergePostpartumTasks(saved: PostpartumTask[] = []) {
  const savedById = new Map(saved.map((task) => [task.id, task]));
  const mergedDefaults = DEFAULT_POSTPARTUM_TASKS.map((task) => ({
    ...task,
    ...savedById.get(task.id),
  }));
  const customTasks = saved.filter(
    (task) => !DEFAULT_POSTPARTUM_TASKS.some((defaultTask) => defaultTask.id === task.id),
  );

  return [...mergedDefaults, ...customTasks];
}

export function secondsBetween(startedAt: string, endedAt: string) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();

  return Math.max(0, Math.round((end - start) / 1000));
}

export function createContractionRecord(
  input: {
    id: string;
    startedAt: string;
    endedAt: string;
    note?: string;
  },
  existingRecords: ContractionRecord[] = [],
): ContractionRecord {
  const previous = existingRecords
    .filter((record) => new Date(record.startedAt).getTime() < new Date(input.startedAt).getTime())
    .sort(
      (left, right) =>
        new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
    )[0];
  const intervalSeconds = previous
    ? secondsBetween(previous.startedAt, input.startedAt)
    : undefined;

  return {
    id: input.id,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    durationSeconds: secondsBetween(input.startedAt, input.endedAt),
    intervalSeconds,
    note: input.note?.trim() || undefined,
  };
}

export function calculateContractionStats(
  records: ContractionRecord[],
  now = new Date(),
): ContractionStats {
  const cutoff = now.getTime() - 60 * 60 * 1000;
  const recent = records
    .filter((record) => new Date(record.startedAt).getTime() >= cutoff)
    .sort(
      (left, right) =>
        new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime(),
    );
  const durationValues = recent.map((record) => record.durationSeconds);
  const intervalValues = recent
    .map((record, index) => {
      if (index === 0) {
        return undefined;
      }

      return secondsBetween(recent[index - 1].startedAt, record.startedAt);
    })
    .filter((value): value is number => typeof value === "number");

  return {
    count: recent.length,
    averageDurationSeconds: averageSeconds(durationValues),
    averageIntervalSeconds: averageSeconds(intervalValues),
  };
}

export function formatDuration(seconds?: number) {
  if (typeof seconds !== "number") {
    return "暂无";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (minutes <= 0) {
    return `${rest}秒`;
  }

  if (rest === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${rest}秒`;
}

export function generateContractionsShareText(records: ContractionRecord[]) {
  const sorted = [...records].sort(
    (left, right) =>
      new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
  const stats = calculateContractionStats(records);

  return [
    "DadKit 宫缩记录",
    "提醒：是否去医院以医生/医院要求为准，本记录只用于沟通。",
    "",
    `最近1小时：${stats.count} 次`,
    `平均间隔：${formatDuration(stats.averageIntervalSeconds)}`,
    `平均持续：${formatDuration(stats.averageDurationSeconds)}`,
    "",
    "## 明细",
    sorted.length > 0
      ? sorted
          .map(
            (record) =>
              `- ${formatDateTime(record.startedAt)}，持续 ${formatDuration(
                record.durationSeconds,
              )}，间隔 ${formatDuration(record.intervalSeconds)}${
                record.note ? `，备注：${record.note}` : ""
              }`,
          )
          .join("\n")
      : "- 暂无记录",
  ].join("\n");
}

export function generateBirthPlanShareText(plan: BirthPlan) {
  const merged = mergeBirthPlan(plan);

  return [
    "DadKit 分娩偏好 / 入院沟通卡",
    "提醒：这不是医疗建议，只是方便爸爸、护士和医生快速沟通。",
    "",
    `紧急联系人：${valueOrEmpty(merged.emergencyContact)}`,
    `陪产人：${valueOrEmpty(merged.supportPerson)}`,
    `医院电话：${valueOrEmpty(merged.hospitalPhone)}`,
    `过敏/长期用药备注：${valueOrEmpty(merged.medicationNotes)}`,
    "",
    "## 沟通偏好",
    `生产偏好：${valueOrEmpty(merged.birthPreferences)}`,
    `疼痛管理沟通项：${valueOrEmpty(merged.painManagement)}`,
    `喂养偏好：${valueOrEmpty(merged.feedingPreference)}`,
    `新生儿护理待确认：${valueOrEmpty(merged.newbornCareQuestions)}`,
    `拍照/探视偏好：${valueOrEmpty(merged.photoVisitPreference)}`,
  ].join("\n");
}

export function generatePostpartumShareText(tasks: PostpartumTask[]) {
  const merged = mergePostpartumTasks(tasks);

  return [
    "DadKit 产后办理待确认",
    "提醒：各地和各医院政策可能不同，请以医院、窗口和官方渠道要求为准。",
    "",
    ...Object.entries(POSTPARTUM_GROUP_LABELS).map(([group, label]) => {
      const groupTasks = merged.filter((task) => task.group === group);

      return [
        `## ${label}`,
        ...groupTasks.map(
          (task) =>
            `- [${POSTPARTUM_STATUS_LABELS[task.status]}] ${task.title}${
              task.note ? `；备注：${task.note}` : ""
            }`,
        ),
      ].join("\n");
    }),
  ].join("\n");
}

function averageSeconds(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function valueOrEmpty(value: string) {
  return value.trim() || "待填写";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
    2,
    "0",
  )}:${String(date.getMinutes()).padStart(2, "0")}`;
}
