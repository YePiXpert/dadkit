export function syncJson(
  data: unknown,
  status = 200,
  additionalHeaders?: HeadersInit,
) {
  const headers = new Headers({
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; sandbox",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });

  for (const [name, value] of new Headers(additionalHeaders)) {
    headers.set(name, value);
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function syncError(
  message: string,
  status: number,
  additionalHeaders?: HeadersInit,
  code?: string,
  details?: Record<string, unknown>,
) {
  return syncJson(
    {
      error: message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
    status,
    additionalHeaders,
  );
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
}
