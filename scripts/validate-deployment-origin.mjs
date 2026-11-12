import { pathToFileURL } from "node:url";

export function validateOrigin(value) {
  if (!value) throw new Error("DADKIT_PUBLIC_ORIGIN is required for release builds");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.port || url.search || url.hash || !["", "/"].includes(url.pathname) ||
      url.hostname === "example.com" || url.hostname.endsWith(".example.com")) {
    throw new Error("Configure a real HTTPS origin without credentials, port, path, query or fragment");
  }
  return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateOrigin(process.env.DADKIT_PUBLIC_ORIGIN);
  console.log("Deployment origin configuration is valid.");
}
