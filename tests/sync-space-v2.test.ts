import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canonicalDataBytes } from "@/lib/sync/usage";
import {
  createRandomSpace,
  createV2Invite,
  deleteSpace,
  getSpaceMetadata,
  joinWithInvite,
  listSessions,
  pullSpace,
  pushSpace,
  renameSpace,
  revokeSession,
  updateSession,
} from "@/lib/sync/server-store";
import { portableTestItem, portableV11 } from "@/tests/helpers/portable-data";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v2-"));
  vi.stubEnv("DADKIT_DATA_DIR", directory);
  vi.stubEnv("DADKIT_SYNC_REQUIRE_HTTPS", "false");
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("random sync spaces", () => {
  it("creates unrelated random identifiers for identical display names", async () => {
    const first = await createRandomSpace("同名家庭", "手机");
    const second = await createRandomSpace("同名家庭", "平板");

    expect(first.space.spaceId).toMatch(/^[0-9a-f]{64}$/);
    expect(second.space.spaceId).toMatch(/^[0-9a-f]{64}$/);
    expect(second.space.spaceId).not.toBe(first.space.spaceId);
    expect(first.space.spaceId).not.toContain("同名家庭");
    expect(first.space.currentSession.role).toBe("owner");

    const renamed = await renameSpace(first.token, "另一个显示名称");
    expect(renamed?.spaceId).toBe(first.space.spaceId);
    expect(renamed?.dataRevision).toBe(0);
    expect(renamed?.metadataRevision).toBeGreaterThan(first.space.metadataRevision);
  });

  it("retries collisions and fails clearly after a bounded number of attempts", async () => {
    const collision = Buffer.alloc(32, 7);
    const unique = Buffer.alloc(32, 8);
    await createRandomSpace("第一个", "设备", { randomBytes: () => collision });
    let calls = 0;
    const retried = await createRandomSpace("第二个", "设备", {
      randomBytes: (size) => {
        if (size !== 32) return Buffer.alloc(size, 9);
        calls += 1;
        return calls === 1 ? collision : unique;
      },
    });
    expect(retried.space.spaceId).toBe(unique.toString("hex"));

    await expect(
      createRandomSpace("第三个", "设备", {
        randomBytes: () => collision,
        maxAttempts: 2,
      }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it("uses one-time invites atomically and never stores their raw secret", async () => {
    const owner = await createRandomSpace("邀请家庭", "管理员手机");
    const invite = await createV2Invite(owner.token, 60);
    expect(invite?.token).toMatch(/^DK2\.[0-9a-f]{64}\.[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{20}$/);
    expect(invite?.code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    const secret = invite!.token.split(".")[2]!;
    const storedBefore = readFileSync(path.join(directory, readdirSync(directory)[0]!), "utf8");
    expect(storedBefore).not.toContain(secret);
    expect(storedBefore).not.toContain(invite!.code);
    expect(storedBefore).not.toContain(invite!.code.replace("-", ""));

    const results = await Promise.all([
      joinWithInvite(invite!.token, "设备 A"),
      joinWithInvite(invite!.code.toLowerCase().replace("-", " "), "设备 B"),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(results.find(Boolean)?.space.currentSession.role).toBe("member");
  });

  it("enforces roles, immediate revocation and last-owner protection", async () => {
    const owner = await createRandomSpace("设备家庭", "主设备");
    const invite = await createV2Invite(owner.token, 60);
    const member = await joinWithInvite(invite!.token, "副设备");
    const devices = await listSessions(owner.token);
    const memberId = devices!.find((device) => device.deviceName === "副设备")!.id;

    await expect(createV2Invite(member!.token, 60)).rejects.toMatchObject({ status: 403 });
    await expect(updateSession(owner.token, owner.space.currentSession.id, { role: "member" }))
      .rejects.toMatchObject({ code: "LAST_OWNER_REQUIRED" });

    await updateSession(owner.token, memberId, { role: "owner" });
    await updateSession(owner.token, owner.space.currentSession.id, { role: "member" });
    await revokeSession(member!.token, owner.space.currentSession.id);
    await expect(pullSpace(owner.token)).resolves.toBeUndefined();
    await expect(revokeSession(member!.token, memberId)).rejects.toMatchObject({ code: "LAST_OWNER_REQUIRED" });
  });

  it("rejects quota overflow without changing revision or rotating backups", async () => {
    const items = Array.from({ length: 800 }, (_, index) =>
      portableTestItem(`quota-${index}`, { name: `物品${index}${"测".repeat(30)}`, updatedAt: index + 1 }),
    );
    const exact = portableV11({ checklist: items });
    const exactBytes = canonicalDataBytes(exact);
    expect(exactBytes).toBeGreaterThan(64 * 1024);
    vi.stubEnv("DADKIT_SYNC_MAX_SPACE_BYTES", String(exactBytes));
    const owner = await createRandomSpace("配额家庭", "主设备");
    const pushed = await pushSpace(owner.token, exact);
    expect(pushed?.version).toBe(1);
    const before = readFileSync(path.join(directory, `space-${owner.space.spaceId}.json`), "utf8");
    const backupsBefore = readdirSync(directory).filter((entry) => entry.includes(".bak."));

    await expect(
      pushSpace(owner.token, portableV11({ checklist: [...items, portableTestItem("one-more", { updatedAt: 9999 })] })),
    ).rejects.toMatchObject({ status: 413, code: "SPACE_QUOTA_EXCEEDED" });

    expect(readFileSync(path.join(directory, `space-${owner.space.spaceId}.json`), "utf8")).toBe(before);
    expect(readdirSync(directory).filter((entry) => entry.includes(".bak."))).toEqual(backupsBefore);
    expect((await getSpaceMetadata(owner.token))?.dataRevision).toBe(1);
  });

  it("deletes the main file and backups after owner confirmation", async () => {
    const owner = await createRandomSpace("删除家庭", "主设备");
    await pushSpace(owner.token, portableV11({ checklist: [portableTestItem("a", { updatedAt: 1 })] }));
    await pushSpace(owner.token, portableV11({ checklist: [portableTestItem("b", { updatedAt: 2 })] }));
    expect(readdirSync(directory).length).toBeGreaterThan(1);
    await deleteSpace(owner.token, "删除家庭");
    expect(readdirSync(directory)).toEqual([]);
    await expect(pullSpace(owner.token)).resolves.toBeUndefined();
  });

  it("keeps data revision stable across metadata-only operations", async () => {
    const owner = await createRandomSpace("修订号家庭", "主设备");
    await pushSpace(owner.token, portableV11({ checklist: [portableTestItem("data", { updatedAt: 1 })] }));
    const before = await getSpaceMetadata(owner.token);
    await createV2Invite(owner.token, 60);
    await updateSession(owner.token, owner.space.currentSession.id, { deviceName: "新设备名" });
    await renameSpace(owner.token, "新显示名称");
    const after = await getSpaceMetadata(owner.token);
    expect(after?.dataRevision).toBe(before?.dataRevision);
    expect(after?.metadataRevision).toBeGreaterThan(before!.metadataRevision);
  });
});
