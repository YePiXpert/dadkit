import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getApk, HEAD as headApk } from "@/app/api/app-version/apk/route";
import { GET } from "@/app/api/app-version/route";

describe("app-version delivery routes", () => {
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

  function writeRelease() {
    const apk = Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
    const sha256 = createHash("sha256").update(apk).digest("hex");
    const apkFile = "dadkit-1.apk";

    writeFileSync(path.join(dataDir, apkFile), apk);
    writeFileSync(
      path.join(dataDir, "app-release.json"),
      JSON.stringify({
        versionCode: 1,
        versionName: "2.1.0",
        notes: "Release note with 'quotes' is preserved.",
        size: apk.byteLength,
        sha256,
        publishedAt: "2026-07-27T00:00:00.000Z",
        apkFile,
      }),
      "utf8",
    );

    return { apk, sha256 };
  }

  it("returns versionCode 0 when no complete release is published", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ versionCode: 0 });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the signed release metadata only when its APK is present", async () => {
    const { sha256 } = writeRelease();

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      versionCode: 1,
      versionName: "2.1.0",
      notes: "Release note with 'quotes' is preserved.",
      size: 8,
      sha256,
      publishedAt: "2026-07-27T00:00:00.000Z",
      url: "/api/app-version/apk?versionCode=1",
    });
  });

  it("rejects malformed manifests and size mismatches", async () => {
    writeFileSync(path.join(dataDir, "app-release.json"), "{oops", "utf8");
    await expect((await GET()).json()).resolves.toEqual({ versionCode: 0 });

    writeFileSync(
      path.join(dataDir, "app-release.json"),
      JSON.stringify({
        versionCode: 1,
        versionName: "2.1.0",
        notes: "bad",
        size: 7,
        sha256: "a".repeat(64),
        publishedAt: "2026-07-27T00:00:00.000Z",
        apkFile: "dadkit-1.apk",
      }),
      "utf8",
    );
    writeFileSync(path.join(dataDir, "dadkit-1.apk"), "12345678");
    await expect((await GET()).json()).resolves.toEqual({ versionCode: 0 });
  });

  it("serves immutable APK bytes with ETag, HEAD and RFC 7233 ranges", async () => {
    const { apk, sha256 } = writeRelease();
    const request = new Request(
      "https://dadkit.505f.com/api/app-version/apk?versionCode=1",
      { headers: { range: "bytes=2-5" } },
    );

    const range = await getApk(request);
    expect(range.status).toBe(206);
    expect(range.headers.get("content-range")).toBe("bytes 2-5/8");
    expect(range.headers.get("content-length")).toBe("4");
    expect(range.headers.get("etag")).toBe(`"${sha256}"`);
    expect(range.headers.get("cache-control")).toBe(
      "private, max-age=31536000, immutable",
    );
    expect(Buffer.from(await range.arrayBuffer())).toEqual(apk.subarray(2, 6));

    const head = await headApk(
      new Request("https://dadkit.505f.com/api/app-version/apk?versionCode=1"),
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("content-length")).toBe("8");
    expect(await head.text()).toBe("");

    const notModified = await getApk(
      new Request("https://dadkit.505f.com/api/app-version/apk?versionCode=1", {
        headers: { "if-none-match": `"${sha256}"` },
      }),
    );
    expect(notModified.status).toBe(304);

    const invalidRange = await getApk(
      new Request("https://dadkit.505f.com/api/app-version/apk", {
        headers: { range: "bytes=99-100" },
      }),
    );
    expect(invalidRange.status).toBe(416);
    expect(invalidRange.headers.get("content-range")).toBe("bytes */8");
  });
});
