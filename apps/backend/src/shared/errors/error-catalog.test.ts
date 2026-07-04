import { describe, expect, it } from "vitest";

import { ERROR_CATALOG } from "./error-catalog";

describe("ERROR_CATALOG", () => {
  it("maps VALIDATION_FAILED to status 400", () => {
    expect(ERROR_CATALOG.VALIDATION_FAILED.status).toBe(400);
  });

  it("maps INTERNAL_ERROR to status 500", () => {
    expect(ERROR_CATALOG.INTERNAL_ERROR.status).toBe(500);
  });

  it("includes the merged AUTH_* module catalog", () => {
    expect(ERROR_CATALOG.AUTH_DUPLICATE_EMAIL).toBeDefined();
    expect(ERROR_CATALOG.AUTH_DUPLICATE_EMAIL.status).toBe(409);
  });
});
