import Image from "next/image";

import { getGrowthIllustrationSrc } from "@/lib/growth-illustrations";
import { cn } from "@/lib/utils";

type GrowthAnalogyIllustrationProps = {
  analogy: string;
  className?: string;
  week: number;
};

export function GrowthAnalogyIllustration({
  analogy,
  className,
  week,
}: GrowthAnalogyIllustrationProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-inset bg-surface-growth shadow-illustration",
        className,
      )}
    >
      <Image
        alt={`${analogy}大小的水粉示意图`}
        className="aspect-[4/3] h-auto w-full select-none object-cover"
        draggable={false}
        height={720}
        priority={week === 36}
        sizes="(max-width: 640px) calc(100vw - 4rem), 560px"
        src={getGrowthIllustrationSrc(week)}
        width={960}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-foreground/5"
      />
    </div>
  );
}
