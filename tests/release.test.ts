import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("ships installable PWA PNG icons", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8"),
    ) as {
      icons: Array<{
        src: string;
        sizes: string;
        type: string;
        purpose?: string;
      }>;
    };

    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        }),
        expect.objectContaining({
          src: "/maskable-icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        }),
      ]),
    );
    expect(existsSync(join(process.cwd(), "public", "icon-192.png"))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", "icon-512.png"))).toBe(true);
    expect(
      existsSync(join(process.cwd(), "public", "maskable-icon-512.png")),
    ).toBe(true);
    expect(
      existsSync(join(process.cwd(), "public", "apple-touch-icon.png")),
    ).toBe(true);
  });
});
