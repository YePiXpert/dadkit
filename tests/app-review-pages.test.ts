import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  getReviewPageHref,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_SUPPORT_PATH,
} from "@/lib/app-routes";

const privacyPage = readFileSync(
  join(process.cwd(), "app", "privacy", "page.tsx"),
  "utf8",
);
const supportPage = readFileSync(
  join(process.cwd(), "app", "support", "page.tsx"),
  "utf8",
);
const mobileBuildDocs = readFileSync(
  join(process.cwd(), "docs", "mobile-app-build.md"),
  "utf8",
);
const mobileReleaseReadinessDocs = readFileSync(
  join(process.cwd(), "docs", "mobile-release-readiness.md"),
  "utf8",
);
const mobileStoreMetadataDocs = readFileSync(
  join(process.cwd(), "docs", "mobile-store-metadata.md"),
  "utf8",
);
const mobileTesterGuideDocs = readFileSync(
  join(process.cwd(), "docs", "mobile-tester-guide.md"),
  "utf8",
);

describe("app review support pages", () => {
  it("ships a privacy policy URL target for app metadata", () => {
    expect(privacyPage).toContain("生效日期：2026-06-30");
    expect(privacyPage).toContain("不要求注册账号");
    expect(privacyPage).toContain("不默认把个人资料上传");
    expect(privacyPage).toContain("当前不使用广告 SDK");
    expect(privacyPage).toContain("WebDAV 是用户手动配置的第三方备份位置");
    expect(privacyPage).toContain("记住密码在本设备");
    expect(privacyPage).toContain("getReviewPageHref(PUBLIC_SUPPORT_PATH)");
  });

  it("ships a support URL target with non-secret feedback guidance", () => {
    expect(supportPage).toContain("支持与反馈");
    expect(supportPage).toContain("GitHub Issues");
    expect(supportPage).toContain("https://github.com/YePiXpert/dadkit/issues");
    expect(supportPage).toContain("不要发送账号或密码");
    expect(supportPage).toContain("TestFlight / APK 测试建议");
    expect(supportPage).toContain("getReviewPageHref(PUBLIC_PRIVACY_PATH)");
  });

  it("keeps public metadata paths separate from native static export hrefs", () => {
    const previousNative = process.env.DADKIT_CAPACITOR_EXPORT;
    const previousPublic = process.env.NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT;

    try {
      delete process.env.DADKIT_CAPACITOR_EXPORT;
      delete process.env.NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT;

      expect(PUBLIC_PRIVACY_PATH).toBe("/privacy");
      expect(PUBLIC_SUPPORT_PATH).toBe("/support");
      expect(getReviewPageHref(PUBLIC_PRIVACY_PATH)).toBe("/privacy");
      expect(getReviewPageHref(PUBLIC_SUPPORT_PATH)).toBe("/support");

      process.env.DADKIT_CAPACITOR_EXPORT = "1";

      expect(getReviewPageHref(PUBLIC_PRIVACY_PATH)).toBe("/privacy/index.html");
      expect(getReviewPageHref(PUBLIC_SUPPORT_PATH)).toBe("/support/index.html");
    } finally {
      if (previousNative === undefined) {
        delete process.env.DADKIT_CAPACITOR_EXPORT;
      } else {
        process.env.DADKIT_CAPACITOR_EXPORT = previousNative;
      }

      if (previousPublic === undefined) {
        delete process.env.NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT;
      } else {
        process.env.NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT = previousPublic;
      }
    }
  });

  it("documents app store metadata placeholders", () => {
    expect(mobileBuildDocs).toContain("Privacy Policy URL: `<public-origin>/privacy`");
    expect(mobileBuildDocs).toContain("Support URL: `<public-origin>/support`");
    expect(mobileBuildDocs).toContain("https://github.com/YePiXpert/dadkit/issues");
    expect(mobileBuildDocs).toContain("docs/mobile-store-metadata.md");
    expect(mobileBuildDocs).toContain("docs/mobile-tester-guide.md");
    expect(mobileBuildDocs).toContain("npm run mobile:handoff:screenshots");
    expect(mobileBuildDocs).toContain("npm run mobile:handoff:store-screenshots");
    expect(mobileBuildDocs).toContain("npm run mobile:handoff:archive");
    expect(mobileBuildDocs).toContain("dist/mobile-handoff/screenshots/");
    expect(mobileBuildDocs).toContain(
      "dist/mobile-handoff/store-screenshots/app-store-6-9/",
    );
    expect(mobileBuildDocs).toContain(
      "dist/mobile-handoff/dadkit-1.2.0-mobile-handoff.zip",
    );
    expect(mobileBuildDocs).toContain("cover.png");
    expect(mobileBuildDocs).toContain("google-play-feature.png");
    expect(mobileBuildDocs).toContain(
      "resources/store/dadkit-google-play-feature.png",
    );
    expect(mobileBuildDocs).toContain("screenshot manifest");
    expect(mobileBuildDocs).toContain("dist/mobile-handoff/readiness-report.md");
    expect(mobileStoreMetadataDocs).toContain("Beta app description");
    expect(mobileStoreMetadataDocs).toContain("What to test");
    expect(mobileStoreMetadataDocs).toContain("App privacy draft");
    expect(mobileStoreMetadataDocs).toContain("Developer-collected data: none.");
    expect(mobileStoreMetadataDocs).toContain("Google Play feature graphic");
    expect(mobileStoreMetadataDocs).toContain("App Store screenshot drafts");
    expect(mobileStoreMetadataDocs).toContain(
      "dist/mobile-handoff/store-screenshots/app-store-6-9/",
    );
    expect(mobileStoreMetadataDocs).toContain("1290x2796");
    expect(mobileStoreMetadataDocs).toContain(
      "resources/store/dadkit-google-play-feature.png",
    );
    expect(mobileStoreMetadataDocs).toContain("1024x500");
    expect(mobileStoreMetadataDocs).toContain(
      "https://support.google.com/googleplay/android-developer/answer/9866151",
    );
    expect(mobileStoreMetadataDocs).toContain(
      "https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/",
    );
    expect(mobileStoreMetadataDocs).toContain("<public-origin>/privacy");
    expect(mobileStoreMetadataDocs).toContain("<public-origin>/support");
    expect(mobileTesterGuideDocs).toContain("Smoke test");
    expect(mobileTesterGuideDocs).toContain("Core workflow test");
    expect(mobileTesterGuideDocs).toContain("Optional WebDAV test");
    expect(mobileTesterGuideDocs).toContain("Feedback template");
    expect(mobileTesterGuideDocs).toContain("Sensitive data removed");
  });

  it("documents final mobile handoff readiness", () => {
    expect(mobileBuildDocs).toContain("docs/mobile-release-readiness.md");
    expect(mobileReleaseReadinessDocs).toContain(
      "android/app/build/outputs/apk/debug/app-debug.apk",
    );
    expect(mobileReleaseReadinessDocs).toContain(
      "dist/mobile-handoff/dadkit-1.2.0-debug.apk",
    );
    expect(mobileReleaseReadinessDocs).toContain(
      "dist/mobile-handoff/dadkit-1.2.0-mobile-handoff.zip",
    );
    expect(mobileReleaseReadinessDocs).toContain("dist/mobile-handoff/index.html");
    expect(mobileReleaseReadinessDocs).toContain("docs/mobile-tester-guide.md");
    expect(mobileReleaseReadinessDocs).toContain(
      "resources/store/dadkit-handoff-cover.png",
    );
    expect(mobileReleaseReadinessDocs).toContain(
      "resources/store/dadkit-google-play-feature.png",
    );
    expect(mobileReleaseReadinessDocs).toContain("npm run mobile:android:handoff");
    expect(mobileReleaseReadinessDocs).toContain("npm run mobile:handoff:screenshots");
    expect(mobileReleaseReadinessDocs).toContain(
      "npm run mobile:handoff:store-screenshots",
    );
    expect(mobileReleaseReadinessDocs).toContain("image2 cover PNG dimensions");
    expect(mobileReleaseReadinessDocs).toContain(
      "Google Play feature graphic dimensions/color type",
    );
    expect(mobileReleaseReadinessDocs).toContain("12 screenshot files");
    expect(mobileReleaseReadinessDocs).toContain(
      "App Store screenshot dimensions/diagnostics",
    );
    expect(mobileReleaseReadinessDocs).toContain(
      "dist/mobile-handoff/readiness-report.json",
    );
    expect(mobileReleaseReadinessDocs).toContain(
      "npm run mobile:android:webdav:verify:prompt",
    );
    expect(mobileReleaseReadinessDocs).toContain("docs/mobile-store-metadata.md");
    expect(mobileReleaseReadinessDocs).toContain("npm run mobile:android:release");
    expect(mobileReleaseReadinessDocs).toContain("DADKIT_ANDROID_KEYSTORE_PATH");
    expect(mobileReleaseReadinessDocs).toContain("TestFlight builds can be tested");
    expect(mobileReleaseReadinessDocs).toContain("to 90 days");
    expect(mobileReleaseReadinessDocs).toContain("up to 10,000 external testers");
    expect(mobileReleaseReadinessDocs).toContain(
      "https://developer.android.com/studio/publish/app-signing",
    );
  });
});
