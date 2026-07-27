import { readAndroidRelease } from "@/lib/android-release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noRelease() {
  return Response.json(
    { versionCode: 0 },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function GET() {
  const release = await readAndroidRelease();

  if (!release) {
    return noRelease();
  }

  const { manifest } = release;

  return Response.json(
    {
      versionCode: manifest.versionCode,
      versionName: manifest.versionName,
      notes: manifest.notes,
      size: manifest.size,
      sha256: manifest.sha256,
      publishedAt: manifest.publishedAt,
      url: `/api/app-version/apk?versionCode=${manifest.versionCode}`,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
