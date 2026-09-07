import type { NextConfig } from "next";

const vpsSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 根布局的内联主题脚本与 Next 水合数据需要 'unsafe-inline'。
      // 开发模式下 Next 的模块加载与 React Refresh 依赖 eval，仅开发环境放行。
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self'",
      "manifest-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

// 静态导出构建（npm run build:static）：产物给静态托管与 App 壳使用。
// 服务端路由（app/api/**、app/healthz、middleware.ts）由 scripts/build-static.mjs
// 在构建期临时移出（App Router 不支持用 pageExtensions 排除，见 vercel/next.js#51478），
// 同步 API 指向 NEXT_PUBLIC_DADKIT_API_BASE 配置的云端。
const isStaticBuild = process.env.BUILD_TARGET === "static";

const nextConfig: NextConfig = isStaticBuild
  ? {
      reactStrictMode: true,
      output: "export",
      images: {
        unoptimized: true,
      },
      // 独立于 .next：Next 构建会清理 .next 下的旧产物，避免与服务器构建互相踩踏。
      distDir: ".dadkit-static-build",
    }
  : {
      reactStrictMode: true,
      output: "standalone",
      images: {
        unoptimized: true,
      },
      async headers() {
        return [
          {
            source: "/:path*",
            headers: vpsSecurityHeaders,
          },
        ];
      },
    };

export default nextConfig;
