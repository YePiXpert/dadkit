import {
  buildHomeReadinessMetrics,
  buildHomeSummary,
} from "@/lib/presentation/home-summary";
import { mergePostpartumTasks, type PostpartumTask } from "@/lib/rc";
import type { ChecklistItem, HospitalAnswer } from "@/lib/types";

export type PlanPillarId = "hospital" | "core_bag" | "go_card" | "postpartum";

export type PlanPillar = {
  id: PlanPillarId;
  title: string;
  href: string;
  caption: string;
  actionLabel: string;
  sourceLabel: string;
  boundary: string;
  completed: number;
  total: number;
  percent: number;
};

type BuildPlanPillarsInput = {
  checklist: ChecklistItem[];
  hospitalAnswers: HospitalAnswer[];
  postpartumTasks: PostpartumTask[];
};

function countPostpartumProgress(tasks: PostpartumTask[]) {
  const merged = mergePostpartumTasks(tasks);
  const completed = merged.filter((task) => task.status !== "todo").length;

  return {
    completed,
    percent: merged.length === 0 ? 0 : Math.round((completed / merged.length) * 100),
    total: merged.length,
  };
}

export function buildPlanPillars({
  checklist,
  hospitalAnswers,
  postpartumTasks,
}: BuildPlanPillarsInput): PlanPillar[] {
  const [corePacking, hospital, go] = buildHomeReadinessMetrics(
    buildHomeSummary(checklist, hospitalAnswers),
  );
  const postpartum = countPostpartumProgress(postpartumTasks);

  return [
    {
      id: "hospital",
      title: "医院确认",
      href: "/hospital",
      caption: "入院流程、医院提供物品、陪产和缴费",
      actionLabel: "补充医院确认",
      sourceLabel: "待问医院 / 已记录",
      boundary: "轻模板和用户记录，不代表官方入院要求。",
      completed: hospital.completed,
      total: hospital.total,
      percent: hospital.percent,
    },
    {
      id: "core_bag",
      title: "核心待产包",
      href: "/checklist",
      caption: "证件、妈妈包、宝宝包和必须确认项",
      actionLabel: "核对核心清单",
      sourceLabel: "核心 / 待确认",
      boundary: "只整理准备清单，不做购物推荐或商品导购。",
      completed: corePacking.completed,
      total: corePacking.total,
      percent: corePacking.percent,
    },
    {
      id: "go_card",
      title: "临出门沟通卡",
      href: "/birth-plan",
      caption: "电话、路线、联系人和入院沟通偏好",
      actionLabel: "填写沟通卡",
      sourceLabel: "用户填写 / 入院沟通",
      boundary: "只辅助家人和医护沟通，不判断是否入院。",
      completed: go.completed,
      total: go.total,
      percent: go.percent,
    },
    {
      id: "postpartum",
      title: "产后提醒",
      href: "/postpartum",
      caption: "出生证明、结算、保险、户口和复查",
      actionLabel: "整理产后提醒",
      sourceLabel: "窗口待确认",
      boundary: "各地口径可能不同，以医院、窗口和官方渠道为准。",
      completed: postpartum.completed,
      total: postpartum.total,
      percent: postpartum.percent,
    },
  ];
}
