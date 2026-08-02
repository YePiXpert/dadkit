import { createHash, scryptSync } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pullSpace, upgradeSession } from "@/lib/sync/server-store";
import { portableV5 } from "@/tests/helpers/portable-data";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "dadkit-sync-migration-"));
  vi.stubEnv("DADKIT_DATA_DIR", directory);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("schema 1 migration", () => {
  it("preserves data, sessions, invite and legacy token without renaming the file", async () => {
    const spaceId = "a".repeat(64);
    const secret = "b".repeat(48);
    const sessionId = createHash("sha256").update(secret).digest("hex");
    const codeSalt = "c".repeat(32);
    const inviteSalt = "d".repeat(32);
    const fixture = {
      codeSalt,
      codeHash: scryptSync("legacy-code", codeSalt, 32).toString("hex"),
      legacyJoinEnabled: true,
      invite: {
        codeSalt: inviteSalt,
        codeHash: scryptSync("23456789", inviteSalt, 32).toString("hex"),
        expiresAt: "2030-01-01T00:00:00.000Z",
      },
      version: 7,
      updatedAt: "2026-08-01T00:00:00.000Z",
      data: portableV5(),
      sessions: {
        [sessionId]: {
          createdAt: "2026-07-01T00:00:00.000Z",
          lastSeenAt: new Date().toISOString(),
        },
      },
    };
    const original = JSON.stringify(fixture);
    const file = path.join(directory, `space-${spaceId}.json`);
    writeFileSync(file, original, "utf8");

    const token = `${spaceId}.${secret}`;
    await expect(pullSpace(token, 5)).resolves.toMatchObject({ version: 7 });
    expect(readFileSync(file, "utf8")).toBe(original);

    const upgraded = await upgradeSession(token, "迁移家庭", "旧手机");
    expect(upgraded?.currentSession).toMatchObject({ id: sessionId, role: "owner", protocolVersion: 2, deviceName: "旧手机" });
    const stored = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> & {
      data: { version: number };
      sessions: Record<string, { role: string }>;
      invites: Record<string, unknown>;
    };
    expect(stored.schemaVersion).toBe(2);
    expect(stored.spaceId).toBe(spaceId);
    expect(stored.dataRevision).toBe(7);
    expect(stored.data.version).toBe(5);
    expect(stored.sessions[sessionId]?.role).toBe("owner");
    expect(Object.keys(stored.invites)).toHaveLength(1);
    expect(path.basename(file)).toBe(`space-${spaceId}.json`);
  });
});
