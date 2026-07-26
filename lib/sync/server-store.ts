import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { mergeExportData } from "@/lib/sync/merge";
import type { DadKitExportData, DadKitImportData } from "@/lib/storage";

// 家庭同步的服务端存储:每个同步码一个 JSON 文件。
// 全部使用同步文件 I/O——Node 单线程事件循环内不会交错,天然逐请求串行;
// 写入采用临时文件 + rename 保证原子性。规模就是家庭级几台设备,
// 需要换成真数据库时只需替换这一个模块。

const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const SESSION_RENEW_THROTTLE_MS = 60 * 60 * 1000;

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

function hashCode(code: string, salt: string) {
  return scryptSync(code, salt, 32).toString("hex");
}

function spacePath(spaceKey: string) {
  if (!/^[0-9a-f]{64}$/.test(spaceKey)) {
    throw new SyncStoreError("同步空间标识不正确。");
  }

  return path.join(dataDir(), `space-${spaceKey}.json`);
}

function readSpace(spaceKey: string): SpaceFile | undefined {
  const filePath = spacePath(spaceKey);

  if (!existsSync(filePath)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as SpaceFile;
  } catch {
    throw new SyncStoreError("同步空间数据读取失败。");
  }
}

function writeSpace(spaceKey: string, space: SpaceFile) {
  mkdirSync(dataDir(), { recursive: true });
  const filePath = spacePath(spaceKey);
  const tempPath = `${filePath}.${randomBytes(4).toString("hex")}.tmp`;

  try {
    writeFileSync(tempPath, JSON.stringify(space), "utf8");
    renameSync(tempPath, filePath);
  } catch {
    throw new SyncStoreError("同步空间数据写入失败。");
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

function authenticate(
  token: string,
): { spaceKey: string; space: SpaceFile; sessionKey: string } | undefined {
  const [spaceKey, secret] = token.split(".");

  if (!spaceKey || !secret || !/^[0-9a-f]{48,96}$/.test(secret)) {
    return undefined;
  }

  const space = readSpace(spaceKey);

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
    writeSpace(spaceKey, space);
    return undefined;
  }

  // 滑动续期,最多每小时写一次盘。
  if (now - Date.parse(session.lastSeenAt) > SESSION_RENEW_THROTTLE_MS) {
    session.lastSeenAt = new Date(now).toISOString();
    writeSpace(spaceKey, space);
  }

  return { spaceKey, space, sessionKey };
}

export function joinSpace(
  name: string,
  code: string,
): SyncJoinResult | undefined {
  const normalizedName = name.trim();
  const normalizedCode = code.trim();
  const spaceKey = sha256(normalizedName);
  const now = new Date().toISOString();
  let space = readSpace(spaceKey);

  if (space) {
    const candidate = hashCode(normalizedCode, space.codeSalt);
    const expected = Buffer.from(space.codeHash, "hex");
    const actual = Buffer.from(candidate, "hex");

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return undefined;
    }

    pruneExpiredSessions(space, Date.now());
  } else {
    const codeSalt = randomBytes(16).toString("hex");

    space = {
      codeSalt,
      codeHash: hashCode(normalizedCode, codeSalt),
      version: 0,
      updatedAt: now,
      data: null,
      sessions: {},
    };
  }

  const secret = randomBytes(24).toString("hex");

  space.sessions[sha256(secret)] = { createdAt: now, lastSeenAt: now };
  writeSpace(spaceKey, space);

  return { token: `${spaceKey}.${secret}`, ...snapshotOf(space) };
}

export function pullSpace(token: string): SyncSpaceSnapshot | undefined {
  const auth = authenticate(token);
  return auth ? snapshotOf(auth.space) : undefined;
}

export function pushSpace(
  token: string,
  incoming: DadKitExportData,
): SyncSpaceSnapshot | undefined {
  const auth = authenticate(token);

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
  writeSpace(spaceKey, space);

  return snapshotOf(space);
}

export function leaveSpace(token: string): boolean {
  const auth = authenticate(token);

  if (!auth) {
    return false;
  }

  delete auth.space.sessions[auth.sessionKey];
  writeSpace(auth.spaceKey, auth.space);

  return true;
}
