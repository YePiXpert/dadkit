import { afterEach, describe, expect, it } from "vitest";

import {
  clearSyncSessionExpired,
  getSyncSessionStatus,
  markSyncSessionExpired,
} from "@/lib/sync-session-status";

afterEach(() => {
  clearSyncSessionExpired();
});

describe("sync session expiry status", () => {
  it("keeps an actionable expired-session state until the user rejoins", () => {
    markSyncSessionExpired("家庭同步会话已失效，请重新加入。");

    expect(getSyncSessionStatus()).toEqual({
      expired: true,
      message: "家庭同步会话已失效，请重新加入。",
    });

    clearSyncSessionExpired();
    expect(getSyncSessionStatus()).toEqual({ expired: false });
  });
});
