import type { NextConfig } from "next";

const isCapacitorExport = process.env.DADKIT_CAPACITOR_EXPORT === "1";

const vpsSecurityHeaders = [
  { key: "Content-Security-Policy", value: "base-uri 'self'; frame-ancestors 'none'; object-src 'none'" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isCapacitorExport ? "export" : "standalone",
  images: isCapacitorExport ? { unoptimized: true } : undefined,
  trailingSlash: isCapacitorExport ? true : undefined,
  ...(isCapacitorExport
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/:path*",
              headers: vpsSecurityHeaders,
            },
          ];
        },
      }),
};

export default nextConfig;
