"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, WifiOff } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePastedInvite, takeInviteFromLocation } from "@/lib/sync/client-invite";

export function JoinSyncWorkspace() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [pasted, setPasted] = useState("");
  const [deviceName, setDeviceName] = useState("这台设备");
  const [existingName, setExistingName] = useState<string>();
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean>();

  useEffect(() => {
    // 凭据只进入内存，并在任何网络请求前立即清除地址栏 fragment。
    const fromFragment = takeInviteFromLocation(window.location, window.history);
    if (fromFragment) {
      setInviteToken(fromFragment);
      setPasted("已读取邀请链接");
    }
    void import("@/lib/data/settings-repository").then(({ loadSyncSession }) => {
      const session = loadSyncSession();
      setExistingName(
        session && "displayName" in session
          ? session.displayName
          : session?.spaceName,
      );
    });
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  function parseManual(value: string) {
    setPasted(value);
    const parsed = parsePastedInvite(value);
    setInviteToken(parsed ?? "");
    if (value && !parsed) {
      setMessage("邀请链接或邀请 token 格式不正确。");
      setOk(false);
    } else {
      setMessage("");
    }
  }

  async function join() {
    if (!online) {
      setMessage("需要联网才能加入家庭同步。");
      setOk(false);
      return;
    }
    if (!inviteToken || !deviceName.trim()) {
      setMessage("请填写有效邀请和设备名称。");
      setOk(false);
      return;
    }
    if (existingName && !replaceConfirmed) {
      setMessage("请先确认切换家庭同步空间。");
      setOk(false);
      return;
    }
    setBusy(true);
    const { joinSyncSpaceByInvite } = await import("@/lib/sync/client");
    const result = await joinSyncSpaceByInvite(inviteToken, deviceName.trim());
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setOk(false);
      return;
    }
    setInviteToken("");
    setPasted("");
    setMessage(`已加入“${result.space.displayName}”，正在返回首页。`);
    setOk(true);
    router.replace("/");
  }

  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader backHref="/settings/sync" backLabel="返回同步设置" kicker="私密邀请" subtitle="邀请凭据只在本页内存中短暂使用，不会保存到浏览器存储。" title="加入家庭同步" />
        {!online ? (
          <Feedback message="需要联网才能加入家庭同步。" ok={false} />
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="size-5" />邀请</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sync-invite">邀请链接或邀请 token</Label>
              <Input autoComplete="off" id="sync-invite" onChange={(event) => parseManual(event.target.value)} placeholder="粘贴邀请链接" value={pasted} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="join-device-name">设备名称</Label>
              <Input id="join-device-name" maxLength={60} onChange={(event) => setDeviceName(event.target.value)} placeholder="例如：家中 iPad" value={deviceName} />
              <p className="text-[13px] leading-5 text-muted-foreground">设备名称与家庭成员是两回事，不会自动成为记录人。</p>
            </div>
            {existingName ? (
              <label className="flex items-start gap-3 rounded-xl bg-muted/35 p-3 text-sm leading-6 shadow-sm">
                <input checked={replaceConfirmed} className="mt-1 size-4 accent-primary" onChange={(event) => setReplaceConfirmed(event.target.checked)} type="checkbox" />
                <span>当前连接“{existingName}”。我确认切换同步空间；本机业务数据不会删除，数据仍按现有合并规则处理。</span>
              </label>
            ) : null}
            <Feedback message={message} ok={ok} />
            <Button disabled={busy || !online || !inviteToken || !deviceName.trim()} onClick={() => void join()}>
              {busy ? "正在加入…" : "加入家庭同步"}
            </Button>
            {!online ? <WifiOff className="mx-auto size-5 text-muted-foreground" /> : null}
          </CardContent>
        </Card>
        <p className="px-2 text-[13px] leading-5 text-muted-foreground">邀请链接属于敏感凭据，请勿公开发布。家庭同步会把数据保存到你的同步服务器，当前不提供端到端加密。</p>
      </section>
    </div>
  );
}
