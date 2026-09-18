const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function getLovableAiGatewayRunId(request: Request): string | undefined {
  return request.headers.get(RUN_ID_HEADER) ?? undefined;
}

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId;
  const wrapped: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (runId) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input as RequestInfo, { ...init, headers });
    const returned = response.headers.get(RUN_ID_HEADER);
    if (returned) runId = returned;
    return response;
  };
  return {
    fetch: wrapped,
    get runId() {
      return runId;
    },
  };
}

export function getLovableAiGatewayResponseHeaders(
  base?: HeadersInit,
  extra?: Record<string, string>,
): Headers {
  const headers = new Headers(base);
  for (const [k, v] of Object.entries(extra ?? {})) headers.set(k, v);
  return headers;
}

export function withLovableAiGatewayRunIdHeader(
  response: Response,
  runIdFetch: { runId: string | undefined },
): Response {
  if (!runIdFetch.runId) return response;
  const headers = new Headers(response.headers);
  headers.set(RUN_ID_HEADER, runIdFetch.runId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
