import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET } from "@/app/api/app-version/route";

describe("app-version route", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-app-version-"));
    previousDataDir = process.env.DADKIT_DATA_DIR;
    process.env.DADKIT_DATA_DIR = dataDir;
  });

  afterEach(() => {
    if (previousDataDir === undefined) {
      delete process.env.DADKIT_DATA_DIR;
    } else {
      process.env.DADKIT_DATA_DIR = previousDataDir;
    }

    rmSync(dataDir, { recursive: true, force: true });
  });

  it("未发布时返回 versionCode 0", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ versionCode: 0 });
  });

  it("返回发布文件里的版本信息", async () => {
    writeFileSync(
      path.join(dataDir, "app-release.json"),
      JSON.stringify({ versionCode: 4, versionName: "1.3", notes: "测试" }),
      "utf8",
    );

    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      versionCode: 4,
      versionName: "1.3",
      notes: "测试",
      url: "/api/app-version/apk",
    });
  });

  it("发布文件损坏时按未发布处理", async () => {
    writeFileSync(path.join(dataDir, "app-release.json"), "{oops", "utf8");

    const response = await GET();
    await expect(response.json()).resolves.toEqual({ versionCode: 0 });
  });
});
