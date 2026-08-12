"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export function BabyRepositoryErrorState({
  backHref = "/",
  error,
  onRetry,
}: {
  backHref?: string;
  error: string;
  onRetry(): void;
}) {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid min-h-[60dvh] content-center gap-4 sm:max-w-[32rem]">
        <div className="grid gap-3 rounded-card bg-card p-5 shadow-sm">
          <h1 className="text-lg font-bold">宝宝记录暂不可用</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm">DadKit 不会静默退回 localStorage，以免让你误以为记录已经保存。</p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={onRetry}>重新尝试</Button>
            <Button asChild variant="outline"><Link href={backHref}>返回</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
