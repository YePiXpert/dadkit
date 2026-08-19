import {
  upgradeExportDataToLatest,
  type DadKitExportData,
  type DadKitImportData,
  type DeletedCustomItemStamps,
  type HiddenTemplateItemStamps,
} from "@/lib/data/format";
import { mergeBabyData } from "@/lib/baby/merge";
import { mergeHospitalProfiles } from "@/lib/hospital/merge";
import { mergeHousehold } from "@/lib/household/merge";
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

export type ChecklistMergeDocument = {
  checklist: ChecklistItem[];
  customItems: ChecklistItem[];
  hiddenTemplateItemStamps: HiddenTemplateItemStamps;
  deletedCustomItems: DeletedCustomItemStamps;
};

export function mergeChecklistDocuments(
  local: ChecklistMergeDocument,
  remote: ChecklistMergeDocument,
) {
  const hiddenTemplateItemStamps = mergeHiddenStamps(
    local.hiddenTemplateItemStamps,
    remote.hiddenTemplateItemStamps,
  );
  const deletedCustomItems = mergeTombstones(
    local.deletedCustomItems,
    remote.deletedCustomItems,
  );
  const customItems = mergeItemLists(local.customItems, remote.customItems).filter(
    (item) => keepsCustomItem(item, deletedCustomItems),
  );
  const checklist = mergeItemLists(local.checklist, remote.checklist).filter(
    (item) => item.source !== "user" || keepsCustomItem(item, deletedCustomItems),
  );

  return {
    checklist,
    customItems,
    hiddenTemplateItemIds: Object.entries(hiddenTemplateItemStamps)
      .filter(([, stamp]) => stamp.hidden)
      .map(([id]) => id)
      .sort(),
    hiddenTemplateItemStamps,
    deletedCustomItems,
  };
}

export function mergeExportData(
  local: DadKitExportData,
  remote: DadKitImportData,
): DadKitExportData {
  const cleanLocal = upgradeExportDataToLatest(local);
  const cleanRemote = upgradeExportDataToLatest(remote);
  if (remote.version < 9) {
    const localEvents = new Map(cleanLocal.baby.care.events.map((event) => [event.id, event]));
    cleanRemote.baby.care.events = cleanRemote.baby.care.events.map((event) => ({
      ...event,
      recordedByMemberId: localEvents.get(event.id)?.recordedByMemberId ?? null,
    }));
  }

  const checklistDocument = mergeChecklistDocuments(cleanLocal, cleanRemote);
  const remoteGrowthWins =
    cleanRemote.growthUpdatedAt > cleanLocal.growthUpdatedAt;

  return {
    version: 10,
    exportedAt: new Date().toISOString(),
    // 精简/完整模式是设备偏好,不随同步走。
    checklistMode: cleanLocal.checklistMode,
    checklist: checklistDocument.checklist,
    customItems: checklistDocument.customItems,
    hiddenTemplateItemIds: checklistDocument.hiddenTemplateItemIds,
    growth: remoteGrowthWins ? cleanRemote.growth : cleanLocal.growth,
    hiddenTemplateItemStamps: checklistDocument.hiddenTemplateItemStamps,
    deletedCustomItems: checklistDocument.deletedCustomItems,
    growthUpdatedAt: remoteGrowthWins
      ? cleanRemote.growthUpdatedAt
      : cleanLocal.growthUpdatedAt,
    hospital: mergeHospitalProfiles(cleanLocal.hospital, cleanRemote.hospital),
    baby: mergeBabyData(cleanLocal.baby, cleanRemote.baby),
    household: mergeHousehold(cleanLocal.household, cleanRemote.household),
  };
}

export const mergeCanonicalExportData = mergeExportData;
