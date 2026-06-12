import Image from "next/image";

import { cn } from "@/lib/utils";

const ILLUSTRATIONS = {
  family: {
    alt: "孕妈妈、爸爸和小马助手一起整理待产清单",
    height: 720,
    src: "/illustrations/dadkit-horse-family.webp",
    width: 1280,
  },
  horse: {
    alt: "拿着清单的小马助手",
    height: 640,
    src: "/illustrations/dadkit-horse-mascot.webp",
    width: 640,
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
  const defaultShape =
    variant === "family" ? "aspect-[16/9]" : "aspect-square";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-white/80 bg-accent shadow-soft",
        defaultShape,
        className,
      )}
    >
      <Image
        alt={illustration.alt}
        className={cn("object-cover", imageClassName)}
        fill
        priority={priority}
        sizes={sizes ?? (variant === "family" ? "100vw" : "160px")}
        src={illustration.src}
      />
    </div>
  );
}
