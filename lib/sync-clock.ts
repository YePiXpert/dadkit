const SYNC_CLOCK_OFFSET_KEY = "dadkit:v3:sync-clock-offset-ms";
const SYNC_CLOCK_TIMELINE_INITIALIZED_KEY =
  "dadkit:v3:sync-clock-timeline-initialized";
export const MAX_SYNC_CLOCK_OFFSET_MS = 24 * 60 * 60 * 1_000;

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getSyncClockOffset() {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(SYNC_CLOCK_OFFSET_KEY);
    const offset = raw === null ? Number.NaN : Number(raw);

    return Number.isFinite(offset) ? offset : undefined;
  } catch {
    return undefined;
  }
}

export function saveSyncClockOffset(offset: number | undefined) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    if (offset === undefined || !Number.isFinite(offset)) {
      window.localStorage.removeItem(SYNC_CLOCK_OFFSET_KEY);
      return;
    }

    window.localStorage.setItem(SYNC_CLOCK_OFFSET_KEY, String(Math.round(offset)));
  } catch {
    // Clock correction is an enhancement; a storage failure must not block sync.
  }
}

export function getSyncClockTimelineInitialized() {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(SYNC_CLOCK_TIMELINE_INITIALIZED_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function saveSyncClockTimelineInitialized(initialized: boolean) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    if (initialized) {
      window.localStorage.setItem(SYNC_CLOCK_TIMELINE_INITIALIZED_KEY, "1");
    } else {
      window.localStorage.removeItem(SYNC_CLOCK_TIMELINE_INITIALIZED_KEY);
    }
  } catch {
    // Timeline correction is an enhancement; a storage failure must not block sync.
  }
}

export function estimateSyncClockOffset(
  serverTime: string | undefined,
  receivedAt = Date.now(),
  requestStartedAt = receivedAt,
) {
  const timestamp = serverTime ? Date.parse(serverTime) : Number.NaN;

  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(requestStartedAt) ||
    !Number.isFinite(receivedAt) ||
    requestStartedAt > receivedAt
  ) {
    return undefined;
  }

  const roundTripMidpoint = requestStartedAt + (receivedAt - requestStartedAt) / 2;
  const offset = timestamp - roundTripMidpoint;

  return Math.min(
    MAX_SYNC_CLOCK_OFFSET_MS,
    Math.max(-MAX_SYNC_CLOCK_OFFSET_MS, offset),
  );
}

export function getSyncAdjustedNow(now = Date.now()) {
  const offset = getSyncClockOffset();

  return offset === undefined ? now : now + offset;
}

export { SYNC_CLOCK_OFFSET_KEY, SYNC_CLOCK_TIMELINE_INITIALIZED_KEY };
