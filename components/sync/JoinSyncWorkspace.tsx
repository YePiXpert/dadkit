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
import { loadSyncSession } from "@/lib/data/settings-repository";
import { parsePastedInvite, takeInviteFromLocation } from "@/lib/sync/client-invite";

export function JoinSyncWorkspace() {
  const router = useRouter();
  const [inviteCredential, setInviteCredential] = useState("");
  const [pasted, setPasted] = useState("");
  const [deviceName, setDeviceName] = useState("这台设备");
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [existingName, setExistingName] = useState<string>();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [initialDataMode, setInitialDataMode] = useState<"remote" | "merge">("remote");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean>();

  useEffect(() => {
    // 凭据只进入内存，并在任何网络请求前立即清除地址栏 fragment。
    const fromFragment = takeInviteFromLocation(window.location, window.history);
    if (fromFragment) {
      setInviteCredential(fromFragment);
      setPasted("已读取邀请链接");
    }
    try {
      const session = loadSyncSession();
      setHasExistingSession(Boolean(session));
      setExistingName(session?.displayName);
      setSessionChecked(true);
    } catch {
      setMessage("无法检查当前同步空间，请刷新页面后重试。");
      setOk(false);
    }
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
    setInviteCredential(parsed ?? "");
    if (value && !parsed) {
      setMessage("邀请链接或短口令格式不正确。");
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
    if (!inviteCredential || !deviceName.trim()) {
      setMessage("请填写有效邀请和设备名称。");
      setOk(false);
      return;
    }
    if (hasExistingSession && !replaceConfirmed) {
      setMessage("请先确认切换家庭同步空间。");
      setOk(false);
      return;
    }
    setBusy(true);
    const { joinSyncSpaceByInvite } = await import("@/lib/sync/client");
    const result = await joinSyncSpaceByInvite(inviteCredential, deviceName.trim(), {
      replaceExisting: replaceConfirmed,
      initialDataMode,
    });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      setOk(false);
      return;
    }
    setInviteCredential("");
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
        <Card aria-busy={!sessionChecked}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Link2 className="size-5" />邀请</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sync-invite">邀请链接或短口令</Label>
              <Input autoComplete="off" id="sync-invite" onChange={(event) => parseManual(event.target.value)} placeholder="粘贴邀请链接或输入 XXXX-XXXX" value={pasted} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="join-device-name">设备名称</Label>
              <Input id="join-device-name" maxLength={60} onChange={(event) => setDeviceName(event.target.value)} placeholder="例如：家中 iPad" value={deviceName} />
              <p className="text-[13px] leading-5 text-muted-foreground">设备名称仅用于在同步空间中区分设备。</p>
            </div>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">这台设备已有数据怎么处理</legend>
              <label className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-inset border p-3 shadow-sm ${initialDataMode === "remote" ? "border-primary bg-secondary/50" : "border-border bg-card"}`}>
                <input checked={initialDataMode === "remote"} className="mt-1 size-4 accent-primary" name="initial-data-mode" onChange={() => setInitialDataMode("remote")} type="radio" />
                <span className="font-medium">使用家庭数据（推荐）</span>
                <span className="col-start-2 text-[13px] leading-5 text-muted-foreground">用远端家庭数据替换本机业务数据。加入前会自动保存恢复点；本机设备偏好和物品照片不受影响。</span>
              </label>
              <label className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-inset border p-3 shadow-sm ${initialDataMode === "merge" ? "border-primary bg-secondary/50" : "border-border bg-card"}`}>
                <input checked={initialDataMode === "merge"} className="mt-1 size-4 accent-primary" name="initial-data-mode" onChange={() => setInitialDataMode("merge")} type="radio" />
                <span className="font-medium">合并本机数据</span>
                <span className="col-start-2 text-[13px] leading-5 text-muted-foreground">保留并合并本机已有的清单、家庭资料和宝宝记录，合并结果会上传到家庭空间。</span>
              </label>
            </fieldset>
            {hasExistingSession ? (
              <label className="flex items-start gap-3 rounded-inset bg-muted/35 p-3 text-sm leading-6 shadow-sm">
                <input checked={replaceConfirmed} className="mt-1 size-4 accent-primary" onChange={(event) => setReplaceConfirmed(event.target.checked)} type="checkbox" />
                <span>当前连接“{existingName ?? "现有家庭同步空间"}”。我确认切换同步空间；切换前会保存恢复点，随后按上方选项处理本机数据。</span>
              </label>
            ) : null}
            <Feedback message={message} ok={ok} />
            <Button disabled={busy || !online || !sessionChecked || !inviteCredential || !deviceName.trim() || Boolean(hasExistingSession && !replaceConfirmed)} onClick={() => void join()}>
              {busy ? "正在加入…" : "加入家庭同步"}
            </Button>
            {!online ? <WifiOff className="mx-auto size-5 text-muted-foreground" /> : null}
          </CardContent>
        </Card>
        <p className="px-2 text-[13px] leading-5 text-muted-foreground">邀请链接和短口令都属于敏感凭据，请勿公开发布。家庭同步会把数据保存到你的同步服务器，当前不提供端到端加密。</p>
      </section>
    </div>
  );
}
