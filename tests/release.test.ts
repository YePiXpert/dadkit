import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

describe("release endpoints and pages", () => {
  it("ships v1.3 release metadata", () => {
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

    expect(packageJson.version).toBe("1.3.0");
    expect(settingsPage).toContain('version: "1.3.0"');
    expect(manifest.name).toBe("DadKit 待产准备");
    expect(manifest.description).toContain("医院确认");
    expect(manifest.description).toContain("临出门沟通卡");
    expect(readme).toContain("# DadKit v1.3");
    expect(readme).toContain("四根柱子");
    expect(readme).toContain("医院确认、核心待产包、临出门沟通卡和产后提醒");
    expect(readme).toContain("![DadKit README 展示横幅]");
    expect(readme).toContain("![DadKit 使用流程图]");
    expect(readme).not.toContain("分娩偏好卡");
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
  });

  it("pre-caches app illustrations for installed PWA sessions", () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
    const illustrationAssets = readdirSync(
      join(process.cwd(), "public", "illustrations"),
    )
      .filter((file) => /\.(png|webp)$/.test(file))
      .map((file) => `/illustrations/${file}`)
      .sort();

    expect(illustrationAssets.length).toBeGreaterThan(0);
    expect(sw).toContain('const CACHE_NAME = "dadkit-v1.3.0-vps-safe-v1"');
    expect(sw).toContain("const CORE_ROUTES = [");
    expect(sw).toContain('"/checklist"');
    expect(sw).toContain('"/hospital"');
    expect(sw).toContain('"/timeline"');
    expect(sw).toContain("precacheAppShell");
    expect(sw).toContain('url.pathname === "/_next/image"');
    expect(sw).toContain('url.pathname.startsWith("/illustrations/")');

    for (const asset of illustrationAssets) {
      expect(sw).toContain(`"${asset}"`);
    }
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
      <img srcset="/_next/image?url=%2Ficon.png&amp;w=256&amp;q=75 1x, /_next/image?url=%2Ficon.png&amp;w=512&amp;q=75 2x">
      <script>self.__next_f.push([1,"href=\\\"/_next/static/css/flight.css\\\""])</script>
    `);

    expect(assets).toEqual([
      "/_next/static/css/app.css",
      "/_next/image?url=%2Ficon.png&w=256&q=75",
      "/_next/image?url=%2Ficon.png&w=512&q=75",
    ]);
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
