import { describe, expect, it } from "vitest";

import { AUTH_ERROR_CATALOG } from "./auth-error";
import { ERROR_CATALOG } from "../../../shared/errors/error-catalog";

describe("AUTH_ERROR_CATALOG", () => {
  it("maps AUTH_DUPLICATE_EMAIL to status 409", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_DUPLICATE_EMAIL.status).toBe(409);
  });

  it("maps AUTH_INVALID_CREDENTIALS to status 401", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_INVALID_CREDENTIALS.status).toBe(401);
  });

  it("maps AUTH_RATE_LIMITED to status 429", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_RATE_LIMITED.status).toBe(429);
  });

  it("maps AUTH_MISSING_REFRESH_TOKEN to status 401", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_MISSING_REFRESH_TOKEN.status).toBe(401);
  });

  it("maps AUTH_INVALID_REFRESH_TOKEN to status 401", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_INVALID_REFRESH_TOKEN.status).toBe(401);
  });

  it("maps AUTH_REFRESH_TOKEN_EXPIRED to status 401", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_REFRESH_TOKEN_EXPIRED.status).toBe(401);
  });

  it("maps AUTH_REFRESH_TOKEN_REUSED to status 401", () => {
    expect(AUTH_ERROR_CATALOG.AUTH_REFRESH_TOKEN_REUSED.status).toBe(401);
  });

  it("is merged into the shared ERROR_CATALOG", () => {
    expect(ERROR_CATALOG.AUTH_DUPLICATE_EMAIL).toEqual(
      AUTH_ERROR_CATALOG.AUTH_DUPLICATE_EMAIL,
    );
  });
});
