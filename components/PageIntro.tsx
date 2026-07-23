import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function PageIntro({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageIntroProps) {
  return (
    <section className={cn("mobile-shell lg:max-w-none", className)}>
      <div className="grid gap-2 px-1">
        <p className="section-kicker">{eyebrow}</p>
        <h1 className="text-xl font-semibold leading-tight tracking-normal sm:text-2xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {children ? <div className="mt-1">{children}</div> : null}
      </div>
    </section>
  );
}
