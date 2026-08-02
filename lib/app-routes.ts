export const DEPARTURE_PATH = "/departure";
export const HOSPITAL_PATH = "/hospital";
export const PLANNING_PATH = "/planning";
export const PUBLIC_PRIVACY_PATH = "/privacy";
export const PUBLIC_SUPPORT_PATH = "/support";

const reviewPagePaths = new Set([PUBLIC_PRIVACY_PATH, PUBLIC_SUPPORT_PATH]);

export function getReviewPageHref(path: string) {
  if (!reviewPagePaths.has(path)) {
    throw new Error(`Unsupported app review page path: ${path}`);
  }

  return path;
}
