"use client";

import { useEffect } from "react";
import { PartyPopper } from "lucide-react";

const CONFETTI_PIECES = [
  { left: "8%", delay: "0s", duration: "2.6s", color: "#f9536f", size: 10 },
  { left: "16%", delay: "0.3s", duration: "2.9s", color: "#ffc94d", size: 8 },
  { left: "24%", delay: "0.1s", duration: "2.4s", color: "#4caf7d", size: 12 },
  { left: "32%", delay: "0.5s", duration: "3s", color: "#7fb3e8", size: 8 },
  { left: "40%", delay: "0.2s", duration: "2.7s", color: "#ff9fb2", size: 10 },
  { left: "48%", delay: "0.4s", duration: "2.5s", color: "#f9536f", size: 8 },
  { left: "56%", delay: "0s", duration: "2.8s", color: "#ffc94d", size: 12 },
  { left: "64%", delay: "0.3s", duration: "2.6s", color: "#4caf7d", size: 8 },
  { left: "72%", delay: "0.15s", duration: "3s", color: "#7fb3e8", size: 10 },
  { left: "80%", delay: "0.45s", duration: "2.5s", color: "#ff9fb2", size: 12 },
  { left: "88%", delay: "0.25s", duration: "2.9s", color: "#f9536f", size: 8 },
  { left: "94%", delay: "0.1s", duration: "2.7s", color: "#ffc94d", size: 10 },
  { left: "12%", delay: "0.6s", duration: "3.1s", color: "#4caf7d", size: 8 },
  { left: "52%", delay: "0.55s", duration: "3.1s", color: "#7fb3e8", size: 10 },
] as const;

const AUTO_CLOSE_MS = 3200;

/** 装包进度首次达到 100% 时的庆祝遮罩：奖章贴纸卡 + 彩带，自动关闭。 */
export function CelebrationOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(onClose, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-foreground/40 p-6"
      onClick={onClose}
      role="status"
    >
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

      <div className="celebration-card grid justify-items-center gap-3 rounded-[2rem] border border-border bg-background px-8 py-7 text-center shadow-xl">
        <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
          <PartyPopper className="size-8" strokeWidth={2} />
        </span>
        <p className="text-xl font-bold leading-7">待产包全部装包完成！</p>
        <p className="text-sm leading-6 text-muted-foreground">
          辛苦了，随时可以安心出发。
        </p>
      </div>
    </div>
  );
}
