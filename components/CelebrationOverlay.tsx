"use client";

import { PackageCheck, PartyPopper, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatChecklistShareText, shareText } from "@/lib/share";

const CONFETTI_PIECES = [
  { left: "8%", delay: "0s", duration: "2.6s", color: "hsl(var(--confetti-coral))", size: 10 },
  { left: "16%", delay: "0.3s", duration: "2.9s", color: "hsl(var(--confetti-gold))", size: 8 },
  { left: "24%", delay: "0.1s", duration: "2.4s", color: "hsl(var(--confetti-green))", size: 12 },
  { left: "32%", delay: "0.5s", duration: "3s", color: "hsl(var(--confetti-blue))", size: 8 },
  { left: "40%", delay: "0.2s", duration: "2.7s", color: "hsl(var(--confetti-pink))", size: 10 },
  { left: "48%", delay: "0.4s", duration: "2.5s", color: "hsl(var(--confetti-coral))", size: 8 },
  { left: "56%", delay: "0s", duration: "2.8s", color: "hsl(var(--confetti-gold))", size: 12 },
  { left: "64%", delay: "0.3s", duration: "2.6s", color: "hsl(var(--confetti-green))", size: 8 },
  { left: "72%", delay: "0.15s", duration: "3s", color: "hsl(var(--confetti-blue))", size: 10 },
  { left: "80%", delay: "0.45s", duration: "2.5s", color: "hsl(var(--confetti-pink))", size: 12 },
  { left: "88%", delay: "0.25s", duration: "2.9s", color: "hsl(var(--confetti-coral))", size: 8 },
  { left: "94%", delay: "0.1s", duration: "2.7s", color: "hsl(var(--confetti-gold))", size: 10 },
  { left: "12%", delay: "0.6s", duration: "3.1s", color: "hsl(var(--confetti-green))", size: 8 },
  { left: "52%", delay: "0.55s", duration: "3.1s", color: "hsl(var(--confetti-blue))", size: 10 },
] as const;

export type CelebrationVariant = "complete" | "section" | "birth";

/** 三种里程碑的文案：全部装完是大庆祝，单个分包和宝宝出生是轻一档的贴纸卡。 */
export function getCelebrationCopy(
  variant: CelebrationVariant,
  options: { babyName?: string; sectionLabel?: string } = {},
) {
  if (variant === "section") {
    return {
      title: `${options.sectionLabel ?? "这个分类"}已经装好！`,
      description: "这个分包可以随时拎走，继续稳稳装下一个。",
    };
  }

  if (variant === "birth") {
    const name = options.babyName?.trim();
    return {
      title: name ? `${name}出生了！` : "宝宝出生了！",
      description: "已切换到宝宝记录，喂养、尿布和睡眠都可以随手记。",
    };
  }

  return {
    title: "待产包已经准备完成！",
    description: "辛苦了，随时可以安心出发。",
  };
}

/** 装包进度首次达到 100% 时的庆祝遮罩：奖章贴纸卡 + 彩带。 */
export function CelebrationOverlay({
  babyName,
  departureItemCount = 0,
  packingPercent = 100,
  open,
  onClose,
  sectionLabel,
  variant = "complete",
}: {
  babyName?: string;
  departureItemCount?: number;
  packingPercent?: number;
  open: boolean;
  onClose: () => void;
  sectionLabel?: string;
  variant?: CelebrationVariant;
}) {
  if (!open) {
    return null;
  }

  const copy = getCelebrationCopy(variant, { babyName, sectionLabel });
  const confettiPieces =
    variant === "complete" ? CONFETTI_PIECES : CONFETTI_PIECES.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="celebration-card grid justify-items-center gap-3 overflow-visible rounded-card bg-background px-8 py-7 text-center shadow-xl">
        {confettiPieces.map((piece, index) => (
          <span
            aria-hidden="true"
            className="celebration-confetti"
            key={index}
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
            }}
          />
        ))}
        {variant === "birth" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            aria-hidden="true"
            className="size-20 rounded-full object-cover shadow-md"
            src="/item-art/state-birth-booties.webp"
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
            {variant === "section" ? (
              <PackageCheck className="size-8" strokeWidth={2} />
            ) : (
              <PartyPopper className="size-8" strokeWidth={2} />
            )}
          </span>
        )}
        <DialogHeader className="items-center gap-1">
          <DialogTitle className="text-xl leading-7">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        {variant === "complete" && departureItemCount > 0 ? (
          <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-primary">
            别忘了临出门拿 {departureItemCount} 件。
          </p>
        ) : null}
        <DialogFooter className="w-full sm:justify-center">
          {variant === "complete" ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => void shareText(formatChecklistShareText(packingPercent))}
              variant="outline"
            >
              <Share2 />
              分享给家人
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button className="w-full sm:w-auto">知道了</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
