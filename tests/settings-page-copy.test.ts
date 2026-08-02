import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PRIMARY_NAVIGATION_ITEMS } from "@/lib/navigation";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const settingsPage = readSource("app", "settings", "page.tsx");
const checklistSettingsPage = readSource(
  "app",
  "settings",
  "checklist",
  "page.tsx",
);
const backupSettingsPage = readSource(
  "app",
  "settings",
  "backup",
  "page.tsx",
);
const sharedFeedback = readSource("components", "ui", "feedback.tsx");

describe("settings information architecture", () => {
  it("uses 清单 / 宝宝 / 我的 as the three primary destinations", () => {
    expect(
      PRIMARY_NAVIGATION_ITEMS.map(({ href, id, label }) => ({
        href,
        id,
        label,
      })),
    ).toEqual([
      { href: "/", id: "home", label: "首页" },
      { href: "/checklist", id: "checklist", label: "清单" },
      { href: "/baby", id: "baby", label: "宝宝" },
      { href: "/settings", id: "mine", label: "我的" },
    ]);
  });

  it("keeps /settings as a focused 我的 entry page", () => {
    expect(settingsPage).toContain("我的");
    expect(settingsPage).not.toContain('href: "/hospital"');
    expect(settingsPage).not.toContain('href: "/growth"');
    expect(settingsPage).toContain('href: "/settings/sync"');
    expect(settingsPage).toContain('href: "/settings/family"');
    expect(settingsPage).toContain('href: "/settings/checklist"');
    expect(settingsPage).toContain('href: "/settings/backup"');
    expect(settingsPage).not.toContain("登录");
    expect(settingsPage).not.toContain("心愿单");
  });

  it("moves backup capabilities out of the entry page and provides full v8 JSON backup", () => {
    expect(settingsPage).not.toContain("loadSnapshots");
    expect(settingsPage).not.toContain("clearAll");
    expect(settingsPage).not.toContain("WebDAV 地址");

    expect(backupSettingsPage).toContain("备份与恢复");
    expect(backupSettingsPage).toContain("本机恢复点");
    expect(backupSettingsPage).toContain("最多保留 2 份");
    expect(backupSettingsPage).toContain("WebDAV 备份");
    expect(backupSettingsPage).toContain("照片备份包");
    expect(backupSettingsPage).toContain("导出照片包");
    expect(backupSettingsPage).toContain("导入照片包");
    expect(backupSettingsPage).toContain("导出 JSON 备份");
    expect(backupSettingsPage).toContain("导入 JSON 备份");
    expect(backupSettingsPage).not.toContain("手动备份");
    expect(backupSettingsPage).not.toContain("应用密码 / 密码");
    expect(backupSettingsPage).toContain("exportJsonBackup");
    expect(backupSettingsPage).toContain("importDataAsync");
  });

  it("provides local checklist preferences and a non-destructive repair", () => {
    expect(checklistSettingsPage).toContain(
      "useChecklistDescriptionPreference",
    );
    expect(checklistSettingsPage).toContain("显示物品说明");
    expect(checklistSettingsPage).toContain('value: "lean"');
    expect(checklistSettingsPage).toContain('label: "精简"');
    expect(checklistSettingsPage).toContain('value: "full"');
    expect(checklistSettingsPage).toContain('label: "完整"');
    expect(checklistSettingsPage).toContain("restoreMissingTemplateItems");
    expect(checklistSettingsPage).toContain("不会清除勾选进度");
    expect(checklistSettingsPage).toContain("不会删除自定义物品");
  });

  it("uses typed custom dialogs for rebuild and clear", () => {
    expect(checklistSettingsPage).toContain("<Dialog");
    expect(checklistSettingsPage).toContain(
      'rebuildConfirmation !== "重新开始"',
    );
    expect(checklistSettingsPage).toContain("输入“重新开始”以继续");
    expect(checklistSettingsPage).not.toContain("window.confirm");

    expect(backupSettingsPage).toContain("<Dialog");
    expect(backupSettingsPage).toContain(
      'clearConfirmation !== "清空全部数据"',
    );
    expect(backupSettingsPage).toContain("输入“清空全部数据”以继续");
    expect(backupSettingsPage).toContain("系统会先验证完整恢复点能够成功写入");
    expect(backupSettingsPage).toContain("全部本机恢复点");
  });

  it("keeps privacy and support subordinate to backup", () => {
    expect(backupSettingsPage).toContain("PUBLIC_PRIVACY_PATH");
    expect(backupSettingsPage).toContain("PUBLIC_SUPPORT_PATH");
    expect(backupSettingsPage).toContain("隐私说明");
    expect(backupSettingsPage).toContain("支持与反馈");
    expect(backupSettingsPage).toContain("@/components/ui/feedback");
    expect(checklistSettingsPage).toContain("@/components/ui/feedback");
    expect(sharedFeedback).toContain('aria-live="polite"');
    expect(sharedFeedback).toContain(
      'role={ok === false ? "alert" : "status"}',
    );
  });
});
