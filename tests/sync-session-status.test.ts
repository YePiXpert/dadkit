import { afterEach, describe, expect, it } from "vitest";

import {
  clearSyncSessionExpired,
  dismissSyncSessionExpired,
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

  it("stays dismissed until the session is rejoined or expires again", () => {
    dismissSyncSessionExpired();
    expect(getSyncSessionStatus()).toEqual({ expired: false });

    markSyncSessionExpired("家庭同步会话已失效，请重新加入。");
    dismissSyncSessionExpired();
    expect(getSyncSessionStatus()).toEqual({
      expired: true,
      message: "家庭同步会话已失效，请重新加入。",
      dismissed: true,
    });

    // 再次失效时重新弹出,重新加入后彻底复位。
    markSyncSessionExpired("家庭同步会话已失效，请重新加入。");
    expect(getSyncSessionStatus()).toEqual({
      expired: true,
      message: "家庭同步会话已失效，请重新加入。",
    });

    markSyncSessionExpired("家庭同步会话已失效，请重新加入。");
    dismissSyncSessionExpired();
    clearSyncSessionExpired();
    expect(getSyncSessionStatus()).toEqual({ expired: false });
  });
});
