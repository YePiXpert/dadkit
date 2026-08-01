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
  return headers.get(DADKIT_DATA_VERSION_HEADER) === "6" ? 6 : 5;
}
