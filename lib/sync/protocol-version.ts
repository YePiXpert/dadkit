export const DADKIT_SYNC_PROTOCOL_VERSION = 2 as const;
export const DADKIT_SYNC_PROTOCOL_HEADER = "X-DadKit-Sync-Protocol";

export function syncProtocolResponseHeaders() {
  return {
    vary: `X-DadKit-Data-Version, ${DADKIT_SYNC_PROTOCOL_HEADER}`,
  };
}
