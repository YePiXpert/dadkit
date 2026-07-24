import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

describe("release endpoints and pages", () => {
  it("ships the fresh V2 PWA metadata", () => {
    const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
    const settingsPage = readFileSync(
      join(process.cwd(), "app", "settings", "page.tsx"),
      "utf8",
    );
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8"),
    ) as {
      name: string;
      description: string;
    };

    expect(packageJson.version).toBe("2.0.0");
    expect(settingsPage).toContain('version: "2.0.0"');
    expect(manifest.name).toBe("DadKit 待产包清单");
    expect(manifest.description).toContain("打开即用");
    expect(manifest.description).toContain("待购买");
    expect(readme).toContain("# DadKit v2.0");
    expect(readme).toContain("零输入启动");
    expect(readme).toContain("全部、待购买、待装包");
    expect(readme).toContain("纯 PWA");
    expect(readme).not.toContain("四根柱子");
  });

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
    expect(existsSync(join(process.cwd(), "public", "og.png"))).toBe(true);
  });

  it("pre-caches the V2 web app shell without illustrations", () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

    expect(sw).toContain('const CACHE_NAME = "dadkit-v2.0.0-pwa-r2"');
    expect(sw).toContain("const CORE_ROUTES = [");
    expect(sw).toContain('"/hospital"');
    expect(sw).toContain('"/timeline"');
    expect(sw).toContain("precacheAppShell");
    expect(sw).not.toContain('url.pathname === "/_next/image"');
    expect(sw).not.toContain("/illustrations/");
    expect(sw).not.toContain('url.pathname.startsWith("/illustrations/")');
  });

  it("extracts only real Next asset attributes from server HTML", () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    const context = {
      self: {
        addEventListener: () => undefined,
        location: { origin: "https://dadkit.example" },
      },
    } as Record<string, unknown>;

    runInNewContext(
      `${sw}\n;globalThis.__extractBuildAssets = extractBuildAssets;`,
      context,
    );
    const extractBuildAssets = context.__extractBuildAssets as (
      html: string,
    ) => string[];
    const assets = extractBuildAssets(`
      <link href="/_next/static/css/app.css" rel="stylesheet">
      <script>self.__next_f.push([1,"href=\\\"/_next/static/css/flight.css\\\""])</script>
    `);

    expect(assets).toEqual(["/_next/static/css/app.css"]);
  });

  it("keeps optional route and media failures from aborting app-shell install", async () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    const cachedUrls: string[] = [];
    class FakeRequest {
      constructor(readonly url: string) {}
    }
    class FakeResponse {
      readonly ok = true;
      readonly type = "basic";

      constructor(private readonly body: string) {}

      clone() {
        return new FakeResponse(this.body);
      }

      async text() {
        return this.body;
      }
    }
    const cache = {
      async put(request: FakeRequest) {
        cachedUrls.push(request.url);
      },
    };
    const context = {
      self: {
        addEventListener: () => undefined,
        location: { origin: "https://dadkit.example" },
      },
      caches: {
        async open() {
          return cache;
        },
      },
      Request: FakeRequest,
      async fetch(request: FakeRequest) {
        if (
          request.url === "/hospital" ||
          request.url === "/manifest.webmanifest"
        ) {
          throw new Error("simulated optional fetch failure");
        }

        return new FakeResponse(
          request.url === "/"
            ? '<script src="/_next/static/chunks/root.js"></script>'
            : "",
        );
      },
    } as Record<string, unknown>;

    runInNewContext(
      `${sw}\n;globalThis.__precacheAppShell = precacheAppShell;`,
      context,
    );
    const precacheAppShell = context.__precacheAppShell as () => Promise<void>;

    await expect(precacheAppShell()).resolves.toBeUndefined();
    expect(cachedUrls).toContain("/");
    expect(cachedUrls).toContain("/_next/static/chunks/root.js");
    expect(cachedUrls).not.toContain("/hospital");
    expect(cachedUrls).not.toContain("/manifest.webmanifest");
  });
});
