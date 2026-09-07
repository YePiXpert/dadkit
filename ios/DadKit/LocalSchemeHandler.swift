import Foundation
import WebKit

/// 以 dadkit-local://localhost 提供 bundle 内 www/ 目录的静态资源。
/// Next 静态导出的路由形态是 xxx.html（个别带同名目录），解析顺序：
/// 精确文件 → 目录 index.html → 追加 .html。
final class LocalSchemeHandler: NSObject, WKURLSchemeHandler {
    private static let rootURL = URL(fileURLWithPath: Bundle.main.bundlePath)
        .appendingPathComponent("www")

    private let workQueue = DispatchQueue(label: "com.dadkit.local-scheme", qos: .userInitiated)
    private let lock = NSLock()
    private var stoppedTaskIds = Set<ObjectIdentifier>()

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let request = urlSchemeTask.request
        workQueue.async { [weak self] in
            guard let self else { return }
            let outcome = Self.resolve(request: request)

            DispatchQueue.main.async { [weak self] in
                guard
                    let self,
                    !self.isStopped(urlSchemeTask)
                else { return }

                switch outcome {
                case .failure:
                    urlSchemeTask.didReceive(
                        Self.response(for: request.url, status: 404, mimeType: "text/plain")
                    )
                    urlSchemeTask.didFinish()
                case .success(let fileURL, let mimeType):
                    do {
                        let data = try Data(contentsOf: fileURL)
                        urlSchemeTask.didReceive(
                            Self.response(for: request.url, status: 200, mimeType: mimeType)
                        )
                        urlSchemeTask.didReceive(data)
                        urlSchemeTask.didFinish()
                    } catch {
                        if !self.isStopped(urlSchemeTask) {
                            urlSchemeTask.didReceive(
                                Self.response(for: request.url, status: 500, mimeType: "text/plain")
                            )
                            urlSchemeTask.didFinish()
                        }
                    }
                }
            }
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        lock.lock()
        stoppedTaskIds.insert(ObjectIdentifier(urlSchemeTask))
        lock.unlock()
    }

    private func isStopped(_ task: WKURLSchemeTask) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return stoppedTaskIds.contains(ObjectIdentifier(task))
    }

    private enum Resolution {
        case success(URL, String)
        case failure
    }

    private static func resolve(request: URLRequest) -> Resolution {
        guard let url = request.url else { return .failure }
        var path = url.path
        if path.hasPrefix("/") { path.removeFirst() }
        if path.isEmpty { path = "index.html" }

        let root = rootURL.standardizedFileURL.path
        let standardized = rootURL
            .appendingPathComponent(path)
            .standardizedFileURL
        // 防目录穿越：解析后的路径必须仍位于 www/ 下。
        guard standardized.path.hasPrefix(root + "/") || standardized.path == root else {
            return .failure
        }

        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: standardized.path, isDirectory: &isDirectory) {
            let fileURL = isDirectory.boolValue
                ? standardized.appendingPathComponent("index.html")
                : standardized
            guard FileManager.default.fileExists(atPath: fileURL.path) else {
                return .failure
            }
            return .success(fileURL, mimeType(forExtension: fileURL.pathExtension))
        }

        let htmlCandidate = rootURL.appendingPathComponent("\(path).html")
        if FileManager.default.fileExists(atPath: htmlCandidate.path) {
            return .success(htmlCandidate, mimeType(forExtension: "html"))
        }
        return .failure
    }

    private static func response(
        for url: URL?,
        status: Int,
        mimeType: String
    ) -> HTTPURLResponse {
        HTTPURLResponse(
            url: url ?? URL(fileURLWithPath: "/"),
            statusCode: status,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": mimeType]
        )!
    }

    private static func mimeType(forExtension ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm":
            return "text/html"
        case "js", "mjs":
            return "text/javascript"
        case "css":
            return "text/css"
        case "json", "map":
            return "application/json"
        case "txt":
            return "text/plain"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "svg":
            return "image/svg+xml"
        case "webp":
            return "image/webp"
        case "ico":
            return "image/x-icon"
        case "woff2":
            return "font/woff2"
        case "woff":
            return "font/woff"
        case "ttf":
            return "font/ttf"
        case "otf":
            return "font/otf"
        case "webmanifest":
            return "application/manifest+json"
        default:
            return "application/octet-stream"
        }
    }
}
