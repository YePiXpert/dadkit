import { syncError, syncJson } from "@/lib/sync/http";
import { secureTransportAvailable } from "@/lib/sync/origin-policy";
import { DADKIT_SYNC_PROTOCOL_VERSION } from "@/lib/sync/protocol-version";
import {
  getSyncSpaceConfig,
  SYNC_INVITE_TTL_OPTIONS_MINUTES,
} from "@/lib/sync/space-config";

export const runtime = "nodejs";

export function GET(request: Request) {
  try {
    const config = getSyncSpaceConfig();
    return syncJson({
      syncProtocolVersion: DADKIT_SYNC_PROTOCOL_VERSION,
      dataVersion: 11,
      registrationMode: config.registrationMode,
      maxSpaceBytes: config.maxSpaceBytes,
      maxDevices: config.maxDevices,
      maxActiveInvites: config.maxActiveInvites,
      inviteTtlOptions: SYNC_INVITE_TTL_OPTIONS_MINUTES.filter(
        (minutes) => minutes <= config.maxInviteTtlMinutes,
      ),
      secureTransport: secureTransportAvailable(request),
      serverTime: new Date().toISOString(),
    });
  } catch {
    return syncError("同步服务配置无效。", 500);
  }
}
