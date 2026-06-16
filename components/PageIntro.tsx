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
      <div
        className={cn(
          "relative grid gap-3 px-1 sm:hidden",
          mascot ? "grid-cols-[minmax(0,1fr)_4.5rem]" : "grid-cols-1",
        )}
      >
        <div className="min-w-0">
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight tracking-normal">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        {mascot ? (
          <CuteIllustration
            className="size-16 shrink-0 justify-self-end"
            imageClassName="object-cover"
            priority
            sizes="64px"
          />
        ) : null}
        {children ? (
          <div className={cn(mascot && "col-span-2")}>{children}</div>
        ) : null}
      </div>

      <div className="relative hidden overflow-hidden rounded-lg border border-white/80 bg-card/95 p-4 shadow-soft sm:block sm:p-5">
        <div className="pointer-events-none absolute right-5 top-4 size-8 rounded-full bg-peach/70" />
        <div className="pointer-events-none absolute right-20 top-8 h-3 w-8 rounded-full bg-mint/80" />
        <div className="pointer-events-none absolute bottom-5 right-24 size-3 rounded-full bg-lavender" />
        <div
          className={cn(
            "relative grid gap-4 sm:items-center",
            mascot
              ? "grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[1fr_auto]"
              : "grid-cols-1",
          )}
        >
          <div className="min-w-0">
            <p className="cute-eyebrow">{eyebrow}</p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {mascot ? (
            <CuteIllustration
              className="size-20 shrink-0 justify-self-end sm:size-28"
              imageClassName="object-cover"
              priority
              sizes="112px"
            />
          ) : null}
          {children ? (
            <div className={cn(mascot && "col-span-2")}>{children}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
