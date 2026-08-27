// 家庭计划(物品分工/价格/渠道)已在 v3.4.13 下线。此文件只为旧数据格式保留:
// 导入 v7-v9 备份时 planning 字段整体忽略;向旧客户端投影时下发空计划。
type StampedValue<T> = {
  value: T;
  updatedAt: number;
};

export type LegacyItemPlanningRecordV1 = {
  assignee: StampedValue<string>;
  dueDate: StampedValue<string>;
  estimatedPriceFen: StampedValue<number | null>;
  actualPriceFen: StampedValue<number | null>;
  purchaseChannel: StampedValue<string>;
  storageLocation: StampedValue<string>;
};

export type LegacyItemPlanningDataV1 = {
  version: 1;
  clearedAt: number;
  items: Record<string, LegacyItemPlanningRecordV1>;
};

export type LegacyItemPlanningRecordV2 = {
  assigneeIds: StampedValue<string[]>;
  dueDate: StampedValue<string>;
  estimatedPriceFen: StampedValue<number | null>;
  actualPriceFen: StampedValue<number | null>;
  purchaseChannel: StampedValue<string>;
  storageLocation: StampedValue<string>;
};

export type LegacyItemPlanningDataV2 = {
  version: 2;
  clearedAt: number;
  items: Record<string, LegacyItemPlanningRecordV2>;
};

export function createEmptyLegacyPlanningV1(): LegacyItemPlanningDataV1 {
  return { version: 1, clearedAt: 0, items: {} };
}

export function createEmptyLegacyPlanningV2(): LegacyItemPlanningDataV2 {
  return { version: 2, clearedAt: 0, items: {} };
}
