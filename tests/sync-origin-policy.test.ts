import { afterEach, describe, expect, it, vi } from "vitest";

import { checkMutationOrigin } from "@/lib/sync/origin-policy";

afterEach(() => vi.unstubAllEnvs());

function mutationRequest(
  requestOrigin: string,
  headerOrigin: string | undefined,
  secFetchSite = "same-origin",
) {
  const headers = new Headers({ "sec-fetch-site": secFetchSite });
  if (headerOrigin) headers.set("origin", headerOrigin);
  return new Request(`${requestOrigin}/api/sync/push`, { headers });
}

describe("sync mutation origin policy", () => {
  it("allows the primary origin and exact configured aliases", () => {
    vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.example");
    vi.stubEnv(
      "DADKIT_TRUSTED_ORIGINS",
      "https://legacy.example/, https://family.example:8443",
    );
    vi.stubEnv("DADKIT_SYNC_REQUIRE_HTTPS", "true");

    expect(
      checkMutationOrigin(
        mutationRequest("https://dadkit.example", "https://dadkit.example"),
        { requireHeader: true },
      ),
    ).toBe(true);
    expect(
      checkMutationOrigin(
        mutationRequest("https://legacy.example", "https://legacy.example"),
        { requireHeader: true },
      ),
    ).toBe(true);
    expect(
      checkMutationOrigin(
        mutationRequest(
          "https://family.example:8443",
          "https://family.example:8443",
        ),
        { requireHeader: true },
      ),
    ).toBe(true);
  });

  it("rejects lookalikes, wildcards, cross-site requests and insecure aliases", () => {
    vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.example");
    vi.stubEnv(
      "DADKIT_TRUSTED_ORIGINS",
      "*.example, https://legacy.example, http://insecure.example",
    );
    vi.stubEnv("DADKIT_SYNC_REQUIRE_HTTPS", "true");

    for (const origin of [
      "https://legacy.example.evil.test",
      "https://evil.test",
      "http://insecure.example",
    ]) {
      expect(
        checkMutationOrigin(mutationRequest(origin, origin), {
          requireHeader: true,
        }),
      ).toBe(false);
    }
    expect(
      checkMutationOrigin(
        mutationRequest(
          "https://legacy.example",
          "https://legacy.example",
          "cross-site",
        ),
        { requireHeader: true },
      ),
    ).toBe(false);
  });

  it("keeps missing Origin behavior explicit", () => {
    vi.stubEnv("DADKIT_PUBLIC_ORIGIN", "https://dadkit.example");
    const request = mutationRequest("https://dadkit.example", undefined);

    expect(checkMutationOrigin(request)).toBe(true);
    expect(checkMutationOrigin(request, { requireHeader: true })).toBe(false);
  });
});
