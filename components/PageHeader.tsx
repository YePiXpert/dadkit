import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  kicker?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  aside?: ReactNode;
};

export function PageHeader({
  title,
  kicker,
  subtitle,
  backHref,
  backLabel = "返回上一级",
  aside,
}: PageHeaderProps) {
  if (backHref) {
    return (
      <header className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-start gap-2 py-1 sm:py-3">
        <Link
          aria-label={backLabel}
          className="flex size-12 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-shadow hover:shadow-md"
          href={backHref}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 pt-0.5 text-center">
          {kicker ? (
            <p className="text-[13px] font-semibold tracking-wide text-primary">{kicker}</p>
          ) : null}
          <h1 className="mt-0.5 break-words text-2xl font-bold tracking-tight sm:text-[28px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {aside ?? <span aria-hidden className="size-12" />}
      </header>
    );
  }

  return (
    <header className="px-1 pb-1 text-center">
      {kicker ? (
        <p className="text-[13px] font-semibold tracking-wide text-primary">{kicker}</p>
      ) : null}
      <h1 className="py-2 text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
