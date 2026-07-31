import {
  migrateHiddenStamps,
  sanitizeDadKitImportData,
  type DadKitExportData,
  type DadKitImportData,
  type DeletedCustomItemStamps,
  type HiddenTemplateItemStamps,
} from "@/lib/data/format";
import type { ChecklistItem } from "@/lib/types";

// 多端条目级合并:同一对象(updatedAt 新者胜),删除墓碑优先于更旧的数据。
// 客户端拉取后、服务端接收推送时都使用这一个纯函数,保证两端语义一致。

function timestampOf(item: ChecklistItem): number {
  return typeof item.updatedAt === "number" && Number.isFinite(item.updatedAt)
    ? item.updatedAt
    : 0;
}

function mergeItemLists(
  local: ChecklistItem[],
  remote: ChecklistItem[],
): ChecklistItem[] {
  const merged = new Map<string, ChecklistItem>();

  for (const item of local) {
    merged.set(item.id, item);
  }

  for (const item of remote) {
    const existing = merged.get(item.id);

    if (!existing || timestampOf(item) > timestampOf(existing)) {
      merged.set(item.id, item);
    }
  }

  return [...merged.values()];
}

function mergeHiddenStamps(
  local: HiddenTemplateItemStamps,
  remote: HiddenTemplateItemStamps,
): HiddenTemplateItemStamps {
  const merged: HiddenTemplateItemStamps = { ...local };

  for (const [id, stamp] of Object.entries(remote)) {
    const existing = merged[id];

    if (!existing || stamp.updatedAt > existing.updatedAt) {
      merged[id] = stamp;
    }
  }

  return merged;
}

function mergeTombstones(
  local: DeletedCustomItemStamps,
  remote: DeletedCustomItemStamps,
): DeletedCustomItemStamps {
  const merged: DeletedCustomItemStamps = { ...local };

  for (const [id, timestamp] of Object.entries(remote)) {
    if (!(id in merged) || timestamp > merged[id]) {
      merged[id] = timestamp;
    }
  }

  return merged;
}

function keepsCustomItem(
  item: ChecklistItem,
  tombstones: DeletedCustomItemStamps,
): boolean {
  const deletedAt = tombstones[item.id];
  return deletedAt === undefined || deletedAt <= timestampOf(item);
}

export function mergeExportData(
  local: DadKitExportData,
  remote: DadKitImportData,
): DadKitExportData {
  const cleanLocal = sanitizeDadKitImportData(local) as DadKitExportData;
  const cleanRemote = sanitizeDadKitImportData(remote);
  const remoteStamps =
    cleanRemote.version === 5
      ? cleanRemote.hiddenTemplateItemStamps
      : migrateHiddenStamps(cleanRemote.hiddenTemplateItemIds, 0);
  const remoteTombstones =
    cleanRemote.version === 5 ? cleanRemote.deletedCustomItems : {};
  const remoteGrowth = cleanRemote.version === 3 ? undefined : cleanRemote.growth;
  const remoteGrowthUpdatedAt =
    cleanRemote.version === 5 ? cleanRemote.growthUpdatedAt : 0;

  const hiddenTemplateItemStamps = mergeHiddenStamps(
    cleanLocal.hiddenTemplateItemStamps,
    remoteStamps,
  );
  const deletedCustomItems = mergeTombstones(
    cleanLocal.deletedCustomItems,
    remoteTombstones,
  );
  const customItems = mergeItemLists(cleanLocal.customItems, cleanRemote.customItems).filter(
    (item) => keepsCustomItem(item, deletedCustomItems),
  );
  const checklist = mergeItemLists(cleanLocal.checklist, cleanRemote.checklist).filter(
    (item) => item.source !== "user" || keepsCustomItem(item, deletedCustomItems),
  );
  const remoteGrowthWins =
    remoteGrowth !== undefined && remoteGrowthUpdatedAt > cleanLocal.growthUpdatedAt;

  return {
    version: 5,
    exportedAt: new Date().toISOString(),
    // 精简/完整模式是设备偏好,不随同步走。
    checklistMode: cleanLocal.checklistMode,
    checklist,
    customItems,
    hiddenTemplateItemIds: Object.entries(hiddenTemplateItemStamps)
      .filter(([, stamp]) => stamp.hidden)
      .map(([id]) => id)
      .sort(),
    growth: remoteGrowthWins ? remoteGrowth : cleanLocal.growth,
    hiddenTemplateItemStamps,
    deletedCustomItems,
    growthUpdatedAt: remoteGrowthWins
      ? remoteGrowthUpdatedAt
      : cleanLocal.growthUpdatedAt,
  };
}
