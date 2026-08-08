import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

const REMOVED_PRODUCT_ROUTES = [
  "setup",
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
      screenshots?: Array<{
        src: string;
        sizes: string;
        type: string;
        form_factor?: string;
      }>;
    };

    expect(packageJson.version).toBe("3.4.3");
    expect(manifest.name).toBe("DadKit 待产包清单");
    expect(manifest.description).toContain("待产包");
    expect(manifest.description).toContain("宝宝记录");
    expect(manifest.shortcuts).toEqual(
      expect.arrayContaining([expect.objectContaining({ url: "/baby" })]),
    );
    expect(manifest.description).toContain("备份");
    expect(
      manifest.shortcuts.map(({ name, short_name, url }) => ({
        name,
        short_name,
        url,
      })),
    ).toEqual([
      { name: "待产清单", short_name: "清单", url: "/" },
      { name: "宝宝记录", short_name: "宝宝", url: "/baby" },
      { name: "我的", short_name: "我的", url: "/settings" },
    ]);
    expect(manifest.screenshots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: "/screenshot-home.png",
          sizes: "390x844",
          type: "image/png",
          form_factor: "narrow",
        }),
        expect.objectContaining({
          src: "/screenshot-checklist.png",
          sizes: "390x844",
          type: "image/png",
          form_factor: "narrow",
        }),
      ]),
    );
    expect(readme).toContain("清单");
    expect(readme).toContain("恢复快照");
    expect(readme).toContain("WebDAV 备份");
    expect(readme).toContain("宝宝成长记");
    expect(readme).toContain("医院档案");
    expect(readme).toContain("兼容既有备份和旧版家庭同步设备");
    expect(readme).toContain("通用家庭档案");
    expect(readme).toContain("当前设备使用者");
    expect(readme).toContain("亲喂、瓶喂、吸奶、尿布和睡眠");
    expect(readme).toContain("全部、待购买、待装包和已装包");
    expect(readme).toContain("https://dadkit.505f.com/");
    expect(readme).toContain("public/og.png");
    expect(readme).toContain("public/growth/week-20-banana.webp");
    expect(readme).toContain("最新 Android APK");
    expect(readme).toContain("Android APK 升级");
    expect(readme).not.toContain("公开 APK、日志和仓库不得包含");
  });

  it("ships the full PWA surface inside the Android APK", () => {
    const manifest = readSource(
      "android",
      "app",
      "src",
      "main",
      "AndroidManifest.xml",
    );
    const activity = readSource(
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "dadkit",
      "mobile",
      "LauncherActivity.java",
    );
    const bundleScript = readSource("scripts", "build-android-web.mjs");
    const validator = readSource("scripts", "validate-android-release.mjs");

    expect(manifest).toContain("android.permission.INTERNET");
    expect(manifest).not.toContain("trusted");
    expect(manifest).not.toContain("asset_statements");
    expect(manifest).toContain('android:name=".LauncherActivity"');
    expect(activity).toContain("extends Activity");
    expect(activity).toContain("new WebView(this)");
    expect(activity).toContain('getAssets().open("www/" + assetPath)');
    expect(activity).toContain("DadKitAndroidMigration");
    expect(activity).toContain("appVersionCode=16");
    expect(bundleScript).toContain('DADKIT_BUILD_TARGET: "android"');
    expect(bundleScript).toContain('"public"');
    expect(bundleScript).toContain('"assets",\n  "www"');
    expect(validator).toContain("144 bundled item illustrations");
    expect(validator).toContain("33 bundled growth illustrations");
    expect(validator).toContain("bundled public asset matches PWA");
    expect(existsSync(join(process.cwd(), "scripts", "prepare-native-android.mjs"))).toBe(false);
    expect(packageJson.devDependencies).not.toHaveProperty("@bubblewrap/cli");
  });

  it("keeps the Android tag release strict and verifies the signed APK", () => {
    const workflow = readSource(".github", "workflows", "android-release.yml");

    expect(workflow).toContain('test "$GITHUB_REF_NAME" = "v3.4.3"');
    expect(workflow).toContain(
      'git merge-base --is-ancestor "$GITHUB_SHA" origin/main',
    );
    expect(workflow).toContain("npm run android:bundle");
    expect(workflow).toContain("apksigner");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("retention-days: 30");
    expect(workflow).toContain('= "144"');
    expect(workflow).toContain('= "33"');
    expect(workflow).toContain('gh release create "$GITHUB_REF_NAME"');
  });

  it("returns health status with version and buildTime", async () => {
    const previousDataDir = process.env.DADKIT_DATA_DIR;
    const healthDataDir = mkdtempSync(join(tmpdir(), "dadkit-health-"));
    process.env.DADKIT_DATA_DIR = healthDataDir;

    try {
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        version: packageJson.version,
        buildTime: process.env.DADKIT_BUILD_TIME ?? "unknown",
        syncProtocolVersion: 2,
        syncSpaceSchemaVersion: 2,
        storageWritable: true,
      });
    } finally {
      if (previousDataDir === undefined) {
        delete process.env.DADKIT_DATA_DIR;
      } else {
        process.env.DADKIT_DATA_DIR = previousDataDir;
      }
      rmSync(healthDataDir, { force: true, recursive: true });
    }
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
      "og-growth.png",
      "screenshot-home.png",
      "screenshot-checklist.png",
    ]) {
      const pathname = join(process.cwd(), "public", asset);
      expect(existsSync(pathname)).toBe(true);
      expect(statSync(pathname).size).toBeLessThan(300 * 1024);
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
      expect(sources).not.toMatch(new RegExp(`["']/${route}["'?]`));
    }

    expect(existsSync(join(process.cwd(), "app", "page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "app", "settings", "page.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), "app", "hospital", "page.tsx"))).toBe(
      true,
    );
    expect(existsSync(join(process.cwd(), "app", "planning", "page.tsx"))).toBe(
      true,
    );
  });

  it("pre-caches all core offline routes during install", () => {
    const sw = readSource("public", "sw.js");

    expect(sw).toContain('const CACHE_NAME = "dadkit-v3.4.3-pwa-r1"');
    for (const route of [
      "/",
      "/checklist",
      "/baby",
      "/baby/timeline",
      "/tools",
      "/growth",
      "/departure",
      "/hospital",
      "/planning",
      "/settings",
      "/settings/backup",
      "/settings/checklist",
      "/settings/family",
      "/settings/sync",
      "/privacy",
      "/support",
    ]) {
      expect(sw).toContain(`"${route}"`);
    }
    expect(sw).not.toContain("CORE_ROUTES");

    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(sw).not.toContain(`"/${route}"`);
    }

    expect(sw).toContain("precacheAppShell");
    expect(sw).not.toContain("/illustrations/");
  });

  it("caps runtime asset caches per path prefix", () => {
    const sw = readSource("public", "sw.js");

    expect(sw).toContain("RUNTIME_CACHE_LIMITS");
    for (const prefix of ["/_next/static/", "/item-art/", "/growth/"]) {
      expect(sw).toContain(`prefix: "${prefix}"`);
    }
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
            "dadkit-v2.1.0-pwa-r12",
            "dadkit-v2.1.1-pwa-r13",
            "dadkit-v2.1.1-pwa-r14",
            "dadkit-v2.2.0-pwa-r1",
            "dadkit-v2.2.1-pwa-r1",
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
      "dadkit-v2.1.0-pwa-r11",
      "dadkit-v2.1.0-pwa-r12",
      "dadkit-v2.1.1-pwa-r13",
      "dadkit-v2.1.1-pwa-r14",
      "dadkit-v2.2.0-pwa-r1",
      "dadkit-v2.2.1-pwa-r1",
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

  it("caches only same-origin Next assets and acknowledges completion", async () => {
    const sw = readSource("public", "sw.js");
    const listeners = new Map<string, (event: Record<string, unknown>) => void>();
    const cachedUrls: string[] = [];
    let cacheWork: Promise<unknown> | undefined;
    let reply: { ok?: boolean } | undefined;
    class FakeRequest {
      constructor(readonly url: string) {}
    }
    const context = {
      self: {
        addEventListener: (
          type: string,
          listener: (event: Record<string, unknown>) => void,
        ) => listeners.set(type, listener),
        location: { origin: "https://dadkit.example" },
      },
      caches: {
        async open() {
          return {
            async put(request: FakeRequest) {
              cachedUrls.push(request.url);
            },
          };
        },
      },
      Request: FakeRequest,
      URL,
      async fetch() {
        return { ok: true, type: "basic" };
      },
    } as Record<string, unknown>;

    runInNewContext(sw, context);
    listeners.get("message")?.({
      data: {
        type: "CACHE_ASSETS",
        urls: [
          "/_next/static/chunks/dialog.js?build=1",
          "https://dadkit.example/_next/static/css/app.css",
          "https://example.net/_next/static/chunks/foreign.js",
          "/api/private",
        ],
      },
      ports: [
        {
          postMessage(message: { ok?: boolean }) {
            reply = message;
          },
        },
      ],
      waitUntil(work: Promise<unknown>) {
        cacheWork = work;
      },
    });

    await cacheWork;
    await Promise.resolve();
    expect(cachedUrls).toEqual([
      "/_next/static/chunks/dialog.js?build=1",
      "/_next/static/css/app.css",
    ]);
    expect(reply?.ok).toBe(true);
  });

  it("pre-caches entry routes while tolerating optional media failure", async () => {
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
    expect(cachedUrls).toContain("/checklist");
    expect(cachedUrls).toContain("/onboarding");
    expect(cachedUrls).toContain("/settings/family");
    expect(cachedUrls).toContain("/join");
    expect(cachedUrls).toContain("/settings/sync");
    expect(cachedUrls).toContain("/_next/static/chunks/root.js");
    expect(cachedUrls).toContain("/icon-192.png");
    expect(cachedUrls).not.toContain("/manifest.webmanifest");
    expect(cachedUrls).toContain("/settings");
    expect(cachedUrls).toContain("/growth");
    expect(cachedUrls).toContain("/baby/timeline");
    expect(cachedUrls).toContain("/hospital");
    expect(cachedUrls).not.toContain("/checklist/mom");

    for (const route of REMOVED_PRODUCT_ROUTES) {
      expect(cachedUrls).not.toContain(`/${route}`);
    }
  });

  it("evicts the oldest runtime cache entries beyond the per-prefix cap", async () => {
    const sw = readSource("public", "sw.js");
    const deleted: string[] = [];
    const keys = [
      ...Array.from({ length: 201 }, (_, index) => ({
        url: `https://dadkit.example/item-art/${index}.webp`,
      })),
      { url: "https://dadkit.example/manifest.webmanifest" },
    ];
    const cache = {
      async keys() {
        return keys;
      },
      async delete(request: { url: string }) {
        deleted.push(request.url);
        return true;
      },
    };
    const context = {
      self: {
        addEventListener: () => undefined,
        location: { origin: "https://dadkit.example" },
      },
    } as Record<string, unknown>;

    runInNewContext(
      `${sw}\n;globalThis.__trimRuntimeCache = trimRuntimeCache;`,
      context,
    );
    const trimRuntimeCache = context.__trimRuntimeCache as (
      cache: unknown,
      pathname: string,
    ) => Promise<void>;

    await trimRuntimeCache(cache, "/item-art/200.webp");
    expect(deleted).toEqual(["https://dadkit.example/item-art/0.webp"]);

    await trimRuntimeCache(cache, "/manifest.webmanifest");
    expect(deleted).toEqual(["https://dadkit.example/item-art/0.webp"]);
  });
});
