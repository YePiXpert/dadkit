// App 壳内 WebView 的本地资源 origin：资源打包在应用内，同步 API 走跨域 Bearer。
// Android 用 WebViewAssetLoader 的 https 伪域，iOS 用 WKURLSchemeHandler 的自定义 scheme。
export const ANDROID_APP_ORIGIN = "https://appassets.androidplatform.net";
export const IOS_APP_ORIGIN = "dadkit-local://localhost";

export const APP_LOCAL_ORIGINS: readonly string[] = [
  ANDROID_APP_ORIGIN,
  IOS_APP_ORIGIN,
];
