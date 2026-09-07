package com.dadkit.mobile;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;


@SuppressWarnings("deprecation")
public class LauncherActivity extends Activity {
    // 页面资源全部打包在 assets/www/，经 WebViewAssetLoader 以 https 伪域加载；
    // 只有家庭同步数据请求云端 API（dadkit.505f.com/api/sync）。
    private static final String LOCAL_HOST = "appassets.androidplatform.net";
    private static final String LOCAL_ORIGIN = "https://" + LOCAL_HOST;
    private static final String API_HOST = "dadkit.505f.com";
    private static final int APP_VERSION_CODE = 28;
    private static final String START_URL =
            LOCAL_ORIGIN + "/?source=apk&appVersionCode=" + APP_VERSION_CODE;
    // 旧版 APK 的本地数据存在 https://dadkit.505f.com 这个 WebView origin 下；
    // 升级后首启静默加载一次旧站点导出数据，再进入本地资源版本。
    private static final String LEGACY_MIGRATION_URL =
            "https://" + API_HOST + "/?source=apk-migration&appVersionCode=" + APP_VERSION_CODE;
    private static final long LEGACY_MIGRATION_TIMEOUT_MS = 20_000L;
    private static final int LEGACY_MIGRATION_MAX_ATTEMPTS = 3;
    private static final String ASSETS_WWW_ROOT = "www/";
    private static final String ERROR_PAGE =
            "<!doctype html><html lang=\"zh-CN\"><head>"
                    + "<meta charset=\"utf-8\">"
                    + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                    + "<meta name=\"color-scheme\" content=\"light dark\">"
                    + "<style>html{font-family:sans-serif;color-scheme:light dark}"
                    + "body{min-height:100vh;margin:0;display:grid;place-items:center;"
                    + "background:#fbf8f2;color:#2a2521}main{max-width:24rem;padding:2rem;"
                    + "text-align:center}h1{font-size:1.25rem}p{line-height:1.7;color:#746b64}"
                    + "a{display:inline-block;margin-top:1rem;padding:.8rem 1.5rem;border-radius:999px;"
                    + "background:#b95549;color:white;text-decoration:none;font-weight:700}"
                    + "@media(prefers-color-scheme:dark){body{background:#1a1714;color:#f5eee7}"
                    + "p{color:#bdb2a8}}</style></head><body><main>"
                    + "<h1>应用资源加载异常</h1>"
                    + "<p>内置页面不完整，请重新安装最新安装包。</p>"
                    + "<a href=\"" + START_URL + "\">重试</a>"
                    + "</main></body></html>";
    private static final int FILE_CHOOSER_REQUEST = 201;
    private static final String NATIVE_DATA_PREFERENCES = "dadkit_native_data";
    private static final String NATIVE_DOCUMENT_KEY = "family_document";
    private static final String NATIVE_RECORDED_BY_KEY = "recorded_by_member_id";
    private static final String NATIVE_MIGRATION_COMPLETE_KEY = "web_migration_complete";
    private static final String WEB_ORIGIN_MIGRATION_KEY = "web_origin_migration_state";
    private static final String WEB_ORIGIN_MIGRATION_DONE = "done";
    private static final String WEB_ORIGIN_MIGRATION_ATTEMPTS_KEY = "web_origin_migration_attempts";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private WebViewAssetLoader assetLoader;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable legacyMigrationTimeout;
    private boolean legacyMigrationRunning;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        applySystemBarTheme(false);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(251, 248, 242));
        setContentView(webView);
        configureWebView();

        if (savedInstanceState == null) {
            if (shouldRunLegacyMigration()) {
                startLegacyMigration();
            } else {
                webView.loadUrl(START_URL);
            }
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(false);
        settings.setUserAgentString(
                settings.getUserAgentString() + " DadKitAndroid/" + APP_VERSION_CODE
        );

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new LocalAssetsHandler(this))
                .build();

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(
                (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0
        );

        webView.addJavascriptInterface(
                new NativeDataMigrationBridge(),
                "DadKitAndroidMigration"
        );
        webView.addJavascriptInterface(new AndroidShellBridge(), "DadKitAndroidShell");
        webView.addJavascriptInterface(new LegacyExportBridge(), "DadKitAndroidLegacyExport");
        webView.setWebViewClient(new DadKitWebViewClient());
        webView.setWebChromeClient(new DadKitWebChromeClient());
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) ->
                openExternal(Uri.parse(url))
        );
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (legacyMigrationTimeout != null) {
            mainHandler.removeCallbacks(legacyMigrationTimeout);
            legacyMigrationTimeout = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("DadKitAndroidMigration");
            webView.removeJavascriptInterface("DadKitAndroidShell");
            webView.removeJavascriptInterface("DadKitAndroidLegacyExport");
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            );
            fileChooserCallback = null;
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
    }

    private SharedPreferences preferences() {
        return getSharedPreferences(NATIVE_DATA_PREFERENCES, MODE_PRIVATE);
    }

    private boolean shouldRunLegacyMigration() {
        SharedPreferences preferences = preferences();
        if (WEB_ORIGIN_MIGRATION_DONE.equals(
                preferences.getString(WEB_ORIGIN_MIGRATION_KEY, "")
        )) {
            return false;
        }
        return preferences.getInt(WEB_ORIGIN_MIGRATION_ATTEMPTS_KEY, 0)
                < LEGACY_MIGRATION_MAX_ATTEMPTS;
    }

    private void startLegacyMigration() {
        SharedPreferences preferences = preferences();
        int attempts = preferences.getInt(WEB_ORIGIN_MIGRATION_ATTEMPTS_KEY, 0);
        preferences
                .edit()
                .putInt(WEB_ORIGIN_MIGRATION_ATTEMPTS_KEY, attempts + 1)
                .apply();
        legacyMigrationRunning = true;
        legacyMigrationTimeout = () -> finishLegacyMigration(null);
        mainHandler.postDelayed(legacyMigrationTimeout, LEGACY_MIGRATION_TIMEOUT_MS);
        webView.loadUrl(LEGACY_MIGRATION_URL);
    }

    private void requestLegacyExport(WebView view) {
        // 旧站点页面注册的 window.__dadkitLegacyExport 返回可移植数据 JSON；
        // evaluateJavascript 不能等待 Promise，通过 JS 桥回调接收结果。
        view.evaluateJavascript(
                "(function(){var b=window.DadKitAndroidLegacyExport;if(!b){return;}"
                        + "var p=window.__dadkitLegacyExport?window.__dadkitLegacyExport()"
                        + ":Promise.resolve(null);"
                        + "Promise.resolve(p).then(function(j){b.receive(j||'')})"
                        + ".catch(function(){b.receive('')})})()",
                null
        );
    }

    private void finishLegacyMigration(String export) {
        if (!legacyMigrationRunning) {
            return;
        }
        legacyMigrationRunning = false;
        if (legacyMigrationTimeout != null) {
            mainHandler.removeCallbacks(legacyMigrationTimeout);
            legacyMigrationTimeout = null;
        }

        String trimmed = export == null ? "" : export.trim();
        boolean hasExport = trimmed.length() > 2 && !"null".equals(trimmed);
        SharedPreferences.Editor editor = preferences().edit();
        if (hasExport) {
            // 写入旧迁移通道并复位其完成标记，本地页面启动时由
            // AndroidNativeMigration 导入；已开启同步的设备合并是无害幂等的。
            editor
                    .putString(NATIVE_DOCUMENT_KEY, trimmed)
                    .putBoolean(NATIVE_MIGRATION_COMPLETE_KEY, false);
        }
        if (export != null
                || preferences().getInt(WEB_ORIGIN_MIGRATION_ATTEMPTS_KEY, 0)
                        >= LEGACY_MIGRATION_MAX_ATTEMPTS) {
            // 拿到结果（含无可迁移数据）或多次失败后放弃重试。
            editor.putString(WEB_ORIGIN_MIGRATION_KEY, WEB_ORIGIN_MIGRATION_DONE);
        }
        editor.apply();
        webView.loadUrl(START_URL);
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, R.string.no_external_app, Toast.LENGTH_SHORT).show();
        }
    }

    private void applySystemBarTheme(boolean dark) {
        int background = dark ? Color.rgb(26, 23, 20) : Color.rgb(251, 248, 242);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);
        int flags = getWindow().getDecorView().getSystemUiVisibility();
        flags = dark
                ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                : flags | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags = dark
                    ? flags & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
                    : flags | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    // 以 dadkit-local 类似的解析顺序提供 assets/www/ 下的静态资源：
    // 精确文件 → 目录 index.html → 追加 .html（Next 静态导出的路由形态是 xxx.html，
    // xxx/ 目录里只有嵌套子路由）。MimeTypeMap 对 woff2/webmanifest 覆盖不全，手工映射。
    private static final class LocalAssetsHandler implements WebViewAssetLoader.PathHandler {
        private final AssetManager assetManager;

        LocalAssetsHandler(Activity activity) {
            assetManager = activity.getAssets();
        }

        @Override
        public WebResourceResponse handle(String path) {
            if (path == null || path.isEmpty() || "/".equals(path)) {
                path = "/index.html";
            }
            String assetPath = resolve(path);
            if (assetPath == null) {
                return null;
            }
            try {
                InputStream stream = assetManager.open(assetPath);
                return new WebResourceResponse(mimeOf(assetPath), null, stream);
            } catch (IOException error) {
                return null;
            }
        }

        private String resolve(String path) {
            String relative = path.startsWith("/") ? path.substring(1) : path;
            for (String segment : relative.split("/")) {
                if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                    return null;
                }
            }
            String[] candidates = {
                    ASSETS_WWW_ROOT + relative,
                    ASSETS_WWW_ROOT + relative + "/index.html",
                    ASSETS_WWW_ROOT + relative + ".html",
            };
            for (String candidate : candidates) {
                if (exists(candidate)) {
                    return candidate;
                }
            }
            return null;
        }

        private boolean exists(String assetPath) {
            try (InputStream stream = assetManager.open(assetPath)) {
                return true;
            } catch (IOException error) {
                return false;
            }
        }

        private static String mimeOf(String assetPath) {
            int dot = assetPath.lastIndexOf('.');
            String ext = dot < 0
                    ? ""
                    : assetPath.substring(dot + 1).toLowerCase(Locale.US);
            switch (ext) {
                case "html":
                case "htm":
                    return "text/html";
                case "js":
                case "mjs":
                    return "text/javascript";
                case "css":
                    return "text/css";
                case "json":
                case "map":
                    return "application/json";
                case "txt":
                    return "text/plain";
                case "png":
                    return "image/png";
                case "jpg":
                case "jpeg":
                    return "image/jpeg";
                case "svg":
                    return "image/svg+xml";
                case "webp":
                    return "image/webp";
                case "ico":
                    return "image/x-icon";
                case "woff2":
                    return "font/woff2";
                case "woff":
                    return "font/woff";
                case "ttf":
                    return "font/ttf";
                case "otf":
                    return "font/otf";
                case "webmanifest":
                    return "application/manifest+json";
                default:
                    return "application/octet-stream";
            }
        }
    }

    private final class AndroidShellBridge {
        @JavascriptInterface
        public void setDarkTheme(boolean dark) {
            runOnUiThread(() -> applySystemBarTheme(dark));
        }
    }

    private final class LegacyExportBridge {
        @JavascriptInterface
        public void receive(final String export) {
            runOnUiThread(() -> finishLegacyMigration(export));
        }
    }

    private final class NativeDataMigrationBridge {
        private SharedPreferences preferences() {
            return getSharedPreferences(NATIVE_DATA_PREFERENCES, MODE_PRIVATE);
        }

        @JavascriptInterface
        public String getNativeData() {
            SharedPreferences preferences = preferences();
            if (preferences.getBoolean(NATIVE_MIGRATION_COMPLETE_KEY, false)) {
                return "";
            }
            return preferences.getString(NATIVE_DOCUMENT_KEY, "");
        }

        @JavascriptInterface
        public String getRecordedByMemberId() {
            return preferences().getString(NATIVE_RECORDED_BY_KEY, "");
        }

        @JavascriptInterface
        public void markMigrationComplete() {
            preferences().edit().putBoolean(NATIVE_MIGRATION_COMPLETE_KEY, true).apply();
        }
    }

    private final class DadKitWebChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> callback,
                FileChooserParams params
        ) {
            if (fileChooserCallback != null) {
                fileChooserCallback.onReceiveValue(null);
            }

            fileChooserCallback = callback;

            try {
                Intent chooser = Intent.createChooser(
                        params.createIntent(),
                        getString(R.string.choose_photo)
                );
                startActivityForResult(chooser, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException error) {
                fileChooserCallback = null;
                Toast.makeText(
                        LauncherActivity.this,
                        R.string.no_photo_app,
                        Toast.LENGTH_SHORT
                ).show();
                return false;
            }
        }
    }

    private final class DadKitWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(
                WebView view,
                WebResourceRequest request
        ) {
            return assetLoader.shouldInterceptRequest(request.getUrl());
        }

        @Override
        public boolean shouldOverrideUrlLoading(
                WebView view,
                WebResourceRequest request
        ) {
            Uri uri = request.getUrl();

            if ("https".equals(uri.getScheme()) && LOCAL_HOST.equals(uri.getHost())) {
                return false;
            }

            openExternal(uri);
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (legacyMigrationRunning
                    && url != null
                    && url.startsWith("https://" + API_HOST)) {
                requestLegacyExport(view);
            }
        }

        @Override
        public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
        ) {
            if (request.isForMainFrame()) {
                if (legacyMigrationRunning) {
                    // 旧站点不可达（如离线首启）：直接进入本地应用，下次启动重试。
                    finishLegacyMigration(null);
                    return;
                }
                showErrorPage(view);
                return;
            }
            super.onReceivedError(view, request, error);
        }

        @Override
        public void onReceivedHttpError(
                WebView view,
                WebResourceRequest request,
                WebResourceResponse errorResponse
        ) {
            if (request.isForMainFrame()) {
                if (legacyMigrationRunning) {
                    finishLegacyMigration(null);
                    return;
                }
                showErrorPage(view);
                return;
            }
            super.onReceivedHttpError(view, request, errorResponse);
        }
    }

    private void showErrorPage(WebView view) {
        view.loadDataWithBaseURL(
                START_URL,
                ERROR_PAGE,
                "text/html",
                "UTF-8",
                START_URL
        );
    }
}
