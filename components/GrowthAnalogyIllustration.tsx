import Image from "next/image";

import { getGrowthIllustrationSrc } from "@/lib/growth-illustrations";

type GrowthAnalogyIllustrationProps = {
  analogy: string;
  week: number;
};

export function GrowthAnalogyIllustration({
  analogy,
  week,
}: GrowthAnalogyIllustrationProps) {
  return (
    <div className="relative overflow-hidden rounded-[1.4rem] bg-[#f7f0e2] shadow-[inset_0_0_0_1px_rgba(102,82,50,0.08)]">
      <Image
        alt={`${analogy}大小的水粉示意图`}
        className="aspect-[4/3] h-auto w-full select-none object-cover dark:brightness-[0.82] dark:saturate-[0.9]"
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
