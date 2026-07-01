import type { NextConfig } from "next";

const isCapacitorExport = process.env.DADKIT_CAPACITOR_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isCapacitorExport ? "export" : "standalone",
  images: isCapacitorExport ? { unoptimized: true } : undefined,
  trailingSlash: isCapacitorExport ? true : undefined,
};

export default nextConfig;
