const MIB = 1024 * 1024;

export type SyncRegistrationMode = "open" | "closed";

export type SyncSpaceConfig = {
  registrationMode: SyncRegistrationMode;
  maxSpaceBytes: number;
  maxDevices: number;
  maxActiveInvites: number;
  defaultInviteTtlMinutes: number;
  maxInviteTtlMinutes: number;
  trustProxyHops: number;
  requireHttps: boolean;
  sessionTtlMs: number;
};

function integerEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} 必须是 ${minimum} 到 ${maximum} 之间的整数。`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} 必须是 ${minimum} 到 ${maximum} 之间的整数。`);
  }
  return value;
}

function booleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} 必须是 true 或 false。`);
}

export function getSyncSpaceConfig(): SyncSpaceConfig {
  const registrationMode =
    process.env.DADKIT_SYNC_REGISTRATION_MODE?.trim().toLowerCase() || "open";
  if (registrationMode !== "open" && registrationMode !== "closed") {
    throw new Error("DADKIT_SYNC_REGISTRATION_MODE 必须是 open 或 closed。");
  }

  const maxInviteTtlMinutes = integerEnv(
    "DADKIT_SYNC_MAX_INVITE_TTL_MINUTES",
    1440,
    10,
    10_080,
  );
  const defaultInviteTtlMinutes = integerEnv(
    "DADKIT_SYNC_DEFAULT_INVITE_TTL_MINUTES",
    30,
    10,
    maxInviteTtlMinutes,
  );

  return {
    registrationMode,
    maxSpaceBytes: integerEnv(
      "DADKIT_SYNC_MAX_SPACE_BYTES",
      24 * MIB,
      64 * 1024,
      1024 * MIB,
    ),
    maxDevices: integerEnv("DADKIT_SYNC_MAX_DEVICES", 12, 1, 100),
    maxActiveInvites: integerEnv(
      "DADKIT_SYNC_MAX_ACTIVE_INVITES",
      5,
      1,
      50,
    ),
    defaultInviteTtlMinutes,
    maxInviteTtlMinutes,
    trustProxyHops: integerEnv("DADKIT_TRUST_PROXY_HOPS", 0, 0, 10),
    requireHttps: booleanEnv("DADKIT_SYNC_REQUIRE_HTTPS", true),
    sessionTtlMs: 180 * 24 * 60 * 60 * 1000,
  };
}

export const SYNC_INVITE_TTL_OPTIONS_MINUTES = [10, 60, 1440] as const;
