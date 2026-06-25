import Image from "next/image";

import { cn } from "@/lib/utils";

const ILLUSTRATIONS = {
  checklistBag: {
    alt: "Maternity bag and checklist sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-checklist-bag-sticker-v2.png",
    width: 1254,
  },
  family: {
    alt: "Family preparing maternity checklist illustration",
    height: 1024,
    src: "/illustrations/dadkit-family-transparent.png",
    width: 1536,
  },
  homeJournal: {
    alt: "Maternity preparation journal cover sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-home-journal-sticker-v2.png",
    width: 1254,
  },
  hospitalRoute: {
    alt: "Hospital route and document sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-hospital-route-sticker-v2.png",
    width: 1254,
  },
  helper: {
    alt: "Checklist helper illustration",
    height: 1254,
    src: "/illustrations/dadkit-bear-transparent.png",
    width: 1254,
  },
  horse: {
    alt: "Baby mascot illustration with a pink bow",
    height: 1254,
    src: "/illustrations/dadkit-horse-girl.png",
    width: 1254,
  },
  maternityJournal: {
    alt: "Maternity preparation journal sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-maternity-journal-sticker.png",
    width: 1254,
  },
  postpartumPaperwork: {
    alt: "Postpartum paperwork sticker illustration",
    height: 1536,
    src: "/illustrations/dadkit-postpartum-paperwork-sticker.png",
    width: 1536,
  },
  shareSummary: {
    alt: "Preparation summary share sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-share-summary-sticker-v2.png",
    width: 1254,
  },
  timelineCalendar: {
    alt: "Timeline calendar sticker illustration",
    height: 1254,
    src: "/illustrations/dadkit-timeline-calendar-sticker-v2.png",
    width: 1254,
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
