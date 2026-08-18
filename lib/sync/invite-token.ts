import { randomBytes as nodeRandomBytes } from "node:crypto";

const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const INVITE_SECRET_LENGTH = 20;
const INVITE_CODE_LENGTH = 8;
const SPACE_ID_PATTERN = /^[0-9a-f]{64}$/;

export type ParsedSyncInviteToken = {
  spaceId: string;
  secret: string;
};

function generateInviteValue(
  length: number,
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  let value = "";
  const unbiasedLimit =
    Math.floor(256 / INVITE_ALPHABET.length) * INVITE_ALPHABET.length;

  while (value.length < length) {
    for (const byte of randomBytes(32)) {
      if (byte >= unbiasedLimit) continue;
      value += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
      if (value.length === length) break;
    }
  }

  return value;
}

export function generateInviteSecret(
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  return generateInviteValue(INVITE_SECRET_LENGTH, randomBytes);
}

export function generateInviteCode(
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  return formatInviteCode(generateInviteValue(INVITE_CODE_LENGTH, randomBytes));
}

export function formatInviteSecret(secret: string) {
  return secret.match(/.{1,5}/g)?.join("-") ?? secret;
}

export function normalizeInviteSecret(value: string) {
  const normalized = value.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_SECRET_LENGTH}}$`).test(
    normalized,
  )
    ? normalized
    : undefined;
}

export function formatInviteCode(code: string) {
  const normalized = code.toUpperCase().replace(/[\s-]/g, "");
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}

export function normalizeInviteCode(value: string) {
  const normalized = value.toUpperCase().replace(/[\s-]/g, "");
  return new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`).test(
    normalized,
  )
    ? normalized
    : undefined;
}

export function createInviteToken(spaceId: string, secret: string) {
  if (!SPACE_ID_PATTERN.test(spaceId) || !normalizeInviteSecret(secret)) {
    throw new Error("邀请凭据格式不正确。");
  }
  return `DK2.${spaceId}.${normalizeInviteSecret(secret)}`;
}

export function parseInviteToken(value: string): ParsedSyncInviteToken | undefined {
  const trimmed = value.trim();
  let candidate = trimmed;

  try {
    if (/^https?:\/\//i.test(candidate)) {
      const url = new URL(candidate);
      candidate = new URLSearchParams(url.hash.slice(1)).get("invite") ?? "";
    }
  } catch {
    return undefined;
  }

  const [prefix, spaceId, rawSecret, extra] = candidate.split(".");
  const secret = rawSecret ? normalizeInviteSecret(rawSecret) : undefined;
  if (
    prefix !== "DK2" ||
    extra !== undefined ||
    !SPACE_ID_PATTERN.test(spaceId ?? "") ||
    !secret
  ) {
    return undefined;
  }

  return { spaceId: spaceId!, secret };
}

export function createInviteLink(origin: string, token: string) {
  const url = new URL("/join", origin);
  url.hash = `invite=${encodeURIComponent(token)}`;
  return url.toString();
}
