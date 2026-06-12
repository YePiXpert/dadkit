import type { ReactNode } from "react";

import { CuteIllustration } from "@/components/CuteIllustration";
import { cn } from "@/lib/utils";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  mascot?: boolean;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  className,
  mascot = true,
}: PageIntroProps) {
  return (
    <section className={cn("mobile-shell lg:max-w-none", className)}>
      <div className="grid gap-4 rounded-lg border border-white/80 bg-card/95 p-4 shadow-soft sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="cute-eyebrow">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-normal">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
        {mascot ? (
          <CuteIllustration
            className="hidden size-24 shrink-0 sm:block"
            imageClassName="object-cover"
            sizes="96px"
          />
        ) : null}
      </div>
    </section>
  );
}
