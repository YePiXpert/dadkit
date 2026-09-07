import SafariServices
import UIKit
import WebKit

/// 本地资源壳：页面全部打包在 bundle 的 www/ 下，经自定义 scheme
/// dadkit-local://localhost 加载；只有家庭同步数据请求云端 API。
final class DadKitViewController: UIViewController {
    private static let localScheme = "dadkit-local"
    private static let localOrigin = "dadkit-local://localhost"
    private static let startURL = URL(
        string: "\(localOrigin)/?source=ipa&appVersionCode=1"
    )!

    private var webView: WKWebView?
    private var darkTheme = false {
        didSet {
            guard darkTheme != oldValue else { return }
            applyTheme()
        }
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return darkTheme ? .lightContent : .darkContent
    }

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(
            LocalSchemeHandler(),
            forURLScheme: DadKitViewController.localScheme
        )

        let contentController = configuration.userContentController
        contentController.add(
            ShellMessageProxy(owner: self),
            name: "dadkitShell"
        )
        // 注入与 Android 同名的 window.DadKitAndroidShell 桥，
        // Web 端 use-theme 无需改动即可同步状态栏深浅色。
        contentController.addUserScript(
            WKUserScript(
                source: """
                window.DadKitAndroidShell = {
                  setDarkTheme: function (dark) {
                    window.webkit.messageHandlers.dadkitShell.postMessage({ dark: !!dark });
                  }
                };
                """,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        // 壳标识：Web 端据此跳过 Service Worker 注册与 PWA 安装提示。
        let baseUserAgent = (webView.value(forKey: "userAgent") as? String) ?? ""
        webView.customUserAgent = baseUserAgent.isEmpty
            ? "DadKitiOS/1"
            : "\(baseUserAgent) DadKitiOS/1"
        self.webView = webView
        view = webView
        applyTheme()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.load(URLRequest(url: DadKitViewController.startURL))
    }

    private func applyTheme() {
        let background = darkTheme
            ? UIColor(red: 26 / 255, green: 23 / 255, blue: 20 / 255, alpha: 1)
            : UIColor(red: 251 / 255, green: 248 / 255, blue: 242 / 255, alpha: 1)
        view.backgroundColor = background
        webView?.backgroundColor = background
        webView?.scrollView.backgroundColor = background
        setNeedsStatusBarAppearanceUpdate()
    }

    fileprivate func handleShellMessage(_ message: WKScriptMessage) {
        guard
            let body = message.body as? [String: Any],
            let dark = body["dark"] as? Bool
        else { return }
        darkTheme = dark
    }
}

/// WKScriptMessageHandler 会被 WKWebView 强持有，用弱代理避免环引用。
private final class ShellMessageProxy: NSObject, WKScriptMessageHandler {
    weak var owner: DadKitViewController?

    init(owner: DadKitViewController) {
        self.owner = owner
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        owner?.handleShellMessage(message)
    }
}

extension DadKitViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == DadKitViewController.localScheme || scheme == "about" {
            decisionHandler(.allow)
            return
        }

        // 邀请链接、参考外链等一律转到 Safari 内嵌浏览，不经本地壳加载。
        if scheme == "http" || scheme == "https" || scheme == "mailto" {
            present(SFSafariViewController(url: url), animated: true)
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.cancel)
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        // 本地资源加载失败属异常情况（安装包损坏），展示重试页。
        webView.loadHTMLString(Self.errorPageHTML, baseURL: DadKitViewController.startURL)
    }
}

private extension DadKitViewController {
    static let errorPageHTML = """
    <!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <style>html{font-family:sans-serif;color-scheme:light dark}
    body{min-height:100vh;margin:0;display:grid;place-items:center;background:#fbf8f2;color:#2a2521}
    main{max-width:24rem;padding:2rem;text-align:center}
    h1{font-size:1.25rem}p{line-height:1.7;color:#746b64}
    a{display:inline-block;margin-top:1rem;padding:.8rem 1.5rem;border-radius:999px;
    background:#b95549;color:white;text-decoration:none;font-weight:700}
    @media(prefers-color-scheme:dark){body{background:#1a1714;color:#f5eee7}p{color:#bdb2a8}}
    </style></head><body><main>
    <h1>应用资源加载异常</h1>
    <p>内置页面不完整，请重新安装应用。</p>
    <a href="dadkit-local://localhost/?source=ipa&amp;appVersionCode=1">重试</a>
    </main></body></html>
    """
}
