import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  isPrimaryNavigationItemActive,
  PRIMARY_NAVIGATION_ITEMS,
} from "@/lib/navigation";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const page = readSource("app", "hospital", "page.tsx");
const workspace = readSource("components", "HospitalProfileWorkspace.tsx");
const summary = readSource("components", "HospitalSummaryCard.tsx");
const departure = readSource("components", "DepartureWorkspace.tsx");
const homeDashboard = readSource("components", "HomeDashboard.tsx");
const pwaRegister = readSource("components", "PwaRegister.tsx");
const serviceWorker = readSource("public", "sw.js");

describe("hospital profile page and entry points", () => {
  it("ships the route, metadata and both requested entry points", () => {
    expect(page).toContain("HospitalProfileWorkspace");
    expect(page).toContain("医院档案 | DadKit");
    expect(homeDashboard).toContain("HOSPITAL_PATH");
    expect(homeDashboard).toContain("医院档案");
    expect(departure).toContain("<HospitalSummaryCard />");
    expect(departure.indexOf("<HospitalSummaryCard />")).toBeGreaterThan(
      departure.indexOf('id="departure-remaining-count"'),
    );
  });

  it("provides explicit view/edit/save/cancel/clear interactions", () => {
    for (const copy of [
      "医院档案",
      "把医院地址、电话和入院要求集中放在这里。",
      "编辑医院档案",
      "保存档案",
      "取消",
      "清空档案",
      "复制地址",
      "本页面仅用于保存用户自行填写的信息",
      "出发前请以医院和医生的最新通知为准",
    ]) {
      expect(workspace).toContain(copy);
    }

    expect(workspace).toContain("<ConfirmDialog");
    expect(workspace).toContain("saveDraft(draft)");
    expect(workspace).toContain("hospitalValuesFromPortable(profile)");
    expect(workspace).toContain("navigator.clipboard.writeText");
    expect(workspace).toContain("hospital-copy-fallback");
    expect(workspace).toContain("hospitalTelHref");
    expect(workspace).not.toContain("dangerouslySetInnerHTML");
  });

  it("renders all 14 labelled fields with accessible errors", () => {
    for (const label of [
      "医院名称",
      "院区",
      "产科/住院电话",
      "急诊电话",
      "医院地址",
      "待产或产科入口",
      "住院办理位置",
      "停车位置",
      "入院流程",
      "陪护和探视要求",
      "医院提供的用品",
      "医院不允许携带的用品",
      "需要携带的证件",
      "其他备注",
    ]) {
      expect(readSource("lib", "hospital", "types.ts")).toContain(label);
    }

    expect(workspace).toContain("<Label htmlFor={id}>");
    expect(workspace).toContain('"aria-describedby"');
    expect(workspace).toContain('"aria-invalid"');
    expect(workspace).toContain("requestAnimationFrame");
  });

  it("keeps the departure summary compact and action-safe", () => {
    expect(summary).toContain("还没有填写医院档案");
    expect(summary).toContain("填写医院档案");
    expect(summary).toContain("查看医院档案");
    expect(summary).toContain("break-words");
    expect(summary).toContain("复制医院地址");
    expect(summary).toContain("拨打产科或住院电话");
    expect(summary).toContain("hospitalTelHref");
    expect(summary).not.toContain("地图");
    expect(summary).not.toContain("geolocation");
  });

  it("assigns /hospital only to 我的 navigation", () => {
    const checklist = PRIMARY_NAVIGATION_ITEMS[0];
    const mine = PRIMARY_NAVIGATION_ITEMS.find((item) => item.id === "mine")!;

    expect(isPrimaryNavigationItemActive("/hospital", checklist)).toBe(false);
    expect(isPrimaryNavigationItemActive("/hospital", mine)).toBe(true);
  });

  it("asks the active service worker to cache a first-visited route", () => {
    expect(pwaRegister).toContain('type: "CACHE_ROUTE"');
    expect(pwaRegister).toContain("window.location.pathname");
    expect(pwaRegister).toContain("稍后");
    expect(pwaRegister).toContain("setWaitingWorker(undefined)");
    expect(serviceWorker).toContain('event.data?.type === "CACHE_ROUTE"');
    expect(serviceWorker).toContain('typeof event.data.url === "string"');
    expect(serviceWorker).toContain("fetchAndCacheRoute");
    expect(serviceWorker).toContain('!url.pathname.startsWith("/api/")');
  });
});
