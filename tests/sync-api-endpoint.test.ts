import { afterEach, describe, expect, it, vi } from "vitest";

import { installBrowserStorage } from "@/tests/helpers/browser-storage";

const HEX_64 = "f".repeat(64);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("sync api endpoint resolution", () => {
  it("keeps relative paths for same-origin deployments by default", async () => {
    vi.stubEnv("NEXT_PUBLIC_DADKIT_API_BASE", "");
    const endpoint = await import("@/lib/sync/api-endpoint");

    expect(endpoint.SYNC_API_BASE).toBe("");
    expect(endpoint.isRemoteSyncApi()).toBe(false);
    expect(endpoint.resolveApiUrl("/api/sync/pull")).toBe("/api/sync/pull");
  });

  it("prefixes the configured cloud API base and normalizes it to an origin", async () => {
    vi.stubEnv("NEXT_PUBLIC_DADKIT_API_BASE", "https://dadkit.505f.com/some/path/");
    const endpoint = await import("@/lib/sync/api-endpoint");

    expect(endpoint.SYNC_API_BASE).toBe("https://dadkit.505f.com");
    expect(endpoint.isRemoteSyncApi()).toBe(true);
    expect(endpoint.resolveApiUrl("/api/sync/pull")).toBe(
      "https://dadkit.505f.com/api/sync/pull",
    );
  });

  it("rejects non-http API base values", async () => {
    vi.stubEnv("NEXT_PUBLIC_DADKIT_API_BASE", "javascript:alert(1)");
    const endpoint = await import("@/lib/sync/api-endpoint");

    expect(endpoint.SYNC_API_BASE).toBe("");
    expect(endpoint.resolveApiUrl("/api/sync/pull")).toBe("/api/sync/pull");
  });

  it("prefers the configured public web origin for invite links", async () => {
    installBrowserStorage();
    vi.stubEnv("NEXT_PUBLIC_DADKIT_PUBLIC_WEB_ORIGIN", "https://dadkit.505f.com");
    vi.stubGlobal("window", { location: { origin: "https://appassets.androidplatform.net" } });
    const endpoint = await import("@/lib/sync/api-endpoint");

    expect(endpoint.publicAppOrigin()).toBe("https://dadkit.505f.com");
  });

  it("falls back to the current origin for same-origin deployments", async () => {
    installBrowserStorage();
    vi.stubEnv("NEXT_PUBLIC_DADKIT_PUBLIC_WEB_ORIGIN", "");
    vi.stubGlobal("window", { location: { origin: "https://dadkit.505f.com" } });
    const endpoint = await import("@/lib/sync/api-endpoint");

    expect(endpoint.publicAppOrigin()).toBe("https://dadkit.505f.com");
  });
});

describe("sync session token persistence", () => {
  async function loadStorage() {
    return import("@/lib/storage");
  }

  function sessionFixture(patch: Record<string, unknown> = {}) {
    return {
      version: 2 as const,
      protocolVersion: 2 as const,
      spaceId: HEX_64,
      displayName: "测试家庭",
      sessionId: "a".repeat(64),
      deviceName: "手机",
      role: "owner" as const,
      joinedAt: "2026-09-07T00:00:00.000Z",
      ...patch,
    };
  }

  it("round-trips a valid Bearer token for cross-origin clients", async () => {
    installBrowserStorage();
    const storage = await loadStorage();
    const token = `${HEX_64}.${"b".repeat(48)}`;

    storage.saveSyncSession({ ...sessionFixture(), token });
    expect(storage.loadSyncSession()?.token).toBe(token);
  });

  it("keeps cookie-only sessions unchanged", async () => {
    installBrowserStorage();
    const storage = await loadStorage();

    storage.saveSyncSession(sessionFixture());
    expect(storage.loadSyncSession()?.token).toBeUndefined();
  });

  it("drops malformed tokens or tokens bound to another space", async () => {
    installBrowserStorage();
    const storage = await loadStorage();

    storage.saveSyncSession({ ...sessionFixture(), token: "not-a-token" });
    expect(storage.loadSyncSession()?.token).toBeUndefined();

    storage.saveSyncSession({
      ...sessionFixture(),
      token: `${"9".repeat(64)}.${"b".repeat(48)}`,
    });
    expect(storage.loadSyncSession()?.token).toBeUndefined();
    // 会话其余字段仍可用（退回同源 Cookie 认证）。
    expect(storage.loadSyncSession()?.spaceId).toBe(HEX_64);
  });
});
