import { describe, expect, it } from "vitest";

import { ApiError, ApiNetworkError } from "./errors";

describe("ApiError", () => {
  it("stores code, status, and detail from the constructor", () => {
    const error = new ApiError("AUTH_DUPLICATE_EMAIL", 409, "Email already registered");

    expect(error.code).toBe("AUTH_DUPLICATE_EMAIL");
    expect(error.status).toBe(409);
    expect(error.detail).toBe("Email already registered");
  });

  it("leaves detail undefined when omitted", () => {
    const error = new ApiError("UNKNOWN", 500);

    expect(error.detail).toBeUndefined();
  });

  it("is an instance of Error so it propagates through catch/reject", () => {
    const error = new ApiError("UNKNOWN", 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

describe("ApiNetworkError", () => {
  it("is a distinct Error subtype, discriminable from ApiError via instanceof", () => {
    const error = new ApiNetworkError("Failed to reach server");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiNetworkError);
    expect(error).not.toBeInstanceOf(ApiError);
  });
});
