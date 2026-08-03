"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isLegacySyncSession,
  loadSyncSession,
} from "@/lib/data/settings-repository";
import {
  joinSpace,
  refreshSyncStatus,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";

export function FamilySyncCard() {
  const status = useSyncStatusStore();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean>();

  useEffect(() => refreshSyncStatus(), []);
  const session = loadSyncSession();
  const label = session
    ? isLegacySyncSession(session)
      ? session.spaceName ?? "现有家庭同步"
      : session.displayName
    : undefined;

  async function sync() {
    setBusy(true);
    const result = await syncNow();
    setBusy(false);
    setMessage(result.ok ? "同步完成。" : result.message ?? "同步失败。");
    setOk(result.ok);
  }

  async function legacyJoin() {
    setBusy(true);
    const result = await joinSpace(name.trim(), code.trim());
    setBusy(false);
    setMessage(result.ok ? "已加入现有家庭同步。" : result.message ?? "加入失败。");
    setOk(result.ok);
    if (result.ok) refreshSyncStatus();
  }

  return (
    <Card id="family-sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Cloud className="size-5" />家庭同步</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status.joined && session ? (
          <>
            <div className="rounded-xl bg-muted/35 p-3 text-sm leading-6 shadow-sm">
              <p className="font-semibold">{label}</p>
              <p className="text-muted-foreground">
                {isLegacySyncSession(session)
                  ? "现有会话仍可同步，可前往管理页安全升级。"
                  : `${session.deviceName} · ${session.role === "owner" ? "管理员" : "成员"}`}
              </p>
              <p className="text-muted-foreground">上次同步：{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString("zh-CN") : "暂无"}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy || status.syncing} onClick={() => void sync()} variant="outline"><RefreshCw className="size-4" />{status.syncing ? "同步中…" : "立即同步"}</Button>
              <Button asChild><Link href="/settings/sync">同步管理</Link></Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-muted-foreground">创建私密同步空间，或通过邀请链接加入家庭。家庭显示名称可以重复。</p>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild><Link href="/settings/sync">创建同步空间</Link></Button>
              <Button asChild variant="outline"><Link href="/join">通过邀请加入</Link></Button>
            </div>
            <details className="rounded-xl bg-muted/35 p-3 text-sm shadow-sm">
              <summary className="cursor-pointer font-medium">使用旧同步码</summary>
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2"><Label htmlFor="legacy-sync-name">原家庭名称</Label><Input id="legacy-sync-name" maxLength={32} onChange={(event) => setName(event.target.value)} value={name} /></div>
                <div className="grid gap-2"><Label htmlFor="legacy-sync-code">原同步码或一次性口令</Label><Input autoComplete="off" id="legacy-sync-code" maxLength={64} onChange={(event) => setCode(event.target.value)} value={code} /></div>
                <Button disabled={busy || name.trim().length < 2 || code.trim().length < 6} onClick={() => void legacyJoin()} variant="outline">加入现有同步空间</Button>
              </div>
            </details>
          </>
        )}
        <Feedback message={message || status.lastError || ""} ok={ok} />
        <p className="text-[13px] leading-5 text-muted-foreground">同步数据保存在所连接的服务器上，当前不提供端到端加密。请使用 HTTPS 并妥善保管邀请链接。</p>
      </CardContent>
    </Card>
  );
}
