// 同步数据格式固定为 v11。旧版本协商(v5-v10)已下线;本地 JSON 导入的
// 旧格式升级仍由 lib/data/format.ts 的 upgradeExportDataToLatest 负责。
export const SYNC_DATA_VERSION = 11 as const;

export function createSyncEtag(revision: number) {
  return `"dadkit-sync-${revision}-v${SYNC_DATA_VERSION}"`;
}
