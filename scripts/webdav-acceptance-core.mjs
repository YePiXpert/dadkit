export const WEBDAV_ACCEPTANCE_DEFAULTS = {
  endpoint: "https://webdav.123pan.cn/webdav",
  remoteDir: "/DadKit",
  filename: "dadkit-backup.json",
};

export function readWebDavAcceptanceEnv(env = process.env) {
  return {
    config: {
      endpoint:
        env.DADKIT_WEBDAV_ENDPOINT ?? WEBDAV_ACCEPTANCE_DEFAULTS.endpoint,
      username: env.DADKIT_WEBDAV_USERNAME ?? "",
      remoteDir:
        env.DADKIT_WEBDAV_REMOTE_DIR ?? WEBDAV_ACCEPTANCE_DEFAULTS.remoteDir,
      filename:
        env.DADKIT_WEBDAV_FILENAME ?? WEBDAV_ACCEPTANCE_DEFAULTS.filename,
    },
    secret: env.DADKIT_WEBDAV_SECRET ?? "",
    allowOverwrite: env.DADKIT_WEBDAV_ALLOW_OVERWRITE === "1",
  };
}

export function missingWebDavAcceptanceEnv({ config, secret }) {
  const missing = [];

  if (!config.username.trim()) {
    missing.push("DADKIT_WEBDAV_USERNAME");
  }

  if (!secret) {
    missing.push("DADKIT_WEBDAV_SECRET");
  }

  return missing;
}

export async function runWebDavAcceptance({
  client,
  config,
  secret,
  allowOverwrite = false,
  now = () => new Date().toISOString(),
}) {
  validateConfig(config, secret);

  const events = [];
  const authorization = buildAuthHeader(config.username, secret);
  const targetUrl = backupUrl(config);

  await ensureRemoteDir({ client, config, authorization, events });

  const existing = await downloadBackup({ client, targetUrl, authorization });
  const existingIsForeign =
    existing.exists && !isDadKitAcceptanceBackup(existing.backup);

  if (existingIsForeign && !allowOverwrite) {
    events.push({
      code: "remote-conflict",
      detail: "existing backup was not created by the acceptance script",
    });

    return {
      ok: false,
      code: "remote-conflict",
      targetUrl,
      events,
    };
  }

  const firstBackup = buildAcceptanceBackup("initial", now());
  await uploadBackup({
    client,
    targetUrl,
    authorization,
    backup: firstBackup,
    eventCode: "initial-uploaded",
    events,
  });

  const firstDownload = await downloadBackup({ client, targetUrl, authorization });

  if (!firstDownload.exists) {
    throw new Error("Uploaded backup was not found on download.");
  }

  assertBackupMatches(firstDownload.backup, firstBackup);
  events.push({ code: "initial-download-verified" });

  const secondBackup = buildAcceptanceBackup("conflict-check", now());

  if (firstDownload.backup.checksum !== secondBackup.checksum) {
    events.push({ code: "conflict-detected" });
  } else {
    throw new Error("Conflict check did not produce a different backup checksum.");
  }

  await uploadBackup({
    client,
    targetUrl,
    authorization,
    backup: secondBackup,
    eventCode: "forced-update-uploaded",
    events,
  });

  const finalDownload = await downloadBackup({ client, targetUrl, authorization });

  if (!finalDownload.exists) {
    throw new Error("Final backup was not found on download.");
  }

  assertBackupMatches(finalDownload.backup, secondBackup);
  events.push({ code: "final-download-verified" });

  return {
    ok: true,
    code: "ok",
    targetUrl,
    events,
  };
}

export function buildAcceptanceBackup(marker, timestamp) {
  const data = buildAcceptanceData(marker, timestamp);

  return {
    schemaVersion: 2,
    app: "DadKit",
    deviceId: "dadkit-acceptance-pwa",
    backupId: `webdav-acceptance-${marker}-${timestamp}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    checksum: calculateChecksum(data),
    data,
  };
}

export function isDadKitAcceptanceBackup(value) {
  return (
    isDadKitBackup(value) &&
    typeof value.deviceId === "string" &&
    value.deviceId.startsWith("dadkit-acceptance-")
  );
}

export function buildAuthHeader(username, secret) {
  return `Basic ${Buffer.from(`${username}:${secret}`, "utf8").toString("base64")}`;
}

export function joinWebDavPath(base, ...segments) {
  const normalizedBase = String(base).trim().replace(/\/+$/, "");
  const cleanedSegments = segments
    .flatMap((segment) => String(segment).split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);

  return [normalizedBase, ...cleanedSegments].join("/");
}

export function backupUrl(config) {
  return joinWebDavPath(config.endpoint, config.remoteDir, config.filename);
}

export function calculateChecksum(value) {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function ensureRemoteDir({ client, config, authorization, events }) {
  const parts = config.remoteDir.split("/").filter(Boolean);
  let currentPath = String(config.endpoint).trim().replace(/\/+$/, "");

  for (const part of parts) {
    currentPath = joinWebDavPath(currentPath, part);

    const propfind = await client.request("PROPFIND", currentPath, {
      headers: {
        Authorization: authorization,
        Depth: "0",
      },
    });

    if (isOkStatus(propfind.status)) {
      events.push({ code: "remote-dir-ready", status: propfind.status });
      continue;
    }

    if (propfind.status !== 404) {
      throw webDavStatusError("Remote directory check", propfind.status);
    }

    const mkcol = await client.request("MKCOL", currentPath, {
      headers: {
        Authorization: authorization,
      },
    });

    if (!isOkStatus(mkcol.status) && mkcol.status !== 405) {
      throw webDavStatusError("Remote directory creation", mkcol.status);
    }

    events.push({ code: "remote-dir-created", status: mkcol.status });
  }
}

async function downloadBackup({ client, targetUrl, authorization }) {
  const response = await client.request("GET", targetUrl, {
    headers: {
      Authorization: authorization,
    },
  });

  if (response.status === 404) {
    return { exists: false };
  }

  if (!isOkStatus(response.status)) {
    throw webDavStatusError("Download", response.status);
  }

  const backup = JSON.parse(responseText(response));

  if (!isDadKitBackup(backup)) {
    throw new Error("Remote file is not a DadKit WebDAV backup.");
  }

  if (calculateChecksum(backup.data) !== backup.checksum) {
    throw new Error("Remote backup checksum verification failed.");
  }

  return { exists: true, backup };
}

async function uploadBackup({
  client,
  targetUrl,
  authorization,
  backup,
  eventCode,
  events,
}) {
  const response = await client.request("PUT", targetUrl, {
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(backup, null, 2),
  });

  if (!isOkStatus(response.status)) {
    throw webDavStatusError("Upload", response.status);
  }

  events.push({ code: eventCode, status: response.status });
}

function assertBackupMatches(actual, expected) {
  if (actual.checksum !== expected.checksum) {
    throw new Error("Downloaded backup checksum does not match uploaded backup.");
  }

  if (actual.backupId !== expected.backupId) {
    throw new Error("Downloaded backup id does not match uploaded backup.");
  }
}

function buildAcceptanceData(marker, timestamp) {
  return {
    version: 2,
    exportedAt: timestamp,
    checklistMode: "lean",
    checklist: [acceptanceChecklistItem(marker, timestamp)],
    customItems: [],
    hiddenTemplateItemIds: [],
    hospitalOverrides: [],
    hospitalAnswers: [],
    timelineTaskStatuses: [],
    contractions: [],
    birthPlan: {},
    postpartumTasks: [],
  };
}

function acceptanceChecklistItem(marker, timestamp) {
  return {
    id: `webdav-acceptance-${marker}`,
    name: `DadKit WebDAV acceptance ${marker} ${timestamp}`,
    category: "mom_labor",
    priority: "must",
    status: "todo",
    source: "user",
    sourceLabel: "DadKit acceptance",
    editable: true,
    removable: true,
    packTier: "core",
    itemKind: "item",
    bag: "mom_bag",
    bulk: "small",
    timing: "pack_now",
  };
}

function validateConfig(config, secret) {
  if (!config.endpoint.trim()) {
    throw new Error("DADKIT_WEBDAV_ENDPOINT is empty.");
  }

  if (!config.username.trim()) {
    throw new Error("DADKIT_WEBDAV_USERNAME is empty.");
  }

  if (!secret) {
    throw new Error("DADKIT_WEBDAV_SECRET is empty.");
  }

  const url = new URL(config.endpoint);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("DADKIT_WEBDAV_ENDPOINT must use http or https.");
  }
}

function responseText(response) {
  if (typeof response.data === "string") {
    return response.data;
  }

  if (response.data === undefined || response.data === null) {
    return "";
  }

  return JSON.stringify(response.data);
}

function isOkStatus(status) {
  return (status >= 200 && status < 300) || status === 207;
}

function webDavStatusError(action, status) {
  const hints = {
    401: "check the WebDAV username and app password",
    403: "check that the authorized WebDAV directory allows read/write access",
    404: "check the endpoint path and remote directory",
    405: "the provider may not allow this WebDAV method on the target path",
    409: "the parent directory may not exist or the provider rejected the path",
    423: "the remote file may be locked",
    429: "the provider is rate limiting requests; wait and retry",
  };
  const hint =
    hints[status] ??
    (status >= 500
      ? "the WebDAV provider returned a server error; wait and retry"
      : "check the WebDAV endpoint, credentials, and permissions");

  return new Error(`${action} failed with HTTP ${status}; ${hint}.`);
}

function isDadKitBackup(value) {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    value.app === "DadKit" &&
    typeof value.deviceId === "string" &&
    typeof value.backupId === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.checksum === "string" &&
    isRecord(value.data) &&
    value.data.version === 2
  );
}

function stableStringify(value) {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(",")}}`;
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}
