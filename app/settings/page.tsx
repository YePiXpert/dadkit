"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Cloud,
  Copy,
  Download,
  History,
  Info,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";

import { DisclaimerBox } from "@/components/DisclaimerBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_BIRTH_PLAN,
  DEFAULT_POSTPARTUM_TASKS,
  type BirthPlan,
  type PostpartumTask,
} from "@/lib/rc";
import {
  formatBabyZodiacLine,
  getBabyMascot,
} from "@/lib/baby-profile";
import {
  getReviewPageHref,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_SUPPORT_PATH,
} from "@/lib/app-routes";
import { useDadKitStore } from "@/lib/store";
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

type ReleaseInfo = {
  ok: boolean;
  version: string;
  buildTime: string;
};

export default function SettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const exportJson = useDadKitStore((state) => state.exportJson);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const importJson = useDadKitStore((state) => state.importJson);
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const customItems = useDadKitStore((state) => state.customItems);
  const contractions = useDadKitStore((state) => state.contractions);
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean | undefined>();
  const [snapshots, setSnapshots] = useState<DadKitSnapshot[]>([]);
  const [webDavConfig, setWebDavConfig] =
    useState<WebDavConfig>(DEFAULT_WEBDAV_CONFIG);
  const [webDavSecret, setWebDavSecret] = useState("");
  const [webDavSyncState, setWebDavSyncState] = useState<WebDavSyncState>({
    deviceId: "",
  });
  const [webDavMessage, setWebDavMessage] = useState("");
  const [webDavMessageOk, setWebDavMessageOk] = useState<boolean | undefined>();
  const [webDavBusy, setWebDavBusy] = useState(false);
  const [pendingRemoteBackup, setPendingRemoteBackup] =
    useState<DadKitWebDavBackup>();
  const [uploadConflict, setUploadConflict] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo>({
    ok: true,
    version: "1.2.0",
    buildTime: "unknown",
  });
  const hasLocalData =
    Boolean(profile) ||
    checklist.length > 0 ||
    customItems.length > 0 ||
    contractions.length > 0 ||
    hasBirthPlanData(birthPlan) ||
    hasPostpartumData(postpartumTasks);
  const recentSnapshots = snapshots.slice(0, 2);
  const babyMascot = getBabyMascot(profile);

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

    void fetch("/healthz", { cache: "no-store" })
      .then((response) => response.json() as Promise<ReleaseInfo>)
      .then((data) => setReleaseInfo(data))
      .catch(() => {
        setReleaseInfo((current) => ({ ...current, ok: false }));
      });
  }, []);

  function clearData() {
    if (!window.confirm("确认清空本地数据？此操作只会影响当前浏览器。")) {
      return;
    }

    clearAll();
    refreshSnapshots();
    refreshWebDavSettings();
    setMessage("本地数据已清空。");
    setMessageOk(true);
  }

  function importData() {
    const result = importJson(importText);

    refreshSnapshots();
    setMessage(result.message);
    setMessageOk(result.ok);

    if (result.ok) {
      setImportText("");
    }
  }

  function restoreLocalSnapshot(id: string) {
    if (!window.confirm("恢复此备份会替换当前资料和清单。是否继续？")) {
      return;
    }

    const result = restoreSnapshot(id);

    if (result.ok) {
      hydrate();
    }

    refreshSnapshots();
    setMessage(result.message);
    setMessageOk(result.ok);
  }

  function deleteAllSnapshots() {
    if (!window.confirm("确认删除全部本地备份？")) {
      return;
    }

    clearSnapshots();
    refreshSnapshots();
    setMessage("本地备份已删除。");
    setMessageOk(true);
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
    const config = normalizeWebDavConfig(webDavConfig);

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
        "下载远端备份会替换当前资料和清单。DadKit 会先保存一份本地快照。是否继续？",
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
      <Card className="mobile-shell app-list-card lg:max-w-none">
        <CardContent className="app-list-row p-3">
          <span className="relative flex size-14 shrink-0 overflow-hidden rounded-full border border-white/80 bg-peach shadow-sm">
            <Image
              alt={babyMascot.alt}
              className="object-contain p-0.5"
              fill
              priority
              sizes="56px"
              src={babyMascot.src}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">
              {profile ? formatBabyZodiacLine(profile) : "待产资料"}
            </p>
            <p className="mt-1 break-words text-xs leading-4 text-muted-foreground">
              {profile ? "待产清单已生成" : "创建资料后生成清单"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-mint px-3 py-1 text-xs font-bold text-primary">
            v{releaseInfo.version}
          </span>
        </CardContent>
      </Card>

      <section className="mobile-shell grid gap-3 lg:max-w-none lg:grid-cols-3">
        <Card className="app-list-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">资料</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-2 pt-0">
            <SettingsShortcutRow
              caption="预产期、地区、医院和生产方式"
              href="/setup"
              icon={<Info className="size-4" />}
              title="编辑资料"
            />
            <SettingsShortcutRow
              caption="医院模板、地区医院和入院备注"
              href="/hospital"
              icon={<Info className="size-4" />}
              title="修改地区医院"
            />
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">备份与恢复</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-2 pt-0">
            <SettingsShortcutRow
              caption={`${snapshots.length} 份本地自动快照`}
              href="#local-snapshots"
              icon={<History className="size-4" />}
              title="最近备份"
            />
            <SettingsShortcutRow
              caption="导入或复制当前浏览器数据"
              href="#json-backup"
              icon={<Download className="size-4" />}
              title="JSON 备份"
            />
            <SettingsShortcutRow
              caption="手动上传或下载远端备份"
              href="#webdav-backup"
              icon={<Cloud className="size-4" />}
              title="WebDAV 备份"
            />
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">应用信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 p-2 pt-0">
            <SettingsShortcutRow
              caption={`v${releaseInfo.version}`}
              href="#about-dadkit"
              icon={<Info className="size-4" />}
              title="关于 DadKit"
            />
            <SettingsShortcutRow
              caption="本地优先和医疗信息边界"
              href="#disclaimer"
              icon={<Info className="size-4" />}
              title="免责声明"
            />
            <SettingsShortcutRow
              caption="本地数据、WebDAV 和第三方服务说明"
              href={getReviewPageHref(PUBLIC_PRIVACY_PATH)}
              icon={<Info className="size-4" />}
              title="隐私政策"
            />
            <SettingsShortcutRow
              caption="问题反馈、测试说明和支持渠道"
              href={getReviewPageHref(PUBLIC_SUPPORT_PATH)}
              icon={<ArrowRight className="size-4" />}
              title="支持与反馈"
            />
            <SettingsShortcutRow
              caption="本地数据和清单数量"
              href="#current-data-summary"
              icon={<Info className="size-4" />}
              title="当前数据摘要"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3">
        <SettingsDetailsSection
          icon={<History className="size-4 text-primary" />}
          id="local-snapshots"
          title="最近备份"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                最近备份
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {snapshots.length === 0 ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  暂无本地备份。DadKit 会在导入、重置、清空或创建新清单前自动保存最近备份。
                </p>
              ) : (
                <>
                  <div className="grid gap-2">
                    {recentSnapshots.map((snapshot) => (
                      <div
                        className="soft-detail flex flex-wrap items-center justify-between gap-3"
                        key={snapshot.id}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">
                            {formatSnapshotTime(snapshot.createdAt)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {snapshot.reason}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreLocalSnapshot(snapshot.id)}
                        >
                          恢复
                        </Button>
                      </div>
                    ))}
                  </div>

                  <details className="soft-detail">
                    <summary className="cursor-pointer text-sm font-semibold">
                      查看全部备份
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {snapshots.map((snapshot) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/80 bg-card/80 p-3 shadow-sm"
                          key={snapshot.id}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {formatSnapshotTime(snapshot.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {snapshot.reason}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => restoreLocalSnapshot(snapshot.id)}
                          >
                            恢复
                          </Button>
                        </div>
                      ))}
                      <Button
                        className="justify-self-start"
                        variant="outline"
                        onClick={deleteAllSnapshots}
                      >
                        <Trash2 className="size-4" />
                        删除全部快照
                      </Button>
                    </div>
                  </details>
                </>
              )}
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Upload className="size-4 text-primary" />}
          id="json-backup"
          title="JSON 备份"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-4 text-primary" />
                JSON 备份
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <details className="soft-detail">
                <summary className="cursor-pointer text-sm font-semibold">
                  导入 / 复制 JSON
                </summary>
                <div className="mt-3 grid gap-3">
                  <Textarea
                    className="max-h-[45dvh] min-h-40 overflow-y-auto font-mono text-sm"
                    placeholder="粘贴 DadKit JSON 备份"
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={importData}>
                      <Upload className="size-4" />
                      校验并导入
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(exportJson())}
                    >
                      <Copy className="size-4" />
                      复制当前 JSON
                    </Button>
                  </div>
                </div>
              </details>
              {message ? (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    messageOk === false
                      ? "bg-coral-soft text-coral-foreground"
                      : "bg-secondary text-primary"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Cloud className="size-4 text-primary" />}
          id="webdav-backup"
          title="WebDAV 备份"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="size-4 text-primary" />
                WebDAV 备份
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-sm leading-6 text-muted-foreground">
                手动上传或下载 JSON 备份，不会自动同步。浏览器请求会经 DadKit 同源代理转发。
              </p>

              <div className="soft-detail flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="webdav-enabled">启用 WebDAV 备份</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    关闭后会保留配置，但不会阻止你手动测试或上传。
                  </p>
                </div>
                <Switch
                  id="webdav-enabled"
                  checked={webDavConfig.enabled}
                  onCheckedChange={(checked) =>
                    updateWebDavConfig({ enabled: checked })
                  }
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={webDavBusy} variant="outline" onClick={testWebDav}>
                  测试连接
                </Button>
                <Button disabled={webDavBusy} onClick={() => uploadCurrentBackup()}>
                  <Upload className="size-4" />
                  上传当前备份
                </Button>
                <Button
                  disabled={webDavBusy}
                  variant="outline"
                  onClick={downloadRemoteBackup}
                >
                  <Download className="size-4" />
                  下载远端备份
                </Button>
                <Button disabled={webDavBusy} variant="outline" onClick={clearWebDav}>
                  清除 WebDAV 配置
                </Button>
              </div>

              <details className="soft-detail">
                <summary className="cursor-pointer text-sm font-semibold">
                  连接设置
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="WebDAV 地址" htmlFor="webdav-endpoint">
                    <Input
                      id="webdav-endpoint"
                      placeholder="https://webdav.123pan.cn/webdav"
                      type="url"
                      value={webDavConfig.endpoint}
                      onChange={(event) =>
                        updateWebDavConfig({ endpoint: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="用户名" htmlFor="webdav-username">
                    <Input
                      id="webdav-username"
                      value={webDavConfig.username}
                      onChange={(event) =>
                        updateWebDavConfig({ username: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="应用密码 / 密码" htmlFor="webdav-secret">
                    <Input
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
                        updateWebDavConfig({
                          authMode: value as WebDavConfig["authMode"],
                        })
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
                      onChange={(event) =>
                        updateWebDavConfig({ remoteDir: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="文件名" htmlFor="webdav-filename">
                    <Input
                      id="webdav-filename"
                      value={webDavConfig.filename}
                      onChange={(event) =>
                        updateWebDavConfig({ filename: event.target.value })
                      }
                    />
                  </Field>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-white/80 bg-card/80 p-3 shadow-sm">
                    <div>
                      <Label htmlFor="webdav-remember-secret">
                        记住密码在本设备
                      </Label>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        默认只保存到当前浏览器会话。
                      </p>
                    </div>
                    <Switch
                      id="webdav-remember-secret"
                      checked={webDavConfig.rememberSecret}
                      onCheckedChange={(checked) =>
                        updateWebDavConfig({ rememberSecret: checked })
                      }
                    />
                  </div>
                </div>
              </details>

              {uploadConflict ? (
                <div className="grid gap-2 rounded-lg border border-amber/30 bg-amber-soft p-3 text-sm text-amber-foreground">
                  <p>远端备份与当前本地数据不同。你可以用本地覆盖远端，或取消。</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => uploadCurrentBackup(true)}>
                      用本地覆盖远端
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUploadConflict(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : null}

              {pendingRemoteBackup ? (
                <div className="soft-detail grid gap-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <StatusTile
                      label="更新时间"
                      value={formatSnapshotTime(pendingRemoteBackup.updatedAt)}
                    />
                    <StatusTile
                      label="deviceId"
                      value={pendingRemoteBackup.deviceId}
                    />
                    <StatusTile
                      label="清单项目"
                      value={`${pendingRemoteBackup.data.checklist.length} 项`}
                    />
                    <StatusTile
                      label="个人资料"
                      value={pendingRemoteBackup.data.userProfile ? "包含" : "不包含"}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={restoreRemoteBackup}>恢复这个远端备份</Button>
                    <Button
                      variant="outline"
                      onClick={() => setPendingRemoteBackup(undefined)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : null}

              {webDavMessage ? (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    webDavMessageOk === false
                      ? "bg-coral-soft text-coral-foreground"
                      : "bg-secondary text-primary"
                  }`}
                >
                  {webDavMessage}
                </p>
              ) : null}

              <div className="grid gap-1 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                <span>设备 ID：{webDavSyncState.deviceId || "未初始化"}</span>
                <span>
                  上次同步：
                  {webDavSyncState.lastSyncAt
                    ? formatSnapshotTime(webDavSyncState.lastSyncAt)
                    : "暂无"}
                </span>
                <span>
                  上次上传：
                  {webDavSyncState.lastUploadAt
                    ? formatSnapshotTime(webDavSyncState.lastUploadAt)
                    : "暂无"}
                </span>
                <span>
                  上次下载：
                  {webDavSyncState.lastDownloadAt
                    ? formatSnapshotTime(webDavSyncState.lastDownloadAt)
                    : "暂无"}
                </span>
              </div>
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Info className="size-4 text-primary" />}
          id="current-data-summary"
          title="当前数据摘要"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                当前数据摘要
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
              <StatusTile label="个人资料" value={profile ? "已创建" : "未创建"} />
              <StatusTile label="清单项目" value={`${checklist.length} 项`} />
              <StatusTile
                label="清单模式"
                value={checklistMode === "lean" ? "精简" : "完整"}
              />
              <StatusTile label="自定义项" value={`${customItems.length} 项`} />
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<RotateCcw className="size-4 text-primary" />}
          id="danger-zone"
          title="清空本地数据"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="size-4 text-primary" />
                清空本地数据
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm leading-6 text-muted-foreground">
                会清空当前浏览器中的资料、清单、自定义项和 WebDAV 设置。清空前会自动保留一份本地快照。
              </p>
              <Button className="justify-self-start" variant="outline" onClick={clearData}>
                <RotateCcw className="size-4" />
                清空本地数据
              </Button>
              {message ? (
                <p
                  className={`rounded-lg px-3 py-2 text-sm ${
                    messageOk === false
                      ? "bg-coral-soft text-coral-foreground"
                      : "bg-secondary text-primary"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Info className="size-4 text-primary" />}
          id="about-dadkit"
          title="关于 DadKit"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-4 text-primary" />
                关于 DadKit
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
              <p>
                DadKit 是一个开源待产准备清单工具，不需要登录，数据保存在本地浏览器，不上传用户隐私数据。
              </p>
              <p>
                医院模板用于帮助整理待确认事项。未核验模板不会作为官方入院要求，也不会写死医院一定提供某些物品。
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <StatusTile label="版本" value={`v${releaseInfo.version}`} />
                <StatusTile
                  label="构建时间"
                  value={
                    releaseInfo.buildTime === "unknown"
                      ? "暂未记录"
                      : formatSnapshotTime(releaseInfo.buildTime)
                  }
                />
                <StatusTile
                  label="健康检查"
                  value={releaseInfo.ok ? "正常" : "未连接"}
                />
              </div>
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Info className="size-4 text-primary" />}
          id="disclaimer"
          title="免责声明"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle>免责声明</CardTitle>
            </CardHeader>
            <CardContent>
              <DisclaimerBox />
            </CardContent>
          </Card>
        </SettingsDetailsSection>

        <SettingsDetailsSection
          icon={<Cloud className="size-4 text-primary" />}
          id="webdav-credentials"
          title="WebDAV 凭据说明"
        >
          <Card className="macaron-panel">
            <CardHeader>
              <CardTitle>WebDAV 凭据说明</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <p>
                WebDAV 地址、用户名和备份路径保存在当前浏览器；应用密码默认只保存在当前会话。
              </p>
              <p>
                只有开启“记住密码在本设备”时，应用密码才会留在当前浏览器本地存储中。
              </p>
            </CardContent>
          </Card>
        </SettingsDetailsSection>
      </section>
    </div>
  );
}

function SettingsShortcutRow({
  caption,
  href,
  icon,
  title,
}: {
  caption: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link className="app-list-row min-h-16 bg-card/90" href={href}>
      <span className="app-icon-tile size-9 rounded-md">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5">{title}</span>
        <span className="mt-0.5 block break-words text-xs leading-4 text-muted-foreground">
          {caption}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function SettingsDetailsSection({
  children,
  icon,
  id,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <details
      className="mobile-shell scroll-mt-24 rounded-lg border border-white/90 bg-card/95 p-4 shadow-soft lg:max-w-none"
      id={id}
    >
      <summary className="cursor-pointer list-none text-base font-bold">
        <span className="inline-flex items-center gap-2">
          {icon}
          {title}
        </span>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
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
    <div className="rounded-lg border border-white/80 bg-cream/70 px-3 py-2 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

function hasBirthPlanData(plan: BirthPlan) {
  return Object.entries(DEFAULT_BIRTH_PLAN).some(
    ([key, value]) => plan[key as keyof BirthPlan] !== value,
  );
}

function hasPostpartumData(tasks: PostpartumTask[]) {
  const defaultsById = new Map(DEFAULT_POSTPARTUM_TASKS.map((task) => [task.id, task]));

  return tasks.some((task) => {
    const defaultTask = defaultsById.get(task.id);

    if (!defaultTask) {
      return true;
    }

    return task.status !== defaultTask.status || (task.note ?? "") !== (defaultTask.note ?? "");
  });
}
