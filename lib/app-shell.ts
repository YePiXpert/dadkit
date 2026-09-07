// App 壳内 WebView 的 UA 会追加 DadKitAndroid/<code> 或 DadKitiOS/<code>。
// 壳内资源已本地化：Service Worker、安装提示等 PWA 能力没有意义，直接跳过。
export function isAppShellBuild(): boolean {
  if (typeof window === "undefined") return false;
  return /DadKit(Android|iOS)\/\d+/.test(window.navigator.userAgent);
}
