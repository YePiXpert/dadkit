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

describe("public PWA support pages", () => {
  it("describes only checklist and backup data", () => {
    expect(privacyPage).toContain("不要求注册账号");
    expect(privacyPage).toContain("待产清单");
    expect(privacyPage).toContain("本地快照");
    expect(privacyPage).toContain("当前不使用广告 SDK");
    expect(privacyPage).toContain("WebDAV 是用户手动配置的第三方备份位置");
    expect(privacyPage).toContain("getReviewPageHref(PUBLIC_SUPPORT_PATH)");
    expect(privacyPage).not.toContain("预产期、地区、医院、生产方式");
    expect(privacyPage).not.toContain("宫缩记录");
    expect(privacyPage).not.toContain("产后提醒");
    expect(privacyPage).not.toContain("TestFlight");
    expect(privacyPage).not.toContain("App Store Connect");
  });

  it("ships PWA-focused support and non-secret feedback guidance", () => {
    expect(supportPage).toContain("支持与反馈");
    expect(supportPage).toContain("GitHub Issues");
    expect(supportPage).toContain("https://github.com/YePiXpert/dadkit/issues");
    expect(supportPage).toContain("不要发送账号或密码");
    expect(supportPage).toContain("PWA 使用检查");
    expect(supportPage).toContain("数据");
    expect(supportPage).not.toContain("进入“我的”");
    expect(supportPage).not.toContain("TestFlight");
    expect(supportPage).not.toContain("APK");
  });

  it("uses ordinary web routes for public pages", () => {
    expect(PUBLIC_PRIVACY_PATH).toBe("/privacy");
    expect(PUBLIC_SUPPORT_PATH).toBe("/support");
    expect(getReviewPageHref(PUBLIC_PRIVACY_PATH)).toBe("/privacy");
    expect(getReviewPageHref(PUBLIC_SUPPORT_PATH)).toBe("/support");
    expect(() => getReviewPageHref("/unknown")).toThrow(
      "Unsupported app review page path",
    );
  });
});
