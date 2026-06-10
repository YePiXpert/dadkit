import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      version: packageJson.version,
      buildTime: process.env.DADKIT_BUILD_TIME ?? "unknown",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
