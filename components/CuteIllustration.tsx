import Image from "next/image";

import { cn } from "@/lib/utils";

const ILLUSTRATIONS = {
  checklistBag: {
    alt: "待产包和清单功能贴纸插图",
    height: 1536,
    src: "/illustrations/dadkit-checklist-bag-sticker.png",
    width: 1536,
  },
  family: {
    alt: "家人一起整理待产清单",
    height: 1024,
    src: "/illustrations/dadkit-family-transparent.png",
    width: 1536,
  },
  hospitalRoute: {
    alt: "医院路线和证件功能贴纸插图",
    height: 1536,
    src: "/illustrations/dadkit-hospital-route-sticker.png",
    width: 1536,
  },
  helper: {
    alt: "拿着清单的小熊插图",
    height: 1254,
    src: "/illustrations/dadkit-bear-transparent.png",
    width: 1254,
  },
  horse: {
    alt: "戴粉色蝴蝶结的小马宝宝插图",
    height: 1254,
    src: "/illustrations/dadkit-horse-girl.png",
    width: 1254,
  },
  postpartumPaperwork: {
    alt: "产后证件和结算材料功能贴纸插图",
    height: 1536,
    src: "/illustrations/dadkit-postpartum-paperwork-sticker.png",
    width: 1536,
  },
  shareSummary: {
    alt: "导出摘要和协作清单功能贴纸插图",
    height: 1536,
    src: "/illustrations/dadkit-share-summary-sticker.png",
    width: 1536,
  },
  timelineCalendar: {
    alt: "日历和时间线功能贴纸插图",
    height: 1536,
    src: "/illustrations/dadkit-timeline-calendar-sticker.png",
    width: 1536,
  },
};

export type CuteIllustrationVariant = keyof typeof ILLUSTRATIONS;

type CuteIllustrationProps = {
  variant?: CuteIllustrationVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  sizes?: string;
};

export function CuteIllustration({
  variant = "horse",
  className,
  imageClassName,
  priority = false,
  sizes,
}: CuteIllustrationProps) {
  const illustration = ILLUSTRATIONS[variant];
  const defaultShape = variant === "family" ? "aspect-[16/9]" : "aspect-square";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/80 bg-accent/70 shadow-soft",
        defaultShape,
        className,
      )}
    >
      <Image
        alt={illustration.alt}
        className={cn("object-contain", imageClassName)}
        fill
        priority={priority}
        sizes={sizes ?? (variant === "family" ? "100vw" : "160px")}
        src={illustration.src}
      />
    </div>
  );
}
