import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 最新 Android 安装包下载。文件由 scripts/release-apk.sh 放入数据目录,
// 不经 Git 分发(安装包内含部署域名)。未发布时返回 404。

function apkFilePath() {
  const configured = process.env.DADKIT_DATA_DIR?.trim();
  const dir = configured || path.join(process.cwd(), "data");
  return path.join(dir, "dadkit-latest.apk");
}

export async function GET() {
  const filePath = apkFilePath();

  if (!existsSync(filePath)) {
    return Response.json({ error: "暂未发布安装包。" }, { status: 404 });
  }

  const size = statSync(filePath).size;
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "content-type": "application/vnd.android.package-archive",
      "content-length": String(size),
      "content-disposition": 'attachment; filename="dadkit.apk"',
      "cache-control": "no-store",
    },
  });
}
