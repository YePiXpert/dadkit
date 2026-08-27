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
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;



@SuppressWarnings("deprecation")
public class LauncherActivity extends Activity {
    private static final String APP_HOST = "dadkit.505f.com";
    private static final String START_URL =
            "https://" + APP_HOST + "/?source=apk&appVersionCode=27";
    private static final String OFFLINE_PAGE =
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
                    + "<h1>暂时无法连接 DadKit</h1>"
                    + "<p>首次使用需要联网。若此前已使用过，请检查网络后重试。</p>"
                    + "<a href=\"" + START_URL + "\">重新加载</a>"
                    + "</main></body></html>";
    private static final int FILE_CHOOSER_REQUEST = 201;
    private static final String NATIVE_DATA_PREFERENCES = "dadkit_native_data";
    private static final String NATIVE_DOCUMENT_KEY = "family_document";
    private static final String NATIVE_RECORDED_BY_KEY = "recorded_by_member_id";
    private static final String NATIVE_MIGRATION_COMPLETE_KEY = "web_migration_complete";

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
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportZoom(false);
        settings.setUserAgentString(
                settings.getUserAgentString() + " DadKitAndroid/27"
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

        @Override
        public void onReceivedError(
                WebView view,
                WebResourceRequest request,
                WebResourceError error
        ) {
            if (request.isForMainFrame()) {
                showOfflinePage(view);
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
                showOfflinePage(view);
                return;
            }
            super.onReceivedHttpError(view, request, errorResponse);
        }
    }

    private void showOfflinePage(WebView view) {
        view.loadDataWithBaseURL(
                START_URL,
                OFFLINE_PAGE,
                "text/html",
                "UTF-8",
                START_URL
        );
    }
}
