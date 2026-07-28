import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

const REMOVED_PRODUCT_ROUTES = [
  "setup",
  "hospital",
  "timeline",
  "contractions",
  "go",
  "birth-plan",
  "postpartum",
  "share",
] as const;

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

describe("release endpoints and product surface", () => {
  it("ships checklist-and-backup PWA metadata", () => {
    const readme = readSource("README.md");
    const manifest = JSON.parse(
      readSource("public", "manifest.webmanifest"),
    ) as {
      name: string;
      description: string;
      shortcuts: Array<{ name: string; short_name: string; url: string }>;
    };

    expect(packageJson.version).toBe("2.1.0");
    expect(manifest.name).toBe("DadKit 待产包清单");
    expect(manifest.description).toContain("待产包");
    expect(manifest.description).toContain("备份");
    expect(
      manifest.shortcuts.map(({ name, short_name, url }) => ({
        name,
        short_name,
        url,
      })),
    ).toEqual([
      { name: "待产清单", short_name: "清单", url: "/" },
      { name: "我的", short_name: "我的", url: "/settings" },
    ]);
    expect(readme).toContain("清单");
    expect(readme).toContain("本地恢复快照");
    expect(readme).toContain("WebDAV 备份");
    expect(readme).toContain("宝宝成长记");
    expect(readme).toContain("全部、待购买、待装包、已装包");
    expect(readme).toContain("https://dadkit.505f.com/");
    expect(readme).toContain("不再提供加密设备迁移功能");
    expect(readme).toContain("本机照片不会随备份或同步转移");
    expect(readme).toContain("Android TWA");
  });

  it("ships digital asset links for the Android TWA", () => {
    const assetLinks = JSON.parse(
      readSource("public", ".well-known", "assetlinks.json"),
    ) as Array<{
      relation: string[];
      target: {
        namespace: string;
        package_name: string;
        sha256_cert_fingerprints: string[];
      };
    }>;

    expect(assetLinks).toHaveLength(1);
    expect(assetLinks[0].relation).toContain(
      "delegate_permission/common.handle_all_urls",
    );
    expect(assetLinks[0].target.namespace).toBe("android_app");
    expect(assetLinks[0].target.package_name).toBe("com.dadkit.mobile");
    expect(
      assetLinks[0].target.sha256_cert_fingerprints.length,
    ).toBeGreaterThan(0);
  });

  it("keeps the Android tag release strict and normalizes certificate fingerprints", () => {
    const workflow = readSource(".github", "workflows", "android-release.yml");

    expect(workflow).toContain('test "$GITHUB_REF_NAME" = "v2.1.0"');
    expect(workflow).toContain(
      'git merge-base --is-ancestor "$GITHUB_SHA" origin/main',
    );
    expect(workflow).toContain('tr -d \':\' | tr \'[:upper:]\' \'[:lower:]\'');
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("retention-days: 30");
    expect(workflow).toContain('gh release create "$GITHUB_REF_NAME"');
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
      readSource("public", "manifest.webmanifest"),
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

    for (const asset of [
      "icon-192.png",
      "icon-512.png",
      "maskable-icon-512.png",
      "apple-touch-icon.png",
      "og.png",
    ]) {
      expect(existsSync(join(process.cwd(), "public", asset))).toBe(true);
    }
  });

  it("removes every retired product route and entry point", () => {
    const sources = [
      readSource("lib", "navigation.ts"),
      readSource("app", "settings", "page.tsx"),
      readSource("components", "ChecklistWorkspace.tsx"),
      readSource("public", "sw.js"),
      readSource("public", "manifest.webmanifest"),
      readSource("README.md"),
    ].join("\n");

    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(existsSync(join(process.cwd(), "app", route, "page.tsx"))).toBe(
        false,
      );
      expect(sources).not.toContain(`/${route}`);
    }

    expect(existsSync(join(process.cwd(), "app", "page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "app", "settings", "page.tsx"))).toBe(
      true,
    );
  });

  it("pre-caches the v2.1.0 checklist, growth and settings shell", () => {
    const sw = readSource("public", "sw.js");

    expect(sw).toContain('const CACHE_NAME = "dadkit-v2.1.0-pwa-r11"');
    expect(sw).toContain("const REQUIRED_ROUTES = CORE_ROUTES.slice(0, -2)");
    expect(sw).toContain("const OPTIONAL_ROUTES = CORE_ROUTES.slice(-2)");
    for (const route of [
      "/settings/checklist",
      "/settings/backup",
      "/growth",
      "/checklist/documents",
      "/checklist/mom",
      "/checklist/baby",
      "/checklist/confinementMom",
      "/checklist/confinementBaby",
      "/checklist/partner",
      "/checklist/home",
      "/checklist/lastMinute",
    ]) {
      expect(sw).toContain(`"${route}"`);
    }

    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(sw).not.toContain(`"/${route}"`);
    }

    expect(sw).toContain("precacheAppShell");
    expect(sw).not.toContain("/illustrations/");
  });

  it("deletes previous app caches during activation", async () => {
    const sw = readSource("public", "sw.js");
    const listeners = new Map<string, (event: { waitUntil: (work: Promise<unknown>) => void }) => void>();
    const deleted: string[] = [];
    let activation: Promise<unknown> | undefined;
    const context = {
      self: {
        addEventListener: (
          type: string,
          listener: (event: { waitUntil: (work: Promise<unknown>) => void }) => void,
        ) => listeners.set(type, listener),
        clients: { claim: () => undefined },
        location: { origin: "https://dadkit.example" },
      },
      caches: {
        async keys() {
          return [
            "dadkit-v2.0.0-pwa-r9",
            "dadkit-v2.1.0-pwa-r10",
            "dadkit-v2.1.0-pwa-r11",
          ];
        },
        async delete(key: string) {
          deleted.push(key);
          return true;
        },
      },
    } as Record<string, unknown>;

    runInNewContext(sw, context);
    listeners.get("activate")?.({
      waitUntil(work) {
        activation = work;
      },
    });
    await activation;

    expect(deleted).toEqual([
      "dadkit-v2.0.0-pwa-r9",
      "dadkit-v2.1.0-pwa-r10",
    ]);
  });

  it("extracts only real Next asset attributes from server HTML", () => {
    const sw = readSource("public", "sw.js");
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
      <script>self.__next_f.push([1,"href=\\"/_next/static/css/flight.css\\""])</script>
    `);

    expect(assets).toEqual(["/_next/static/css/app.css"]);
  });

  it("caches both product pages while tolerating optional media failure", async () => {
    const sw = readSource("public", "sw.js");
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
      caches: { async open() { return cache; } },
      Request: FakeRequest,
      async fetch(request: FakeRequest) {
        if (request.url === "/manifest.webmanifest") {
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
    expect(cachedUrls).toContain("/settings");
    expect(cachedUrls).toContain("/growth");
    expect(cachedUrls).toContain("/settings/checklist");
    expect(cachedUrls).toContain("/settings/backup");
    expect(cachedUrls).toContain("/checklist/mom");
    expect(cachedUrls).toContain("/_next/static/chunks/root.js");
    expect(cachedUrls).not.toContain("/manifest.webmanifest");

    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(cachedUrls).not.toContain(`/${route}`);
    }
  });
});
