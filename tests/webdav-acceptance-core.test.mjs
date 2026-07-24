import { describe, expect, it } from "vitest";

import {
  buildAcceptanceBackup,
  isDadKitAcceptanceBackup,
  missingWebDavAcceptanceEnv,
  readWebDavAcceptanceEnv,
  runWebDavAcceptance,
  WEBDAV_ACCEPTANCE_DEFAULTS,
} from "../scripts/webdav-acceptance-core.mjs";

describe("webdav acceptance core", () => {
  it("reads 123pan defaults while requiring credentials from env", () => {
    const env = {
      DADKIT_WEBDAV_USERNAME: "user",
      DADKIT_WEBDAV_SECRET: "secret",
    };
    const result = readWebDavAcceptanceEnv(env);

    expect(result.config.endpoint).toBe(WEBDAV_ACCEPTANCE_DEFAULTS.endpoint);
    expect(result.config.remoteDir).toBe("/DadKit");
    expect(result.config.filename).toBe("dadkit-backup.json");
    expect(result.config.username).toBe("user");
    expect(result.secret).toBe("secret");
    expect(result.allowOverwrite).toBe(false);
    expect(missingWebDavAcceptanceEnv(result)).toEqual([]);
  });

  it("reports missing credential env names without accepting CLI secrets", () => {
    const result = readWebDavAcceptanceEnv({});

    expect(missingWebDavAcceptanceEnv(result)).toEqual([
      "DADKIT_WEBDAV_USERNAME",
      "DADKIT_WEBDAV_SECRET",
    ]);
  });

  it("builds schema V2 backups and rejects V1 envelopes or data", () => {
    const backup = buildAcceptanceBackup("v2", "2026-06-30T00:00:00.000Z");

    expect(backup.schemaVersion).toBe(2);
    expect(backup.data.version).toBe(2);
    expect(isDadKitAcceptanceBackup(backup)).toBe(true);
    expect(
      isDadKitAcceptanceBackup({
        ...backup,
        schemaVersion: 1,
      }),
    ).toBe(false);
    expect(
      isDadKitAcceptanceBackup({
        ...backup,
        data: {
          ...backup.data,
          version: 1,
        },
      }),
    ).toBe(false);
  });

  it("uploads, detects conflict, overwrites, and verifies the final backup", async () => {
    const client = createMemoryWebDavClient();
    const result = await runWebDavAcceptance({
      client,
      config: testConfig(),
      secret: "secret",
      now: fixedNow(),
    });

    expect(result.ok).toBe(true);
    expect(result.events.map((event) => event.code)).toEqual([
      "remote-dir-created",
      "initial-uploaded",
      "initial-download-verified",
      "conflict-detected",
      "forced-update-uploaded",
      "final-download-verified",
    ]);
    expect(isDadKitAcceptanceBackup(JSON.parse(client.files.get(result.targetUrl)))).toBe(
      true,
    );
  });

  it("refuses to replace an existing non-acceptance backup unless allowed", async () => {
    const client = createMemoryWebDavClient();
    const targetUrl = "https://example.com/dav/DadKit/dadkit-backup.json";

    client.directories.add("https://example.com/dav/DadKit");
    client.files.set(
      targetUrl,
      JSON.stringify({
        ...buildAcceptanceBackup("foreign", "2026-06-30T00:00:00.000Z"),
        deviceId: "real-user-device",
      }),
    );

    const result = await runWebDavAcceptance({
      client,
      config: testConfig(),
      secret: "secret",
      now: fixedNow(),
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("remote-conflict");
    expect(client.putCount).toBe(0);
  });

  it("turns authentication failures into actionable messages", async () => {
    const client = {
      async request() {
        return { status: 401, data: "" };
      },
    };

    await expect(
      runWebDavAcceptance({
        client,
        config: testConfig(),
        secret: "wrong-secret",
        now: fixedNow(),
      }),
    ).rejects.toThrow(
      "Remote directory check failed with HTTP 401; check the WebDAV username and app password.",
    );
  });
});

function testConfig() {
  return {
    endpoint: "https://example.com/dav",
    username: "dad",
    remoteDir: "/DadKit",
    filename: "dadkit-backup.json",
  };
}

function fixedNow() {
  const values = [
    "2026-06-30T00:00:00.000Z",
    "2026-06-30T00:01:00.000Z",
  ];

  return () => values.shift() ?? "2026-06-30T00:02:00.000Z";
}

function createMemoryWebDavClient() {
  const directories = new Set(["https://example.com/dav"]);
  const files = new Map();
  const client = {
    directories,
    files,
    putCount: 0,
    async request(method, url, { body } = {}) {
      if (method === "PROPFIND") {
        return { status: directories.has(url) ? 207 : 404, data: "" };
      }

      if (method === "MKCOL") {
        directories.add(url);
        return { status: 201, data: "" };
      }

      if (method === "GET") {
        if (!files.has(url)) {
          return { status: 404, data: "" };
        }

        return { status: 200, data: files.get(url) };
      }

      if (method === "PUT") {
        client.putCount += 1;
        files.set(url, body);
        return { status: 201, data: "" };
      }

      return { status: 405, data: "" };
    },
  };

  return client;
}
