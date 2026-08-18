export function parsePastedInvite(value: string) {
  let candidate = value.trim();
  try {
    if (/^https?:\/\//i.test(candidate)) {
      const url = new URL(candidate);
      candidate = new URLSearchParams(url.hash.slice(1)).get("invite") ?? "";
    }
  } catch {
    return undefined;
  }
  if (/^DK2\.[0-9a-f]{64}\.[23456789ABCDEFGHJKLMNPQRSTUVWXYZ-]{20,24}$/.test(candidate)) {
    return candidate;
  }
  const normalizedCode = candidate.toUpperCase().replace(/[\s-]/g, "");
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(normalizedCode)
    ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
    : undefined;
}

export function takeInviteFromLocation(location: Location, history: History) {
  const invite = new URLSearchParams(location.hash.slice(1)).get("invite") ?? "";
  if (location.hash) {
    history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  }
  return parsePastedInvite(invite);
}
