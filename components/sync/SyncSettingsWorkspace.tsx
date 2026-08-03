"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  Copy,
  HardDrive,
  Link2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Users,
  WifiOff,
} from "lucide-react";

import { DangerZone } from "@/components/DangerZone";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isLegacySyncSession,
  loadSyncClientState,
  loadSyncSession,
} from "@/lib/data/settings-repository";
import {
  createRandomSyncSpace,
  createSyncInviteLink,
  deleteSyncSpacePermanently,
  fetchSyncServiceInfo,
  fetchSyncSpaceMetadata,
  leaveSpace,
  listSyncInvites,
  listSyncSessions,
  renameSyncSpace,
  revokeSyncInvite,
  revokeSyncSession,
  syncNow,
  updateSyncSession,
  upgradeLegacySyncSession,
  useSyncStatusStore,
  type SyncInviteMetadata,
  type SyncServiceInfo,
  type SyncSessionMetadata,
  type SyncSpaceMetadata,
  type SyncSpaceRole,
} from "@/lib/sync/client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function formatDate(value?: string) {
  if (!value) return "暂无";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "暂无" : date.toLocaleString("zh-CN");
}

function roleLabel(role: SyncSpaceRole) {
  return role === "owner" ? "管理员" : "成员";
}

export function SyncSettingsWorkspace() {
  const syncStatus = useSyncStatusStore();
  const [online, setOnline] = useState(true);
  const [service, setService] = useState<SyncServiceInfo>();
  const [space, setSpace] = useState<SyncSpaceMetadata>();
  const [hasSession, setHasSession] = useState(false);
  const [sessions, setSessions] = useState<SyncSessionMetadata[]>([]);
  const [invites, setInvites] = useState<SyncInviteMetadata[]>([]);
  const [legacy, setLegacy] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [deviceName, setDeviceName] = useState("这台设备");
  const [rename, setRename] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [freshInvite, setFreshInvite] = useState<{ id: string; link: string; expiresAt: string }>();
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean>();

  const refresh = useCallback(async () => {
    const local = loadSyncSession();
    setHasSession(Boolean(local));
    setLegacy(isLegacySyncSession(local));
    const serviceResult = await fetchSyncServiceInfo();
    if (serviceResult.ok) setService(serviceResult.data);
    else setOnline(false);
    if (!local || isLegacySyncSession(local)) {
      setSpace(undefined);
      return;
    }
    const metadata = await fetchSyncSpaceMetadata();
    if (!metadata.ok) {
      setMessage(metadata.message);
      setMessageOk(false);
      return;
    }
    setSpace(metadata.space);
    setRename(metadata.space.displayName);
    if (metadata.space.currentSession.role === "owner") {
      const [deviceResult, inviteResult] = await Promise.all([
        listSyncSessions(),
        listSyncInvites(),
      ]);
      if (deviceResult.ok) setSessions(deviceResult.sessions);
      if (inviteResult.ok) setInvites(inviteResult.invites);
    } else {
      setSessions([metadata.space.currentSession]);
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    void refresh();
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [refresh]);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    if (!online) {
      setMessage("需要联网才能管理家庭同步。");
      setMessageOk(false);
      return false;
    }
    setBusy(true);
    const result = await action();
    setBusy(false);
    setMessage(result.ok ? success : result.message ?? "操作失败。");
    setMessageOk(result.ok);
    if (result.ok) await refresh();
    return result.ok;
  }

  async function createSpace() {
    const success = await run(
      () => createRandomSyncSpace(displayName.trim(), deviceName.trim()),
      "家庭同步空间已创建。",
    );
    if (success) {
      setDisplayName("");
      setDeviceName("这台设备");
    }
  }

  async function upgrade() {
    await run(() => upgradeLegacySyncSession(deviceName.trim()), "旧同步会话已安全升级。原始 token 已从本机移除。");
  }

  async function createInvite() {
    if (!online) return;
    setBusy(true);
    const result = await createSyncInviteLink(ttlMinutes);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setMessageOk(false);
      return;
    }
    setFreshInvite(result.invite);
    setMessage("邀请已生成。原始邀请只会显示这一次。");
    setMessageOk(true);
    await refresh();
  }

  async function copyInvite() {
    if (!freshInvite) return;
    await navigator.clipboard.writeText(freshInvite.link);
    setMessage("邀请链接已复制。请只发送给信任的家人。");
    setMessageOk(true);
  }

  async function shareInvite() {
    if (!freshInvite) return;
    if (navigator.share) await navigator.share({ title: "DadKit 家庭同步邀请", text: freshInvite.link });
    else await copyInvite();
  }

  const localState = loadSyncClientState();
  const percent = space
    ? Math.min(100, Math.round((space.usage.dataBytes / Math.max(1, space.usage.dataLimitBytes)) * 100))
    : 0;

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 pb-28 sm:max-w-[42rem]">
        <PageHeader backHref="/settings" backLabel="返回我的" kicker="多设备协作" subtitle="同步设备与家庭成员是两套独立概念；设备角色只控制同步空间管理。" title="家庭同步" />
        {!online ? <Feedback message="当前离线：可查看本机已知状态，管理操作需要联网。" ok={false} /> : null}
        <Feedback message={message} ok={messageOk} />

        {!hasSession ? (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Cloud className="size-5" />创建同步空间</CardTitle></CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm leading-6 text-muted-foreground">家庭名称只是显示文字，允许与其他家庭相同。服务器会生成不可预测的私密空间标识。</p>
                <div className="grid gap-2"><Label htmlFor="new-space-name">家庭显示名称</Label><Input id="new-space-name" maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：小满之家" value={displayName} /></div>
                <div className="grid gap-2"><Label htmlFor="new-device-name">设备名称</Label><Input id="new-device-name" maxLength={60} onChange={(event) => setDeviceName(event.target.value)} placeholder="例如：客厅电脑" value={deviceName} /></div>
                {service?.registrationMode === "closed" ? <Feedback message="此服务器已关闭新空间创建，已有空间仍可加入和同步。" ok={false} /> : null}
                {service && !service.secureTransport ? <Feedback message="当前连接不安全。公开部署必须使用 HTTPS。" ok={false} /> : null}
                <Button disabled={busy || !online || !displayName.trim() || !deviceName.trim() || service?.registrationMode === "closed" || service?.secureTransport === false} onClick={() => void createSpace()}>创建家庭同步</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5" />通过邀请加入</CardTitle></CardHeader>
              <CardContent className="grid gap-3"><p className="text-sm leading-6 text-muted-foreground">粘贴邀请链接即可加入，不需要输入与创建者相同的家庭名称。</p><Button asChild><Link href="/join">打开加入页面</Link></Button><details className="text-sm text-muted-foreground"><summary className="cursor-pointer py-2 font-medium text-foreground">使用旧同步码</summary><p className="py-2">旧同步码入口仍保留在“备份与恢复”的家庭同步区域，供已有家庭继续使用。</p><Button asChild size="sm" variant="outline"><Link href="/settings/backup#family-sync">打开兼容入口</Link></Button></details></CardContent>
            </Card>
          </>
        ) : null}

        {legacy ? (
          <Card>
            <CardHeader><CardTitle>升级现有同步会话</CardTitle></CardHeader>
            <CardContent className="grid gap-4"><p className="text-sm leading-6 text-muted-foreground">升级后改用受浏览器保护的 Cookie，并启用设备管理。升级验证失败时旧会话会保留，不会掉线。</p><div className="grid gap-2"><Label htmlFor="upgrade-device-name">设备名称</Label><Input id="upgrade-device-name" maxLength={60} onChange={(event) => setDeviceName(event.target.value)} value={deviceName} /></div><Button disabled={busy || !online || !deviceName.trim()} onClick={() => void upgrade()}>安全升级</Button></CardContent>
          </Card>
        ) : null}

        {space ? (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />同步空间</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-lg font-semibold">{space.displayName}</span><Badge variant="secondary">{roleLabel(space.currentSession.role)}</Badge></div><p className="font-mono text-[13px] text-muted-foreground">空间指纹：{space.spaceId.slice(0, 6)}…{space.spaceId.slice(-4)}</p><p className="text-muted-foreground">当前设备：{space.currentSession.deviceName}</p>{space.currentSession.role === "owner" ? <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input aria-label="新的家庭显示名称" maxLength={40} onChange={(event) => setRename(event.target.value)} value={rename} /><Button disabled={busy || !online || !rename.trim()} onClick={() => void run(() => renameSyncSpace(rename.trim()), "家庭显示名称已更新。")}>重命名</Button></div> : null}</CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="size-5" />同步状态</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm"><p>上次成功同步：{formatDate(syncStatus.lastSyncAt ?? localState.lastSyncAt)}</p><p>状态：{syncStatus.syncing ? "同步中…" : syncStatus.lastError ? syncStatus.lastError : "已就绪"}</p>{syncStatus.retryAt ? <p>下次重试：{formatDate(syncStatus.retryAt)}</p> : null}<Button disabled={busy || syncStatus.syncing || !online} onClick={() => void run(syncNow, "同步完成。")}>立即同步</Button></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="size-5" />空间用量</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm"><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div><p>{formatBytes(space.usage.dataBytes)} / {formatBytes(space.usage.dataLimitBytes)}（{percent}%）</p><div className="grid grid-cols-2 gap-3"><p className="rounded-xl bg-muted/50 p-3 shadow-sm">设备 {space.usage.deviceCount} / {space.usage.deviceLimit}</p><p className="rounded-xl bg-muted/50 p-3 shadow-sm">有效邀请 {space.usage.activeInviteCount} / {space.usage.activeInviteLimit}</p></div></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />设备</CardTitle></CardHeader>
              <CardContent className="grid gap-3">{sessions.map((session) => <div className="grid gap-3 rounded-xl bg-muted/35 p-3 shadow-sm" key={session.id}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{session.deviceName}{session.current ? "（当前设备）" : ""}</span><span className="text-[13px] text-muted-foreground">{roleLabel(session.role)}</span></div><p className="text-[13px] text-muted-foreground">加入：{formatDate(session.createdAt)} · 最近活动：{formatDate(session.lastSeenAt)}</p><div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Input aria-label={`${session.deviceName}的新名称`} defaultValue={session.deviceName} maxLength={60} onBlur={(event) => { const next = event.currentTarget.value.trim(); if (next && next !== session.deviceName) void run(() => updateSyncSession(session.id, { deviceName: next }), "设备名称已更新。"); }} />{space.currentSession.role === "owner" && !session.current ? <select aria-label="设备角色" className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" disabled={busy || !online} onChange={(event) => void run(() => updateSyncSession(session.id, { role: event.target.value as SyncSpaceRole }), "设备角色已更新。") } value={session.role}><option value="member">成员</option><option value="owner">管理员</option></select> : null}{space.currentSession.role === "owner" && !session.current ? <Button disabled={busy || !online} onClick={() => void run(() => revokeSyncSession(session.id), "设备已撤销。") } variant="destructive">撤销</Button> : null}</div></div>)}</CardContent>
            </Card>

            {space.currentSession.role === "owner" ? (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="size-5" />邀请</CardTitle></CardHeader>
                <CardContent className="grid gap-4"><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><select aria-label="邀请有效期" className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm" onChange={(event) => setTtlMinutes(Number(event.target.value))} value={ttlMinutes}>{(service?.inviteTtlOptions ?? [10, 60, 1440]).map((minutes) => <option key={minutes} value={minutes}>{minutes === 1440 ? "24 小时" : minutes === 60 ? "1 小时" : `${minutes} 分钟`}</option>)}</select><Button disabled={busy || !online} onClick={() => void createInvite()}>生成邀请</Button></div>{freshInvite ? <div className="grid gap-3 rounded-xl bg-secondary/50 p-3 shadow-sm ring-1 ring-primary/30"><p className="break-all text-sm">{freshInvite.link}</p><p className="text-[13px] text-muted-foreground">到期：{formatDate(freshInvite.expiresAt)}。离开本页后无法再次显示原始邀请。</p><div className="grid grid-cols-2 gap-2"><Button onClick={() => void copyInvite()} variant="outline"><Copy className="size-4" />复制</Button><Button onClick={() => void shareInvite()} variant="outline"><Share2 className="size-4" />分享</Button></div></div> : null}<div className="grid gap-2">{invites.length ? invites.map((invite) => <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/35 p-3 text-sm shadow-sm" key={invite.id}><span>{invite.usedAt ? "已使用" : invite.revokedAt ? "已撤销" : new Date(invite.expiresAt).getTime() <= Date.now() ? "已过期" : "有效至"} {formatDate(invite.usedAt ?? invite.revokedAt ?? invite.expiresAt)}</span>{!invite.usedAt && !invite.revokedAt && new Date(invite.expiresAt).getTime() > Date.now() ? <Button disabled={busy || !online} onClick={() => void run(() => revokeSyncInvite(invite.id), "邀请已撤销。") } size="sm" variant="outline">撤销</Button> : null}</div>) : <p className="text-sm text-muted-foreground">暂无邀请记录。</p>}</div></CardContent>
              </Card>
            ) : null}

            <DangerZone title="危险操作" description="退出只移除这台设备的同步会话，本机业务数据保持不变。最后一台管理员设备必须先转移权限。">
              <div className="grid gap-4"><Button disabled={busy || !online} onClick={() => void run(leaveSpace, "已退出家庭同步，本机数据保持不变。") } variant="outline">退出这台设备</Button>{space.currentSession.role === "owner" ? <div className="grid gap-3 border-t border-border pt-4"><p className="text-sm leading-6 text-destructive">永久删除会移除服务器主文件和全部滚动备份，无法恢复；本机清单、家庭资料和宝宝记录仍会保留，并先创建本地恢复点。</p><Label htmlFor="delete-space-confirmation">输入家庭显示名称或“永久删除”</Label><Input id="delete-space-confirmation" onChange={(event) => setDeleteConfirmation(event.target.value)} value={deleteConfirmation} /><Button disabled={busy || !online || (deleteConfirmation !== space.displayName && deleteConfirmation !== "永久删除")} onClick={() => void run(() => deleteSyncSpacePermanently(deleteConfirmation), "服务器同步空间已永久删除，本机数据保持不变。") } variant="destructive">永久删除服务器空间</Button></div> : null}</div>
            </DangerZone>
          </>
        ) : null}
        {!online ? <WifiOff className="mx-auto size-5 text-muted-foreground" /> : null}
      </section>
    </div>
  );
}
