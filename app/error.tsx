"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset(): void }) {
  return (
    <main className="page-shell">
      <section className="mobile-shell grid min-h-[70dvh] content-center gap-4 sm:max-w-[32rem]">
        <div className="grid gap-4 rounded-card bg-card p-5 shadow-sm">
          <div className="grid gap-2">
            <p className="section-kicker text-destructive">页面暂时无法显示</p>
            <h1 className="text-2xl font-bold">本地数据没有被自动清除</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              可以先重试当前页面；若问题持续，请重新加载，或前往备份与恢复检查本机恢复点。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={reset}>重试</Button>
            <Button onClick={() => window.location.reload()} variant="outline">重新加载</Button>
            <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
            <Button asChild variant="outline"><Link href="/settings/backup">备份与恢复</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}
