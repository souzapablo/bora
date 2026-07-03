import { describe, expect, it } from "vitest";

import { validateEnv } from "./env";

describe("validateEnv", () => {
  it("throws a clear, named error when a required env var is missing", () => {
    expect(() => validateEnv({})).toThrow(/VITE_API_URL/);
  });
});
