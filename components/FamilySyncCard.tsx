"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { loadSyncSession } from "@/lib/data/settings-repository";
import {
  refreshSyncStatus,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";

export function FamilySyncCard() {
  const joined = useSyncStatusStore((state) => state.joined);
  const syncing = useSyncStatusStore((state) => state.syncing);
  const lastSyncAt = useSyncStatusStore((state) => state.lastSyncAt);
  const lastError = useSyncStatusStore((state) => state.lastError);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean>();

  useEffect(() => refreshSyncStatus(), []);
  const session = loadSyncSession();

  async function sync() {
    setBusy(true);
    const result = await syncNow();
    setBusy(false);
    setMessage(result.ok ? "同步完成。" : result.message ?? "同步失败。");
    setOk(result.ok);
  }

  return (
    <Card id="family-sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cloud className="size-5" />家庭同步</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {joined && session ? (
          <>
            <div className="rounded-inset bg-muted/35 p-3 text-sm leading-6 shadow-sm">
              <p className="font-semibold">{session.displayName}</p>
              <p className="text-muted-foreground">
                {session.deviceName} · {session.role === "owner" ? "管理员" : "成员"}
              </p>
              <p className="text-muted-foreground">上次同步：{lastSyncAt ? new Date(lastSyncAt).toLocaleString("zh-CN") : "暂无"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy || syncing} onClick={() => void sync()} variant="outline"><RefreshCw className="size-4" />{syncing ? "同步中…" : "立即同步"}</Button>
              <Button asChild><Link href="/settings/sync">同步管理</Link></Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-muted-foreground">创建私密同步空间，或通过邀请链接、短口令加入家庭。家庭显示名称可以重复。</p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild><Link href="/settings/sync">创建同步空间</Link></Button>
              <Button asChild variant="outline"><Link href="/join">通过邀请加入</Link></Button>
            </div>
          </>
        )}
        <Feedback message={message || lastError || ""} ok={ok} />
        <p className="text-[13px] leading-5 text-muted-foreground">同步数据保存在所连接的服务器上，当前不提供端到端加密。请使用 HTTPS 并妥善保管邀请链接和短口令。</p>
      </CardContent>
    </Card>
  );
}
