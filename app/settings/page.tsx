"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
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

const WEBDAV_PROXY_ENABLED = false;

export default function SettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const exportJson = useDadKitStore((state) => state.exportJson);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const importJson = useDadKitStore((state) => state.importJson);
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const customItems = useDadKitStore((state) => state.customItems);
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
  const hasLocalData =
    Boolean(profile) || checklist.length > 0 || customItems.length > 0;

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
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">本地数据</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          数据只在当前浏览器。导入会先校验 JSON，失败时不会修改本地数据。
        </p>
      </div>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            本地存储状态
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

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
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
                {snapshots.map((snapshot) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
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
              <Button
                className="justify-self-start"
                variant="outline"
                onClick={deleteAllSnapshots}
              >
                <Trash2 className="size-4" />
                删除全部快照
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle>常用设置</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/setup">修改个人资料</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hospital">修改地区/医院</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hospital">编辑医院信息</Link>
          </Button>
          <Button variant="outline" onClick={clearData}>
            <RotateCcw className="size-4" />
            清空本地数据
          </Button>
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="size-4 text-primary" />
            WebDAV 备份
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            DadKit 可以把 JSON 备份保存到你自己的 WebDAV 存储。第一版只做手动上传和恢复，不会自动同步。
          </p>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
            <div>
              <Label htmlFor="webdav-enabled">启用 WebDAV 备份</Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                关闭后会保留配置，但不会阻止你手动测试或上传。
              </p>
            </div>
            <Switch
              id="webdav-enabled"
              checked={webDavConfig.enabled}
              onCheckedChange={(checked) => updateWebDavConfig({ enabled: checked })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="WebDAV 地址" htmlFor="webdav-endpoint">
              <Input
                id="webdav-endpoint"
                placeholder="https://example.com/remote.php/dav/files/user"
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
            <Field label="连接方式" htmlFor="webdav-connection-mode">
              <Select value="direct" onValueChange={() => undefined}>
                <SelectTrigger id="webdav-connection-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">浏览器直连</SelectItem>
                  <SelectItem disabled={!WEBDAV_PROXY_ENABLED} value="proxy">
                    服务器代理
                  </SelectItem>
                </SelectContent>
              </Select>
              {!WEBDAV_PROXY_ENABLED ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  当前部署未开启代理。浏览器直连可能受 WebDAV 服务 CORS 限制。
                </p>
              ) : null}
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
              <div>
                <Label htmlFor="webdav-remember-secret">记住密码在本设备</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  只在可信设备保存 WebDAV 凭据。默认只保存到当前浏览器会话。
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

          {uploadConflict ? (
            <div className="grid gap-2 rounded-xl border border-amber/30 bg-amber-soft p-3 text-sm text-amber-foreground">
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
            <div className="grid gap-3 rounded-xl border border-border bg-background p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-4">
                <StatusTile
                  label="更新时间"
                  value={formatSnapshotTime(pendingRemoteBackup.updatedAt)}
                />
                <StatusTile label="deviceId" value={pendingRemoteBackup.deviceId} />
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
              className={`rounded-xl px-3 py-2 text-sm ${
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

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            JSON 备份
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            className="min-h-[180px] font-mono text-sm"
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
          {message ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
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

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            关于 DadKit
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
          <p>
            DadKit 是一个开源待产准备清单工具，第一版不需要登录，数据保存在本地浏览器，不上传用户隐私数据。
          </p>
          <p>
            医院模板用于帮助整理待确认事项。未核验模板不会作为官方入院要求，也不会写死医院一定提供某些物品。
          </p>
        </CardContent>
      </Card>

      <DisclaimerBox />
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
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}
