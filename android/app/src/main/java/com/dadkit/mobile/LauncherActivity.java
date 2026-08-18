package com.dadkit.mobile;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@SuppressWarnings("deprecation")
public class LauncherActivity extends Activity {
    private static final String APP_HOST = "dadkit.505f.com";
    private static final String START_URL =
            "https://" + APP_HOST + "/?source=apk&appVersionCode=22";
    private static final int FILE_CHOOSER_REQUEST = 201;
    private static final String NATIVE_DATA_PREFERENCES = "dadkit_native_data";
    private static final String NATIVE_DOCUMENT_KEY = "family_document";
    private static final String NATIVE_RECORDED_BY_KEY = "recorded_by_member_id";
    private static final String NATIVE_MIGRATION_COMPLETE_KEY = "web_migration_complete";
    private static final String NATIVE_SYNC_PREFERENCES = "dadkit_native_sync";
    private static final String UPDATE_FILE_PROVIDER_AUTHORITY =
            "com.dadkit.mobile.fileprovider";
    private static final int UPDATE_MAX_REDIRECTS = 5;
    private static final long UPDATE_MAX_BYTES = 100L * 1024L * 1024L;

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private final AtomicBoolean updateDownloadInFlight = new AtomicBoolean(false);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        applySystemBarTheme(false);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(251, 248, 242));
        setContentView(webView);
        configureWebView();

        if (savedInstanceState == null) {
            webView.loadUrl(START_URL);
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
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(false);
        settings.setUserAgentString(
                settings.getUserAgentString() + " DadKitAndroid/22"
        );

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
        webView.addJavascriptInterface(new AndroidUpdateBridge(), "DadKitAndroidUpdate");
        webView.setWebViewClient(new BundledWebViewClient());
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
        if (webView != null) {
            webView.stopLoading();
            webView.removeJavascriptInterface("DadKitAndroidMigration");
            webView.removeJavascriptInterface("DadKitAndroidShell");
            webView.removeJavascriptInterface("DadKitAndroidUpdate");
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
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(
                    resultCode,
                    data
            );
            fileChooserCallback.onReceiveValue(result);
            fileChooserCallback = null;
            return;
        }

        super.onActivityResult(requestCode, resultCode, data);
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

    private final class AndroidShellBridge {
        @JavascriptInterface
        public void setDarkTheme(boolean dark) {
            runOnUiThread(() -> applySystemBarTheme(dark));
        }
    }

    private final class AndroidUpdateBridge {
        @JavascriptInterface
        public void startDownload(String url, String sha256) {
            if (url == null || url.isEmpty()
                    || !updateDownloadInFlight.compareAndSet(false, true)) {
                return;
            }
            String expectedSha256 = sha256 == null ? "" : sha256.trim();
            if (!expectedSha256.matches("(?i)^[0-9a-f]{64}$")
                    || !isAllowedUpdateUrl(url)) {
                updateDownloadInFlight.set(false);
                notifyUpdateProgress("error", 0, "更新信息无效，请稍后重试");
                return;
            }
            new Thread(() -> downloadUpdate(url, expectedSha256)).start();
        }
    }

    private void downloadUpdate(String url, String expectedSha256) {
        File updateDir = new File(getFilesDir(), "updates");
        File target = new File(updateDir, "dadkit-update.apk");
        try {
            if (!expectedSha256.isEmpty()
                    && target.isFile()
                    && expectedSha256.equalsIgnoreCase(sha256Hex(target))) {
                notifyUpdateProgress("ready", 100, null);
                installDownloadedApk(target);
                return;
            }

            notifyUpdateProgress("downloading", 0, null);
            downloadFollowingRedirects(url, target);

            if (!expectedSha256.isEmpty()) {
                notifyUpdateProgress("verifying", 100, null);
                if (!expectedSha256.equalsIgnoreCase(sha256Hex(target))) {
                    deleteQuietly(target);
                    notifyUpdateProgress("error", 0, "安装包校验失败，请重试");
                    return;
                }
            }

            notifyUpdateProgress("ready", 100, null);
            installDownloadedApk(target);
        } catch (Exception error) {
            deleteQuietly(target);
            String message = error.getMessage();
            notifyUpdateProgress("error", 0, message == null ? "下载失败" : message);
        } finally {
            updateDownloadInFlight.set(false);
        }
    }

    private boolean isAllowedUpdateUrl(String value) {
        try {
            URL parsed = new URL(value);
            return "https".equalsIgnoreCase(parsed.getProtocol())
                    && APP_HOST.equalsIgnoreCase(parsed.getHost())
                    && "/api/app-version/apk".equals(parsed.getPath());
        } catch (Exception error) {
            return false;
        }
    }

    private void downloadFollowingRedirects(String url, File target) throws IOException {
        String current = url;
        for (int redirect = 0; redirect <= UPDATE_MAX_REDIRECTS; redirect++) {
            if (!isAllowedUpdateUrl(current)) {
                throw new IOException("下载失败：更新地址无效");
            }
            HttpURLConnection connection = (HttpURLConnection) new URL(current).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestProperty(
                    "Accept",
                    "application/vnd.android.package-archive"
            );

            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = connection.getHeaderField("Location");
                connection.disconnect();
                if (location == null || redirect == UPDATE_MAX_REDIRECTS) {
                    throw new IOException("下载失败：重定向过多");
                }
                current = new URL(new URL(current), location).toString();
                continue;
            }
            if (status != HttpURLConnection.HTTP_OK) {
                connection.disconnect();
                throw new IOException("下载失败：服务器返回 " + status);
            }

            File parent = target.getParentFile();
            if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
                connection.disconnect();
                throw new IOException("下载失败：无法创建存储目录");
            }

            long total = connection.getContentLength();
            if (total > UPDATE_MAX_BYTES) {
                connection.disconnect();
                throw new IOException("下载失败：安装包过大");
            }
            try (InputStream input = connection.getInputStream();
                    OutputStream output = new FileOutputStream(target)) {
                byte[] buffer = new byte[64 * 1024];
                long downloaded = 0;
                int lastPercent = -1;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    output.write(buffer, 0, read);
                    downloaded += read;
                    if (downloaded > UPDATE_MAX_BYTES) {
                        throw new IOException("下载失败：安装包过大");
                    }
                    if (total > 0) {
                        int percent = (int) (downloaded * 100 / total);
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            notifyUpdateProgress("downloading", percent, null);
                        }
                    }
                }
                output.flush();
            } finally {
                connection.disconnect();
            }
            return;
        }
    }

    private String sha256Hex(File file) throws IOException {
        MessageDigest digest;
        try {
            digest = MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
        try (InputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        StringBuilder hex = new StringBuilder();
        for (byte value : digest.digest()) {
            hex.append(String.format(Locale.ROOT, "%02x", value));
        }
        return hex.toString();
    }

    private void installDownloadedApk(File apk) {
        runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) {
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !getPackageManager().canRequestPackageInstalls()) {
                notifyUpdateProgress("error", 0, "请在系统设置中允许 DadKit 安装应用后重试");
                try {
                    startActivity(new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + getPackageName())
                    ));
                } catch (ActivityNotFoundException ignored) {
                }
                return;
            }
            Uri uri = FileProvider.getUriForFile(
                    LauncherActivity.this,
                    UPDATE_FILE_PROVIDER_AUTHORITY,
                    apk
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(intent);
            } catch (ActivityNotFoundException error) {
                notifyUpdateProgress("error", 0, "找不到系统安装界面，请手动下载更新");
            }
        });
    }

    private void notifyUpdateProgress(String state, int percent, String error) {
        StringBuilder script = new StringBuilder(
                "window.__dadkitUpdateProgress&&window.__dadkitUpdateProgress({"
        );
        script.append("\"state\":\"").append(state).append("\"");
        script.append(",\"percent\":").append(percent);
        if (error != null) {
            script.append(",\"error\":\"").append(jsonEscape(error)).append("\"");
        }
        script.append("})");
        String javascript = script.toString();
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(javascript, null);
            }
        });
    }

    private String jsonEscape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private void deleteQuietly(File file) {
        try {
            if (file.exists()) {
                file.delete();
            }
        } catch (SecurityException ignored) {
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
        public String getNativeSyncToken() {
            return getSharedPreferences(NATIVE_SYNC_PREFERENCES, MODE_PRIVATE)
                    .getString("session_token", "");
        }

        @JavascriptInterface
        public String getNativeFamilyName() {
            return getSharedPreferences(NATIVE_SYNC_PREFERENCES, MODE_PRIVATE)
                    .getString("family_name", "");
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

    private final class BundledWebViewClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(
                WebView view,
                WebResourceRequest request
        ) {
            Uri uri = request.getUrl();

            if (!"https".equals(uri.getScheme()) || !APP_HOST.equals(uri.getHost())) {
                return null;
            }

            String path = uri.getPath() == null ? "/" : uri.getPath();
            if (path.equals("/api") || path.startsWith("/api/")) {
                return null;
            }

            return bundledResponse(path);
        }

        @Override
        public boolean shouldOverrideUrlLoading(
                WebView view,
                WebResourceRequest request
        ) {
            Uri uri = request.getUrl();

            if ("https".equals(uri.getScheme()) && APP_HOST.equals(uri.getHost())) {
                return false;
            }

            openExternal(uri);
            return true;
        }
    }

    private WebResourceResponse bundledResponse(String requestPath) {
        if (requestPath.contains("..")) {
            return response(403, "text/plain", "Blocked");
        }

        String assetPath = requestPath.startsWith("/")
                ? requestPath.substring(1)
                : requestPath;

        if (assetPath.isEmpty()) {
            assetPath = "index.html";
        } else if (assetPath.endsWith("/")) {
            assetPath += "index.html";
        } else if (!assetPath.substring(assetPath.lastIndexOf('/') + 1).contains(".")) {
            assetPath += "/index.html";
        }

        try {
            InputStream input = getAssets().open("www/" + assetPath);
            String mimeType = mimeTypeFor(assetPath);
            String encoding = mimeType.startsWith("text/")
                    || mimeType.contains("javascript")
                    || mimeType.contains("json")
                    || mimeType.contains("xml")
                    ? "UTF-8"
                    : null;
            Map<String, String> headers = new HashMap<>();
            headers.put(
                    "Cache-Control",
                    assetPath.endsWith(".html")
                            ? "no-store"
                            : "public, max-age=31536000, immutable"
            );
            headers.put("X-Content-Type-Options", "nosniff");

            return new WebResourceResponse(
                    mimeType,
                    encoding,
                    200,
                    "OK",
                    headers,
                    input
            );
        } catch (IOException error) {
            return response(404, "text/plain", "Not found");
        }
    }

    private WebResourceResponse response(int status, String mimeType, String body) {
        return new WebResourceResponse(
                mimeType,
                "UTF-8",
                status,
                status == 404 ? "Not Found" : "Error",
                Collections.singletonMap("Cache-Control", "no-store"),
                new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8))
        );
    }

    private String mimeTypeFor(String assetPath) {
        String extension = MimeTypeMap.getFileExtensionFromUrl(assetPath);
        String detected = MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                extension.toLowerCase(Locale.ROOT)
        );

        if (detected != null) {
            return detected;
        }
        if ("webmanifest".equals(extension)) {
            return "application/manifest+json";
        }
        if ("woff2".equals(extension)) {
            return "font/woff2";
        }
        if ("js".equals(extension)) {
            return "application/javascript";
        }
        return "application/octet-stream";
    }
}
