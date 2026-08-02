export const SYNC_ERROR_CODES = {
  registrationClosed: "SYNC_REGISTRATION_CLOSED",
  invalidInvite: "INVALID_INVITE",
  deviceLimitReached: "DEVICE_LIMIT_REACHED",
  activeInviteLimitReached: "ACTIVE_INVITE_LIMIT_REACHED",
  spaceQuotaExceeded: "SPACE_QUOTA_EXCEEDED",
  ownerRequired: "OWNER_REQUIRED",
  lastOwnerRequired: "LAST_OWNER_REQUIRED",
  sessionRevoked: "SESSION_REVOKED",
  originRejected: "ORIGIN_REJECTED",
  rateLimited: "RATE_LIMITED",
  storageUnavailable: "SYNC_STORAGE_UNAVAILABLE",
  secureTransportRequired: "SECURE_TRANSPORT_REQUIRED",
} as const;

export type SyncErrorCode =
  (typeof SYNC_ERROR_CODES)[keyof typeof SYNC_ERROR_CODES];
