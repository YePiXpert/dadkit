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
      <header
        className={`grid items-start gap-2 py-0.5 sm:py-1.5 ${
          aside
            ? "grid-cols-[2.75rem_minmax(0,1fr)_auto]"
            : "grid-cols-[2.75rem_minmax(0,1fr)_2.75rem]"
        }`}
      >
        <Link
          aria-label={backLabel}
          className="flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-shadow hover:shadow-md"
          href={backHref}
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 pt-0.5 text-center">
          {kicker ? (
            <p className="text-xs font-semibold tracking-wide text-primary">{kicker}</p>
          ) : null}
          <h1 className="mt-0.5 break-words text-[22px] font-bold leading-tight tracking-tight sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mx-auto mt-1 max-w-[24rem] text-balance text-[13px] leading-5 text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {aside ?? <span aria-hidden className="size-11" />}
      </header>
    );
  }

  return (
    <header className="relative px-1 pb-1 text-center">
      {aside ? <div className="absolute right-0 top-1.5">{aside}</div> : null}
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
