import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

describe("release endpoints and pages", () => {
  it("returns health status with version and buildTime", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      version: packageJson.version,
      buildTime: process.env.DADKIT_BUILD_TIME ?? "unknown",
    });
  });
});
