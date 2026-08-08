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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Locale;

@SuppressWarnings("deprecation")
public class LauncherActivity extends Activity {
    private static final String APP_HOST = "dadkit.505f.com";
    private static final String START_URL =
            "https://" + APP_HOST + "/?source=apk&appVersionCode=16";
    private static final int FILE_CHOOSER_REQUEST = 201;
    private static final String NATIVE_DATA_PREFERENCES = "dadkit_native_data";
    private static final String NATIVE_DOCUMENT_KEY = "family_document";
    private static final String NATIVE_RECORDED_BY_KEY = "recorded_by_member_id";
    private static final String NATIVE_MIGRATION_COMPLETE_KEY = "web_migration_complete";
    private static final String NATIVE_SYNC_PREFERENCES = "dadkit_native_sync";

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;

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
                settings.getUserAgentString() + " DadKitAndroid/16"
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
