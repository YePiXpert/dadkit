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
  generateInviteSecret,
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
import {
  legacySyncSpaceName,
  normalizeSyncSpaceName,
} from "@/lib/sync/space-name";
import { canonicalDataBytes, isInviteActive, syncSpaceUsage } from "@/lib/sync/usage";

const SESSION_RENEW_THROTTLE_MS = 60 * 60 * 1000;
const SPACE_BACKUP_COUNT = 5;
const LEGACY_INVITE_TTL_MS = 10 * 60 * 1000;
const LEGACY_INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const RANDOM_SPACE_ATTEMPTS = 8;
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

type LegacySpaceSession = { createdAt: string; lastSeenAt: string };
type LegacySpaceInvite = { codeSalt: string; codeHash: string; expiresAt: string };
type LegacySpaceFile = {
  codeSalt: string;
  codeHash: string;
  legacyJoinEnabled?: boolean;
  invite?: LegacySpaceInvite;
  version: number;
  updatedAt: string;
  data: DadKitImportData | null;
  sessions: Record<string, LegacySpaceSession>;
};

export type SyncSpaceSnapshot = {
  version: number;
  updatedAt: string;
  serverTime: string;
  data: DadKitImportData | null;
};

export type SyncJoinResult = SyncSpaceSnapshot & { token: string };
export type SyncInvite = { code: string; expiresAt: string };
export type SyncCreateResult = SyncJoinResult & { invite: SyncInvite };

export type SyncSessionPublic = SyncSpaceSessionV2 & {
  id: string;
  current: boolean;
};

export type SyncInvitePublic = Omit<SyncSpaceInviteV2, "codeSalt" | "codeHash">;

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
    (value.protocolVersion === 1 || value.protocolVersion === 2)
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
    (value.kind === "legacy-name" || value.kind === "random") &&
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
    (value.legacyAuth === undefined ||
      (isRecord(value.legacyAuth) &&
        typeof value.legacyAuth.codeSalt === "string" &&
        /^[0-9a-f]{32}$/.test(value.legacyAuth.codeSalt) &&
        typeof value.legacyAuth.codeHash === "string" &&
        /^[0-9a-f]{64}$/.test(value.legacyAuth.codeHash) &&
        typeof value.legacyAuth.joinEnabled === "boolean" &&
        (value.legacyAuth.normalizedNameHash === undefined ||
          (typeof value.legacyAuth.normalizedNameHash === "string" &&
            /^[0-9a-f]{64}$/.test(value.legacyAuth.normalizedNameHash))))) &&
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

function isLegacySession(value: unknown): value is LegacySpaceSession {
  return (
    isRecord(value) &&
    isValidDateString(value.createdAt) &&
    isValidDateString(value.lastSeenAt)
  );
}

function isLegacyInvite(value: unknown): value is LegacySpaceInvite {
  return (
    isRecord(value) &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
    isValidDateString(value.expiresAt)
  );
}

function isLegacySpaceFile(value: unknown): value is LegacySpaceFile {
  return (
    isRecord(value) &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
    (value.legacyJoinEnabled === undefined || typeof value.legacyJoinEnabled === "boolean") &&
    (value.invite === undefined || isLegacyInvite(value.invite)) &&
    Number.isInteger(value.version) &&
    (value.version as number) >= 0 &&
    isValidDateString(value.updatedAt) &&
    (value.data === null || isDadKitImportData(value.data)) &&
    isRecord(value.sessions) &&
    Object.entries(value.sessions).every(
      ([id, session]) => /^[0-9a-f]{64}$/.test(id) && isLegacySession(session),
    )
  );
}

export function migrateLegacySpaceFile(
  spaceId: string,
  legacy: LegacySpaceFile,
): SyncSpaceFileV2 {
  const sessions = Object.fromEntries(
    Object.entries(legacy.sessions).map(([id, session]) => [
      id,
      {
        ...session,
        deviceName: "旧设备",
        role: "owner" as const,
        protocolVersion: 1 as const,
      },
    ]),
  );
  const firstSessionId = Object.keys(sessions).sort()[0] ?? "legacy";
  const invites: Record<string, SyncSpaceInviteV2> = {};
  if (legacy.invite) {
    const id = sha256(`legacy-invite:${legacy.invite.codeHash}`).slice(0, 32);
    invites[id] = {
      id,
      ...legacy.invite,
      createdAt: legacy.updatedAt,
      createdBySessionId: firstSessionId,
      role: "member",
      usedAt: null,
      revokedAt: null,
    };
  }
  const createdAt =
    Object.values(legacy.sessions)
      .map((session) => session.createdAt)
      .sort()[0] ?? legacy.updatedAt;

  return {
    schemaVersion: 2,
    spaceId,
    kind: "legacy-name",
    displayName: "家庭同步",
    createdAt,
    dataRevision: legacy.version,
    metadataRevision: 0,
    dataUpdatedAt: legacy.updatedAt,
    metadataUpdatedAt: legacy.updatedAt,
    data: legacy.data,
    legacyAuth: {
      codeSalt: legacy.codeSalt,
      codeHash: legacy.codeHash,
      joinEnabled: legacy.legacyJoinEnabled !== false,
      normalizedNameHash: spaceId,
    },
    sessions,
    invites,
  };
}

async function readSpace(spaceId: string): Promise<SyncSpaceFileV2 | undefined> {
  try {
    const parsed = JSON.parse(await readFile(spacePath(spaceId), "utf8")) as unknown;
    if (isSpaceFileV2(parsed)) {
      if (parsed.spaceId !== spaceId) throw new SyncStoreError("同步空间数据结构无效。");
      return parsed;
    }
    if (isLegacySpaceFile(parsed)) return migrateLegacySpaceFile(spaceId, parsed);
    throw new SyncStoreError("同步空间数据结构无效。");
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return undefined;
    if (error instanceof SyncStoreError) throw error;
    throw new SyncStoreError("同步空间数据读取失败。");
  }
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
  protocolVersion: 1 | 2,
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  const secret = randomBytes(24).toString("hex");
  const id = sha256(secret);
  space.sessions[id] = { createdAt: now, lastSeenAt: now, deviceName, role, protocolVersion };
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

function generateLegacyInviteCode() {
  const bytes = nodeRandomBytes(16);
  let code = "";
  const limit = Math.floor(256 / LEGACY_INVITE_ALPHABET.length) * LEGACY_INVITE_ALPHABET.length;
  for (const byte of bytes) {
    if (byte >= limit) continue;
    code += LEGACY_INVITE_ALPHABET[byte % LEGACY_INVITE_ALPHABET.length];
    if (code.length === 8) break;
  }
  if (code.length < 8) return generateLegacyInviteCode();
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalizeLegacyInviteCode(code: string) {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${LEGACY_INVITE_ALPHABET}]{8}$`).test(normalized)
    ? normalized
    : undefined;
}

async function setLegacyInvite(space: SyncSpaceFileV2, sessionId: string): Promise<SyncInvite> {
  for (const invite of Object.values(space.invites)) {
    if (isInviteActive(invite, Date.now())) invite.revokedAt = new Date().toISOString();
  }
  const code = generateLegacyInviteCode();
  const normalized = normalizeLegacyInviteCode(code)!;
  const now = new Date().toISOString();
  const codeSalt = nodeRandomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LEGACY_INVITE_TTL_MS).toISOString();
  const id = nodeRandomBytes(16).toString("hex");
  space.invites[id] = {
    id,
    codeSalt,
    codeHash: await hashCode(normalized, codeSalt),
    createdAt: now,
    expiresAt,
    createdBySessionId: sessionId,
    role: "member",
    usedAt: null,
    revokedAt: null,
  };
  touchMetadata(space, now);
  return { code, expiresAt };
}

export async function joinSpace(
  name: string,
  code: string,
  existingOnly = false,
  targetVersion: DadKitSyncDataVersion = 9,
): Promise<SyncJoinResult | undefined> {
  const normalizedName = normalizeSyncSpaceName(name);
  const legacyName = legacySyncSpaceName(name);
  const normalizedSpaceId = sha256(normalizedName);
  const legacySpaceId = sha256(legacyName);

  return withSpaceLock(normalizedSpaceId, async () => {
    const now = new Date().toISOString();
    let spaceId = normalizedSpaceId;
    let space = await readSpace(spaceId);
    if (!space && legacySpaceId !== normalizedSpaceId) {
      space = await readSpace(legacySpaceId);
      spaceId = legacySpaceId;
    }

    if (!space) {
      if (existingOnly) return undefined;
      const codeSalt = nodeRandomBytes(16).toString("hex");
      space = {
        schemaVersion: 2,
        spaceId,
        kind: "legacy-name",
        displayName: sanitizeSyncDisplayName(name) || "家庭同步",
        createdAt: now,
        dataRevision: 0,
        metadataRevision: 0,
        dataUpdatedAt: now,
        metadataUpdatedAt: now,
        data: null,
        legacyAuth: {
          codeSalt,
          codeHash: await hashCode(code.trim(), codeSalt),
          joinEnabled: true,
          normalizedNameHash: normalizedSpaceId,
        },
        sessions: {},
        invites: {},
      };
    } else {
      let authenticated = false;
      const inviteCode = normalizeLegacyInviteCode(code);
      if (inviteCode) {
        for (const invite of Object.values(space.invites)) {
          if (!isInviteActive(invite, Date.now())) continue;
          const candidate = await hashCode(inviteCode, invite.codeSalt);
          if (safeHashMatch(candidate, invite.codeHash)) {
            invite.usedAt = now;
            authenticated = true;
            if (space.legacyAuth) space.legacyAuth.joinEnabled = false;
            break;
          }
        }
      }
      if (!authenticated && space.legacyAuth?.joinEnabled !== false) {
        const candidate = await hashCode(code.trim(), space.legacyAuth!.codeSalt);
        authenticated = safeHashMatch(candidate, space.legacyAuth!.codeHash);
      }
      if (!authenticated) return undefined;
      pruneExpiredSessions(space, Date.now());
      if (Object.keys(space.sessions).length >= getSyncSpaceConfig().maxDevices) {
        throw new SyncStoreError("同步设备数量已达到上限。", SYNC_ERROR_CODES.deviceLimitReached, 409);
      }
    }

    const issued = issueSession(space, now, "旧设备", "owner", 1);
    touchMetadata(space, now);
    await writeSpace(space);
    return { token: issued.token, ...snapshotOf(space, targetVersion) };
  });
}

export async function createSpace(
  name: string,
  targetVersion: DadKitSyncDataVersion = 9,
): Promise<SyncCreateResult | undefined> {
  if (!getSyncSpaceConfig().legacyCreateEnabled) return undefined;
  const normalizedName = normalizeSyncSpaceName(name);
  const legacyName = legacySyncSpaceName(name);
  const spaceId = sha256(normalizedName);
  const legacySpaceId = sha256(legacyName);
  return withSpaceLock(spaceId, async () => {
    if (
      (await readSpace(spaceId)) ||
      (legacySpaceId !== spaceId && (await readSpace(legacySpaceId)))
    ) return undefined;
    const now = new Date().toISOString();
    const codeSalt = nodeRandomBytes(16).toString("hex");
    const retiredCode = nodeRandomBytes(32).toString("hex");
    const space: SyncSpaceFileV2 = {
      schemaVersion: 2,
      spaceId,
      kind: "legacy-name",
      displayName: sanitizeSyncDisplayName(name) || "家庭同步",
      createdAt: now,
      dataRevision: 0,
      metadataRevision: 0,
      dataUpdatedAt: now,
      metadataUpdatedAt: now,
      data: null,
      legacyAuth: {
        codeSalt,
        codeHash: await hashCode(retiredCode, codeSalt),
        joinEnabled: false,
        normalizedNameHash: spaceId,
      },
      sessions: {},
      invites: {},
    };
    const issued = issueSession(space, now, "旧设备", "owner", 1);
    const invite = await setLegacyInvite(space, issued.sessionId);
    await writeSpace(space);
    return { token: issued.token, invite, ...snapshotOf(space, targetVersion) };
  });
}

export async function createInvite(
  token: string,
  name: string,
): Promise<SyncInvite | null | undefined> {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  if (
    sha256(normalizeSyncSpaceName(name)) !== parsed.spaceId &&
    sha256(legacySyncSpaceName(name)) !== parsed.spaceId
  ) return null;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    requireOwner(auth.session);
    const invite = await setLegacyInvite(auth.space, auth.sessionId);
    await writeSpace(auth.space);
    return invite;
  });
}

export async function pullSpace(
  token: string,
  targetVersion: DadKitSyncDataVersion = 9,
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
  targetVersion: DadKitSyncDataVersion = 9,
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
    const needsCanonicalUpgrade = space.data !== null && space.data.version !== 9;
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
      const issued = issueSession(space, now, cleanDeviceName, "owner", 2, randomBytes);
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
  return withSpaceLock(parsed.spaceId, async () => {
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
    const id = nodeRandomBytes(16).toString("hex");
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttl * 60_000).toISOString();
    auth.space.invites[id] = {
      id,
      codeSalt: salt,
      codeHash: await hashCode(secret, salt),
      createdAt: now,
      expiresAt,
      createdBySessionId: auth.sessionId,
      role: "member",
      usedAt: null,
      revokedAt: null,
    };
    touchMetadata(auth.space, now);
    await writeSpace(auth.space);
    return { id, token: createInviteToken(auth.space.spaceId, secret), expiresAt };
  });
}

export async function joinWithInvite(
  inviteToken: string,
  deviceName: string,
): Promise<SyncRandomCreateResult | undefined> {
  const parsed = parseInviteToken(inviteToken);
  const cleanDeviceName = sanitizeDeviceName(deviceName);
  if (!parsed || cleanDeviceName.length < 1 || cleanDeviceName.length > 60) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const space = await readSpace(parsed.spaceId);
    if (!space) return undefined;
    pruneExpiredSessions(space, Date.now());
    const config = getSyncSpaceConfig();
    let matched: SyncSpaceInviteV2 | undefined;
    const secret = normalizeInviteSecret(parsed.secret)!;
    for (const invite of Object.values(space.invites)) {
      if (!isInviteActive(invite, Date.now())) continue;
      const candidate = await hashCode(secret, invite.codeSalt);
      if (safeHashMatch(candidate, invite.codeHash)) {
        matched = invite;
        break;
      }
    }
    if (!matched) return undefined;
    if (Object.keys(space.sessions).length >= config.maxDevices) {
      throw new SyncStoreError("同步设备数量已达到上限。", SYNC_ERROR_CODES.deviceLimitReached, 409);
    }
    const now = new Date().toISOString();
    matched.usedAt = now;
    const issued = issueSession(space, now, cleanDeviceName, "member", 2);
    touchMetadata(space, now);
    await writeSpace(space);
    return { token: issued.token, space: metadataOf(space, issued.sessionId) };
  });
}

export async function getSpaceMetadata(token: string) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    return auth ? metadataOf(auth.space, auth.sessionId) : undefined;
  });
}

export async function upgradeSession(
  token: string,
  displayName: string,
  deviceName: string,
) {
  const parsed = parseSessionToken(token);
  if (!parsed) return undefined;
  const cleanDisplayName = sanitizeSyncDisplayName(displayName);
  const cleanDeviceName = sanitizeDeviceName(deviceName);
  if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40 || cleanDeviceName.length < 1 || cleanDeviceName.length > 60) {
    throw new SyncStoreError("家庭或设备名称不正确。", SYNC_ERROR_CODES.storageUnavailable, 400);
  }
  return withSpaceLock(parsed.spaceId, async () => {
    const auth = await authenticateLocked(parsed.spaceId, parsed.secret);
    if (!auth) return undefined;
    let changed = false;
    if (
      auth.space.kind === "legacy-name" &&
      auth.session.role === "owner" &&
      auth.space.displayName !== cleanDisplayName
    ) {
      auth.space.displayName = cleanDisplayName;
      changed = true;
    }
    if (auth.session.deviceName !== cleanDeviceName || auth.session.protocolVersion !== 2) {
      auth.session.deviceName = cleanDeviceName;
      auth.session.protocolVersion = 2;
      changed = true;
    }
    if (changed) {
      touchMetadata(auth.space);
      await writeSpace(auth.space);
    }
    return metadataOf(auth.space, auth.sessionId);
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
