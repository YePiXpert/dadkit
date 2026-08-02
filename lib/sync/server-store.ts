import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
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
import { mergeExportData } from "@/lib/sync/merge";
import {
  legacySyncSpaceName,
  normalizeSyncSpaceName,
} from "@/lib/sync/space-name";

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THROTTLE_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 10 * 60 * 1000;
const SPACE_BACKUP_COUNT = 5;
const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;
const spaceLocks = new Map<string, Promise<void>>();

export class SyncStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncStoreError";
  }
}

type SpaceSession = {
  createdAt: string;
  lastSeenAt: string;
};

type SpaceInvite = {
  codeSalt: string;
  codeHash: string;
  expiresAt: string;
};

type SpaceFile = {
  codeSalt: string;
  codeHash: string;
  legacyJoinEnabled?: boolean;
  invite?: SpaceInvite;
  version: number;
  updatedAt: string;
  data: DadKitImportData | null;
  sessions: Record<string, SpaceSession>;
};

export type SyncSpaceSnapshot = {
  version: number;
  updatedAt: string;
  serverTime: string;
  data: DadKitImportData | null;
};

export type SyncJoinResult = SyncSpaceSnapshot & {
  token: string;
};

export type SyncInvite = {
  code: string;
  expiresAt: string;
};

export type SyncCreateResult = SyncJoinResult & {
  invite: SyncInvite;
};

function dataDir() {
  const configured = process.env.DADKIT_DATA_DIR?.trim();
  return configured || path.join(process.cwd(), "data");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function hashCode(code: string, salt: string) {
  return (await scrypt(code, salt, 32)).toString("hex");
}

function spacePath(spaceKey: string) {
  if (!/^[0-9a-f]{64}$/.test(spaceKey)) {
    throw new SyncStoreError("同步空间标识不正确。");
  }

  return path.join(dataDir(), `space-${spaceKey}.json`);
}

function isSpaceSession(value: unknown): value is SpaceSession {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    isValidDateString(value.createdAt) &&
    isValidDateString(value.lastSeenAt)
  );
}

function isSpaceInvite(value: unknown): value is SpaceInvite {
  return (
    isRecord(value) &&
    Object.keys(value).length === 3 &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
    isValidDateString(value.expiresAt)
  );
}

function isSpaceFile(value: unknown): value is SpaceFile {
  const allowedKeys = new Set([
    "codeSalt",
    "codeHash",
    "legacyJoinEnabled",
    "invite",
    "version",
    "updatedAt",
    "data",
    "sessions",
  ]);

  return (
    isRecord(value) &&
    Object.keys(value).every((key) => allowedKeys.has(key)) &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
    (value.legacyJoinEnabled === undefined ||
      typeof value.legacyJoinEnabled === "boolean") &&
    (value.invite === undefined || isSpaceInvite(value.invite)) &&
    Number.isInteger(value.version) &&
    (value.version as number) >= 0 &&
    isValidDateString(value.updatedAt) &&
    (value.data === null || isDadKitImportData(value.data)) &&
    isRecord(value.sessions) &&
    Object.entries(value.sessions).every(
      ([key, session]) => /^[0-9a-f]{64}$/.test(key) && isSpaceSession(session),
    )
  );
}

async function readSpace(spaceKey: string): Promise<SpaceFile | undefined> {
  const filePath = spacePath(spaceKey);

  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;

    if (!isSpaceFile(parsed)) {
      throw new SyncStoreError("同步空间数据结构无效。");
    }

    return parsed;
  } catch (error) {
    if (
      isRecord(error) &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }

    if (error instanceof SyncStoreError) {
      throw error;
    }

    throw new SyncStoreError("同步空间数据读取失败。");
  }
}

async function writeSpace(spaceKey: string, space: SpaceFile) {
  const directory = dataDir();
  const filePath = spacePath(spaceKey);
  const tempPath = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;

  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await rotateSpaceBackups(filePath);
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

async function withSpaceLock<T>(
  spaceKey: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = spaceLocks.get(spaceKey) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.catch(() => undefined).then(() => current);

  spaceLocks.set(spaceKey, queued);
  await previous.catch(() => undefined);

  try {
    return await operation();
  } finally {
    release();
    if (spaceLocks.get(spaceKey) === queued) {
      spaceLocks.delete(spaceKey);
    }
  }
}

function snapshotOf(
  space: SpaceFile,
  targetVersion: DadKitSyncDataVersion,
): SyncSpaceSnapshot {
  return {
    version: space.version,
    updatedAt: space.updatedAt,
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

async function rotateSpaceBackups(filePath: string) {
  for (let index = SPACE_BACKUP_COUNT; index >= 1; index -= 1) {
    const source = index === 1 ? filePath : `${filePath}.bak.${index - 1}`;
    const destination = `${filePath}.bak.${index}`;

    try {
      await writeFile(destination, await readFile(source), { mode: 0o600 });
      await chmod(destination, 0o600);
    } catch (error) {
      if (
        isRecord(error) &&
        typeof error.code === "string" &&
        error.code === "ENOENT"
      ) {
        continue;
      }

      throw error;
    }
  }
}

function issueSession(spaceKey: string, space: SpaceFile, now: string) {
  const secret = randomBytes(24).toString("hex");
  space.sessions[sha256(secret)] = { createdAt: now, lastSeenAt: now };
  return `${spaceKey}.${secret}`;
}

function generateInviteCode() {
  const bytes = randomBytes(8);
  const code = Array.from(
    bytes,
    (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length],
  ).join("");
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function normalizeInviteCode(code: string) {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${INVITE_ALPHABET}]{8}$`).test(normalized)
    ? normalized
    : undefined;
}

async function setInvite(space: SpaceFile): Promise<SyncInvite> {
  const code = generateInviteCode();
  const normalized = normalizeInviteCode(code)!;
  const codeSalt = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  space.invite = {
    codeSalt,
    codeHash: await hashCode(normalized, codeSalt),
    expiresAt,
  };

  return { code, expiresAt };
}

function pruneExpiredSessions(space: SpaceFile, now: number) {
  for (const [key, session] of Object.entries(space.sessions)) {
    if (now - Date.parse(session.lastSeenAt) > SESSION_TTL_MS) {
      delete space.sessions[key];
    }
  }
}

function parseToken(token: string) {
  const [spaceKey, secret, extra] = token.split(".");

  if (
    extra !== undefined ||
    !spaceKey ||
    !secret ||
    !/^[0-9a-f]{64}$/.test(spaceKey) ||
    !/^[0-9a-f]{48,96}$/.test(secret)
  ) {
    return undefined;
  }

  return { spaceKey, secret };
}

async function authenticateLocked(
  spaceKey: string,
  secret: string,
): Promise<
  { spaceKey: string; space: SpaceFile; sessionKey: string } | undefined
> {
  const space = await readSpace(spaceKey);

  if (!space) {
    return undefined;
  }

  const sessionKey = sha256(secret);
  const session = space.sessions[sessionKey];

  if (!session) {
    return undefined;
  }

  const now = Date.now();

  pruneExpiredSessions(space, now);

  if (!space.sessions[sessionKey]) {
    await writeSpace(spaceKey, space);
    return undefined;
  }

  if (now - Date.parse(session.lastSeenAt) > SESSION_RENEW_THROTTLE_MS) {
    session.lastSeenAt = new Date(now).toISOString();
    await writeSpace(spaceKey, space);
  }

  return { spaceKey, space, sessionKey };
}

export async function joinSpace(
  name: string,
  code: string,
  existingOnly = false,
  targetVersion: DadKitSyncDataVersion = 6,
): Promise<SyncJoinResult | undefined> {
  const normalizedName = normalizeSyncSpaceName(name);
  const legacyName = legacySyncSpaceName(name);
  const normalizedCode = code.trim();
  const normalizedSpaceKey = sha256(normalizedName);
  const legacySpaceKey = sha256(legacyName);

  return withSpaceLock(normalizedSpaceKey, async () => {
    const now = new Date().toISOString();
    let spaceKey = normalizedSpaceKey;
    let space = await readSpace(spaceKey);

    if (!space && legacySpaceKey !== normalizedSpaceKey) {
      space = await readSpace(legacySpaceKey);
      spaceKey = legacySpaceKey;
    }

    if (space) {
      let authenticated = false;
      const inviteCode = normalizeInviteCode(normalizedCode);

      if (
        inviteCode &&
        space.invite &&
        Date.parse(space.invite.expiresAt) > Date.now()
      ) {
        const candidate = await hashCode(inviteCode, space.invite.codeSalt);
        const expected = Buffer.from(space.invite.codeHash, "hex");
        const actual = Buffer.from(candidate, "hex");

        authenticated =
          expected.length === actual.length &&
          timingSafeEqual(expected, actual);

        if (authenticated) {
          delete space.invite;
          space.legacyJoinEnabled = false;
        }
      }

      if (!authenticated && space.legacyJoinEnabled !== false) {
        const candidate = await hashCode(normalizedCode, space.codeSalt);
        const expected = Buffer.from(space.codeHash, "hex");
        const actual = Buffer.from(candidate, "hex");

        authenticated =
          expected.length === actual.length &&
          timingSafeEqual(expected, actual);
      }

      if (!authenticated) {
        return undefined;
      }

      pruneExpiredSessions(space, Date.now());
    } else {
      if (existingOnly) {
        return undefined;
      }

      const codeSalt = randomBytes(16).toString("hex");

      space = {
        codeSalt,
        codeHash: await hashCode(normalizedCode, codeSalt),
        legacyJoinEnabled: true,
        version: 0,
        updatedAt: now,
        data: null,
        sessions: {},
      };
    }

    const token = issueSession(spaceKey, space, now);
    await writeSpace(spaceKey, space);

    return { token, ...snapshotOf(space, targetVersion) };
  });
}

export async function createSpace(
  name: string,
  targetVersion: DadKitSyncDataVersion = 7,
): Promise<SyncCreateResult | undefined> {
  const normalizedName = normalizeSyncSpaceName(name);
  const legacyName = legacySyncSpaceName(name);
  const spaceKey = sha256(normalizedName);
  const legacySpaceKey = sha256(legacyName);

  return withSpaceLock(spaceKey, async () => {
    if (
      (await readSpace(spaceKey)) ||
      (legacySpaceKey !== spaceKey && (await readSpace(legacySpaceKey)))
    ) {
      return undefined;
    }

    const now = new Date().toISOString();
    const codeSalt = randomBytes(16).toString("hex");
    const retiredLegacyCode = randomBytes(32).toString("hex");
    const space: SpaceFile = {
      codeSalt,
      codeHash: await hashCode(retiredLegacyCode, codeSalt),
      legacyJoinEnabled: false,
      version: 0,
      updatedAt: now,
      data: null,
      sessions: {},
    };
    const invite = await setInvite(space);
    const token = issueSession(spaceKey, space, now);

    await writeSpace(spaceKey, space);
    return { token, invite, ...snapshotOf(space, targetVersion) };
  });
}

export async function createInvite(
  token: string,
  name: string,
): Promise<SyncInvite | null | undefined> {
  const parsed = parseToken(token);

  if (!parsed) {
    return undefined;
  }
  if (
    sha256(normalizeSyncSpaceName(name)) !== parsed.spaceKey &&
    sha256(legacySyncSpaceName(name)) !== parsed.spaceKey
  ) {
    return null;
  }

  return withSpaceLock(parsed.spaceKey, async () => {
    const auth = await authenticateLocked(parsed.spaceKey, parsed.secret);

    if (!auth) {
      return undefined;
    }

    const invite = await setInvite(auth.space);
    await writeSpace(auth.spaceKey, auth.space);
    return invite;
  });
}

export async function pullSpace(
  token: string,
  targetVersion: DadKitSyncDataVersion = 7,
): Promise<SyncSpaceSnapshot | undefined> {
  const parsed = parseToken(token);

  if (!parsed) {
    return undefined;
  }

  return withSpaceLock(parsed.spaceKey, async () => {
    const auth = await authenticateLocked(parsed.spaceKey, parsed.secret);
    return auth ? snapshotOf(auth.space, targetVersion) : undefined;
  });
}

export async function pushSpace(
  token: string,
  incoming: DadKitImportData,
  targetVersion: DadKitSyncDataVersion = 7,
): Promise<SyncSpaceSnapshot | undefined> {
  const parsed = parseToken(token);

  if (!parsed) {
    return undefined;
  }

  return withSpaceLock(parsed.spaceKey, async () => {
    const auth = await authenticateLocked(parsed.spaceKey, parsed.secret);

    if (!auth) {
      return undefined;
    }

    const { spaceKey, space } = auth;
    const stored = space.data;
    const incomingLatest = upgradeExportDataToLatest(incoming);
    const merged =
      stored === null
        ? incomingLatest
        : mergeExportData(upgradeExportDataToLatest(stored), incomingLatest);

    space.data = merged;
    space.version += 1;
    space.updatedAt = new Date().toISOString();
    await writeSpace(spaceKey, space);

    return snapshotOf(space, targetVersion);
  });
}

export async function leaveSpace(token: string): Promise<boolean> {
  const parsed = parseToken(token);

  if (!parsed) {
    return false;
  }

  return withSpaceLock(parsed.spaceKey, async () => {
    const auth = await authenticateLocked(parsed.spaceKey, parsed.secret);

    if (!auth) {
      return false;
    }

    delete auth.space.sessions[auth.sessionKey];
    await writeSpace(auth.spaceKey, auth.space);

    return true;
  });
}
