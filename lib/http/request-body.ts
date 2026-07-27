import { HttpBoundaryError } from "@/lib/http/boundary-error";

export async function readLimitedRequestText(
  request: Request,
  maxBytes: number,
  timeoutMs = 30_000,
) {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    if (!/^\d+$/.test(contentLength)) {
      throw new HttpBoundaryError("请求长度不正确。", 400);
    }
    if (Number(contentLength) > maxBytes) {
      throw new HttpBoundaryError("请求内容过大。", 413);
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const timeoutError = new HttpBoundaryError("读取请求体超时。", 408);
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(timeoutError);
      void reader.cancel(timeoutError).catch(() => undefined);
    }, Math.max(1, timeoutMs));
  });

  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new HttpBoundaryError("请求内容过大。", 413);
      }

      chunks.push(value);
    }
  } finally {
    clearTimeout(timeoutHandle);
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw new HttpBoundaryError("请求编码必须是有效的 UTF-8。", 400);
  }
}
