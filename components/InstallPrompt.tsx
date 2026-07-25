"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "dadkit-install-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    if (
      isStandaloneDisplay() ||
      window.localStorage.getItem(DISMISS_KEY) === "1"
    ) {
      return;
    }

    setDismissed(false);
    setShowIosGuide(isIosDevice());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  if (dismissed || (!deferredPrompt && !showIosGuide)) {
    return null;
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setDismissed(true);
    }

    setDeferredPrompt(null);
  }

  return (
    <section className="card-surface p-3">
      <div className="flex items-start gap-3">
        <span className="icon-tile size-9">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">把 DadKit 装到桌面</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {showIosGuide && !deferredPrompt
              ? "用 Safari 打开，点底部分享按钮，选择“添加到主屏幕”，离线也能用。"
              : "安装后可直接从桌面打开，离线也能查看和更新待产清单。"}
          </p>
          {deferredPrompt ? (
            <button
              className="mt-2 min-h-11 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
              onClick={handleInstall}
              type="button"
            >
              立即安装
            </button>
          ) : null}
        </div>
        <button
          aria-label="暂不安装"
          className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
          onClick={handleDismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
