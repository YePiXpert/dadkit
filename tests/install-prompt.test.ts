import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPwaInstalledSession,
  isBundledAndroidApp,
  isIosSafariBrowser,
  isPwaInstallAvailable,
  isPwaInstalled,
  markPwaInstalled,
  resolvePwaInstalled,
  setPwaInstallPromptAvailable,
} from "@/lib/install-prompt";

function readSource(...segments: string[]) {
  return readFileSync(join(process.cwd(), ...segments), "utf8");
}

const installPrompt = readSource("components", "InstallPrompt.tsx");
const installPromptLogic = readSource("lib", "install-prompt.ts");
const settingsEntry = readSource(
  "components",
  "InstallPromptSettingsEntry.tsx",
);
const input = readSource("components", "ui", "input.tsx");
const textarea = readSource("components", "ui", "textarea.tsx");
const quantityStepper = readSource("components", "QuantityStepper.tsx");
const checklistWorkspace = readSource(
  "components",
  "ChecklistWorkspace.tsx",
);
const growthWorkspace = readSource("components", "GrowthWorkspace.tsx");

function stubWindow(userAgent = "Test Browser") {
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: false })),
    navigator: {
      maxTouchPoints: 0,
      platform: "Win32",
      standalone: false,
      userAgent,
    },
  });
}

beforeEach(() => {
  stubWindow();
  clearPwaInstalledSession();
  setPwaInstallPromptAvailable(false);
});

afterEach(() => {
  setPwaInstallPromptAvailable(false);
  clearPwaInstalledSession();
  vi.unstubAllGlobals();
});

describe("PWA install status", () => {
  it("treats any reliable install signal as installed", () => {
    expect(
      resolvePwaInstalled({
        displayModeStandalone: false,
        navigatorStandalone: false,
        installedThisSession: false,
      }),
    ).toBe(false);

    for (const installedSignal of [
      "displayModeStandalone",
      "navigatorStandalone",
      "installedThisSession",
    ] as const) {
      expect(
        resolvePwaInstalled({
          displayModeStandalone: installedSignal === "displayModeStandalone",
          navigatorStandalone: installedSignal === "navigatorStandalone",
          installedThisSession: installedSignal === "installedThisSession",
        }),
      ).toBe(true);
    }
  });

  it("keeps install confirmation recoverable within the current runtime", () => {
    expect(isPwaInstalled()).toBe(false);

    markPwaInstalled();
    expect(isPwaInstalled()).toBe(true);

    clearPwaInstalledSession();
    expect(isPwaInstalled()).toBe(false);
    expect(installPromptLogic).not.toContain("PWA_INSTALL_MARKER_KEY");
    expect(installPromptLogic).not.toContain("localStorage");
  });

  it("only exposes an install action when the browser can fulfill it", () => {
    expect(isPwaInstallAvailable()).toBe(false);

    setPwaInstallPromptAvailable(true);
    expect(isPwaInstallAvailable()).toBe(true);

    setPwaInstallPromptAvailable(false);
    stubWindow("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(isPwaInstallAvailable()).toBe(true);
  });

  it("recognizes the bundled Android app and suppresses PWA installation", () => {
    expect(isBundledAndroidApp()).toBe(false);

    stubWindow("Mozilla/5.0 DadKitAndroid/16");
    setPwaInstallPromptAvailable(true);
    expect(isBundledAndroidApp()).toBe(true);
    expect(isPwaInstallAvailable()).toBe(false);
    expect(installPrompt).toContain("isBundledAndroidApp()");
    expect(settingsEntry).toContain("isBundledAndroidApp()");
  });

  it("hides the settings entry after standalone or app installation", () => {
    expect(settingsEntry).toContain("isStandaloneDisplay()");
    expect(settingsEntry).toContain("!isPwaInstalled()");
    expect(settingsEntry).toContain("isPwaInstallAvailable()");
    expect(settingsEntry).toContain('addEventListener("appinstalled"');
    expect(settingsEntry).toContain("if (!showInstallEntry)");
    expect(installPrompt).toContain("markPwaInstalled()");
    expect(installPrompt).toContain('addEventListener("appinstalled"');
    expect(installPrompt).toContain("clearPwaInstalledSession()");
    expect(installPrompt).toContain("INSTALL_STATUS_CHANGED_EVENT");
  });

  it("shows direct steps in Safari and asks other iOS browsers to switch", () => {
    stubWindow(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    );
    expect(isIosSafariBrowser()).toBe(true);

    stubWindow(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/126.0 Mobile/15E148 Safari/604.1",
    );
    expect(isIosSafariBrowser()).toBe(false);
    expect(installPrompt).toContain("点底部分享按钮");
    expect(installPrompt).toContain("请先用 Safari 打开本页");
  });
});

describe("mobile form control text", () => {
  it("keeps focused text controls at 16px to avoid iOS focus zoom", () => {
    expect(input).toContain("py-2 text-base");
    expect(textarea).toContain("py-2 text-base");
    expect(quantityStepper).toContain("text-center text-base");
    expect(checklistWorkspace).toContain("p-3 text-base leading-6");
    expect(growthWorkspace).toContain("text-center text-base font-semibold");
  });
});
