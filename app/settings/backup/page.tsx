"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Cloud,
  ChevronDown,
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  getReviewPageHref,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_SUPPORT_PATH,
} from "@/lib/app-routes";
import {
  clearSnapshots,
  clearWebDavSettings,
  exportData,
  loadSnapshots,
  loadWebDavConfig,
  loadWebDavSecret,
  loadWebDavSyncState,
  restoreSnapshot,
  saveWebDavConfig,
  saveWebDavSecret,
  saveWebDavSyncState,
  type DadKitSnapshot,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import {
  downloadWebDavBackup,
  importDadKitWebDavBackup,
  testWebDavConnection,
  uploadWebDavBackup,
} from "@/lib/webdav/client";
import {
  DEFAULT_WEBDAV_CONFIG,
  type DadKitWebDavBackup,
  type WebDavConfig,
  type WebDavSyncState,
} from "@/lib/webdav/types";

export default function BackupSettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const checklist = useDadKitStore((state) => state.checklist);
  const customItems = useDadKitStore((state) => state.customItems);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotMessageOk, setSnapshotMessageOk] = useState<boolean>();
  const [clearMessage, setClearMessage] = useState("");
  const [clearMessageOk, setClearMessageOk] = useState<boolean>();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState("");
  const [snapshots, setSnapshots] = useState<DadKitSnapshot[]>([]);
  const [webDavConfig, setWebDavConfig] =
    useState<WebDavConfig>(DEFAULT_WEBDAV_CONFIG);
  const [webDavSecret, setWebDavSecret] = useState("");
  const [webDavSyncState, setWebDavSyncState] = useState<WebDavSyncState>({
    deviceId: "",
  });
  const [webDavMessage, setWebDavMessage] = useState("");
  const [webDavMessageOk, setWebDavMessageOk] = useState<boolean>();
  const [webDavBusy, setWebDavBusy] = useState(false);
  const [pendingRemoteBackup, setPendingRemoteBackup] =
    useState<DadKitWebDavBackup>();
  const [uploadConflict, setUploadConflict] = useState(false);
  const recentSnapshots = snapshots.slice(0, 2);
  const hasLocalData = checklist.length > 0 || customItems.length > 0;
  const webDavConfigured = Boolean(
    webDavConfig.endpoint.trim() && webDavConfig.username.trim(),
  );

  function refreshSnapshots() {
    setSnapshots(loadSnapshots());
  }

  function refreshWebDavSettings() {
    const config = loadWebDavConfig();

    setWebDavConfig(config);
    setWebDavSecret(loadWebDavSecret(config.rememberSecret));
    setWebDavSyncState(loadWebDavSyncState());
    setPendingRemoteBackup(undefined);
    setUploadConflict(false);
  }

  useEffect(() => {
    refreshSnapshots();
    refreshWebDavSettings();
  }, []);

  function restoreLocalSnapshot(id: string) {
    if (!window.confirm("恢复此恢复点会替换当前清单。是否继续？")) {
      return;
    }

    const result = restoreSnapshot(id);

    if (result.ok) {
      hydrate();
    }

    refreshSnapshots();
    setSnapshotMessage(result.message);
    setSnapshotMessageOk(result.ok);
  }

  function deleteAllSnapshots() {
    if (!window.confirm("确认删除全部本机恢复点？")) {
      return;
    }

    clearSnapshots();
    refreshSnapshots();
    setSnapshotMessage("本机恢复点已删除。");
    setSnapshotMessageOk(true);
  }

  async function clearData() {
    if (clearConfirmation !== "清空全部数据") {
      return;
    }

    try {
      await clearAll();
    } catch (error) {
      refreshSnapshots();
      setClearMessage(
        error instanceof Error && error.message
          ? error.message
          : "无法创建恢复点，本地数据未清空。",
      );
      setClearMessageOk(false);
      return;
    }

    setClearDialogOpen(false);
    setClearConfirmation("");
    refreshSnapshots();
    refreshWebDavSettings();
    setClearMessage("本机数据已清空，并生成一份全新的通用清单。");
    setClearMessageOk(true);
  }

  function updateWebDavConfig(patch: Partial<WebDavConfig>) {
    const next = normalizeWebDavConfig({ ...webDavConfig, ...patch });

    setWebDavConfig(next);
    saveWebDavConfig(next);
    saveWebDavSecret(webDavSecret, next.rememberSecret);
  }

  function updateWebDavSecret(value: string) {
    setWebDavSecret(value);
    saveWebDavSecret(value, webDavConfig.rememberSecret);
  }

  function updateWebDavSyncState(patch: Partial<WebDavSyncState>) {
    const next = { ...webDavSyncState, ...patch };

    setWebDavSyncState(next);
    saveWebDavSyncState(next);
  }

  function prepareWebDavOperation() {
    const config = normalizeWebDavConfig({ ...webDavConfig, enabled: true });

    setWebDavConfig(config);
    saveWebDavConfig(config);
    saveWebDavSecret(webDavSecret, config.rememberSecret);

    return config;
  }

  async function testWebDav() {
    const config = prepareWebDavOperation();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);
    setUploadConflict(false);

    const result = await testWebDavConnection(config, webDavSecret);

    setWebDavMessage(result.message);
    setWebDavMessageOk(result.ok);
    updateWebDavSyncState({
      lastError: result.ok ? undefined : result.message,
    });
    setWebDavBusy(false);
  }

  async function uploadCurrentBackup(force = false) {
    const config = prepareWebDavOperation();
    const currentData = exportData();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);

    const result = await uploadWebDavBackup(config, webDavSecret, currentData, {
      deviceId: webDavSyncState.deviceId,
      force,
    });

    if (result.conflict) {
      setUploadConflict(true);
      setWebDavMessage("远端备份与当前本地数据不同。");
      setWebDavMessageOk(false);
      setWebDavBusy(false);
      return;
    }

    setUploadConflict(false);
    setWebDavMessage(result.message);
    setWebDavMessageOk(result.ok);

    if (result.ok) {
      const timestamp = new Date().toISOString();
      updateWebDavSyncState({
        lastUploadAt: timestamp,
        lastSyncAt: timestamp,
        lastRemoteUpdatedAt: timestamp,
        lastError: undefined,
      });
    } else {
      updateWebDavSyncState({ lastError: result.message });
    }

    setWebDavBusy(false);
  }

  async function downloadRemoteBackup() {
    if (
      hasLocalData &&
      !window.confirm(
        "检查远端备份后可以选择是否恢复。恢复前会先保存本机恢复点。是否继续？",
      )
    ) {
      return;
    }

    const config = prepareWebDavOperation();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);
    setUploadConflict(false);

    const result = await downloadWebDavBackup(config, webDavSecret);

    setWebDavMessage(result.message);
    setWebDavMessageOk(result.ok);

    if (result.ok && result.backup) {
      setPendingRemoteBackup(result.backup);
      updateWebDavSyncState({
        lastRemoteUpdatedAt: result.backup.updatedAt,
        lastError: undefined,
      });
    } else {
      updateWebDavSyncState({ lastError: result.message });
    }

    setWebDavBusy(false);
  }

  function restoreRemoteBackup() {
    if (!pendingRemoteBackup) {
      return;
    }

    const result = importDadKitWebDavBackup(pendingRemoteBackup);

    if (result.ok) {
      const timestamp = new Date().toISOString();

      hydrate();
      updateWebDavSyncState({
        lastDownloadAt: timestamp,
        lastSyncAt: timestamp,
        lastRemoteUpdatedAt: pendingRemoteBackup.updatedAt,
        lastError: undefined,
      });
      setPendingRemoteBackup(undefined);
    }

    refreshSnapshots();
    setWebDavMessage(result.message);
    setWebDavMessageOk(result.ok);
  }

  function clearWebDav() {
    if (!window.confirm("确认清除 WebDAV 配置和本设备保存的凭据？")) {
      return;
    }

    clearWebDavSettings();
    refreshWebDavSettings();
    setWebDavMessage("WebDAV 配置已清除。");
    setWebDavMessageOk(true);
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          backHref="/settings"
          backLabel="返回我的"
          title="备份与恢复"
        />

        <section className="hero-card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-card/80 bg-card text-primary shadow-sm">
              <ShieldCheck className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight">本机优先保存</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                清单默认只保存在这个浏览器，换设备前请主动备份。
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-card/70 bg-card/75 px-4 py-3">
              <p className="text-xs text-muted-foreground">本机恢复点</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{snapshots.length} 份</p>
            </div>
            <div className="rounded-2xl border border-card/70 bg-card/75 px-4 py-3">
              <p className="text-xs text-muted-foreground">WebDAV</p>
              <p className="mt-1 text-lg font-bold">
                {webDavConfigured ? "已配置" : "未配置"}
              </p>
            </div>
          </div>
        </section>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Database className="size-4" />
              </span>
              <span className="text-base">本机恢复点</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              恢复、清空或重建前自动保存清单，最多保留 5 份。恢复点只在当前浏览器中，不含照片和 WebDAV 配置。
            </p>
            {recentSnapshots.length === 0 ? (
              <p className="rounded-2xl bg-muted px-4 py-4 text-sm text-muted-foreground">
                暂无恢复点。
              </p>
            ) : (
              <div className="grid gap-2">
                {recentSnapshots.map((snapshot) => (
                  <SnapshotRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    onRestore={restoreLocalSnapshot}
                  />
                ))}
              </div>
            )}
            {snapshots.length > 2 ? (
              <details className="rounded-2xl border border-border bg-muted/40 p-3">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">
                  查看全部 {snapshots.length} 份恢复点
                </summary>
                <div className="mt-3 grid gap-2">
                  {snapshots.slice(2).map((snapshot) => (
                    <SnapshotRow
                      key={snapshot.id}
                      snapshot={snapshot}
                      onRestore={restoreLocalSnapshot}
                    />
                  ))}
                </div>
              </details>
            ) : null}
            {snapshots.length > 0 ? (
              <Button className="justify-self-start" size="sm" variant="ghost" onClick={deleteAllSnapshots}>
                <Trash2 />
                删除全部恢复点
              </Button>
            ) : null}
            <Feedback message={snapshotMessage} ok={snapshotMessageOk} />
          </CardContent>
        </Card>

        <details className="group overflow-hidden rounded-[1.75rem] border border-border bg-card">
          <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Cloud className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">WebDAV 备份</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                {webDavConfigured
                  ? `已配置 · 上次上传 ${formatOptionalTime(webDavSyncState.lastUploadAt)}`
                  : "高级功能：跨设备手动上传或恢复备份"}
              </span>
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              {webDavConfigured ? "已配置" : "未配置"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-border/70 p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              只在你主动操作时上传或下载清单备份，不会自动同步，也不上传照片或 WebDAV 凭据。地址必须使用 HTTPS。
            </p>

            <div className="flex flex-wrap gap-2">
              <Button disabled={webDavBusy} onClick={() => uploadCurrentBackup()}>
                <Upload />
                上传当前备份
              </Button>
              <Button disabled={webDavBusy} variant="outline" onClick={downloadRemoteBackup}>
                <Download />
                检查远端备份
              </Button>
              <Button disabled={webDavBusy} variant="outline" onClick={testWebDav}>
                测试连接
              </Button>
            </div>

            <form
              aria-label="WebDAV 配置"
              autoComplete="off"
              className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-3 sm:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <Field label="WebDAV 地址" htmlFor="webdav-endpoint">
                <Input
                  id="webdav-endpoint"
                  type="url"
                  value={webDavConfig.endpoint}
                  onChange={(event) => updateWebDavConfig({ endpoint: event.target.value })}
                />
              </Field>
              <Field label="用户名" htmlFor="webdav-username">
                <Input
                  autoComplete="username"
                  id="webdav-username"
                  value={webDavConfig.username}
                  onChange={(event) => updateWebDavConfig({ username: event.target.value })}
                />
              </Field>
              <Field label="应用密码或普通密码" htmlFor="webdav-secret">
                <Input
                  autoComplete="current-password"
                  id="webdav-secret"
                  type="password"
                  value={webDavSecret}
                  onChange={(event) => updateWebDavSecret(event.target.value)}
                />
              </Field>
              <Field label="凭据类型" htmlFor="webdav-auth-mode">
                <Select
                  value={webDavConfig.authMode}
                  onValueChange={(value) =>
                    updateWebDavConfig({ authMode: value as WebDavConfig["authMode"] })
                  }
                >
                  <SelectTrigger id="webdav-auth-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app_password">应用密码</SelectItem>
                    <SelectItem value="basic">普通密码</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="远端目录" htmlFor="webdav-remote-dir">
                <Input
                  id="webdav-remote-dir"
                  value={webDavConfig.remoteDir}
                  onChange={(event) => updateWebDavConfig({ remoteDir: event.target.value })}
                />
              </Field>
              <Field label="文件名" htmlFor="webdav-filename">
                <Input
                  id="webdav-filename"
                  value={webDavConfig.filename}
                  onChange={(event) => updateWebDavConfig({ filename: event.target.value })}
                />
              </Field>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 sm:col-span-2">
                <div>
                  <Label htmlFor="webdav-remember-secret">记住密码在本设备</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    默认只保留到当前浏览器会话结束。
                  </p>
                </div>
                <Switch
                  id="webdav-remember-secret"
                  checked={webDavConfig.rememberSecret}
                  onCheckedChange={(checked) => updateWebDavConfig({ rememberSecret: checked })}
                />
              </div>
            </form>

            {uploadConflict ? (
              <div className="grid gap-2 rounded-xl border border-warning-foreground/25 bg-warning p-3 text-sm text-warning-foreground">
                <p>远端备份与当前本地数据不同。确认后可用本地数据覆盖远端。</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => uploadCurrentBackup(true)}>
                    用本地覆盖远端
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setUploadConflict(false)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : null}

            {pendingRemoteBackup ? (
              <div className="grid gap-3 rounded-xl border border-border bg-muted/35 p-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatusTile label="远端更新时间" value={formatSnapshotTime(pendingRemoteBackup.updatedAt)} />
                  <StatusTile label="清单项目" value={`${pendingRemoteBackup.data.checklist.length} 项`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={restoreRemoteBackup}>恢复这个远端备份</Button>
                  <Button variant="outline" onClick={() => setPendingRemoteBackup(undefined)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : null}

            <Feedback message={webDavMessage} ok={webDavMessageOk} />

            <div className="grid gap-1 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
              <span>上次上传：{formatOptionalTime(webDavSyncState.lastUploadAt)}</span>
              <span>上次下载：{formatOptionalTime(webDavSyncState.lastDownloadAt)}</span>
            </div>

            <Button className="justify-self-start" size="sm" variant="ghost" onClick={clearWebDav}>
              清除 WebDAV 配置
            </Button>
          </div>
        </details>

        <Card className="border-destructive/25 bg-destructive/[0.025]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">清空并重新开始</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              清单与成长记便携数据可由恢复点找回。WebDAV 设置和本机物品照片会一并清除，且无法从恢复点找回。
            </p>
            <Button
              className="justify-self-start"
              variant="destructive"
              onClick={() => {
                setClearMessage("");
                setClearMessageOk(undefined);
                setClearDialogOpen(true);
              }}
            >
              <RotateCcw />
              清空并生成新清单
            </Button>
            {!clearDialogOpen ? (
              <Feedback message={clearMessage} ok={clearMessageOk} />
            ) : null}
          </CardContent>
        </Card>

        <Dialog
          open={clearDialogOpen}
          onOpenChange={(open) => {
            setClearDialogOpen(open);
            if (!open) setClearConfirmation("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认清空本机数据</DialogTitle>
              <DialogDescription>
                清单与成长记便携数据会先保存为本机恢复点；WebDAV 设置和本机物品照片会被清除。若恢复点保存失败，本次操作会立即中止。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="clear-data-confirmation">
                输入“清空全部数据”以继续
              </Label>
              <Input
                autoComplete="off"
                id="clear-data-confirmation"
                value={clearConfirmation}
                onChange={(event) => setClearConfirmation(event.target.value)}
              />
            </div>
            <Feedback message={clearMessage} ok={clearMessageOk} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button
                disabled={clearConfirmation !== "清空全部数据"}
                variant="destructive"
                onClick={clearData}
              >
                清空本机数据
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <footer className="grid gap-2 px-3 pb-4 pt-1 text-center text-xs leading-5 text-muted-foreground">
          <p>数据默认保存在当前浏览器。</p>
          <p className="flex items-center justify-center gap-3">
            <Link className="inline-flex min-h-11 items-center px-1 text-primary hover:underline" href={getReviewPageHref(PUBLIC_PRIVACY_PATH)}>
              隐私说明
            </Link>
            <span aria-hidden="true">·</span>
            <Link className="inline-flex min-h-11 items-center px-1 text-primary hover:underline" href={getReviewPageHref(PUBLIC_SUPPORT_PATH)}>
              支持与反馈
            </Link>
          </p>
        </footer>
      </section>
    </div>
  );
}

function SnapshotRow({
  snapshot,
  onRestore,
}: {
  snapshot: DadKitSnapshot;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{formatSnapshotTime(snapshot.createdAt)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{snapshot.reason}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onRestore(snapshot.id)}>
        恢复
      </Button>
    </div>
  );
}

function normalizeWebDavConfig(config: WebDavConfig): WebDavConfig {
  return {
    ...config,
    endpoint: config.endpoint.trim(),
    username: config.username.trim(),
    remoteDir: config.remoteDir.trim() || DEFAULT_WEBDAV_CONFIG.remoteDir,
    filename: config.filename.trim() || DEFAULT_WEBDAV_CONFIG.filename,
  };
}

function formatSnapshotTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

function formatOptionalTime(value?: string) {
  return value ? formatSnapshotTime(value) : "暂无";
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}
