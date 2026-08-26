"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const CareTimerBar = dynamic(
  () =>
    import("@/components/baby/CareTimerBar").then(
      (module) => module.CareTimerBar,
    ),
  { ssr: false },
);

// 服务端 layout 里不能直接用 ssr:false 的动态组件，这里包一层客户端挂载点。
export function CareTimerBarMount() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(() => setReady(true), {
        timeout: 1_500,
      });
      return () => window.cancelIdleCallback(handle);
    }

    const handle = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(handle);
  }, []);

  return ready ? <CareTimerBar /> : null;
}
