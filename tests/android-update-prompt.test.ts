import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  androidReleaseDownloadUrl,
  androidUpdateBridge,
  androidUpdateProgressLabel,
  startNativeUpdateDownload,
} from "@/components/AndroidUpdatePrompt";
import {
  ANDROID_UPDATE_CHECK_INTERVAL_MS,
  ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY,
  ANDROID_VERSION_STORAGE_KEY,
  captureCurrentAndroidVersionCode,
  checkForAndroidUpdate,
  resetAndroidUpdateSessionState,
} from "@/lib/android-update";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const promptSource = readSource("components", "AndroidUpdatePrompt.tsx");
const settingsCardSource = readSource(
  "components",
  "AndroidUpdateSettingsCard.tsx",
);
const settingsPageSource = readSource("app", "settings", "page.tsx");
const aboutPageSource = readSource(
  "app",
  "settings",
  "about",
  "page.tsx",
);
const updateCoreSource = readSource("lib", "android-update.ts");
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

function createLocalStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

function stubAndroidWindow({
  search = "",
  storage = createLocalStorage(),
}: {
  search?: string;
  storage?: Storage;
} = {}) {
  vi.stubGlobal("window", {
    location: {
      origin: "https://dadkit.505f.com",
      search,
    },
    localStorage: storage,
    navigator: { userAgent: "DadKit test browser" },
    setTimeout,
    clearTimeout,
  });
  return storage;
}

afterEach(() => {
  resetAndroidUpdateSessionState();
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
    expect(updateCoreSource).toContain("declare global");
    expect(updateCoreSource).toContain("DadKitAndroidUpdate");
    expect(promptSource).toContain("window.__dadkitUpdateProgress");
    expect(updateCoreSource).toContain("window.location.origin");
    expect(promptSource).toContain("startNativeUpdateDownload(release)");
    expect(promptSource).toContain("disabled={busy}");
  });

  it("keeps the 6-hour check interval and version storage keys", () => {
    expect(updateCoreSource).toContain(
      "ANDROID_UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000",
    );
    expect(updateCoreSource).toContain("dadkit:android-version-code");
    expect(updateCoreSource).toContain("dadkit:android-version-checked-at");
    expect(ANDROID_UPDATE_CHECK_INTERVAL_MS).toBe(21_600_000);
  });

  it("adds a persistent version and forced manual-check surface to settings", () => {
    expect(settingsPageSource).toContain('href: "/settings/about"');
    expect(settingsPageSource).toContain("当前版本");
    expect(aboutPageSource).toContain("<AndroidUpdateSettingsCard");
    expect(settingsCardSource).toContain("关于 DadKit");
    expect(settingsCardSource).toContain("当前版本");
    expect(settingsCardSource).toContain("检查更新");
    expect(settingsCardSource).toContain("checkForAndroidUpdate({ force: true })");
    expect(settingsCardSource).toContain("已是最新版");
    expect(settingsCardSource).toContain("检查失败，请确认网络后重试");
    expect(settingsCardSource).toContain("androidUpdateProgressLabel(progress)");
  });
});

describe("android version checks", () => {
  it("captures the APK version from the launch URL for later settings pages", () => {
    const storage = stubAndroidWindow({
      search: "?source=apk&appVersionCode=17",
    });

    expect(captureCurrentAndroidVersionCode()).toBe(17);
    expect(storage.getItem(ANDROID_VERSION_STORAGE_KEY)).toBe("17");
  });

  it("recovers the current version from the native user agent on a deep page", () => {
    const storage = createLocalStorage({
      [ANDROID_VERSION_STORAGE_KEY]: "17",
    });
    vi.stubGlobal("window", {
      location: { origin: "https://dadkit.505f.com", search: "" },
      localStorage: storage,
      navigator: { userAgent: "Android WebView DadKitAndroid/21" },
    });

    expect(captureCurrentAndroidVersionCode()).toBe(21);
    expect(storage.getItem(ANDROID_VERSION_STORAGE_KEY)).toBe("21");
  });

  it("keeps automatic checks throttled within six hours", async () => {
    const now = Date.now();
    stubAndroidWindow({
      storage: createLocalStorage({
        [ANDROID_VERSION_STORAGE_KEY]: "17",
        [ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY]: String(now),
      }),
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkForAndroidUpdate()).resolves.toEqual({
      status: "skipped",
      currentVersionCode: 17,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lets a manual check bypass the interval and report a newer release", async () => {
    const now = Date.now();
    stubAndroidWindow({
      storage: createLocalStorage({
        [ANDROID_VERSION_STORAGE_KEY]: "17",
        [ANDROID_UPDATE_CHECKED_AT_STORAGE_KEY]: String(now),
      }),
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...RELEASE, versionCode: 18 }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      checkForAndroidUpdate({ force: true }),
    ).resolves.toMatchObject({
      status: "available",
      currentVersionCode: 17,
      release: { versionCode: 18 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/app-version",
      expect.objectContaining({ cache: "no-store" }),
    );
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
