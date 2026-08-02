import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";
import { loadSyncSession } from "@/lib/storage";
import { takeInviteFromLocation } from "@/lib/sync/client-invite";
import { upgradeLegacySyncSession } from "@/lib/sync/client";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const space = {
  spaceId: "a".repeat(64),
  kind: "legacy-name" as const,
  displayName: "家庭同步",
  dataRevision: 0,
  metadataRevision: 1,
  dataUpdatedAt: "2026-08-01T00:00:00.000Z",
  metadataUpdatedAt: "2026-08-01T00:00:00.000Z",
  currentSession: {
    id: "b".repeat(64),
    current: true,
    createdAt: "2026-08-01T00:00:00.000Z",
    lastSeenAt: "2026-08-01T00:00:00.000Z",
    deviceName: "手机",
    role: "owner" as const,
    protocolVersion: 2 as const,
  },
  usage: { dataBytes: 0, dataLimitBytes: 1024, deviceCount: 1, deviceLimit: 12, activeInviteCount: 0, activeInviteLimit: 5 },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("client session migration", () => {
  it("keeps the legacy token until the cookie verifies independently", async () => {
    installBrowserStorage({
      "dadkit:v3:sync-session": JSON.stringify({ token: `${"a".repeat(64)}.${"c".repeat(48)}`, joinedAt: "2026-08-01T00:00:00.000Z", spaceName: "家庭同步" }),
    });
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.endsWith("/upgrade") ? json({ space }) : json({ error: "cookie missing" }, 401),
    ));
    expect((await upgradeLegacySyncSession("手机")).ok).toBe(false);
    expect(loadSyncSession()?.token).toBeTruthy();

    vi.stubGlobal("fetch", vi.fn(async () => json({ space })));
    expect((await upgradeLegacySyncSession("手机")).ok).toBe(true);
    const migrated = loadSyncSession();
    expect(migrated?.token).toBeUndefined();
    expect(migrated).toMatchObject({ protocolVersion: 2, deviceName: "手机" });
  });

  it("removes the invite fragment before returning the in-memory token", () => {
    const token = `DK2.${"a".repeat(64)}.${"A".repeat(20)}`;
    const replaceState = vi.fn();
    const result = takeInviteFromLocation(
      { hash: `#invite=${token}`, pathname: "/join", search: "" } as Location,
      { state: null, replaceState } as unknown as History,
    );
    expect(result).toBe(token);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/join");
  });
});
