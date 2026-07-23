"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SharePosterMetric = {
  detail: string;
  metric: string;
  title: string;
};

type PosterRatio = "story" | "feed";

type SharePosterCanvasProps = {
  babyLine: string;
  metrics: SharePosterMetric[];
};

const ratioConfig: Record<
  PosterRatio,
  { aspectRatio: string; label: string; name: string; widthClass: string }
> = {
  story: {
    aspectRatio: "9 / 16",
    label: "9:16",
    name: "9x16",
    widthClass: "max-w-[360px]",
  },
  feed: {
    aspectRatio: "3 / 4",
    label: "3:4",
    name: "3x4",
    widthClass: "max-w-[390px]",
  },
};

export function SharePosterCanvas({
  babyLine,
  metrics,
}: SharePosterCanvasProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<PosterRatio>("story");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const selectedRatio = ratioConfig[ratio];
  const visibleMetrics = metrics.slice(0, ratio === "story" ? 4 : 3);

  async function savePoster() {
    if (!posterRef.current || status === "saving") {
      return;
    }

    setStatus("saving");

    try {
      const dataUrl = await toPng(posterRef.current, {
        backgroundColor: "#ffffff",
        cacheBust: false,
        pixelRatio: 3,
      });
      const link = document.createElement("a");

      link.download = `dadkit-prep-poster-${selectedRatio.name}.png`;
      link.href = dataUrl;
      link.click();
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="mobile-shell grid gap-3 lg:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-sm">
          {(Object.keys(ratioConfig) as PosterRatio[]).map((option) => (
            <button
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                ratio === option
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary active:bg-secondary",
              )}
              key={option}
              type="button"
              onClick={() => setRatio(option)}
            >
              {ratioConfig[option].label}
            </button>
          ))}
        </div>
        <Button className="h-10 px-4" onClick={savePoster}>
          <Download className="size-4" />
          {status === "saving"
            ? "生成中"
            : status === "saved"
              ? "已保存"
              : "保存图片"}
        </Button>
      </div>

      {status === "error" ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          当前浏览器没有成功生成图片，可以先长按或使用系统保存这张卡片。
        </p>
      ) : null}

      <div
        className={cn("mx-auto w-full", selectedRatio.widthClass)}
        style={{ aspectRatio: selectedRatio.aspectRatio }}
      >
        <article
          className="flex size-full flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
          ref={posterRef}
          style={{ aspectRatio: selectedRatio.aspectRatio }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
              待产准备卡
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              DadKit
            </span>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-primary">
              发给爸爸照着做
            </p>
            <h2 className="mt-1 break-words text-xl font-semibold leading-tight tracking-normal">
              我的待产准备小本本
            </h2>
            <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
              {babyLine}
            </p>
          </div>

          <div className="mt-auto grid gap-2">
            {visibleMetrics.map((metric) => (
              <PosterMetricRow key={metric.title} metric={metric} />
            ))}
          </div>

          <p className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-center text-xs font-medium leading-5 text-muted-foreground">
            医院要求和临产安排，以医生和医院最新通知为准。
          </p>
        </article>
      </div>
    </section>
  );
}

function PosterMetricRow({ metric }: { metric: SharePosterMetric }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold leading-5">
          {metric.title}
        </span>
        <span className="mt-0.5 block break-words text-xs leading-4 text-muted-foreground">
          {metric.detail}
        </span>
      </span>
      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
        {metric.metric}
      </span>
    </div>
  );
}
