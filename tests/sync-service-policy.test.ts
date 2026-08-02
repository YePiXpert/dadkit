import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as serviceInfoRoute } from "@/app/api/sync/service-info/route";
import { createRandomSpace } from "@/lib/sync/server-store";
import { getSyncSpaceConfig } from "@/lib/sync/space-config";

afterEach(() => vi.unstubAllEnvs());

describe("sync service policy", () => {
  it("publishes non-sensitive capabilities and registration state", async () => {
    vi.stubEnv("DADKIT_SYNC_REGISTRATION_MODE", "closed");
    vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.example");
    const response = serviceInfoRoute(new Request("https://dadkit.example/api/sync/service-info"));
    const body = await response.json();
    expect(body).toMatchObject({
      syncProtocolVersion: 2,
      registrationMode: "closed",
      secureTransport: true,
      maxDevices: 12,
      maxActiveInvites: 5,
    });
    expect(JSON.stringify(body)).not.toMatch(/displayName|filePath|session|secret/i);
  });

  it("rejects closed registration and invalid quota configuration explicitly", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "dadkit-policy-"));
    try {
      vi.stubEnv("DADKIT_DATA_DIR", directory);
      vi.stubEnv("DADKIT_SYNC_REGISTRATION_MODE", "closed");
      await expect(createRandomSpace("家庭", "设备")).rejects.toMatchObject({ code: "SYNC_REGISTRATION_CLOSED" });
      vi.stubEnv("DADKIT_SYNC_REGISTRATION_MODE", "open");
      vi.stubEnv("DADKIT_SYNC_MAX_SPACE_BYTES", "unlimited");
      expect(() => getSyncSpaceConfig()).toThrow("DADKIT_SYNC_MAX_SPACE_BYTES");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
