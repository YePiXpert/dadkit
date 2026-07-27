import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { readAndroidRelease } from "@/lib/android-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ByteRange = {
  start: number;
  end: number;
};

function parseRange(value: string | null, size: number): ByteRange | undefined {
  if (!value) return undefined;

  const match = value.match(/^bytes=(\d*)-(\d*)$/);

  if (!match || (!match[1] && !match[2])) {
    throw new RangeError("invalid range");
  }

  if (!match[1]) {
    const suffixLength = Number(match[2]);

    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      throw new RangeError("invalid suffix range");
    }

    return {
      start: Math.max(0, size - suffixLength),
      end: size - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    start >= size ||
    requestedEnd < start
  ) {
    throw new RangeError("unsatisfiable range");
  }

  return { start, end: Math.min(requestedEnd, size - 1) };
}

async function serveApk(request: Request, head: boolean) {
  const release = await readAndroidRelease();

  if (!release) {
    return Response.json({ error: "暂未发布安装包。" }, { status: 404 });
  }

  const requestedVersion = new URL(request.url).searchParams.get("versionCode");

  if (
    requestedVersion !== null &&
    Number(requestedVersion) !== release.manifest.versionCode
  ) {
    return Response.json({ error: "请求的安装包版本不存在。" }, { status: 404 });
  }

  const { manifest } = release;
  const etag = `"${manifest.sha256}"`;
  const baseHeaders = new Headers({
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=31536000, immutable",
    "content-disposition": `attachment; filename="DadKit-${manifest.versionName}.apk"`,
    "content-type": "application/vnd.android.package-archive",
    etag,
    "x-content-type-options": "nosniff",
  });

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: baseHeaders });
  }

  let range: ByteRange | undefined;

  try {
    range = parseRange(request.headers.get("range"), manifest.size);
  } catch {
    baseHeaders.set("content-range", `bytes */${manifest.size}`);
    return new Response(null, { status: 416, headers: baseHeaders });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? manifest.size - 1;
  const contentLength = end - start + 1;

  baseHeaders.set("content-length", String(contentLength));
  if (range) {
    baseHeaders.set("content-range", `bytes ${start}-${end}/${manifest.size}`);
  }

  if (head) {
    return new Response(null, {
      status: range ? 206 : 200,
      headers: baseHeaders,
    });
  }

  const stream = Readable.toWeb(
    createReadStream(release.apkPath, { start, end }),
  ) as ReadableStream;

  return new Response(stream, {
    status: range ? 206 : 200,
    headers: baseHeaders,
  });
}

export function GET(request: Request) {
  return serveApk(request, false);
}

export function HEAD(request: Request) {
  return serveApk(request, true);
}
