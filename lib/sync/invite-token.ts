import { randomBytes as nodeRandomBytes } from "node:crypto";

const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const INVITE_SECRET_LENGTH = 20;
const SPACE_ID_PATTERN = /^[0-9a-f]{64}$/;

export type ParsedSyncInviteToken = {
  spaceId: string;
  secret: string;
};

export function generateInviteSecret(
  randomBytes: (size: number) => Buffer = nodeRandomBytes,
) {
  let secret = "";
  const unbiasedLimit =
    Math.floor(256 / INVITE_ALPHABET.length) * INVITE_ALPHABET.length;

  while (secret.length < INVITE_SECRET_LENGTH) {
    for (const byte of randomBytes(32)) {
      if (byte >= unbiasedLimit) continue;
      secret += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
      if (secret.length === INVITE_SECRET_LENGTH) break;
    }
  }

  return secret;
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
