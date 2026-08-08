import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  androidReleaseDownloadUrl,
  androidUpdateBridge,
  androidUpdateProgressLabel,
  startNativeUpdateDownload,
} from "@/components/AndroidUpdatePrompt";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const promptSource = readSource("components", "AndroidUpdatePrompt.tsx");
const launcherSource = readSource(
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
const manifestSource = readSource(
  "android",
  "app",
  "src",
  "main",
  "AndroidManifest.xml",
);
const filePathsSource = readSource(
  "android",
  "app",
  "src",
  "main",
  "res",
  "xml",
  "file_paths.xml",
);

const RELEASE = {
  versionCode: 17,
  versionName: "3.5.0",
  notes: "修复已知问题。",
  size: 12_345_678,
  sha256: "a".repeat(64),
  url: "/api/app-version/apk?versionCode=17",
};

function stubWindowWithBridge() {
  const startDownload = vi.fn();
  vi.stubGlobal("window", {
    location: { origin: "https://dadkit.505f.com" },
    DadKitAndroidUpdate: { startDownload },
  });
  return startDownload;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("android in-app update bridge", () => {
  it("passes an absolute download URL and sha256 to the native bridge", () => {
    const startDownload = stubWindowWithBridge();

    expect(startNativeUpdateDownload(RELEASE)).toBe(true);
    expect(startDownload).toHaveBeenCalledTimes(1);
    expect(startDownload).toHaveBeenCalledWith(
      "https://dadkit.505f.com/api/app-version/apk?versionCode=17",
      "a".repeat(64),
    );
  });

  it("falls back to the versioned API path when the release has no url", () => {
    const release = {
      versionCode: RELEASE.versionCode,
      versionName: RELEASE.versionName,
      notes: RELEASE.notes,
      size: RELEASE.size,
      sha256: RELEASE.sha256,
    };

    expect(androidReleaseDownloadUrl(release)).toBe(
      "/api/app-version/apk?versionCode=17",
    );

    const startDownload = stubWindowWithBridge();
    expect(startNativeUpdateDownload(release)).toBe(true);
    expect(startDownload).toHaveBeenCalledWith(
      "https://dadkit.505f.com/api/app-version/apk?versionCode=17",
      "a".repeat(64),
    );
  });

  it("sends an empty sha256 when the release metadata lacks one", () => {
    const startDownload = stubWindowWithBridge();

    expect(
      startNativeUpdateDownload({ versionCode: 17, url: RELEASE.url }),
    ).toBe(true);
    expect(startDownload).toHaveBeenCalledWith(
      "https://dadkit.505f.com/api/app-version/apk?versionCode=17",
      "",
    );
  });

  it("keeps the plain link fallback when the bridge is missing or incomplete", () => {
    vi.stubGlobal("window", {
      location: { origin: "https://dadkit.505f.com" },
    });
    expect(androidUpdateBridge()).toBeUndefined();
    expect(startNativeUpdateDownload(RELEASE)).toBe(false);

    vi.stubGlobal("window", {
      location: { origin: "https://dadkit.505f.com" },
      DadKitAndroidUpdate: {},
    });
    expect(androidUpdateBridge()).toBeUndefined();
    expect(startNativeUpdateDownload(RELEASE)).toBe(false);

    expect(promptSource).toContain("<a href={downloadUrl}>");
    expect(promptSource).toContain("Button asChild");
  });

  it("can call the bridge again to retry after an error", () => {
    const startDownload = stubWindowWithBridge();

    expect(startNativeUpdateDownload(RELEASE)).toBe(true);
    expect(startNativeUpdateDownload(RELEASE)).toBe(true);
    expect(startDownload).toHaveBeenCalledTimes(2);
    expect(promptSource).toContain("重试下载");
  });
});

describe("android update progress states", () => {
  it("renders downloading with a clamped percentage", () => {
    expect(
      androidUpdateProgressLabel({ state: "downloading", percent: 42 }),
    ).toBe("正在下载 42%");
    expect(
      androidUpdateProgressLabel({ state: "downloading", percent: 140 }),
    ).toBe("正在下载 100%");
    expect(
      androidUpdateProgressLabel({ state: "downloading", percent: -5 }),
    ).toBe("正在下载 0%");
    expect(androidUpdateProgressLabel({ state: "downloading" })).toBe(
      "正在下载…",
    );
  });

  it("renders verifying and ready states", () => {
    expect(
      androidUpdateProgressLabel({ state: "verifying", percent: 100 }),
    ).toBe("下载完成，正在校验安装包…");
    expect(androidUpdateProgressLabel({ state: "ready", percent: 100 })).toBe(
      "校验完成，即将打开安装界面…",
    );
  });

  it("renders the error state with its message and a retry hint", () => {
    expect(
      androidUpdateProgressLabel({
        state: "error",
        percent: 0,
        error: "安装包校验失败，请重试",
      }),
    ).toBe("更新失败：安装包校验失败，请重试");
    expect(androidUpdateProgressLabel({ state: "error", percent: 0 })).toBe(
      "更新失败，请重试",
    );
  });
});

describe("android update prompt wiring", () => {
  it("declares the bridge and progress callback on window", () => {
    expect(promptSource).toContain("declare global");
    expect(promptSource).toContain("DadKitAndroidUpdate");
    expect(promptSource).toContain("window.__dadkitUpdateProgress");
    expect(promptSource).toContain("window.location.origin");
    expect(promptSource).toContain("onClick={startDownload}");
    expect(promptSource).toContain("disabled={busy}");
  });

  it("keeps the 6-hour check interval and version storage keys", () => {
    expect(promptSource).toContain(
      "ANDROID_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000",
    );
    expect(promptSource).toContain("dadkit:android-version-code");
    expect(promptSource).toContain("dadkit:android-version-checked-at");
  });
});

describe("android native updater", () => {
  it("registers and tears down the DadKitAndroidUpdate bridge", () => {
    expect(launcherSource).toContain(
      'addJavascriptInterface(new AndroidUpdateBridge(), "DadKitAndroidUpdate")',
    );
    expect(launcherSource).toContain(
      'removeJavascriptInterface("DadKitAndroidUpdate")',
    );
    expect(launcherSource).toContain("window.__dadkitUpdateProgress");
    expect(launcherSource).toContain("updateDownloadInFlight");
  });

  it("follows redirects manually and verifies sha256 before installing", () => {
    expect(launcherSource).toContain("setInstanceFollowRedirects(false)");
    expect(launcherSource).toContain('getHeaderField("Location")');
    expect(launcherSource).toContain('MessageDigest.getInstance("SHA-256")');
    expect(launcherSource).toContain("equalsIgnoreCase(sha256Hex(target))");
  });

  it("installs through a FileProvider with install-time consent handled", () => {
    expect(launcherSource).toContain("FileProvider.getUriForFile");
    expect(launcherSource).toContain("com.dadkit.mobile.fileprovider");
    expect(launcherSource).toContain(
      '"application/vnd.android.package-archive"',
    );
    expect(launcherSource).toContain("FLAG_GRANT_READ_URI_PERMISSION");
    expect(launcherSource).toContain("FLAG_ACTIVITY_NEW_TASK");
    expect(launcherSource).toContain("canRequestPackageInstalls");

    expect(manifestSource).toContain(
      "android.permission.REQUEST_INSTALL_PACKAGES",
    );
    expect(manifestSource).toContain("androidx.core.content.FileProvider");
    expect(manifestSource).toContain("com.dadkit.mobile.fileprovider");
    expect(manifestSource).toContain("@xml/file_paths");

    expect(filePathsSource).toContain("files-path");
    expect(filePathsSource).toContain('path="updates/"');
  });
});
