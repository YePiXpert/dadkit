"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getChecklistItemState } from "@/lib/checklist-v2";
import {
  INSTALL_PROMPT_DISMISS_KEY,
  OPEN_INSTALL_PROMPT_EVENT,
} from "@/lib/install-prompt";
import { useDadKitStore } from "@/lib/store";

const AUTO_PROMPT_COMPLETION_COUNT = 3;

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
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const hydrated = useDadKitStore((state) => state.hydrated);
  const checklist = useDadKitStore((state) => state.checklist);
  const completedCount = checklist.filter(
    (item) => getChecklistItemState(item) === "packed",
  ).length;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    setShowIosGuide(isIosDevice());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    function handleManualOpen() {
      setShowPrompt(true);
    }

    window.addEventListener(OPEN_INSTALL_PROMPT_EVENT, handleManualOpen);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener(OPEN_INSTALL_PROMPT_EVENT, handleManualOpen);
    };
  }, []);

  useEffect(() => {
    if (
      !hydrated ||
      completedCount < AUTO_PROMPT_COMPLETION_COUNT ||
      isStandaloneDisplay() ||
      window.localStorage.getItem(INSTALL_PROMPT_DISMISS_KEY) === "1"
    ) {
      return;
    }

    setShowPrompt(true);
  }, [completedCount, hydrated]);

  if (!showPrompt || (!deferredPrompt && !showIosGuide)) {
    return null;
  }

  function handleDismiss() {
    window.localStorage.setItem(INSTALL_PROMPT_DISMISS_KEY, "1");
    setShowPrompt(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setShowPrompt(false);
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
            <Button className="mt-2" onClick={handleInstall} size="sm">
              立即安装
            </Button>
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
