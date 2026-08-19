import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createRoute } from "@/app/api/sync/v2/spaces/route";
import { POST as joinRoute } from "@/app/api/sync/v2/join/route";
import { GET as pullRoute } from "@/app/api/sync/pull/route";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import { POST as leaveRoute } from "@/app/api/sync/leave/route";
import { portableV10 } from "@/tests/helpers/portable-data";
import { createV2Invite, updateSession } from "@/lib/sync/server-store";

let directory: string;
const origin = "https://dadkit.test";

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "dadkit-cookie-"));
  vi.stubEnv("DADKIT_DATA_DIR", directory);
  vi.stubEnv("DADKIT_PUBLIC_ORIGIN", origin);
  vi.stubEnv("DADKIT_SYNC_REQUIRE_HTTPS", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

function cookiePair(response: Response) {
  return response.headers.get("set-cookie")!.split(";", 1)[0]!;
}

describe("HttpOnly sync sessions", () => {
  it("creates a cookie-only owner session and uses it for pull and push", async () => {
    const created = await createRoute(new Request(`${origin}/api/sync/v2/spaces`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Cookie 家庭", deviceName: "手机" }),
    }));
    expect(created.status).toBe(201);
    const setCookie = created.headers.get("set-cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    expect(setCookie).toContain("Path=/api/sync");
    expect(setCookie).toContain("Secure");
    expect(JSON.stringify(await created.json())).not.toMatch(/token|secret/i);

    const cookie = cookiePair(created);
    const pulled = await pullRoute(new Request(`${origin}/api/sync/pull`, { headers: { cookie } }));
    expect(pulled.status).toBe(200);
    const pushed = await pushRoute(new Request(`${origin}/api/sync/push`, {
      method: "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: JSON.stringify({ data: portableV10() }),
    }));
    expect(pushed.status).toBe(200);

    const crossSite = await pushRoute(new Request(`${origin}/api/sync/push`, {
      method: "POST",
      headers: { cookie, origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify({ data: portableV10() }),
    }));
    expect(crossSite.status).toBe(403);

    const ownerToken = decodeURIComponent(cookie.split("=")[1]!);
    const invite = await createV2Invite(ownerToken, 60);
    const joined = await joinRoute(new Request(`${origin}/api/sync/v2/join`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ inviteCredential: invite!.code, deviceName: "备用管理员" }),
    }));
    expect(joined.headers.get("set-cookie")).toContain("HttpOnly");
    const joinedBody = await joined.json() as { space: { currentSession: { id: string } } };
    expect(JSON.stringify(joinedBody)).not.toMatch(/token|secret/i);
    await updateSession(ownerToken, joinedBody.space.currentSession.id, { role: "owner" });

    const bearerRejected = await pullRoute(new Request(`${origin}/api/sync/pull`, {
      headers: {
        cookie: "dadkit_sync_session=invalid.cookie",
        authorization: `Bearer ${ownerToken}`,
      },
    }));
    expect(bearerRejected.status).toBe(401);

    const left = await leaveRoute(new Request(`${origin}/api/sync/leave`, {
      method: "POST",
      headers: { cookie, origin },
    }));
    expect(left.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("allows an exact trusted alias without weakening origin rejection", async () => {
    const alias = "https://legacy.dadkit.test";
    vi.stubEnv("DADKIT_TRUSTED_ORIGINS", alias);
    const created = await createRoute(new Request(`${alias}/api/sync/v2/spaces`, {
      method: "POST",
      headers: { origin: alias, "content-type": "application/json" },
      body: JSON.stringify({ displayName: "旧域名家庭", deviceName: "旧 PWA" }),
    }));

    expect(created.status).toBe(201);
    const cookie = cookiePair(created);
    const accepted = await pushRoute(new Request(`${alias}/api/sync/push`, {
      method: "POST",
      headers: { cookie, origin: alias, "content-type": "application/json" },
      body: JSON.stringify({ data: portableV10() }),
    }));
    expect(accepted.status).toBe(200);

    const rejected = await pushRoute(new Request(`${alias}/api/sync/push`, {
      method: "POST",
      headers: {
        cookie,
        origin: "https://legacy.dadkit.test.evil.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: portableV10() }),
    }));
    expect(rejected.status).toBe(403);
  });
});
