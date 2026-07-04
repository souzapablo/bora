import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";
import { ApiError, ApiNetworkError } from "./errors";

const BASE_URL = "http://localhost:3000";

function jsonResponse(body: unknown, status: number, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

/** Grabs the RequestInit the client passed to the mocked fetch on its Nth call. */
function fetchInit(mock: ReturnType<typeof vi.fn>, call = 0): RequestInit {
  return mock.mock.calls[call][1] as RequestInit;
}

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", BASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createApiClient — request building (API-01)", () => {
  it("builds the URL from VITE_API_URL + path, sets JSON content-type, and includes credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await createApiClient().request("/health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/health");
    const init = fetchInit(fetchMock);
    expect(init.credentials).toBe("include");
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  it("normalizes a relative path with no leading slash (edge case)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await createApiClient().request("health");

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/health");
  });
});

describe("createApiClient — error decoding (API-02, API-03, API-04)", () => {
  it("decodes a valid problem+json non-2xx body into a typed ApiError (API-02)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { code: "AUTH_DUPLICATE_EMAIL", title: "Conflict", detail: "Email already registered" },
        409,
        "application/problem+json",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/auth/register")).rejects.toMatchObject({
      code: "AUTH_DUPLICATE_EMAIL",
      status: 409,
      detail: "Email already registered",
    });
    await expect(createApiClient().request("/auth/register")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects with ApiNetworkError when fetch itself fails before any response (API-03)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const rejection = createApiClient().request("/health");
    await expect(rejection).rejects.toBeInstanceOf(ApiNetworkError);
    await expect(rejection).rejects.not.toBeInstanceOf(ApiError);
  });

  it("rejects with ApiError code UNKNOWN when a non-2xx body has the wrong content-type (API-04)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/health")).rejects.toMatchObject({ code: "UNKNOWN", status: 502 });
  });

  it("rejects with ApiError code UNKNOWN when a problem+json non-2xx body is malformed (API-04)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("not json at all", { status: 500, headers: { "content-type": "application/problem+json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/health")).rejects.toMatchObject({ code: "UNKNOWN", status: 500 });
  });
});

describe("createApiClient — success passthrough (API-05)", () => {
  it("returns the parsed JSON of a 2xx response as-is", async () => {
    const payload = { id: 1, name: "Bora" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(payload, 200));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request<typeof payload>("/thing")).resolves.toEqual(payload);
  });

  it("rejects with ApiError code UNKNOWN when a 2xx body is not valid JSON (edge case)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/thing")).rejects.toMatchObject({ code: "UNKNOWN", status: 200 });
  });
});

describe("createApiClient — auth extension points (API-06, API-07, API-08)", () => {
  it("merges the getAuthHeader() value into the Authorization header (API-06)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await createApiClient({ getAuthHeader: () => "Bearer token-123" }).request("/me");

    expect((fetchInit(fetchMock).headers as Headers).get("Authorization")).toBe("Bearer token-123");
  });

  it("does not set Authorization when getAuthHeader returns undefined (API-06)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await createApiClient({ getAuthHeader: () => undefined }).request("/me");

    expect((fetchInit(fetchMock).headers as Headers).get("Authorization")).toBeNull();
  });

  it("retries the request exactly once when onUnauthorized resolves true after a 401 (API-07)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ code: "AUTH_UNAUTHORIZED" }, 401, "application/problem+json"))
      .mockResolvedValueOnce(jsonResponse({ id: 7 }, 200));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn().mockResolvedValue(true);

    await expect(createApiClient({ onUnauthorized }).request("/me")).resolves.toEqual({ id: 7 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries at most once — a second 401 rejects without calling onUnauthorized again (API-07)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: "AUTH_UNAUTHORIZED" }, 401, "application/problem+json"));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn().mockResolvedValue(true);

    await expect(createApiClient({ onUnauthorized }).request("/me")).rejects.toMatchObject({
      code: "AUTH_UNAUTHORIZED",
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects with the typed ApiError when onUnauthorized resolves false (API-07)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: "AUTH_UNAUTHORIZED" }, 401, "application/problem+json"));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn().mockResolvedValue(false);

    await expect(createApiClient({ onUnauthorized }).request("/me")).rejects.toMatchObject({ code: "AUTH_UNAUTHORIZED" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a 401 with the typed ApiError when no onUnauthorized hook is supplied (API-07/API-08)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: "AUTH_UNAUTHORIZED" }, 401, "application/problem+json"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/me")).rejects.toMatchObject({ code: "AUTH_UNAUTHORIZED", status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("behaves as the core client with no hooks: 2xx resolves and no Authorization header is sent (API-08)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 200));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApiClient().request("/health")).resolves.toEqual({ ok: true });
    expect((fetchInit(fetchMock).headers as Headers).get("Authorization")).toBeNull();
  });

  it("invokes onUnauthorized once per failing request with no de-duplication of concurrent 401s (edge case)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: "AUTH_UNAUTHORIZED" }, 401, "application/problem+json"));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn().mockResolvedValue(false);
    const client = createApiClient({ onUnauthorized });

    await Promise.allSettled([client.request("/a"), client.request("/b")]);

    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });
});
