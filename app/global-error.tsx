"use client";

import { useEffect } from "react";

// 根布局自身（含其挂载的全局组件）抛错时，app/error.tsx 无法接住，
// 由这里兜底。不依赖 globals.css 与任何组件，保证一定可以渲染。
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset(): void;
}) {
  useEffect(() => {
    console.error("[DadKit] 应用出现无法恢复的错误。", error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#FBF8F2",
          color: "#262019",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <main style={{ width: "100%", maxWidth: "28rem", padding: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              borderRadius: "1.75rem",
              background: "#FFFFFF",
              padding: "1.5rem",
              boxShadow: "0 10px 28px -12px rgb(64 45 31 / 0.18)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#BD243D",
              }}
            >
              页面暂时无法显示
            </p>
            <h1 style={{ margin: 0, fontSize: "1.5rem", lineHeight: 1.3 }}>
              本地数据没有被自动清除
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "#6B5F55",
              }}
            >
              可以先重试；若问题持续，请重新加载页面。本机保存的清单与记录仍在。
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={reset}
                type="button"
                style={{
                  minHeight: "2.75rem",
                  border: 0,
                  borderRadius: "9999px",
                  background: "#CC4E3E",
                  color: "#FFFFFF",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                重试
              </button>
              <button
                onClick={() => window.location.reload()}
                type="button"
                style={{
                  minHeight: "2.75rem",
                  border: "1px solid #E4DCCF",
                  borderRadius: "9999px",
                  background: "#FFFFFF",
                  color: "#262019",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                重新加载
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
