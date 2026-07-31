"use client";

import { PartyPopper, Share2 } from "lucide-react";

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

/** 装包进度首次达到 100% 时的庆祝遮罩：奖章贴纸卡 + 彩带。 */
export function CelebrationOverlay({
  departureItemCount = 0,
  packingPercent = 100,
  open,
  onClose,
}: {
  departureItemCount?: number;
  packingPercent?: number;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="celebration-card grid justify-items-center gap-3 overflow-visible rounded-card border border-border bg-background px-8 py-7 text-center shadow-xl">
        {CONFETTI_PIECES.map((piece, index) => (
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
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
          <PartyPopper className="size-8" strokeWidth={2} />
        </span>
        <DialogHeader className="items-center gap-1">
          <DialogTitle className="text-xl leading-7">待产包已经准备完成！</DialogTitle>
          <DialogDescription>辛苦了，随时可以安心出发。</DialogDescription>
        </DialogHeader>
        {departureItemCount > 0 ? (
          <p className="rounded-xl bg-secondary px-3 py-2 text-sm text-primary">
            别忘了临出门拿 {departureItemCount} 件。
          </p>
        ) : null}
        <DialogFooter className="w-full sm:justify-center">
          <Button
            className="w-full sm:w-auto"
            onClick={() => void shareText(formatChecklistShareText(packingPercent))}
            variant="outline"
          >
            <Share2 />
            分享给家人
          </Button>
          <DialogClose asChild>
            <Button className="w-full sm:w-auto">知道了</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
