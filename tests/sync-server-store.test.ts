import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DadKitExportData } from "@/lib/data/format";
import {
  createRandomSpace,
  createV2Invite,
  joinWithInvite,
  leaveSpace,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import { portableTestItem, portableV10 } from "@/tests/helpers/portable-data";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "dadkit-sync-store-"));
  vi.stubEnv("DADKIT_DATA_DIR", directory);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

async function createJoinedPair(name = "测试家庭") {
  const owner = await createRandomSpace(name, "设备 A");
  const invite = await createV2Invite(owner.token, 60);
  const member = await joinWithInvite(invite!.code, "设备 B");
  return { owner, member: member! };
}

describe("sync server store", () => {
  it("stores a private random space without raw invitation credentials", async () => {
    const owner = await createRandomSpace("隐私家庭", "主设备");
    writeFileSync(
      path.join(directory, `space-${"f".repeat(64)}.json`),
      JSON.stringify({ version: 1, data: null }),
      "utf8",
    );
    const invite = await createV2Invite(owner.token, 60);
    const entries = readdirSync(directory);
    const file = path.join(directory, `space-${owner.space.spaceId}.json`);
    const stored = readFileSync(file, "utf8");

    expect(entries).toContain(path.basename(file));
    expect(stored).toContain('"displayName":"隐私家庭"');
    expect(stored).not.toContain(invite!.token.split(".")[2]!);
    expect(stored).not.toContain(invite!.code);
    expect(stored).not.toContain(invite!.code.replace("-", ""));
    if (process.platform !== "win32") {
      expect(statSync(file).mode & 0o777).toBe(0o600);
    }
  });

  it("rejects invalid stored structures", async () => {
    const owner = await createRandomSpace("损坏测试", "主设备");
    const file = path.join(directory, `space-${owner.space.spaceId}.json`);

    writeFileSync(file, JSON.stringify({ unsafe: true }), "utf8");
    await expect(pullSpace(owner.token)).rejects.toThrow("同步空间数据结构无效");
  });

  it("authenticates pulls with the issued cookie token only", async () => {
    const owner = await createRandomSpace("拉取家庭", "主设备");

    await expect(pullSpace(owner.token)).resolves.toMatchObject({
      version: 0,
      data: null,
    });
    await expect(pullSpace("bad-token")).resolves.toBeUndefined();
    await expect(pullSpace(`${owner.token}x`)).resolves.toBeUndefined();
  });

  it("serializes concurrent pushes and merges them item-wise", async () => {
    const { owner, member } = await createJoinedPair("合并家庭");
    const [fromA, fromB] = await Promise.all([
      pushSpace(
        owner.token,
        portableV10({ checklist: [portableTestItem("a", { updatedAt: 100 })] }),
      ),
      pushSpace(
        member.token,
        portableV10({
          checklist: [portableTestItem("b", { updatedAt: 200 })],
          customItems: [portableTestItem("custom-b", { updatedAt: 200 })],
        }),
      ),
    ]);

    expect([fromA?.version, fromB?.version].sort()).toEqual([1, 2]);
    const data = (await pullSpace(owner.token))!.data as DadKitExportData;
    expect(data.checklist.map((item) => item.id).sort()).toEqual(["a", "b"]);
    expect(data.customItems.map((item) => item.id)).toEqual(["custom-b"]);
  });

  it("keeps five rolling backups and preserves the current 小美 document", async () => {
    const owner = await createRandomSpace("小美", "主设备");
    for (let index = 1; index <= 6; index += 1) {
      await pushSpace(
        owner.token,
        portableV10({
          checklist: [portableTestItem(`xiaomei-${index}`, { updatedAt: index })],
        }),
      );
    }

    const backups = readdirSync(directory).filter((entry) => entry.includes(".json.bak."));
    expect(backups).toHaveLength(5);
    expect(
      readFileSync(
        path.join(directory, backups.find((entry) => entry.endsWith(".bak.1"))!),
        "utf8",
      ),
    ).toContain("xiaomei-5");
    const current = (await pullSpace(owner.token))!.data as DadKitExportData;
    expect(current.checklist.map((item) => item.id)).toContain("xiaomei-6");
  });

  it("lets the newer side win and revokes a leaving session", async () => {
    const { owner, member } = await createJoinedPair("冲突家庭");
    await pushSpace(
      owner.token,
      portableV10({
        checklist: [portableTestItem("a", { status: "packed", updatedAt: 300 })],
      }),
    );
    const merged = await pushSpace(
      member.token,
      portableV10({
        checklist: [portableTestItem("a", { status: "todo", updatedAt: 100 })],
      }),
    );

    expect((merged!.data as DadKitExportData).checklist[0]?.status).toBe("packed");
    await expect(leaveSpace(member.token)).resolves.toBe(true);
    await expect(pullSpace(member.token)).resolves.toBeUndefined();
  });
});
