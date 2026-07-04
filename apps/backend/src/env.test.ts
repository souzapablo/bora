import { describe, expect, it } from "vitest";

import { validateEnv } from "./env";

describe("validateEnv", () => {
  it("throws a clear, named error when a required env var is missing", () => {
    expect(() => validateEnv({})).toThrow(/PORT/);
  });

  it("throws a clear, named error when DATABASE_URL is missing", () => {
    expect(() =>
      validateEnv({ PORT: "3000", JWT_ACCESS_SECRET: "secret" }),
    ).toThrow(/DATABASE_URL/);
  });

  it("throws a clear, named error when JWT_ACCESS_SECRET is missing", () => {
    expect(() =>
      validateEnv({ PORT: "3000", DATABASE_URL: "postgresql://localhost/bora" }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });
});
