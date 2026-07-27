import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { isRecord, isValidDateString } from "@/lib/data/format";

export type AndroidReleaseManifest = {
  versionCode: number;
  versionName: string;
  notes: string;
  size: number;
  sha256: string;
  publishedAt: string;
  apkFile: string;
};

export function releaseDataDir() {
  const configured = process.env.DADKIT_DATA_DIR?.trim();
  return configured || path.join(process.cwd(), "data");
}

export function releaseManifestPath() {
  return path.join(releaseDataDir(), "app-release.json");
}

export function isAndroidReleaseManifest(
  value: unknown,
): value is AndroidReleaseManifest {
  return (
    isRecord(value) &&
    Object.keys(value).length === 7 &&
    Number.isInteger(value.versionCode) &&
    (value.versionCode as number) > 0 &&
    typeof value.versionName === "string" &&
    value.versionName.length > 0 &&
    value.versionName.length <= 64 &&
    typeof value.notes === "string" &&
    value.notes.length <= 8_000 &&
    Number.isInteger(value.size) &&
    (value.size as number) > 0 &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256) &&
    isValidDateString(value.publishedAt) &&
    typeof value.apkFile === "string" &&
    value.apkFile === `dadkit-${value.versionCode}.apk`
  );
}

export async function readAndroidRelease() {
  try {
    const parsed = JSON.parse(
      await readFile(releaseManifestPath(), "utf8"),
    ) as unknown;

    if (!isAndroidReleaseManifest(parsed)) {
      return undefined;
    }

    const apkPath = path.join(releaseDataDir(), parsed.apkFile);
    const apkStat = await stat(apkPath);

    if (!apkStat.isFile() || apkStat.size !== parsed.size) {
      return undefined;
    }

    return { manifest: parsed, apkPath };
  } catch {
    return undefined;
  }
}
