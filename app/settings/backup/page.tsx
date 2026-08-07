"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
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
import { DangerZone } from "@/components/DangerZone";
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
import { Switch } from "@/components/ui/switch";
import {
  getReviewPageHref,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_SUPPORT_PATH,
} from "@/lib/app-routes";
import {
  clearSnapshotsAsync,
  clearWebDavSettings,
  buildLatestPortableData,
  importDataAsync,
  loadSnapshotsAsync,
  loadWebDavConfig,
  loadWebDavSecret,
  loadWebDavSyncState,
  restoreSnapshotAsync,
  saveWebDavConfig,
  saveWebDavSecret,
  saveWebDavSyncState,
  type DadKitSnapshot,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import {
  leaveSpace,
  refreshSyncStatus,
  useSyncStatusStore,
} from "@/lib/sync/client";
import {
  DEFAULT_WEBDAV_CONFIG,
  type DadKitWebDavBackup,
  type WebDavConfig,
  type WebDavSyncState,
} from "@/lib/webdav/types";

const FamilySyncCard = dynamic(
  () =>
    import("@/components/FamilySyncCard").then(
      (module) => module.FamilySyncCard,
    ),
);
const ConfirmDialog = dynamic(
  () =>
    import("@/components/ConfirmDialog").then(
      (module) => module.ConfirmDialog,
    ),
);
const PhotoBackupCard = dynamic(
  () =>
    import("@/components/PhotoBackupCard").then(
      (module) => module.PhotoBackupCard,
    ),
  { ssr: false },
);

type BackupConfirmation =
  | { type: "restoreSnapshot"; snapshotId: string }
  | { type: "restoreJson" }
  | { type: "deleteSnapshots" }
  | { type: "downloadRemote" }
  | { type: "clearWebDav" };

export default function BackupSettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const hydrate = useDadKitStore((state) => state.hydrate);
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
  const [photoPackageBusy, setPhotoPackageBusy] = useState(false);
  const [photoPackageMessage, setPhotoPackageMessage] = useState("");
  const [photoPackageMessageOk, setPhotoPackageMessageOk] = useState<boolean>();
  const [pendingRemoteBackup, setPendingRemoteBackup] =
    useState<DadKitWebDavBackup>();
  const [confirmation, setConfirmation] = useState<BackupConfirmation>();
  const photoPackageInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);
  const [jsonBackupBusy, setJsonBackupBusy] = useState(false);
  const [jsonBackupMessage, setJsonBackupMessage] = useState("");
  const [jsonBackupMessageOk, setJsonBackupMessageOk] = useState<boolean>();
  const [pendingJsonBackup, setPendingJsonBackup] = useState<string>();
  const syncStatus = useSyncStatusStore();
  const recentSnapshots = snapshots.slice(0, 2);
  const webDavConfigured = Boolean(
    webDavConfig.endpoint.trim() && webDavConfig.username.trim(),
  );

  async function refreshSnapshots() {
    try {
      setSnapshots(await loadSnapshotsAsync());
    } catch {
      setSnapshots([]);
    }
  }

  function refreshWebDavSettings() {
    const config = loadWebDavConfig();

    setWebDavConfig(config);
    setWebDavSecret(loadWebDavSecret(config.rememberSecret));
    setWebDavSyncState(loadWebDavSyncState());
    setPendingRemoteBackup(undefined);
  }

  useEffect(() => {
    hydrate();
    void refreshSnapshots();
    refreshWebDavSettings();
    refreshSyncStatus();
  }, [hydrate]);

  async function restoreLocalSnapshot(id: string) {
    const result = await restoreSnapshotAsync(id);

    if (result.ok) {
      hydrate();
    }

    await refreshSnapshots();
    setSnapshotMessage(result.message);
    setSnapshotMessageOk(result.ok);
  }

  async function deleteAllSnapshots() {
    await clearSnapshotsAsync();
    await refreshSnapshots();
    setSnapshotMessage("本机恢复点已删除。");
    setSnapshotMessageOk(true);
  }

  async function clearData() {
    if (clearConfirmation !== "清空全部数据") {
      return;
    }

    await leaveSpace();

    try {
      await clearAll();
    } catch (error) {
      await refreshSnapshots();
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
    await refreshSnapshots();
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

  function reportWebDavResult(result: { message: string; ok: boolean }) {
    setWebDavMessage(result.message);
    setWebDavMessageOk(result.ok);
  }

  function reportWebDavClientLoadError(stopBusy = false) {
    reportWebDavResult({ message: WEB_DAV_CLIENT_LOAD_ERROR, ok: false });
    if (stopBusy) setWebDavBusy(false);
  }

  async function testWebDav() {
    const config = prepareWebDavOperation();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);
    const client = await loadWebDavClient();

    if (!client) {
      reportWebDavClientLoadError(true);
      return;
    }

    const result = await client.testWebDavConnection(config, webDavSecret);

    reportWebDavResult(result);
    updateWebDavSyncState({
      lastError: result.ok ? undefined : result.message,
    });
    setWebDavBusy(false);
  }

  async function uploadCurrentBackup() {
    const config = prepareWebDavOperation();
    const currentData = await buildLatestPortableData();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);

    const client = await loadWebDavClient();

    if (!client) {
      reportWebDavClientLoadError(true);
      return;
    }

    const result = await client.uploadWebDavBackup(config, webDavSecret, currentData, {
      deviceId: webDavSyncState.deviceId,
    });
    reportWebDavResult(result);

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
    const config = prepareWebDavOperation();

    setWebDavBusy(true);
    setPendingRemoteBackup(undefined);

    const client = await loadWebDavClient();

    if (!client) {
      reportWebDavClientLoadError(true);
      return;
    }

    const result = await client.downloadWebDavBackup(config, webDavSecret);

    reportWebDavResult(result);

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

  async function restoreRemoteBackup() {
    if (!pendingRemoteBackup) {
      return;
    }

    const client = await loadWebDavClient();

    if (!client) {
      reportWebDavClientLoadError();
      return;
    }

    const result = await client.importDadKitWebDavBackup(pendingRemoteBackup);

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

    await refreshSnapshots();
    reportWebDavResult(result);
  }

  function clearWebDav() {
    clearWebDavSettings();
    refreshWebDavSettings();
    setWebDavMessage("WebDAV 配置已清除。");
    setWebDavMessageOk(true);
  }

  async function exportPhotoPackage() {
    setPhotoPackageBusy(true);
    setPhotoPackageMessage("");

    try {
      const { exportItemPhotos } = await import("@/lib/item-photos");
      const backup = await exportItemPhotos();
      downloadJsonFile(
        backup,
        `dadkit-photos-${backup.exportedAt.slice(0, 10)}.json`,
      );
      setPhotoPackageMessage(
        backup.photos.length > 0
          ? `已导出 ${backup.photos.length} 张物品照片。`
          : "当前没有可导出的物品照片，已下载空照片备份包。",
      );
      setPhotoPackageMessageOk(true);
    } catch (error) {
      setPhotoPackageMessage(
        error instanceof Error && error.message
          ? error.message
          : "导出照片备份包失败，请稍后重试。",
      );
      setPhotoPackageMessageOk(false);
    } finally {
      setPhotoPackageBusy(false);
    }
  }

  async function exportJsonBackup() {
    setJsonBackupBusy(true);
    setJsonBackupMessage("");
    try {
      const data = await buildLatestPortableData();
      downloadJsonFile(data, `dadkit-backup-${data.exportedAt.slice(0, 10)}.json`);
      setJsonBackupMessage("完整 JSON 备份已导出，包含宝宝资料、照护事件和删除墓碑。");
      setJsonBackupMessageOk(true);
    } catch (error) {
      setJsonBackupMessage(error instanceof Error && error.message ? error.message : "JSON 备份导出失败，请稍后重试。");
      setJsonBackupMessageOk(false);
    } finally {
      setJsonBackupBusy(false);
    }
  }

  async function chooseJsonBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) {
      setJsonBackupMessage("JSON 备份不能超过 32 MiB。");
      setJsonBackupMessageOk(false);
      return;
    }
    try {
      setPendingJsonBackup(await file.text());
      setConfirmation({ type: "restoreJson" });
    } catch {
      setJsonBackupMessage("无法读取 JSON 备份文件。");
      setJsonBackupMessageOk(false);
    }
  }

  async function restoreJsonBackup() {
    if (!pendingJsonBackup) return;
    setJsonBackupBusy(true);
    const result = await importDataAsync(pendingJsonBackup);
    setPendingJsonBackup(undefined);
    setJsonBackupBusy(false);
    if (result.ok) hydrate();
    await refreshSnapshots();
    setJsonBackupMessage(result.message);
    setJsonBackupMessageOk(result.ok);
  }

  async function importPhotoPackage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (!file) {
      return;
    }

    setPhotoPackageBusy(true);
    setPhotoPackageMessage("");

    try {
      const payload: unknown = JSON.parse(await file.text());
      const { importItemPhotoBackup } = await import("@/lib/item-photos");
      const imported = await importItemPhotoBackup(payload);

      setPhotoPackageMessage(
        imported > 0 ? `已导入 ${imported} 张物品照片。` : "照片备份包中没有照片。",
      );
      setPhotoPackageMessageOk(true);
    } catch (error) {
      setPhotoPackageMessage(
        error instanceof Error && error.message
          ? error.message
          : "导入照片备份包失败，请确认文件完整后重试。",
      );
      setPhotoPackageMessageOk(false);
    } finally {
      setPhotoPackageBusy(false);
    }
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
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
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
            <div className="rounded-2xl bg-card/75 px-4 py-3 shadow-sm">
              <p className="text-[13px] text-muted-foreground">家庭同步</p>
              <p className="mt-1 text-lg font-bold">
                {syncStatus.joined ? "已连接" : "未连接"}
              </p>
            </div>
            <div className="rounded-2xl bg-card/75 px-4 py-3 shadow-sm">
              <p className="text-[13px] text-muted-foreground">本机恢复点</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{snapshots.length} 份</p>
            </div>
          </div>
        </section>

        <FamilySyncCard />

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
              恢复、清空或重建前自动保存完整便携数据，包含宝宝资料与照护记录，最多保留 2 份。恢复点保存在 IndexedDB，不含照片和 WebDAV 配置。
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
                    onRestore={(snapshotId) =>
                      setConfirmation({
                        type: "restoreSnapshot",
                        snapshotId,
                      })
                    }
                  />
                ))}
              </div>
            )}
            {snapshots.length > 0 ? (
              <Button className="justify-self-start" size="sm" variant="ghost" onClick={() => setConfirmation({ type: "deleteSnapshots" })}>
                <Trash2 />
                删除全部恢复点
              </Button>
            ) : null}
            <Feedback message={snapshotMessage} ok={snapshotMessageOk} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary"><Database className="size-4" /></span>
              <span className="text-base">完整 JSON 备份</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">导出完整 JSON 可携带清单、医院档案、家庭分工、宝宝资料、全部照护事件、活动计时和删除墓碑。导入属于完整恢复；不含宝宝数据的旧备份会安全清空本机宝宝记录。</p>
            <input ref={jsonBackupInputRef} accept="application/json,.json" aria-label="选择 JSON 备份文件" className="sr-only" type="file" onChange={chooseJsonBackup} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={jsonBackupBusy} onClick={() => void exportJsonBackup()}><Download />导出 JSON 备份</Button>
              <Button disabled={jsonBackupBusy} onClick={() => jsonBackupInputRef.current?.click()} variant="outline"><Upload />导入 JSON 备份</Button>
            </div>
            <Feedback message={jsonBackupMessage} ok={jsonBackupMessageOk} />
          </CardContent>
        </Card>

        <PhotoBackupCard
          busy={photoPackageBusy}
          inputRef={photoPackageInputRef}
          message={photoPackageMessage}
          messageOk={photoPackageMessageOk}
          onExport={exportPhotoPackage}
          onImport={importPhotoPackage}
        />

        <details className="group overflow-hidden rounded-card bg-card shadow-sm">
          <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Cloud className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">WebDAV 备份</span>
              <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                {webDavConfigured
                  ? `已配置 · 上次上传 ${formatOptionalTime(webDavSyncState.lastUploadAt)}`
                  : "高级功能：跨设备手动上传或恢复备份"}
              </span>
            </span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
              {webDavConfigured ? "已配置" : "未配置"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-4 border-t border-border/70 p-5">
            <p className="text-sm leading-6 text-muted-foreground">
              只在你主动操作时上传或下载完整备份。上传与恢复会合并清单字段、宝宝资料字段和照护事件，不会自动同步，也不上传照片或 WebDAV 凭据。地址必须使用 HTTPS。
            </p>

            <div className="flex flex-wrap gap-2">
              <Button disabled={webDavBusy} onClick={uploadCurrentBackup}>
                <Upload />
                合并并上传当前备份
              </Button>
              <Button
                disabled={webDavBusy}
                variant="outline"
                onClick={() => setConfirmation({ type: "downloadRemote" })}
              >
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
              className="grid gap-3 rounded-2xl bg-muted/35 p-3 shadow-sm sm:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <Field label="WebDAV 地址" htmlFor="webdav-endpoint">
                <>
                  <Input
                    id="webdav-endpoint"
                    type="url"
                    value={webDavConfig.endpoint}
                    onChange={(event) => updateWebDavConfig({ endpoint: event.target.value })}
                  />
                  <p className="text-[13px] leading-5 text-muted-foreground">
                    默认地址适用于 123 云盘；其他服务请填写自己的 WebDAV 地址。
                  </p>
                </>
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
                <select
                  className="flex h-11 w-full rounded-2xl border border-input bg-card px-3.5 py-2 text-base outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                  id="webdav-auth-mode"
                  value={webDavConfig.authMode}
                  onChange={(event) =>
                    updateWebDavConfig({ authMode: event.target.value as WebDavConfig["authMode"] })
                  }
                >
                  <option value="app_password">应用密码</option>
                  <option value="basic">普通密码</option>
                </select>
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
              <div className="flex items-center justify-between gap-3 rounded-lg bg-card p-3 shadow-sm sm:col-span-2">
                <div>
                  <Label htmlFor="webdav-remember-secret">记住密码在本设备</Label>
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                    默认只保留到当前浏览器会话结束。开启后会明文保存在此设备的本地存储，仅在可信设备上使用。
                  </p>
                </div>
                <Switch
                  id="webdav-remember-secret"
                  checked={webDavConfig.rememberSecret}
                  onCheckedChange={(checked) => updateWebDavConfig({ rememberSecret: checked })}
                />
              </div>
            </form>

            {pendingRemoteBackup ? (
              <div className="grid gap-3 rounded-xl bg-muted/35 p-3 text-sm shadow-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatusTile label="远端更新时间" value={formatSnapshotTime(pendingRemoteBackup.updatedAt)} />
                  <StatusTile label="清单项目" value={`${pendingRemoteBackup.data.checklist.length} 项`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={restoreRemoteBackup}>合并这个远端备份</Button>
                  <Button variant="outline" onClick={() => setPendingRemoteBackup(undefined)}>
                    取消
                  </Button>
                </div>
              </div>
            ) : null}

            <Feedback message={webDavMessage} ok={webDavMessageOk} />

            <div className="grid gap-1 text-[13px] leading-5 text-muted-foreground sm:grid-cols-2">
              <span>上次上传：{formatOptionalTime(webDavSyncState.lastUploadAt)}</span>
              <span>上次下载：{formatOptionalTime(webDavSyncState.lastDownloadAt)}</span>
            </div>

            <Button className="justify-self-start" size="sm" variant="ghost" onClick={() => setConfirmation({ type: "clearWebDav" })}>
              清除 WebDAV 配置
            </Button>
          </div>
        </details>

        <DangerZone title="清空并重新开始" description="清单、医院档案、家庭分工、宝宝记录、本机恢复点、WebDAV 设置、家庭同步登录状态和本机物品照片都会清除。请先导出 JSON 或 WebDAV 备份；本操作完成后无法从本机恢复点找回。">
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
        </DangerZone>

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
                系统会先验证完整恢复点能够成功写入；随后清单、医院档案、家庭分工、宝宝记录、全部本机恢复点、WebDAV 设置和本机物品照片都会清除，已连接的家庭同步会退出。请先导出外部备份。
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

        {confirmation ? (
          <ConfirmDialog
            confirmLabel={
              confirmation.type === "restoreSnapshot"
                ? "恢复恢复点"
                : confirmation.type === "restoreJson"
                  ? "导入 JSON 备份"
                : confirmation.type === "deleteSnapshots"
                  ? "删除全部恢复点"
                  : confirmation.type === "clearWebDav"
                    ? "清除 WebDAV 配置"
                    : "继续检查"
            }
            description={
              confirmation.type === "restoreSnapshot"
                ? "恢复此恢复点会完整替换当前便携数据，包括宝宝资料与照护记录。"
                : confirmation.type === "restoreJson"
                  ? "JSON 导入属于完整恢复。系统会先创建恢复点；不含宝宝数据的旧备份会安全清空宝宝资料和照护记录。"
                : confirmation.type === "deleteSnapshots"
                  ? "全部本机恢复点将被永久删除。"
                  : confirmation.type === "clearWebDav"
                    ? "本设备保存的 WebDAV 配置和凭据会被清除。"
                    : "检查远端备份后可以选择是否恢复。恢复前会先保存本机恢复点。"
            }
            onConfirm={() => {
              if (confirmation.type === "restoreSnapshot") {
                void restoreLocalSnapshot(confirmation.snapshotId);
              } else if (confirmation.type === "restoreJson") {
                void restoreJsonBackup();
              } else if (confirmation.type === "deleteSnapshots") {
                void deleteAllSnapshots();
              } else if (confirmation.type === "clearWebDav") {
                clearWebDav();
              } else {
                void downloadRemoteBackup();
              }
            }}
            onOpenChange={(open) => {
              if (!open) setConfirmation(undefined);
            }}
            open
            title={
              confirmation.type === "restoreSnapshot"
                ? "确认恢复本机恢复点？"
                : confirmation.type === "restoreJson"
                  ? "确认导入 JSON 备份？"
                : confirmation.type === "deleteSnapshots"
                  ? "确认删除全部恢复点？"
                  : confirmation.type === "clearWebDav"
                    ? "确认清除 WebDAV 配置？"
                    : "确认检查远端备份？"
            }
            variant={
              confirmation.type === "deleteSnapshots" ||
              confirmation.type === "clearWebDav"
                ? "destructive"
                : "default"
            }
          />
        ) : null}

        <footer className="grid gap-2 px-3 pb-4 pt-1 text-center text-[13px] leading-5 text-muted-foreground">
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{formatSnapshotTime(snapshot.createdAt)}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{snapshot.reason}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onRestore(snapshot.id)}>
        恢复
      </Button>
    </div>
  );
}

const WEB_DAV_CLIENT_LOAD_ERROR = "WebDAV 模块加载失败，请检查网络后重试。";

async function loadWebDavClient() {
  try {
    return await import("@/lib/webdav/client");
  } catch {
    return undefined;
  }
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

function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.download = filename;
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
    <div className="rounded-lg bg-card px-3 py-2 shadow-sm">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}
