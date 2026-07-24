import { getDadActionProgress, getHospitalQuestionProgress } from "@/lib/hospital/confirmation-plan";
import { buildHomeSummary } from "@/lib/presentation/home-summary";
import {
  calculateContractionStats,
  formatDuration,
  mergeBirthPlan,
  mergePostpartumTasks,
  type BirthPlan,
  type ContractionRecord,
  type PostpartumTask,
} from "@/lib/rc";
import {
  generateGoModeTasks,
  isTimelineTaskComplete,
  type TimelineTaskStatus,
} from "@/lib/timeline";
import type { ChecklistItem, HospitalAnswer, UserProfile } from "@/lib/types";

export type PreparationModuleId = "hospital" | "go" | "checklist" | "postpartum";

export type PreparationProgress = {
  completed: number;
  percent: number;
  total: number;
};

export type PreparationModule = PreparationProgress & {
  actionLabel: string;
  boundary: string;
  caption: string;
  href: string;
  id: PreparationModuleId;
  sourceLabel: string;
  title: string;
  weight: number;
};

export type PreparationNextAction = {
  caption: string;
  href: string;
  label: string;
  moduleId: PreparationModuleId;
  title: string;
};

export type PreparationContractionStatus = {
  countsTowardReadiness: false;
  detail: string;
  label: string;
  recentCount: number;
  totalCount: number;
};

export type PreparationSummary = {
  boundary: string;
  contractionStatus: PreparationContractionStatus;
  modules: PreparationModule[];
  nextAction: PreparationNextAction;
  readiness: {
    completedWeight: number;
    label: string;
    percent: number;
    totalWeight: number;
  };
  shareSummary: {
    caption: string;
    metric: string;
    title: string;
  };
};

export type BuildPreparationSummaryInput = {
  birthPlan?: Partial<BirthPlan>;
  checklist: ChecklistItem[];
  contractions?: ContractionRecord[];
  hospitalAnswers: HospitalAnswer[];
  now?: Date;
  postpartumTasks: PostpartumTask[];
  profile: UserProfile;
  timelineTaskStatuses?: TimelineTaskStatus[];
};

export const PREPARATION_MODULE_WEIGHTS: Record<PreparationModuleId, number> = {
  hospital: 30,
  go: 30,
  checklist: 25,
  postpartum: 15,
};

const PREPARATION_BOUNDARY =
  "DadKit 只整理待产准备状态和家庭沟通记录，不替代医生、医院或当地官方要求。";

function progress(total: number, completed: number): PreparationProgress {
  return {
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    total,
  };
}

function countPostpartumProgress(tasks: PostpartumTask[]) {
  const merged = mergePostpartumTasks(tasks);
  const completed = merged.filter((task) => task.status !== "todo").length;

  return progress(merged.length, completed);
}

function countBirthPlanReadiness(plan: BirthPlan) {
  const checks = [Boolean(plan.emergencyContact.trim() || plan.supportPerson.trim())];

  return progress(
    checks.length,
    checks.filter(Boolean).length,
  );
}

function countGoReadiness({
  birthPlan,
  checklist,
  hospitalAnswers,
  profile,
  timelineTaskStatuses,
}: Pick<
  BuildPreparationSummaryInput,
  "checklist" | "hospitalAnswers" | "profile" | "timelineTaskStatuses"
> & {
  birthPlan: BirthPlan;
}) {
  const goTasks = generateGoModeTasks(profile, checklist);
  const completedGoTasks = goTasks.filter((task) =>
    isTimelineTaskComplete(
      task,
      checklist,
      timelineTaskStatuses ?? [],
      hospitalAnswers,
    ),
  ).length;
  const birthPlanProgress = countBirthPlanReadiness(birthPlan);

  return progress(
    goTasks.length + birthPlanProgress.total,
    completedGoTasks + birthPlanProgress.completed,
  );
}

function buildContractionStatus(
  records: ContractionRecord[] = [],
  now?: Date,
): PreparationContractionStatus {
  const stats = calculateContractionStats(records, now);

  if (stats.count > 0) {
    return {
      countsTowardReadiness: false,
      detail: `平均间隔 ${formatDuration(stats.averageIntervalSeconds)}，平均持续 ${formatDuration(
        stats.averageDurationSeconds,
      )}`,
      label: `最近 1 小时 ${stats.count} 次记录`,
      recentCount: stats.count,
      totalCount: records.length,
    };
  }

  return {
    countsTowardReadiness: false,
    detail: "临产时可记录宫缩、破水或见红信息，方便和医院沟通。",
    label: "临产记录工具已就绪",
    recentCount: 0,
    totalCount: records.length,
  };
}

function moduleSource(progressValue: PreparationProgress) {
  return `${progressValue.completed}/${progressValue.total}`;
}

function buildModules({
  birthPlan,
  checklist,
  hospitalAnswers,
  postpartumTasks,
  profile,
  timelineTaskStatuses,
}: BuildPreparationSummaryInput & {
  birthPlan: BirthPlan;
}): PreparationModule[] {
  const homeSummary = buildHomeSummary(checklist, hospitalAnswers);
  const hospital = getHospitalQuestionProgress(hospitalAnswers);
  const dadActions = getDadActionProgress(hospitalAnswers);
  const checklistProgress = homeSummary.corePacking;
  const go = countGoReadiness({
    birthPlan,
    checklist,
    hospitalAnswers,
    profile,
    timelineTaskStatuses,
  });
  const postpartum = countPostpartumProgress(postpartumTasks);

  return [
    {
      ...hospital,
      actionLabel: "补充医院确认",
      boundary: "医院规则以医院、医生、护士和最新通知为准。",
      caption: "入院流程、提供物品、陪产探视和缴费结算",
      href: "/hospital",
      id: "hospital",
      sourceLabel: `医院规则 ${moduleSource(hospital)} · 家人确认 ${moduleSource(dadActions)}`,
      title: "医院确认",
      weight: PREPARATION_MODULE_WEIGHTS.hospital,
    },
    {
      ...go,
      actionLabel: "整理临出门行动卡",
      boundary: "Go 模式只做行动核对，不判断是否应该入院。",
      caption: "证件、联系人、付款和入院沟通卡",
      href: "/go",
      id: "go",
      sourceLabel: `行动卡 ${moduleSource(go)}`,
      title: "Go 模式行动卡",
      weight: PREPARATION_MODULE_WEIGHTS.go,
    },
    {
      ...checklistProgress,
      actionLabel: "核对核心待产包",
      boundary: "清单用于家庭准备，不做商品推荐或购买建议。",
      caption: "证件、妈妈包、宝宝包和核心必带物品",
      href: "/checklist",
      id: "checklist",
      sourceLabel: `核心清单 ${moduleSource(checklistProgress)}`,
      title: "核心待产清单",
      weight: PREPARATION_MODULE_WEIGHTS.checklist,
    },
    {
      ...postpartum,
      actionLabel: "整理产后提醒",
      boundary: "产后办理以医院、窗口和官方渠道要求为准。",
      caption: "出生证明、结算、医保、户口和复查",
      href: "/postpartum",
      id: "postpartum",
      sourceLabel: `窗口事项 ${moduleSource(postpartum)}`,
      title: "产后提醒",
      weight: PREPARATION_MODULE_WEIGHTS.postpartum,
    },
  ];
}

function weightedReadiness(modules: PreparationModule[]) {
  const totalWeight = modules.reduce((sum, module) => sum + module.weight, 0);
  const completedWeight = modules.reduce(
    (sum, module) => sum + (module.percent * module.weight) / 100,
    0,
  );
  const roundedCompleted = Math.round(completedWeight);

  return {
    completedWeight: roundedCompleted,
    label: "整体准备进度",
    percent: totalWeight === 0 ? 0 : Math.round((completedWeight / totalWeight) * 100),
    totalWeight,
  };
}

function pickNextAction(modules: PreparationModule[]): PreparationNextAction {
  const pending = modules
    .filter((item) => item.total > 0 && item.percent < 100)
    .sort((left, right) => right.weight - left.weight || left.percent - right.percent)[0];
  const nextModule = pending ?? modules[0];

  return {
    caption: nextModule.caption,
    href: nextModule.href,
    label: nextModule.actionLabel,
    moduleId: nextModule.id,
    title: nextModule.title,
  };
}

export function buildPreparationSummary(
  input: BuildPreparationSummaryInput,
): PreparationSummary {
  const birthPlan = mergeBirthPlan(input.birthPlan);
  const modules = buildModules({ ...input, birthPlan });
  const readiness = weightedReadiness(modules);
  const nextAction = pickNextAction(modules);
  const contractionStatus = buildContractionStatus(input.contractions, input.now);

  return {
    boundary: PREPARATION_BOUNDARY,
    contractionStatus,
    modules,
    nextAction,
    readiness,
    shareSummary: {
      caption: `${nextAction.title}还有待确认项。${PREPARATION_BOUNDARY}`,
      metric: `${readiness.percent}%`,
      title: "待产准备总进度",
    },
  };
}
