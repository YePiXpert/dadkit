import Image from "next/image";

import { cn } from "@/lib/utils";

const ILLUSTRATIONS = {
  family: {
    alt: "准爸爸和孕妈妈一起整理待产清单",
    height: 1024,
    src: "/illustrations/dadkit-family-transparent.png",
    width: 1536,
  },
  helper: {
    alt: "拿着清单的小熊助手",
    height: 1254,
    src: "/illustrations/dadkit-bear-transparent.png",
    width: 1254,
  },
  horse: {
    alt: "戴粉色蝴蝶结的小马宝宝助手",
    height: 1254,
    src: "/illustrations/dadkit-horse-girl.png",
    width: 1254,
  },
};

type CuteIllustrationProps = {
  variant?: keyof typeof ILLUSTRATIONS;
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
