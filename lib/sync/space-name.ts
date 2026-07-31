/** Uses one stable identifier for visually equivalent family-space names. */
export function normalizeSyncSpaceName(name: string) {
  return name.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

export function legacySyncSpaceName(name: string) {
  return name.trim();
}
