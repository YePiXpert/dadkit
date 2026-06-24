import { differenceInCalendarDays, parseISO } from "date-fns";

import {
  inferPreparationKind,
  isGoCheckItem,
  isShoppingListItem,
} from "@/lib/preparation";
import { normalizeChecklistItem } from "@/lib/rules";
import type { ChecklistItem, HospitalAnswer, Priority, UserProfile } from "@/lib/types";

export type TimelineStageId =
  | "six_weeks"
  | "four_weeks"
  | "three_weeks"
  | "one_week"
  | "go_time";

export type TimelineTask = {
  id: string;
  stageId: TimelineStageId;
  title: string;
  description?: string;
  relatedItemIds?: string[];
  relatedHospitalQuestionIds?: string[];
  priority: Priority;
  kind:
    | "shopping"
    | "washing"
    | "packing"
    | "documents"
    | "hospital"
    | "dad_task"
    | "go";
};

export type TimelineStage = {
  id: TimelineStageId;
  title: string;
  subtitle: string;
  targetDaysBeforeDue: number;
  tasks: TimelineTask[];
};

export type TimelineTaskStatus = {
  taskId: string;
  status: "todo" | "done" | "not_needed";
  updatedAt: string;
};

export const TIMELINE_STAGE_TITLES: Record<TimelineStageId, string> = {
  six_weeks: "先问清楚医院规则",
  four_weeks: "购买和清洗",
  three_weeks: "核心打包完成",
  one_week: "入院动线再确认",
  go_time: "现在就拿这些",
};

export const TIMELINE_KIND_LABELS: Record<TimelineTask["kind"], string> = {
  shopping: "购买",
  washing: "清洗",
  packing: "打包",
  documents: "证件",
  hospital: "医院",
  dad_task: "爸爸协作",
  go: "临出门",
};

const COMPLETE_ITEM_STATUSES = ["packed", "hospital_provided", "not_needed"];

const TODAY_PRIORITY_SCORE: Record<Priority, number> = {
  must: 300,
  recommended: 150,
  optional: 50,
};

const TODAY_KIND_SCORE: Record<TimelineTask["kind"], number> = {
  hospital: 700,
  go: 680,
  documents: 640,
  dad_task: 600,
  shopping: 560,
  packing: 540,
  washing: 420,
};

function normalizeItems(checklist: ChecklistItem[]) {
  return checklist.map(normalizeChecklistItem);
}

function task(
  stageId: TimelineStageId,
  id: string,
  title: string,
  kind: TimelineTask["kind"],
  priority: Priority,
  relatedItemIds: string[] = [],
  description?: string,
  relatedHospitalQuestionIds: string[] = [],
): TimelineTask {
  return {
    id,
    stageId,
    title,
    description,
    relatedItemIds,
    relatedHospitalQuestionIds,
    priority,
    kind,
  };
}

function relatedIds(
  items: ChecklistItem[],
  matcher: (item: ChecklistItem) => boolean,
) {
  return items.filter(matcher).map((item) => item.id);
}

function nameIncludes(item: ChecklistItem, ...keywords: string[]) {
  return keywords.some((keyword) => item.name.includes(keyword));
}

function itemComplete(item: ChecklistItem) {
  return COMPLETE_ITEM_STATUSES.includes(item.status);
}

function titleHas(task: TimelineTask, ...keywords: string[]) {
  return keywords.some((keyword) => task.title.includes(keyword));
}

function todayTaskDecisionScore(task: TimelineTask) {
  let score = TODAY_PRIORITY_SCORE[task.priority] + TODAY_KIND_SCORE[task.kind];

  if (
    task.kind === "hospital" ||
    titleHas(task, "医院", "产科", "住院", "入院", "流程")
  ) {
    score += 180;
  }

  if (task.kind === "go") {
    score += 160;
  }

  if (titleHas(task, "证件", "电话", "路线", "停车", "支付", "押金", "安全座椅")) {
    score += 120;
  }

  if (titleHas(task, "破水", "见红", "胎动异常", "联系流程")) {
    score += 260;
  }

  if (titleHas(task, "妈妈包", "宝宝包", "核心", "购物")) {
    score += 80;
  }

  if (task.title === "确认生产医院") {
    score += 150;
  }

  return score;
}

function sortTodayTasks(tasks: TimelineTask[]) {
  return tasks
    .map((taskItem, index) => ({ index, score: todayTaskDecisionScore(taskItem), taskItem }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ taskItem }) => taskItem);
}

function activeShoppingItems(items: ChecklistItem[]) {
  return items.filter(isShoppingListItem);
}

function activeWashingItems(items: ChecklistItem[]) {
  return items.filter(
    (item) => inferPreparationKind(item) === "wash_then_pack" && !itemComplete(item),
  );
}

function statusForTask(taskId: string, statuses: TimelineTaskStatus[]) {
  return statuses.find((candidate) => candidate.taskId === taskId)?.status;
}

function answerComplete(answer?: Pick<HospitalAnswer, "status">) {
  return Boolean(answer && answer.status !== "todo");
}

function relatedHospitalAnswers(
  task: TimelineTask,
  hospitalAnswers: HospitalAnswer[],
) {
  const ids = new Set(task.relatedHospitalQuestionIds ?? []);

  return hospitalAnswers.filter((answer) => ids.has(answer.itemId));
}

function relatedChecklistItems(task: TimelineTask, checklist: ChecklistItem[]) {
  const ids = new Set(task.relatedItemIds ?? []);

  return normalizeItems(checklist).filter((item) => ids.has(item.id));
}

export function getDaysUntilDue(profile: UserProfile) {
  if (!profile.dueDate) {
    return undefined;
  }

  return differenceInCalendarDays(parseISO(profile.dueDate), new Date());
}

export function getCurrentTimelineStageId(profile: UserProfile) {
  const daysLeft = getDaysUntilDue(profile);

  if (typeof daysLeft !== "number") {
    return undefined;
  }

  if (daysLeft <= 0) {
    return "go_time";
  }

  if (daysLeft <= 7) {
    return "one_week";
  }

  if (daysLeft <= 21) {
    return "three_weeks";
  }

  if (daysLeft <= 28) {
    return "four_weeks";
  }

  return "six_weeks";
}

export function generateGoModeTasks(
  profile: UserProfile,
  checklist: ChecklistItem[],
) {
  return generateTimeline(profile, checklist).find((stage) => stage.id === "go_time")
    ?.tasks ?? [];
}

export function generateTimeline(
  profile: UserProfile,
  checklist: ChecklistItem[],
): TimelineStage[] {
  void profile;

  const items = normalizeItems(checklist);
  const shoppingIds = activeShoppingItems(items).map((item) => item.id);
  const goItems = items.filter(isGoCheckItem);
  const goIds = (matcher: (item: ChecklistItem) => boolean) =>
    relatedIds(goItems, matcher);

  return [
    {
      id: "six_weeks",
      title: TIMELINE_STAGE_TITLES.six_weeks,
      subtitle: "预产期前 6 周",
      targetDaysBeforeDue: 42,
      tasks: [
        task("six_weeks", "timeline-confirm-hospital", "确认生产医院", "hospital", "must"),
        task(
          "six_weeks",
          "timeline-question-pads",
          "到下次产检问清楚医院是否提供产褥垫",
          "hospital",
          "must",
          relatedIds(
            items,
            (item) => item.itemKind === "question" && nameIncludes(item, "产褥垫"),
          ),
          undefined,
          ["question-provided-postpartum-pads"],
        ),
        task(
          "six_weeks",
          "timeline-question-diapers",
          "到下次产检问清楚医院是否提供宝宝尿不湿",
          "hospital",
          "must",
          relatedIds(
            items,
            (item) => item.itemKind === "question" && nameIncludes(item, "尿不湿"),
          ),
          undefined,
          ["question-provided-baby-diapers"],
        ),
        task(
          "six_weeks",
          "timeline-question-baby-clothes",
          "到下次产检问清楚医院是否提供宝宝衣物",
          "hospital",
          "must",
          relatedIds(
            items,
            (item) => item.itemKind === "question" && nameIncludes(item, "宝宝衣物"),
          ),
          undefined,
          ["question-provided-baby-clothes"],
        ),
        task(
          "six_weeks",
          "timeline-save-phone",
          "保存产科/住院处电话",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "产科", "住院处")),
          undefined,
          ["question-admission-phone", "question-labor-urgent-contact"],
        ),
        task(
          "six_weeks",
          "timeline-entrance-parking",
          "确认入院入口和停车方案",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "入院入口", "停车")),
          undefined,
          ["question-admission-day-entrance", "question-admission-night-route"],
        ),
      ],
    },
    {
      id: "four_weeks",
      title: TIMELINE_STAGE_TITLES.four_weeks,
      subtitle: "预产期前 4 周",
      targetDaysBeforeDue: 28,
      tasks: [
        task(
          "four_weeks",
          "timeline-shopping",
          "处理购物清单中的未完成物品",
          "shopping",
          "must",
          shoppingIds,
          "只关联可能需要购买或补货的未完成物品。",
        ),
        task(
          "four_weeks",
          "timeline-wash-baby-clothes",
          "清洗宝宝出院衣物",
          "washing",
          "must",
          relatedIds(
            items,
            (item) =>
              inferPreparationKind(item) === "wash_then_pack" &&
              nameIncludes(item, "宝宝出院衣物"),
          ),
        ),
        task(
          "four_weeks",
          "timeline-wash-blanket",
          "清洗包被 / 小毯子",
          "washing",
          "must",
          relatedIds(
            items,
            (item) =>
              inferPreparationKind(item) === "wash_then_pack" &&
              nameIncludes(item, "包被", "小毯子"),
          ),
        ),
        task(
          "four_weeks",
          "timeline-wash-mom-clothes",
          "清洗妈妈出院衣物",
          "washing",
          "must",
          relatedIds(
            items,
            (item) =>
              inferPreparationKind(item) === "wash_then_pack" &&
              nameIncludes(item, "妈妈出院衣物"),
          ),
        ),
        task(
          "four_weeks",
          "timeline-mom-core",
          "准备妈妈包核心物品",
          "packing",
          "must",
          relatedIds(
            items,
            (item) =>
              item.bag === "mom_bag" &&
              item.packTier === "core" &&
              item.itemKind !== "question",
          ),
        ),
      ],
    },
    {
      id: "three_weeks",
      title: TIMELINE_STAGE_TITLES.three_weeks,
      subtitle: "预产期前 3 周",
      targetDaysBeforeDue: 21,
      tasks: [
        task(
          "three_weeks",
          "timeline-documents-ready",
          "证件包整理好",
          "documents",
          "must",
          relatedIds(
            items,
            (item) => inferPreparationKind(item) === "document",
          ),
        ),
        task(
          "three_weeks",
          "timeline-mom-packed",
          "妈妈包核心物品完成打包",
          "packing",
          "must",
          relatedIds(
            items,
            (item) =>
              item.bag === "mom_bag" &&
              item.packTier === "core" &&
              item.itemKind !== "question",
          ),
        ),
        task(
          "three_weeks",
          "timeline-baby-packed",
          "宝宝包核心物品完成打包",
          "packing",
          "must",
          relatedIds(
            items,
            (item) =>
              item.bag === "baby_bag" &&
              item.packTier === "core" &&
              item.itemKind !== "question",
          ),
        ),
        task(
          "three_weeks",
          "timeline-dad-backpack",
          "爸爸背包准备好",
          "packing",
          "recommended",
          relatedIds(
            items,
            (item) =>
              item.bag === "dad_backpack" &&
              item.packTier === "core" &&
              item.itemKind !== "question",
          ),
        ),
        task(
          "three_weeks",
          "timeline-hospital-questions-recorded",
          "确认医院待问事项是否已经记录",
          "hospital",
          "recommended",
          relatedIds(
            items,
            (item) => item.itemKind === "question" || item.category === "hospital_questions",
          ),
          undefined,
          [
            "question-provided-postpartum-pads",
            "question-provided-baby-diapers",
            "question-provided-baby-clothes",
            "question-admission-day-entrance",
            "question-admission-night-route",
          ],
        ),
      ],
    },
    {
      id: "one_week",
      title: TIMELINE_STAGE_TITLES.one_week,
      subtitle: "预产期前 1 周",
      targetDaysBeforeDue: 7,
      tasks: [
        task(
          "one_week",
          "timeline-night-route",
          "确认夜间入院路线",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "夜间入院", "急诊入院")),
          undefined,
          ["question-admission-night-route"],
        ),
        task(
          "one_week",
          "timeline-parking",
          "确认停车方案",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "停车")),
          undefined,
          ["question-admission-day-entrance", "question-admission-night-route"],
        ),
        task(
          "one_week",
          "timeline-payment-deposit",
          "确认支付方式和住院押金",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "支付", "押金")),
          undefined,
          ["question-payment-deposit", "question-payment-methods"],
        ),
        task(
          "one_week",
          "timeline-insurance-payment",
          "确认医保结算方式",
          "hospital",
          "must",
          relatedIds(
            items,
            (item) =>
              item.itemKind === "question" && nameIncludes(item, "医保结算"),
          ),
          undefined,
          ["question-payment-insurance"],
        ),
        task(
          "one_week",
          "timeline-partner-id",
          "确认陪产人证件",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "陪产人", "身份证件")),
          undefined,
          ["question-partner-allowed", "question-partner-documents"],
        ),
        task(
          "one_week",
          "timeline-labor-alert-flow",
          "确认破水/见红较多/胎动异常时的联系流程",
          "dad_task",
          "must",
          relatedIds(
            items,
            (item) =>
              item.itemKind === "question" &&
              nameIncludes(item, "破水", "见红", "胎动异常"),
          ),
          "保存产科、急诊或住院处电话，并确认白天/夜间应该走哪条路线。",
          ["question-labor-urgent-contact", "question-admission-night-route"],
        ),
        task(
          "one_week",
          "timeline-birth-plan-share",
          "把临出门沟通卡发给陪产人",
          "dad_task",
          "recommended",
          [],
          "提前说清楚无痛/导乐沟通项，以及擦汗、按摩、递水、记录医嘱的分工。",
        ),
        task(
          "one_week",
          "timeline-car-seat-install",
          "确认安全座椅安装",
          "dad_task",
          "must",
          relatedIds(items, (item) => nameIncludes(item, "安全座椅")),
        ),
      ],
    },
    {
      id: "go_time",
      title: TIMELINE_STAGE_TITLES.go_time,
      subtitle: "临出门",
      targetDaysBeforeDue: 0,
      tasks: [
        task(
          "go_time",
          "timeline-go-documents",
          "证件包",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "证件包")),
        ),
        task(
          "go_time",
          "timeline-go-phone",
          "手机",
          "go",
          "must",
          goIds((item) => item.name === "手机" || nameIncludes(item, "手机")),
        ),
        task(
          "go_time",
          "timeline-go-charger",
          "充电器",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "充电器", "充电线")),
        ),
        task(
          "go_time",
          "timeline-go-glasses",
          "眼镜 / 隐形眼镜",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "眼镜", "隐形眼镜")),
        ),
        task(
          "go_time",
          "timeline-go-medicine",
          "常用药清单 / 医生确认用药",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "常用药", "医生确认用药")),
        ),
        task(
          "go_time",
          "timeline-go-mom-bag",
          "妈妈包",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "妈妈包")),
        ),
        task(
          "go_time",
          "timeline-go-baby-bag",
          "宝宝包",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "宝宝包")),
        ),
        task(
          "go_time",
          "timeline-go-car-seat",
          "安全座椅确认",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "安全座椅")),
        ),
        task(
          "go_time",
          "timeline-go-labor-signal-note",
          "记录破水/见红/胎动异常情况",
          "go",
          "must",
          [],
          "用宫缩记录备注写下时间、颜色/量、胎动变化和已联系的医院电话。",
        ),
        task(
          "go_time",
          "timeline-go-home-check",
          "关门窗水电燃气",
          "go",
          "must",
          goIds((item) => nameIncludes(item, "关门窗水电燃气")),
        ),
      ],
    },
  ];
}

export function isTimelineTaskComplete(
  task: TimelineTask,
  checklist: ChecklistItem[],
  statuses: TimelineTaskStatus[] = [],
  hospitalAnswers: HospitalAnswer[] = [],
) {
  const explicitStatus = statusForTask(task.id, statuses);

  if (explicitStatus === "done" || explicitStatus === "not_needed") {
    return true;
  }

  if (explicitStatus === "todo") {
    return false;
  }

  const questionIds = task.relatedHospitalQuestionIds ?? [];

  if (questionIds.length > 0) {
    const answers = relatedHospitalAnswers(task, hospitalAnswers);

    if (
      answers.length === questionIds.length &&
      answers.every(answerComplete)
    ) {
      return true;
    }
  }

  const items = normalizeItems(checklist);

  if (task.kind === "shopping") {
    return activeShoppingItems(items).length === 0;
  }

  if (task.kind === "washing" && !task.relatedItemIds?.length) {
    return activeWashingItems(items).length === 0;
  }

  const relatedItems = relatedChecklistItems(task, items);

  if (task.kind === "documents" && relatedItems.length === 0) {
    return items
      .filter((item) => inferPreparationKind(item) === "document")
      .every(itemComplete);
  }

  if (relatedItems.length === 0) {
    return false;
  }

  return relatedItems.every(itemComplete);
}

export function generateTodayTasks(
  profile: UserProfile,
  checklist: ChecklistItem[],
  statuses: TimelineTaskStatus[] = [],
  hospitalAnswers: HospitalAnswer[] = [],
): TimelineTask[] {
  const currentStageId = getCurrentTimelineStageId(profile);

  if (!currentStageId) {
    return [];
  }

  const timeline = generateTimeline(profile, checklist);
  const currentStageIndex = timeline.findIndex((stage) => stage.id === currentStageId);
  const stagesToScan =
    currentStageIndex >= 0 ? timeline.slice(currentStageIndex) : timeline;
  const pendingCurrentStageTasks =
    stagesToScan[0]?.tasks.filter(
      (candidate) =>
        !isTimelineTaskComplete(candidate, checklist, statuses, hospitalAnswers),
    ) ?? [];

  if (pendingCurrentStageTasks.length > 0) {
    return sortTodayTasks(pendingCurrentStageTasks);
  }

  return sortTodayTasks(
    stagesToScan
    .slice(1)
    .flatMap((stage) => stage.tasks)
    .filter(
      (candidate) =>
        !isTimelineTaskComplete(candidate, checklist, statuses, hospitalAnswers),
    ),
  );
}

export function calculateTimelineStageStatus(
  stage: TimelineStage,
  checklist: ChecklistItem[],
  statuses: TimelineTaskStatus[] = [],
  hospitalAnswers: HospitalAnswer[] = [],
) {
  const total = stage.tasks.length;
  const completed = stage.tasks.filter((taskItem) =>
    isTimelineTaskComplete(taskItem, checklist, statuses, hospitalAnswers),
  ).length;

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
