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
  type DadKitExportData,
  type DadKitImportData,
} from "@/lib/data/format";
import { mergeExportData } from "@/lib/sync/merge";

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THROTTLE_MS = 60 * 60 * 1000;
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

type SpaceFile = {
  codeSalt: string;
  codeHash: string;
  version: number;
  updatedAt: string;
  data: DadKitImportData | null;
  sessions: Record<string, SpaceSession>;
};

export type SyncSpaceSnapshot = {
  version: number;
  updatedAt: string;
  data: DadKitImportData | null;
};

export type SyncJoinResult = SyncSpaceSnapshot & {
  token: string;
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

function isSpaceFile(value: unknown): value is SpaceFile {
  return (
    isRecord(value) &&
    Object.keys(value).length === 6 &&
    typeof value.codeSalt === "string" &&
    /^[0-9a-f]{32}$/.test(value.codeSalt) &&
    typeof value.codeHash === "string" &&
    /^[0-9a-f]{64}$/.test(value.codeHash) &&
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

function snapshotOf(space: SpaceFile): SyncSpaceSnapshot {
  return {
    version: space.version,
    updatedAt: space.updatedAt,
    data: space.data,
  };
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
): Promise<SyncJoinResult | undefined> {
  const normalizedName = name.trim();
  const normalizedCode = code.trim();
  const spaceKey = sha256(normalizedName);

  return withSpaceLock(spaceKey, async () => {
    const now = new Date().toISOString();
    let space = await readSpace(spaceKey);

    if (space) {
      const candidate = await hashCode(normalizedCode, space.codeSalt);
      const expected = Buffer.from(space.codeHash, "hex");
      const actual = Buffer.from(candidate, "hex");

      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      ) {
        return undefined;
      }

      pruneExpiredSessions(space, Date.now());
    } else {
      const codeSalt = randomBytes(16).toString("hex");

      space = {
        codeSalt,
        codeHash: await hashCode(normalizedCode, codeSalt),
        version: 0,
        updatedAt: now,
        data: null,
        sessions: {},
      };
    }

    const secret = randomBytes(24).toString("hex");

    space.sessions[sha256(secret)] = { createdAt: now, lastSeenAt: now };
    await writeSpace(spaceKey, space);

    return { token: `${spaceKey}.${secret}`, ...snapshotOf(space) };
  });
}

export async function pullSpace(
  token: string,
): Promise<SyncSpaceSnapshot | undefined> {
  const parsed = parseToken(token);

  if (!parsed) {
    return undefined;
  }

  return withSpaceLock(parsed.spaceKey, async () => {
    const auth = await authenticateLocked(parsed.spaceKey, parsed.secret);
    return auth ? snapshotOf(auth.space) : undefined;
  });
}

export async function pushSpace(
  token: string,
  incoming: DadKitExportData,
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
    const merged =
      stored === null || stored.version !== 5
        ? incoming
        : mergeExportData(stored, incoming);

    space.data = merged;
    space.version += 1;
    space.updatedAt = new Date().toISOString();
    await writeSpace(spaceKey, space);

    return snapshotOf(space);
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
