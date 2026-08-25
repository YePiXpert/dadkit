import {
  createHash,
  randomBytes as nodeRandomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import {
  isDadKitImportData,
  isRecord,
  isValidDateString,
  projectExportDataForVersion,
  upgradeExportDataToLatest,
  type DadKitImportData,
  type DadKitSyncDataVersion,
} from "@/lib/data/format";
import { SYNC_ERROR_CODES, type SyncErrorCode } from "@/lib/sync/error-codes";
import {
  createInviteToken,
  generateInviteCode,
  generateInviteSecret,
  normalizeInviteCode,
  normalizeInviteSecret,
  parseInviteToken,
} from "@/lib/sync/invite-token";
import { mergeExportData } from "@/lib/sync/merge";
import { getSyncSpaceConfig } from "@/lib/sync/space-config";
import {
  SYNC_SPACE_SCHEMA_VERSION,
  type SyncSpaceFileV2,
  type SyncSpaceInviteV2,
  type SyncSpaceRole,
  type SyncSpaceSessionV2,
  type SyncSpaceUsage,
} from "@/lib/sync/space-schema";
import { canonicalDataBytes, isInviteActive, syncSpaceUsage } from "@/lib/sync/usage";

const SESSION_RENEW_THROTTLE_MS = 60 * 60 * 1000;
const SPACE_BACKUP_COUNT = 5;
const RANDOM_SPACE_ATTEMPTS = 8;
const INVITE_CODE_ATTEMPTS = 8;
const INVITE_CODE_LOCK = "invite-code-generation";
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;
const spaceLocks = new Map<string, Promise<void>>();
const SCRYPT_CONCURRENCY = 4;
let activeScrypt = 0;
const scryptWaiters: Array<() => void> = [];

export class SyncStoreError extends Error {
  constructor(
    message: string,
    readonly code: SyncErrorCode = SYNC_ERROR_CODES.storageUnavailable,
    readonly status = 500,
    readonly details?: Record<string, number | string | boolean>,
  ) {
    super(message);
    this.name = "SyncStoreError";
  }
}

export type SyncSpaceSnapshot = {
  version: number;
  updatedAt: string;
  serverTime: string;
  data: DadKitImportData | null;
};

export type SyncJoinResult = SyncSpaceSnapshot & { token: string };
export type SyncSessionPublic = SyncSpaceSessionV2 & {
  id: string;
  current: boolean;
};

export type SyncInvitePublic = Omit<
  SyncSpaceInviteV2,
  "codeSalt" | "codeHash" | "shortCodeSalt" | "shortCodeHash" | "shortCodeLookup"
>;

export type SyncSpaceMetadata = {
  spaceId: string;
  kind: SyncSpaceFileV2["kind"];
  displayName: string;
  dataRevision: number;
  metadataRevision: number;
  dataUpdatedAt: string;
  metadataUpdatedAt: string;
  currentSession: SyncSessionPublic;
  usage: SyncSpaceUsage;
};

export type SyncRandomCreateResult = {
  token: string;
  space: SyncSpaceMetadata;
};

export type SyncInviteV2Result = {
  id: string;
  token: string;
  code: string;
  expiresAt: string;
};

function dataDir() {
  const configured = process.env.DADKIT_DATA_DIR?.trim();
  return configured || path.join(process.cwd(), "data");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function hashCode(code: string, salt: string) {
  if (activeScrypt >= SCRYPT_CONCURRENCY) {
    await new Promise<void>((resolve) => scryptWaiters.push(resolve));
  }
  activeScrypt += 1;
  try {
    return (await scrypt(code, salt, 32)).toString("hex");
  } finally {
    activeScrypt -= 1;
    scryptWaiters.shift()?.();
  }
}

function safeHashMatch(candidate: string, expected: string) {
  const actualBuffer = Buffer.from(candidate, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function spacePath(spaceId: string) {
  if (!/^[0-9a-f]{64}$/.test(spaceId)) {
    throw new SyncStoreError("同步空间标识不正确。", SYNC_ERROR_CODES.sessionRevoked, 401);
  }
  return path.join(dataDir(), `space-${spaceId}.json`);
}

export function sanitizeSyncDisplayName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export function sanitizeDeviceName(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

function isRole(value: unknown): value is SyncSpaceRole {
  return value === "owner" || value === "member";
}

function isSessionV2(value: unknown): value is SyncSpaceSessionV2 {
  return (
    isRecord(value) &&
    isValidDateString(value.createdAt) &&
    isValidDateString(value.lastSeenAt) &&
    typeof value.deviceName === "string" &&
    value.deviceName.length >= 1 &&
    value.deviceName.length <= 60 &&
    isRole(value.role) &&
    value.protocolVersion === 2
  );
}

function isInviteV2(value: unknown): value is SyncSpaceInviteV2 {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    /^[0-9a-f]{32}$/.test(value.id) &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
    (value.shortCodeSalt === undefined ||
      (typeof value.shortCodeSalt === "string" &&
        /^[0-9a-f]{32}$/.test(value.shortCodeSalt))) &&
    (value.shortCodeHash === undefined ||
      (typeof value.shortCodeHash === "string" &&
        /^[0-9a-f]{64}$/.test(value.shortCodeHash))) &&
    (value.shortCodeLookup === undefined ||
      (typeof value.shortCodeLookup === "string" &&
        /^[0-9a-f]{64}$/.test(value.shortCodeLookup))) &&
    ((value.shortCodeSalt === undefined &&
      value.shortCodeHash === undefined &&
      value.shortCodeLookup === undefined) ||
      (value.shortCodeSalt !== undefined &&
        value.shortCodeHash !== undefined &&
        value.shortCodeLookup !== undefined)) &&
    isValidDateString(value.createdAt) &&
    isValidDateString(value.expiresAt) &&
    typeof value.createdBySessionId === "string" &&
    value.role === "member" &&
    (value.usedAt === null || isValidDateString(value.usedAt)) &&
    (value.revokedAt === null || isValidDateString(value.revokedAt))
  );
}

function isSpaceFileV2(value: unknown): value is SyncSpaceFileV2 {
  return (
    isRecord(value) &&
    value.schemaVersion === SYNC_SPACE_SCHEMA_VERSION &&
    typeof value.spaceId === "string" &&
    /^[0-9a-f]{64}$/.test(value.spaceId) &&
    value.kind === "random" &&
    typeof value.displayName === "string" &&
    value.displayName.length >= 1 &&
    value.displayName.length <= 40 &&
    isValidDateString(value.createdAt) &&
    Number.isInteger(value.dataRevision) &&
    (value.dataRevision as number) >= 0 &&
    Number.isInteger(value.metadataRevision) &&
    (value.metadataRevision as number) >= 0 &&
    isValidDateString(value.dataUpdatedAt) &&
    isValidDateString(value.metadataUpdatedAt) &&
    (value.data === null || isDadKitImportData(value.data)) &&
    isRecord(value.sessions) &&
    Object.entries(value.sessions).every(
      ([id, session]) => /^[0-9a-f]{64}$/.test(id) && isSessionV2(session),
    ) &&
    isRecord(value.invites) &&
    Object.entries(value.invites).every(
      ([id, invite]) => id === (invite as { id?: unknown }).id && isInviteV2(invite),
    )
  );
}

async function readSpace(spaceId: string): Promise<SyncSpaceFileV2 | undefined> {
  try {
    const parsed = JSON.parse(await readFile(spacePath(spaceId), "utf8")) as unknown;
    if (isSpaceFileV2(parsed)) {
      if (parsed.spaceId !== spaceId) throw new SyncStoreError("同步空间数据结构无效。");
      return parsed;
    }
    throw new SyncStoreError("同步空间数据结构无效。");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    if (error instanceof SyncStoreError) throw error;
    throw new SyncStoreError("同步空间数据读取失败。");
  }
}

async function listSpaceIds() {
  try {
    return (await readdir(dataDir()))
      .map((entry) => /^space-([0-9a-f]{64})\.json$/.exec(entry)?.[1])
      .filter((spaceId): spaceId is string => Boolean(spaceId));
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return [];
    throw new SyncStoreError("同步空间目录读取失败。");
  }
}

async function findSpaceIdsByInviteCode(normalizedCode: string) {
  const lookup = sha256(normalizedCode);
  const matches: string[] = [];
  for (const spaceId of await listSpaceIds()) {
    let space: SyncSpaceFileV2 | undefined;
    try {
      space = await readSpace(spaceId);
    } catch (error) {
      if (error instanceof SyncStoreError) continue;
      throw error;
    }
    if (
      space &&
      Object.values(space.invites).some(
        (invite) =>
          isInviteActive(invite, Date.now()) && invite.shortCodeLookup === lookup,
      )
    ) {
      matches.push(spaceId);
    }
  }
  return matches;
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    const normalized = normalizeInviteCode(code)!;
    if ((await findSpaceIdsByInviteCode(normalized)).length === 0) {
      return { code, normalized };
    }
  }
  throw new SyncStoreError(
    "无法生成唯一邀请口令，请稍后重试。",
    SYNC_ERROR_CODES.storageUnavailable,
    503,
  );
}

async function rotateSpaceBackups(filePath: string) {
  for (let index = SPACE_BACKUP_COUNT; index >= 1; index -= 1) {
    const source = index === 1 ? filePath : `${filePath}.bak.${index - 1}`;
    const destination = `${filePath}.bak.${index}`;
    try {
      await writeFile(destination, await readFile(source), { mode: 0o600 });
      await chmod(destination, 0o600);
    } catch (error) {
      if (isRecord(error) && error.code === "ENOENT") continue;
      throw error;
    }
  }
}

async function writeSpace(
  space: SyncSpaceFileV2,
  options: { rotateDataBackups?: boolean } = {},
) {
  const directory = dataDir();
  const filePath = spacePath(space.spaceId);
  const tempPath = `${filePath}.${nodeRandomBytes(8).toString("hex")}.tmp`;
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    if (options.rotateDataBackups) await rotateSpaceBackups(filePath);
    await writeFile(tempPath, JSON.stringify(space), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(tempPath, filePath);
    await chmod(filePath, 0o600);
  } catch {
    await unlink(tempPath).catch(() => undefined);
    throw new SyncStoreError("同步空间数据写入失败。");
  }
}

async function withSpaceLock<T>(spaceId: string, operation: () => Promise<T>): Promise<T> {
  const previous = spaceLocks.get(spaceId) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => current);
  spaceLocks.set(spaceId, queued);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (spaceLocks.get(spaceId) === queued) spaceLocks.delete(spaceId);
  }
}

function touchMetadata(space: SyncSpaceFileV2, now = new Date().toISOString()) {
  space.metadataRevision += 1;
  space.metadataUpdatedAt = now;
}

function snapshotOf(
  space: SyncSpaceFileV2,
  targetVersion: DadKitSyncDataVersion,
): SyncSpaceSnapshot {
  return {
    version: space.dataRevision,
    updatedAt: space.dataUpdatedAt,
    serverTime: new Date().toISOString(),
    data:
      space.data === null
        ? null
        : projectExportDataForVersion(
            upgradeExportDataToLatest(space.data),
            targetVersion,
          ),
  };
}

function issueSession(
  space: SyncSpaceFileV2,
  now: string,
  deviceName: string,
  role: SyncSpaceRole,
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  const secret = randomBytes(24).toString("hex");
  const id = sha256(secret);
  space.sessions[id] = {
    createdAt: now,
    lastSeenAt: now,
    deviceName,
    role,
    protocolVersion: 2,
  };
  return { token: `${space.spaceId}.${secret}`, sessionId: id };
}

function parseSessionToken(token: string) {
  const [spaceId, secret, extra] = token.split(".");
  if (
    extra !== undefined ||
    !/^[0-9a-f]{64}$/.test(spaceId ?? "") ||
    !/^[0-9a-f]{48,96}$/.test(secret ?? "")
  ) return undefined;
  return { spaceId: spaceId!, secret: secret! };
}

function pruneExpiredSessions(space: SyncSpaceFileV2, now: number) {
  const ttl = getSyncSpaceConfig().sessionTtlMs;
  let changed = false;
  for (const [id, session] of Object.entries(space.sessions)) {
    if (now - Date.parse(session.lastSeenAt) > ttl) {
      delete space.sessions[id];
      changed = true;
    }
  }
  return changed;
}

async function authenticateLocked(spaceId: string, secret: string, touch = true) {
  const space = await readSpace(spaceId);
  if (!space) return undefined;
  const sessionId = sha256(secret);
  const now = Date.now();
  const pruned = pruneExpiredSessions(space, now);
  const session = space.sessions[sessionId];
  if (!session) {
    if (pruned) {
      touchMetadata(space, new Date(now).toISOString());
      await writeSpace(space);
    }
    return undefined;
  }
  if (pruned || (touch && now - Date.parse(session.lastSeenAt) > SESSION_RENEW_THROTTLE_MS)) {
    if (touch) session.lastSeenAt = new Date(now).toISOString();
    touchMetadata(space, new Date(now).toISOString());
    await writeSpace(space);
  }
  return { space, session, sessionId };
}

function metadataOf(
  space: SyncSpaceFileV2,
  sessionId: string,
): SyncSpaceMetadata {
  const current = space.sessions[sessionId];
  if (!current) throw new SyncStoreError("同步会话已失效。", SYNC_ERROR_CODES.sessionRevoked, 401);
  return {
    spaceId: space.spaceId,
    kind: space.kind,
    displayName: space.displayName,
    dataRevision: space.dataRevision,
    metadataRevision: space.metadataRevision,
    dataUpdatedAt: space.dataUpdatedAt,
    metadataUpdatedAt: space.metadataUpdatedAt,
    currentSession: { id: sessionId, current: true, ...current },
    usage: syncSpaceUsage(space, getSyncSpaceConfig()),
  };
}

function ownerCount(space: SyncSpaceFileV2) {
  return Object.values(space.sessions).filter((session) => session.role === "owner").length;
}

function requireOwner(session: SyncSpaceSessionV2) {
  if (session.role !== "owner") {
    throw new SyncStoreError("需要同步空间管理员权限。", SYNC_ERROR_CODES.ownerRequired, 403);
  }
}

export async function pullSpace(
  token: string,
  targetVersion: DadKitSyncDataVersion = 11,
): Promise<SyncSpaceSnapshot | undefined> {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    return auth ? snapshotOf(auth.space, targetVersion) : undefined;
  });
}

function canonicalComparable(data: DadKitImportData) {
  return JSON.stringify({ ...upgradeExportDataToLatest(data), exportedAt: "" });
}

export async function pushSpace(
  token: string,
  incoming: DadKitImportData,
  targetVersion: DadKitSyncDataVersion = 11,
): Promise<SyncSpaceSnapshot | undefined> {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    const { space } = auth;
    const merged =
      space.data === null
        ? upgradeExportDataToLatest(incoming)
        : mergeExportData(upgradeExportDataToLatest(space.data), incoming);
    const usedBytes = canonicalDataBytes(merged);
    const limitBytes = getSyncSpaceConfig().maxSpaceBytes;
    if (usedBytes > limitBytes) {
      throw new SyncStoreError(
        "家庭同步空间已达到容量上限。",
        SYNC_ERROR_CODES.spaceQuotaExceeded,
        413,
        { usedBytes, limitBytes },
      );
    }
    const businessChanged =
      space.data === null || canonicalComparable(space.data) !== canonicalComparable(merged);
    const needsCanonicalUpgrade = space.data !== null && space.data.version !== 11;
    if (businessChanged || needsCanonicalUpgrade) {
      const now = new Date().toISOString();
      space.data = merged;
      if (businessChanged) {
        space.dataRevision += 1;
        space.dataUpdatedAt = now;
      }
      await writeSpace(space, { rotateDataBackups: true });
    }
    return snapshotOf(space, targetVersion);
  });
}

export async function leaveSpace(token: string): Promise<boolean> {
  const parsed = parseSessionToken(token);
  if (!parsed) return false;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret, false);
    if (!auth) return false;
    if (auth.session.role === "owner" && ownerCount(auth.space) === 1) {
      throw new SyncStoreError(
        "请先把另一台设备设为管理员，再退出当前设备。",
        SYNC_ERROR_CODES.lastOwnerRequired,
        409,
      );
    }
    delete auth.space.sessions[auth.sessionId];
    touchMetadata(auth.space);
    await writeSpace(auth.space);
    return true;
  });
}

export async function assertCanLeaveSpace(token: string): Promise<boolean> {
  const parsed = parseSessionToken(token);
  if (!parsed) return false;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret, false);
    if (!auth) return false;
    if (auth.session.role === "owner" && ownerCount(auth.space) === 1) {
      throw new SyncStoreError(
        "请先把另一台设备设为管理员，再切换家庭同步空间。",
        SYNC_ERROR_CODES.lastOwnerRequired,
        409,
      );
    }
    return true;
  });
}

export async function createRandomSpace(
  displayName: string,
  deviceName: string,
  options: {
    randomBytes?: (size: number) => Buffer;
    maxAttempts?: number;
  } = {},
): Promise<SyncRandomCreateResult> {
  const config = getSyncSpaceConfig();
  if (config.registrationMode === "closed") {
    throw new SyncStoreError("当前服务器已关闭新建家庭同步空间。", SYNC_ERROR_CODES.registrationClosed, 403);
  }
  const cleanDisplayName = sanitizeSyncDisplayName(displayName);
  const cleanDeviceName = sanitizeDeviceName(deviceName);
  if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40) {
    throw new SyncStoreError("家庭显示名称需要 1 到 40 个字符。", SYNC_ERROR_CODES.storageUnavailable, 400);
  }
  if (cleanDeviceName.length < 1 || cleanDeviceName.length > 60) {
    throw new SyncStoreError("设备名称需要 1 到 60 个字符。", SYNC_ERROR_CODES.storageUnavailable, 400);
  }
  const randomBytes = options.randomBytes ?? nodeRandomBytes;
  const attempts = options.maxAttempts ?? RANDOM_SPACE_ATTEMPTS;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const spaceId = randomBytes(32).toString("hex");
    if (!/^[0-9a-f]{64}$/.test(spaceId)) continue;
    const result = await withSpaceLock(spaceId, async () => {
      if (await readSpace(spaceId)) return undefined;
      const now = new Date().toISOString();
      const space: SyncSpaceFileV2 = {
        schemaVersion: 2,
        spaceId,
        kind: "random",
        displayName: cleanDisplayName,
        createdAt: now,
        dataRevision: 0,
        metadataRevision: 0,
        dataUpdatedAt: now,
        metadataUpdatedAt: now,
        data: null,
        sessions: {},
        invites: {},
      };
      const issued = issueSession(space, now, cleanDeviceName, "owner", randomBytes);
      touchMetadata(space, now);
      await writeSpace(space);
      return { token: issued.token, space: metadataOf(space, issued.sessionId) };
    });
    if (result) return result;
  }
  throw new SyncStoreError("无法生成新的同步空间标识，请稍后重试。", SYNC_ERROR_CODES.storageUnavailable, 503);
}

export async function createV2Invite(
  token: string,
  ttlMinutes?: number,
): Promise<SyncInviteV2Result | undefined> {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(INVITE_CODE_LOCK, () => withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    const config = getSyncSpaceConfig();
    const ttl = ttlMinutes ?? config.defaultInviteTtlMinutes;
    if (!Number.isInteger(ttl) || ttl < 10 || ttl > config.maxInviteTtlMinutes) {
      throw new SyncStoreError("邀请有效期不正确。", SYNC_ERROR_CODES.invalidInvite, 400);
    }
    const usage = syncSpaceUsage(auth.space, config);
    if (usage.activeInviteCount >= config.maxActiveInvites) {
      throw new SyncStoreError("有效邀请数量已达到上限。", SYNC_ERROR_CODES.activeInviteLimitReached, 409);
    }
    const secret = generateInviteSecret();
    const salt = nodeRandomBytes(16).toString("hex");
    const shortCode = await generateUniqueInviteCode();
    const shortCodeSalt = nodeRandomBytes(16).toString("hex");
    const id = nodeRandomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();
    auth.space.invites[id] = {
      id,
      codeSalt: salt,
      codeHash: await hashCode(secret, salt),
      shortCodeSalt,
      shortCodeHash: await hashCode(shortCode.normalized, shortCodeSalt),
      shortCodeLookup: sha256(shortCode.normalized),
      createdAt: now,
      expiresAt,
      createdBySessionId: auth.sessionId,
      role: "member",
      usedAt: null,
      revokedAt: null,
    };
    touchMetadata(auth.space, now);
    await writeSpace(auth.space);
    return {
      id,
      token: createInviteToken(auth.space.spaceId, secret),
      code: shortCode.code,
      expiresAt,
    };
  }));
}

export async function joinWithInvite(
  inviteCredential: string,
  deviceName: string,
): Promise<SyncRandomCreateResult | undefined> {
  const parsed = parseInviteToken(inviteCredential);
  const normalizedCode = normalizeInviteCode(inviteCredential);
  const cleanDeviceName = sanitizeDeviceName(deviceName);
  if ((!parsed && !normalizedCode) || cleanDeviceName.length < 1 || cleanDeviceName.length > 60) {
    return undefined;
  }
  const spaceIds = parsed
    ? [parsed.spaceId]
    : await findSpaceIdsByInviteCode(normalizedCode!);
  for (const spaceId of spaceIds) {
    const result = await withSpaceLock(spaceId, async () => {
      const space = await readSpace(spaceId);
      if (!space) return undefined;
      pruneExpiredSessions(space, Date.now());
      const config = getSyncSpaceConfig();
      let matched: SyncSpaceInviteV2 | undefined;
      for (const invite of Object.values(space.invites)) {
        if (!isInviteActive(invite, Date.now())) continue;
        const salt = parsed ? invite.codeSalt : invite.shortCodeSalt;
        const expected = parsed ? invite.codeHash : invite.shortCodeHash;
        const credential = parsed
          ? normalizeInviteSecret(parsed.secret)!
          : normalizedCode!;
        if (!salt || !expected) continue;
        const candidate = await hashCode(credential, salt);
        if (safeHashMatch(candidate, expected)) {
          matched = invite;
          break;
        }
      }
      if (!matched) return undefined;
      if (Object.keys(space.sessions).length >= config.maxDevices) {
        throw new SyncStoreError(
          "同步设备数量已达到上限。",
          SYNC_ERROR_CODES.deviceLimitReached,
          409,
        );
      }
      const now = new Date().toISOString();
      matched.usedAt = now;
      const issued = issueSession(space, now, cleanDeviceName, "member");
      touchMetadata(space, now);
      await writeSpace(space);
      return { token: issued.token, space: metadataOf(space, issued.sessionId) };
    });
    if (result) return result;
  }
  return undefined;
}

export async function getSpaceMetadata(token: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    return auth ? metadataOf(auth.space, auth.sessionId) : undefined;
  });
}

export async function renameSpace(token: string, displayName: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  const clean = sanitizeSyncDisplayName(displayName);
  if (clean.length < 1 || clean.length > 40) {
    throw new SyncStoreError("家庭显示名称需要 1 到 40 个字符。", SYNC_ERROR_CODES.storageUnavailable, 400);
  }
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    if (auth.space.displayName !== clean) {
      auth.space.displayName = clean;
      touchMetadata(auth.space);
      await writeSpace(auth.space);
    }
    return metadataOf(auth.space, auth.sessionId);
  });
}

export async function listSessions(token: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    return Object.entries(auth.space.sessions)
      .map(([id, session]) => ({ id, current: id === auth.sessionId, ...session }))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  });
}

export async function updateSession(
  token: string,
  targetSessionId: string,
  patch: { deviceName?: string; role?: SyncSpaceRole },
) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    const target = auth.space.sessions[targetSessionId];
    if (!target) throw new SyncStoreError("设备会话不存在或已失效。", SYNC_ERROR_CODES.sessionRevoked, 404);
    if (targetSessionId !== auth.sessionId || patch.role !== undefined) requireOwner(auth.session);
    let changed = false;
    if (patch.deviceName !== undefined) {
      const clean = sanitizeDeviceName(patch.deviceName);
      if (clean.length < 1 || clean.length > 60) {
        throw new SyncStoreError("设备名称需要 1 到 60 个字符。", SYNC_ERROR_CODES.storageUnavailable, 400);
      }
      if (target.deviceName !== clean) {
        target.deviceName = clean;
        changed = true;
      }
    }
    if (patch.role !== undefined && target.role !== patch.role) {
      if (target.role === "owner" && patch.role === "member" && ownerCount(auth.space) === 1) {
        throw new SyncStoreError("同步空间至少需要一台管理员设备。", SYNC_ERROR_CODES.lastOwnerRequired, 409);
      }
      target.role = patch.role;
      changed = true;
    }
    if (changed) {
      touchMetadata(auth.space);
      await writeSpace(auth.space);
    }
    return { id: targetSessionId, current: targetSessionId === auth.sessionId, ...target };
  });
}

export async function revokeSession(token: string, targetSessionId: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret, false);
    if (!auth) return undefined;
    requireOwner(auth.session);
    const target = auth.space.sessions[targetSessionId];
    if (!target) return true;
    if (target.role === "owner" && ownerCount(auth.space) === 1) {
      throw new SyncStoreError("不能撤销最后一台管理员设备。", SYNC_ERROR_CODES.lastOwnerRequired, 409);
    }
    delete auth.space.sessions[targetSessionId];
    touchMetadata(auth.space);
    await writeSpace(auth.space);
    return true;
  });
}

export async function listInvites(token: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    return Object.values(auth.space.invites)
      .map((invite) => ({
        id: invite.id,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        createdBySessionId: invite.createdBySessionId,
        role: invite.role,
        usedAt: invite.usedAt,
        revokedAt: invite.revokedAt,
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  });
}

export async function revokeInvite(token: string, inviteId: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    const invite = auth.space.invites[inviteId];
    if (!invite) return true;
    if (invite.revokedAt === null && invite.usedAt === null) {
      invite.revokedAt = new Date().toISOString();
      touchMetadata(auth.space);
      await writeSpace(auth.space);
    }
    return true;
  });
}

export async function deleteSpace(token: string, confirmation: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret, false);
    if (!auth) return undefined;
    requireOwner(auth.session);
    if (confirmation !== auth.space.displayName && confirmation !== "永久删除") {
      throw new SyncStoreError("请输入家庭显示名称或“永久删除”进行确认。", SYNC_ERROR_CODES.ownerRequired, 400);
    }
    const prefix = `space-${parsed.spaceId}.json`;
    let entries: string[];
    try {
      entries = await readdir(dataDir());
      const targets = entries.filter(
        (entry) =>
          entry === prefix ||
          entry.startsWith(`${prefix}.bak.`) ||
          (entry.startsWith(`${prefix}.`) && entry.endsWith(".tmp")),
      );
      await Promise.all(targets.map((entry) => unlink(path.join(dataDir(), entry))));
    } catch {
      throw new SyncStoreError("无法永久删除同步空间，请稍后重试。");
    }
    return true;
  });
}

export async function checkSyncStorageHealth() {
  const directory = dataDir();
  const probe = path.join(directory, `.dadkit-health-${nodeRandomBytes(8).toString("hex")}.tmp`);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(probe, "ok", { flag: "wx", mode: 0o600 });
    await unlink(probe);
    return true;
  } catch {
    await unlink(probe).catch(() => undefined);
    return false;
  }
}
