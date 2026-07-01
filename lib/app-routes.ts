export const PUBLIC_PRIVACY_PATH = "/privacy";
export const PUBLIC_SUPPORT_PATH = "/support";

const reviewPagePaths = new Set([PUBLIC_PRIVACY_PATH, PUBLIC_SUPPORT_PATH]);

export function getReviewPageHref(path: string) {
  if (!reviewPagePaths.has(path)) {
    throw new Error(`Unsupported app review page path: ${path}`);
  }

  if (!isCapacitorStaticExport()) {
    return path;
  }

  return `${path}/index.html`;
}

function isCapacitorStaticExport() {
  return (
    process.env.NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT === "1" ||
    process.env.DADKIT_CAPACITOR_EXPORT === "1"
  );
}
