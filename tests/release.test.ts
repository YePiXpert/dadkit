import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { GET } from "@/app/healthz/route";
import packageJson from "@/package.json";

describe("release endpoints and pages", () => {
  it("ships v1.2 release metadata", () => {
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

    expect(packageJson.version).toBe("1.2.0");
    expect(settingsPage).toContain('version: "1.2.0"');
    expect(manifest.name).toBe("DadKit 待产准备");
    expect(manifest.description).toContain("医院确认");
    expect(manifest.description).toContain("临出门沟通卡");
    expect(readme).toContain("# DadKit v1.2");
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
      .filter((file) => file.endsWith(".png"))
      .map((file) => `/illustrations/${file}`)
      .sort();

    expect(illustrationAssets.length).toBeGreaterThan(0);
    expect(sw).toContain('const CACHE_NAME = "dadkit-v1.2.0"');
    expect(sw).toContain('url.pathname.startsWith("/illustrations/")');

    for (const asset of illustrationAssets) {
      expect(sw).toContain(`"${asset}"`);
    }
  });
});
