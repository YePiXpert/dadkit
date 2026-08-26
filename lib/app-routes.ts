export const CHECKLIST_PATH = "/checklist";
export const DEPARTURE_PATH = "/departure";
export const GROWTH_PATH = "/growth";
export const BABY_PATH = "/baby";
export const BABY_TIMELINE_PATH = "/baby/timeline";
export const ONBOARDING_PATH = "/onboarding";
export const SYNC_SETTINGS_PATH = "/settings/sync";
export const JOIN_SYNC_PATH = "/join";
export const PUBLIC_PRIVACY_PATH = "/privacy";
export const PUBLIC_SUPPORT_PATH = "/support";

const reviewPagePaths = new Set([PUBLIC_PRIVACY_PATH, PUBLIC_SUPPORT_PATH]);

export function getReviewPageHref(path: string) {
  if (!reviewPagePaths.has(path)) {
    throw new Error(`Unsupported app review page path: ${path}`);
  }

  return path;
}
