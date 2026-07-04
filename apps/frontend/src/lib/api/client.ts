import { ApiError, ApiNetworkError } from "./errors";

/**
 * Optional auth seams. BORA-30 ships them unused; a feature (e.g. BORA-22) plugs in
 * token injection and 401-refresh-retry without this module knowing anything about auth.
 */
export interface ApiClientOptions {
  /** Returns the full `Authorization` header value (e.g. `"Bearer <jwt>"`), or undefined if none. */
  getAuthHeader?: () => string | undefined;
  /** Called once on a 401. Resolve `true` to have the client retry the request exactly once. */
  onUnauthorized?: () => Promise<boolean>;
}

export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

const PROBLEM_JSON = "application/problem+json";

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Thin typed `fetch` wrapper. Decodes the backend's RFC 7807 Problem Details responses
 * (AD-003) into typed ApiError, distinguishes transport failures as ApiNetworkError, and
 * exposes optional auth extension points. Never rejects with a raw Response or untyped Error.
 */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = import.meta.env.VITE_API_URL as string;

  async function decodeError(response: Response): Promise<ApiError> {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes(PROBLEM_JSON)) {
      try {
        const body = (await response.json()) as { code?: unknown; detail?: unknown };
        if (typeof body.code === "string") {
          const detail = typeof body.detail === "string" ? body.detail : undefined;
          return new ApiError(body.code, response.status, detail);
        }
      } catch {
        // Malformed problem+json body — fall through to the generic UNKNOWN error.
      }
    }
    return new ApiError("UNKNOWN", response.status);
  }

  async function send(url: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    const authHeader = options.getAuthHeader?.();
    if (authHeader) {
      headers.set("Authorization", authHeader);
    }

    try {
      return await fetch(url, { ...init, headers, credentials: "include" });
    } catch (cause) {
      throw new ApiNetworkError(cause instanceof Error ? cause.message : "Network request failed");
    }
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${baseUrl}${normalizePath(path)}`;

    let response = await send(url, init);

    if (response.status === 401 && options.onUnauthorized) {
      const refreshed = await options.onUnauthorized();
      if (refreshed) {
        // Retry exactly once — the retried response is used as-is, even if it 401s again.
        response = await send(url, init);
      }
    }

    if (!response.ok) {
      throw await decodeError(response);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError("UNKNOWN", response.status);
    }
  }

  return { request };
}

/** The default, hook-less client instance BORA-30 itself uses and tests. */
export const apiClient = createApiClient();
