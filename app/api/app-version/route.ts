import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Android 壳启动时查询最新版本。发布信息是数据目录里的 app-release.json
// (由 scripts/release-apk.sh 写入),文件不存在或损坏时返回 versionCode 0,
// 客户端静默视为"没有新版本",不打搅用户。

type AndroidRelease = {
  versionCode: number;
  versionName?: string;
  notes?: string;
  url?: string;
};

function releaseFilePath() {
  const configured = process.env.DADKIT_DATA_DIR?.trim();
  const dir = configured || path.join(process.cwd(), "data");
  return path.join(dir, "app-release.json");
}

function noRelease() {
  return Response.json(
    { versionCode: 0 },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  try {
    const filePath = releaseFilePath();

    if (!existsSync(filePath)) {
      return noRelease();
    }

    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as AndroidRelease;

    if (!Number.isInteger(parsed.versionCode) || parsed.versionCode < 1) {
      return noRelease();
    }

    return Response.json(
      {
        versionCode: parsed.versionCode,
        versionName:
          typeof parsed.versionName === "string" ? parsed.versionName : "",
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        url:
          typeof parsed.url === "string" && parsed.url
            ? parsed.url
            : "/api/app-version/apk",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return noRelease();
  }
}
