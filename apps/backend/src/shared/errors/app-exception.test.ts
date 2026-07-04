import { describe, expect, it } from "vitest";

import { AppException } from "./app-exception";

describe("AppException", () => {
  it("exposes the wrapped AppError and sets Error.message to its code", () => {
    const exception = new AppException({ code: "X" });

    expect(exception.appError.code).toBe("X");
    expect(exception.message).toBe("X");
  });

  it("preserves detail and meta on the wrapped AppError", () => {
    const exception = new AppException({
      code: "VALIDATION_FAILED",
      detail: "Request validation failed",
      meta: { errors: [{ path: "password", message: "too short" }] },
    });

    expect(exception.appError.detail).toBe("Request validation failed");
    expect(exception.appError.meta).toEqual({
      errors: [{ path: "password", message: "too short" }],
    });
  });
});
