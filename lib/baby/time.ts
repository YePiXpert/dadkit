export function isIsoUtcTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function durationBetween(startAt: string, endAt: string | null, now = Date.now()) {
  const start = Date.parse(startAt);
  const end = endAt === null ? now : Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

export function formatCareDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}小时${minutes}分`;
  if (minutes > 0) return `${minutes}分${remainingSeconds}秒`;
  return `${remainingSeconds}秒`;
}

export function formatCareRelativeTime(time: string, now = Date.now()) {
  const timestamp = Date.parse(time);
  if (!Number.isFinite(timestamp)) return "时间未知";
  const difference = Math.max(0, now - timestamp);
  if (difference < 60_000) return "刚刚";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)} 分钟前`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)} 小时前`;
  return `${Math.floor(difference / 86_400_000)} 天前`;
}

export function careEventSortTime(event: { startAt?: string; occurredAt?: string }) {
  return Date.parse(event.startAt ?? event.occurredAt ?? "") || 0;
}
