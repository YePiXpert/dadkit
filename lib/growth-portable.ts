import {
  GROWTH_CHECKUP_TASK_IDS,
  isIsoCalendarDate,
} from "@/lib/growth";

// 成长记可移植数据(备份/家庭同步)的类型与校验。
// 单独放在无 "use client" 的模块里:服务端 API 路由(sync/push)也要调用,
// 从 "use client" 的 growth-store 导入会在服务端运行时报错。

export type GrowthProfileData = {
  nickname: string;
  dueDate: string;
};

export type GrowthProgressData = {
  completedTaskIds: string[];
};

export type GrowthPortableData = {
  version: 1;
  profile: GrowthProfileData;
  progress: GrowthProgressData;
};

export function normalizeNickname(value: string) {
  return value.replace(/\s+/g, " ").trimStart().slice(0, 20);
}

export function isGrowthTaskId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    GROWTH_CHECKUP_TASK_IDS.includes(value)
  );
}

export function validateGrowthPortableData(
  value: unknown,
): value is GrowthPortableData {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["version", "profile", "progress"]) ||
    value.version !== 1
  ) {
    return false;
  }

  if (
    !isRecord(value.profile) ||
    !hasExactKeys(value.profile, ["nickname", "dueDate"]) ||
    !isRecord(value.progress) ||
    !hasExactKeys(value.progress, ["completedTaskIds"])
  ) {
    return false;
  }

  const { nickname, dueDate } = value.profile;
  const { completedTaskIds } = value.progress;

  return (
    typeof nickname === "string" &&
    nickname === normalizeNickname(nickname) &&
    typeof dueDate === "string" &&
    (dueDate === "" || isIsoCalendarDate(dueDate)) &&
    Array.isArray(completedTaskIds) &&
    completedTaskIds.every(isGrowthTaskId) &&
    new Set(completedTaskIds).size === completedTaskIds.length &&
    completedTaskIds.every(
      (taskId, index) =>
        index === 0 ||
        GROWTH_CHECKUP_TASK_IDS.indexOf(completedTaskIds[index - 1]) <
          GROWTH_CHECKUP_TASK_IDS.indexOf(taskId),
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();

  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
}
