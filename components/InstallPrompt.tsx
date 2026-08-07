"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getChecklistItemState } from "@/lib/checklist-v2";
import {
  clearPwaInstalledSession,
  INSTALL_PROMPT_DISMISS_KEY,
  INSTALL_STATUS_CHANGED_EVENT,
  isIosInstallGuideAvailable,
  isIosSafariBrowser,
  isPwaInstallAvailable,
  isPwaInstalled,
  isStandaloneDisplay,
  markPwaInstalled,
  OPEN_INSTALL_PROMPT_EVENT,
  setPwaInstallPromptAvailable,
} from "@/lib/install-prompt";
import { useDadKitStore } from "@/lib/store";

const AUTO_PROMPT_COMPLETION_COUNT = 3;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installStatusRevision, setInstallStatusRevision] = useState(0);
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
      markPwaInstalled();
    }

    setShowIosGuide(!isPwaInstalled() && isIosInstallGuideAvailable());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      clearPwaInstalledSession();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowIosGuide(false);
      setPwaInstallPromptAvailable(true);
    }

    function handleInstalled() {
      setPwaInstallPromptAvailable(false);
      markPwaInstalled();
      setDeferredPrompt(null);
      setShowIosGuide(false);
      setShowPrompt(false);
    }

    function handleInstallStatusChanged() {
      setInstallStatusRevision((revision) => revision + 1);

      if (isPwaInstalled()) {
        setDeferredPrompt(null);
        setShowIosGuide(false);
        setShowPrompt(false);
      }
    }

    function handleManualOpen() {
      if (
        isPwaInstalled() ||
        !isPwaInstallAvailable()
      ) {
        return;
      }

      const showGuide = isIosInstallGuideAvailable();
      setShowIosGuide(showGuide);
      setShowPrompt(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(
      INSTALL_STATUS_CHANGED_EVENT,
      handleInstallStatusChanged,
    );
    window.addEventListener(OPEN_INSTALL_PROMPT_EVENT, handleManualOpen);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(
        INSTALL_STATUS_CHANGED_EVENT,
        handleInstallStatusChanged,
      );
      window.removeEventListener(OPEN_INSTALL_PROMPT_EVENT, handleManualOpen);
    };
  }, []);

  useEffect(() => {
    if (
      !hydrated ||
      completedCount < AUTO_PROMPT_COMPLETION_COUNT ||
      isPwaInstalled() ||
      window.localStorage.getItem(INSTALL_PROMPT_DISMISS_KEY) === "1"
    ) {
      return;
    }

    setShowPrompt(true);
  }, [completedCount, hydrated, installStatusRevision]);

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
      markPwaInstalled();
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
    setPwaInstallPromptAvailable(false);
  }

  return (
    <section className="card-surface p-3">
      <div className="flex items-start gap-3">
        <span className="icon-tile size-9">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">把 DadKit 装到桌面</p>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
            {showIosGuide && !deferredPrompt
              ? isIosSafariBrowser()
                ? "点底部分享按钮，选择“添加到主屏幕”，离线也能用。"
                : "请先用 Safari 打开本页，再点底部分享按钮，选择“添加到主屏幕”。"
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
