import packageJson from "@/package.json";
import { checkSyncStorageHealth } from "@/lib/sync/server-store";
import { DADKIT_SYNC_PROTOCOL_VERSION } from "@/lib/sync/protocol-version";
import { SYNC_SPACE_SCHEMA_VERSION } from "@/lib/sync/space-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const storageWritable = await checkSyncStorageHealth();
  return Response.json(
    {
      ok: storageWritable,
      version: packageJson.version,
      buildTime: process.env.DADKIT_BUILD_TIME ?? "unknown",
      syncProtocolVersion: DADKIT_SYNC_PROTOCOL_VERSION,
      syncSpaceSchemaVersion: SYNC_SPACE_SCHEMA_VERSION,
      storageWritable,
      ...(process.env.DADKIT_E2E_RUN_ID
        ? { e2eRunId: process.env.DADKIT_E2E_RUN_ID }
        : {}),
    },
    {
      status: storageWritable ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
