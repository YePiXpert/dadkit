import type { DadKitSyncDataVersion } from "@/lib/data/format";

export const DADKIT_DATA_VERSION_HEADER = "X-DadKit-Data-Version";

export function createSyncEtag(
  revision: number,
  dataVersion: DadKitSyncDataVersion,
) {
  return `"dadkit-sync-${revision}-v${dataVersion}"`;
}

export function syncDataVersionResponseHeaders(
  revision: number,
  dataVersion: DadKitSyncDataVersion,
) {
  return {
    etag: createSyncEtag(revision, dataVersion),
    vary: DADKIT_DATA_VERSION_HEADER,
  };
}

export function getRequestedDataVersion(
  headers: Pick<Headers, "get">,
): DadKitSyncDataVersion {
  const requested = headers.get(DADKIT_DATA_VERSION_HEADER);
  if (requested === "10") return 10;
  if (requested === "9") return 9;
  if (requested === "8") return 8;
  if (requested === "7") return 7;
  if (requested === "6") return 6;
  return 5;
}
